import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
    });
  }

  // On startup, ensure the R2 bucket allows PUT from any origin so the browser
  // can upload directly using a pre-signed URL without hitting CORS errors.
  async onModuleInit() {
    await this.ensureR2Cors().catch(err =>
      this.logger.warn('R2 CORS setup skipped — configure AllowedMethods:[PUT] manually if direct uploads fail', err?.message),
    );
  }

  private async ensureR2Cors() {
    await this.s3.send(new PutBucketCorsCommand({
      Bucket: this.bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['PUT'],
          AllowedHeaders: ['Content-Type'],
          MaxAgeSeconds: 3600,
        }],
      },
    }));
    this.logger.log('R2 CORS configured: PUT allowed from any origin');
  }

  async upload(userId: string, file: Express.Multer.File, title?: string) {
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = file.originalname.replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60);
    const key = `uploads/${userId}/${uuidv4()}-${base}.${ext}`;
    const fileType = this.detectFileType(file.mimetype, file.originalname);

    // Upload to Cloudflare R2
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
      this.logger.warn('R2 upload failed, using local path', err);
      fileUrl = `/uploads/${key}`;
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

    // Trigger async processing
    this.processFile(note.id, file.buffer, file.mimetype).catch(err =>
      this.logger.error(`File processing failed for ${note.id}`, err),
    );

    this.analyticsService.track(userId, 'note_uploaded', {
      noteId: note.id,
      fileType: fileType,
      filename: file.originalname,
    }).catch(() => {});

    return note;
  }

  private async processFile(noteId: string, buffer: Buffer, mimetype: string) {
    await this.prisma.note.update({ where: { id: noteId }, data: { processingStatus: 'PROCESSING' } });

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
      } else {
        // For images/voice: placeholder — real OCR would use AWS Textract / Google Vision
        content = `[Image upload: ${noteId}. OCR processing not yet configured.]`;
      }

      // Guard: if nothing was extractable, mark DONE with an informative summary so the
      // user knows the file was received but no text could be read (scanned PDF, etc.)
      if (!content.trim() || content.trim().length < 20) {
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            processingStatus: 'DONE',
            summary: JSON.stringify({
              overview: 'No text could be extracted from this file. If it is a scanned document, OCR is not yet configured.',
              topics: [],
              takeaways: [],
            }),
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

  // Lightweight upload for community post/reply attachments — no Note record, no AI processing
  async uploadAttachment(userId: string, file: Express.Multer.File): Promise<{ url: string; type: 'FILE' | 'IMAGE' | 'VOICE' }> {
    // Sanitize filename: keep only alphanumeric, dots, dashes, underscores.
    // Special characters (spaces, unicode, parens…) break the R2 URL when
    // inserted into the object key without encoding.
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = file.originalname.replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
    const safeName = `${base}.${ext}`;
    const key = `attachments/${userId}/${uuidv4()}-${safeName}`;

    if (!this.publicUrl) {
      this.logger.error(
        'CLOUDFLARE_R2_PUBLIC_URL is not configured — attachment uploads will fail. ' +
        'Set this env var to the public base URL of your R2 bucket (e.g. https://pub-xxx.r2.dev).',
      );
      throw new Error('File storage is not configured. Please contact support.');
    }

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
    } catch (err) {
      // R2 upload failed — do NOT store a broken fallback URL in the database.
      // The client will receive a 500 and show an appropriate error toast.
      this.logger.error('R2 attachment upload failed', err);
      throw new Error('File upload failed. Please try again.');
    }

    // Normalise publicUrl: strip any trailing slash so we never get double-slashes.
    const base_url = this.publicUrl.replace(/\/+$/, '');
    const url = `${base_url}/${key}`;

    // AttachmentType only has FILE | IMAGE | VOICE — 'TEXT' (from detectFileType's
    // default) is not valid here. Map anything that isn't IMAGE or VOICE to FILE.
    const detected = this.detectFileType(file.mimetype, file.originalname);
    const type = (['IMAGE', 'VOICE'].includes(detected) ? detected : 'FILE') as 'FILE' | 'IMAGE' | 'VOICE';
    return { url, type };
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
      throw new Error('File storage is not configured. Please contact support.');
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
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype.startsWith('audio/')) return 'VOICE';
    return 'TEXT';
  }
}
