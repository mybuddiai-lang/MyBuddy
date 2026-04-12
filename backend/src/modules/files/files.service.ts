import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class FilesService {
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

  async upload(userId: string, file: Express.Multer.File, title?: string) {
    const key = `uploads/${userId}/${uuidv4()}-${file.originalname}`;
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
      fileUrl = `${this.publicUrl}/${key}`;
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
      if (mimetype === 'text/plain') {
        content = buffer.toString('utf-8');
      } else if (mimetype === 'application/pdf') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse');
          const parsed = await pdfParse(buffer);
          content = parsed.text || '';
          this.logger.log(`PDF parsed: ${content.length} chars extracted from note ${noteId}`);
        } catch (pdfErr) {
          this.logger.warn(`PDF parse failed for note ${noteId}, using fallback`, pdfErr);
          content = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\t]/g, ' ').trim();
        }
      } else {
        // For images: pass a placeholder — real OCR would use AWS Textract / Google Vision
        content = `[Image upload: ${noteId}. OCR processing not yet configured.]`;
      }

      // Generate AI summary and facts
      const summary = await this.aiService.summarizeContent(content);
      const facts = await this.aiService.extractHighYieldFacts(content);

      // Create note chunks and reminders
      const chunks = [];
      for (let i = 0; i < Math.min(facts.length, 10); i++) {
        const fact = facts[i];
        const chunk = await this.prisma.noteChunk.create({
          data: {
            noteId,
            content: `Q: ${fact.question}\nA: ${fact.answer}`,
            chunkIndex: i,
          },
        });
        chunks.push(chunk);
      }

      // Schedule spaced repetition reminders
      const note = await this.prisma.note.findUnique({ where: { id: noteId } });
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
        data: { processingStatus: 'DONE', summary, content },
      });

      this.eventEmitter.emit('note.processed', { noteId, userId: note.userId });
    } catch (err) {
      this.logger.error('File processing error', err);
      const failed = await this.prisma.note.update({ where: { id: noteId }, data: { processingStatus: 'FAILED' }, select: { userId: true } });
      this.eventEmitter.emit('note.failed', { noteId, userId: failed.userId });
    }
  }

  // Lightweight upload for community post/reply attachments — no Note record, no AI processing
  async uploadAttachment(userId: string, file: Express.Multer.File): Promise<{ url: string; type: 'FILE' | 'IMAGE' | 'VOICE' }> {
    const key = `attachments/${userId}/${uuidv4()}-${file.originalname}`;
    let url = '';
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      url = `${this.publicUrl}/${key}`;
    } catch (err) {
      this.logger.warn('R2 attachment upload failed', err);
      url = `/uploads/${file.originalname}`;
    }
    const type = this.detectFileType(file.mimetype, file.originalname) as 'FILE' | 'IMAGE' | 'VOICE';
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
      include: { chunks: true },
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
