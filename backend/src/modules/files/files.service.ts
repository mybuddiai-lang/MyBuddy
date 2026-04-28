import { Injectable, NotFoundException, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);
  private s3: S3Client;
  private bucket: string;

  private publicUrl: string;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
    private analyticsService: AnalyticsService,
  ) {
    this.bucket = config.get<string>('CLOUDFLARE_R2_BUCKET', 'buddi-uploads');
    this.publicUrl = config.get<string>('CLOUDFLARE_R2_PUBLIC_URL', '');
    const accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    // FetchHttpHandler makes the AWS SDK use Node.js 18's built-in fetch instead of
    // OpenSSL for TLS. Railway's OpenSSL fails to handshake with R2's EC certificate
    // (SSL alert 40). fetch has no such restriction, so uploads reach R2 reliably.
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY', ''),
      },
      // AWS SDK v3.382+ adds CRC32 checksum headers by default — R2 rejects these
      requestChecksumCalculation: 'WHEN_REQUIRED' as any,
      responseChecksumValidation: 'WHEN_REQUIRED' as any,
      requestHandler: new FetchHttpHandler(),
    });
  }

  async onModuleInit() {
    this.logger.log('FilesService ready');
  }

  // Direct multipart upload for slides: browser POSTs the file to Railway,
  // Railway uploads the buffer to R2, creates a Note, and triggers AI processing.
  async upload(userId: string, file: Express.Multer.File, title?: string) {
    const key = `uploads/${userId}/${uuidv4()}-${file.originalname}`;
    const fileType = this.detectFileType(file.mimetype, file.originalname);

    let fileUrl = '';
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      fileUrl = `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
    } catch (err) {
      this.logger.warn('R2 upload failed, storing locally', err);
      fileUrl = `/uploads/${file.originalname}`;
    }

    const note = await this.prisma.note.create({
      data: {
        userId,
        title: title || file.originalname.replace(/\.[^/.]+$/, ''),
        originalFilename: file.originalname,
        fileUrl,
        fileType: fileType as any,
        processingStatus: 'PENDING',
      },
    });

    this.analyticsService.track(userId, 'note_uploaded', {
      noteId: note.id,
      fileType,
      filename: file.originalname,
    }).catch(() => {});

    this.processFile(note.id, file.buffer, file.mimetype, file.originalname).catch(err =>
      this.logger.error(`processFile failed for ${note.id}`, err),
    );

    return note;
  }

  // Called after the browser uploads a note/slide file directly to R2.
  // Creates the note record and triggers AI processing by fetching the file
  // from the public CDN URL (which bypasses r2.cloudflarestorage.com).
  async registerUpload(
    userId: string,
    dto: { publicUrl: string; originalFilename: string; contentType: string; title?: string },
  ) {
    const fileType = this.detectFileType(dto.contentType, dto.originalFilename);
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: dto.title || dto.originalFilename.replace(/\.[^/.]+$/, ''),
        originalFilename: dto.originalFilename,
        fileUrl: dto.publicUrl,
        fileType: fileType as any,
        processingStatus: 'PENDING',
      },
    });

    this.analyticsService.track(userId, 'note_uploaded', {
      noteId: note.id,
      fileType,
      filename: dto.originalFilename,
    }).catch(() => {});

    // Download from the public CDN URL (not the S3 API) and process
    this.fetchAndProcess(note.id, dto.publicUrl, dto.contentType, dto.originalFilename).catch(err =>
      this.logger.error(`fetchAndProcess failed for ${note.id}`, err),
    );

    return note;
  }

  private async fetchAndProcess(noteId: string, publicUrl: string, mimetype: string, filename?: string) {
    try {
      this.logger.log(`Fetching file for AI processing: ${noteId}`);
      const response = await fetch(publicUrl);
      if (!response.ok) throw new Error(`CDN fetch failed: ${response.status} ${response.statusText}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await this.processFile(noteId, buffer, mimetype, filename);
    } catch (err) {
      this.logger.error(`fetchAndProcess error for note ${noteId}`, err);
      const failed = await this.prisma.note.update({
        where: { id: noteId },
        data: { processingStatus: 'FAILED' },
        select: { userId: true },
      }).catch(() => null);
      if (failed) this.eventEmitter.emit('note.failed', { noteId, userId: failed.userId });
    }
  }

  private async processFile(noteId: string, buffer: Buffer, mimetype: string, filename?: string) {
    await this.prisma.note.update({ where: { id: noteId }, data: { processingStatus: 'PROCESSING' } });

    const lowerName = (filename ?? '').toLowerCase();
    const isPptx =
      mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimetype === 'application/vnd.ms-powerpoint' ||
      lowerName.endsWith('.pptx') ||
      lowerName.endsWith('.ppt');

    try {
      // Extract text content
      let content = '';
      let pageCount: number | undefined;

      if (mimetype === 'text/plain') {
        content = buffer.toString('utf-8');
      } else if (mimetype === 'application/pdf') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse');
          const parsed = await pdfParse(buffer);
          content = parsed.text || '';
          pageCount = parsed.numpages;
          this.logger.log(`PDF parsed: ${content.length} chars, ${pageCount} pages from note ${noteId}`);
        } catch (pdfErr) {
          this.logger.warn(`PDF parse failed for note ${noteId}, using fallback`, pdfErr);
          content = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\t]/g, ' ').trim();
        }
      } else if (isPptx) {
        try {
          // officeparser v6+ returns an AST — call .toText() to get the plain string.
          // The old parseOfficeAsync no longer exists in v6; parseOffice returns a Promise.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const officeParser = require('officeparser');
          const ast = await officeParser.parseOffice(buffer, { outputErrorToConsole: false });
          content = ast.toText();
          this.logger.log(`PPTX parsed: ${content.length} chars from note ${noteId}`);
        } catch (pptxErr) {
          this.logger.warn(`PPTX parse failed for note ${noteId}`, pptxErr);
          content = `[PowerPoint file received. Text extraction failed — please try converting to PDF.]`;
        }
      } else if (mimetype.startsWith('audio/')) {
        content = `[VOICE_NOTE]`;
      } else {
        content = `[IMAGE_ONLY]`;
      }

      // Guard: skip AI when there is no real extractable text.
      // This catches: truly empty content (<20 chars), the PPTX fallback placeholder
      // ("[PowerPoint file received...]"), voice notes, and image-only uploads.
      // Previously these all slipped past the length check and the AI was called with
      // placeholder text, causing it to generate confusing "OCR not configured" summaries.
      const isPlaceholder = content.trimStart().startsWith('[');
      if (!content.trim() || content.trim().length < 20 || isPlaceholder) {
        let overview: string;
        if (isPlaceholder && content.startsWith('[VOICE_NOTE]')) {
          overview = 'Voice note saved. Audio transcription in slides is coming soon — for full AI analysis, type or paste your notes as text, or upload a PDF.';
        } else if (isPlaceholder && content.startsWith('[IMAGE_ONLY]')) {
          overview = 'Image uploaded. Buddi cannot yet extract text from images. For full AI analysis, upload a PDF or a text file with your notes.';
        } else if (isPlaceholder && isPptx) {
          overview = 'PowerPoint file was uploaded but text could not be extracted automatically. Try saving your presentation as a PDF and re-uploading for full AI analysis.';
        } else {
          overview = 'No text could be extracted from this file. Try uploading a PDF with selectable text, or paste your notes as a text file.';
        }
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            processingStatus: 'DONE',
            summary: JSON.stringify({ overview, topics: [], takeaways: [] }),
            content,
            ...(pageCount !== undefined ? { pageCount } : {}),
          },
        });
        const baseNote = await this.prisma.note.findUnique({ where: { id: noteId }, select: { userId: true } });
        if (baseNote) this.eventEmitter.emit('note.processed', { noteId, userId: baseNote.userId });
        return;
      }

      // Run all AI extraction in parallel with individual fallbacks.
      // Promise.allSettled ensures a single AI timeout/error doesn't kill the whole note.
      const [summaryResult, factsResult, termsResult] = await Promise.allSettled([
        this.aiService.summarizeContent(content),
        this.aiService.extractHighYieldFacts(content),
        this.aiService.extractKeyTerms(content),
      ]);

      const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : JSON.stringify({
        overview: 'Summary could not be generated. Please try re-uploading the file.',
        topics: [],
        takeaways: [],
      });
      const facts = factsResult.status === 'fulfilled' ? factsResult.value : [];
      const terms = termsResult.status === 'fulfilled' ? termsResult.value : [];

      if (summaryResult.status === 'rejected') this.logger.warn(`summarizeContent failed for note ${noteId}`, summaryResult.reason);
      if (factsResult.status === 'rejected') this.logger.warn(`extractHighYieldFacts failed for note ${noteId}`, factsResult.reason);
      if (termsResult.status === 'rejected') this.logger.warn(`extractKeyTerms failed for note ${noteId}`, termsResult.reason);

      // Store Q&A flashcard chunks (chunkIndex 0–14)
      for (let i = 0; i < Math.min(facts.length, 15); i++) {
        const fact = facts[i];
        await this.prisma.noteChunk.create({
          data: {
            noteId,
            content: `Q: ${fact.question}\nA: ${fact.answer}`,
            chunkIndex: i,
          },
        });
      }

      // Store key term / glossary chunks (chunkIndex 100–107, offset to distinguish type)
      for (let i = 0; i < Math.min(terms.length, 8); i++) {
        const term = terms[i];
        await this.prisma.noteChunk.create({
          data: {
            noteId,
            content: `TERM: ${term.term}\nDEF: ${term.definition}`,
            chunkIndex: 100 + i,
          },
        });
      }

      // Schedule spaced repetition reminders
      const note = await this.prisma.note.findUnique({ where: { id: noteId } });
      if (!note) {
        // Note was deleted before processing finished — nothing to update
        return;
      }
      const intervals = [1, 3, 7, 14, 30];
      for (const days of intervals) {
        await this.prisma.reminder.create({
          data: {
            userId: note.userId,
            noteId,
            title: `Review: ${note.title}`,
            description: `Spaced repetition — Day ${days}`,
            scheduledFor: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            type: 'RECALL',
            difficultyLevel: Math.min(Math.ceil(days / 7) + 1, 5),
          },
        });
      }

      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          processingStatus: 'DONE',
          summary,
          content,
          ...(pageCount !== undefined ? { pageCount } : {}),
        },
      });

      this.eventEmitter.emit('note.processed', { noteId, userId: note.userId });
    } catch (err) {
      this.logger.error('File processing error', err);
      const failed = await this.prisma.note.update({ where: { id: noteId }, data: { processingStatus: 'FAILED' }, select: { userId: true } });
      this.eventEmitter.emit('note.failed', { noteId, userId: failed.userId });
    }
  }

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    return this.aiService.transcribeAudio(file);
  }

  // Generate a short-lived pre-signed PUT URL so the browser can upload
  // directly to Cloudflare R2, bypassing the Vercel proxy's 4.5 MB body limit.
  // The returned `publicUrl` is what gets stored in the database after upload.
  async getUploadUrl(
    userId: string,
    contentType: string,
    filename: string,
  ): Promise<{ uploadUrl: string; publicUrl: string; type: 'IMAGE' | 'FILE' | 'VOICE' }> {
    if (!this.publicUrl) {
      throw new InternalServerErrorException('File storage is not configured — set CLOUDFLARE_R2_PUBLIC_URL on Railway.');
    }

    const ext = (filename.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
    const key = `attachments/${userId}/${uuidv4()}-${base}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    // 5-minute window is generous enough for slow connections
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const publicUrl = `${this.publicUrl.replace(/\/+$/, '')}/${key}`;

    const detected = this.detectFileType(contentType, filename);
    const type = (['IMAGE', 'VOICE'].includes(detected) ? detected : 'FILE') as 'IMAGE' | 'FILE' | 'VOICE';

    return { uploadUrl, publicUrl, type };
  }

  // Lightweight upload for chat/community attachments — no Note record, no AI processing.
  // Browser POSTs multipart form-data directly to Railway; Railway uploads buffer to R2.
  async uploadAttachment(userId: string, file: Express.Multer.File): Promise<{ url: string; type: 'FILE' | 'IMAGE' | 'VOICE' }> {
    if (!this.publicUrl) {
      throw new InternalServerErrorException('File storage is not configured — set CLOUDFLARE_R2_PUBLIC_URL on Railway.');
    }
    // Sanitize filename the same way getUploadUrl does, so the stored CDN URL is
    // always a valid URL (no spaces or special characters that break image loading).
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
    const key = `attachments/${userId}/${uuidv4()}-${base}.${ext}`;
    let url: string;
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      url = `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
    } catch (err) {
      this.logger.warn('R2 attachment upload failed', err);
      throw new InternalServerErrorException('Attachment upload failed. Please try again.');
    }
    const raw = this.detectFileType(file.mimetype, file.originalname);
    // Map detectFileType output to the AttachmentType enum values (FILE/IMAGE/VOICE)
    const type = (raw === 'IMAGE' ? 'IMAGE' : raw === 'VOICE' ? 'VOICE' : 'FILE') as 'FILE' | 'IMAGE' | 'VOICE';
    return { url, type };
  }

  async findAll(userId: string) {
    return this.prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, fileType: true, processingStatus: true, masteryLevel: true, summary: true, createdAt: true },
    });
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async remove(id: string, userId: string) {
    const note = await this.prisma.note.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.note.delete({ where: { id } });
    return { message: 'Note deleted' };
  }

  private detectFileType(mimetype: string, filename: string): string {
    if (mimetype === 'application/pdf') return 'PDF';
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimetype === 'application/vnd.ms-powerpoint' ||
      filename.toLowerCase().endsWith('.pptx') ||
      filename.toLowerCase().endsWith('.ppt')
    ) return 'PPTX';
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype.startsWith('audio/')) return 'VOICE';
    return 'TEXT';
  }
}
