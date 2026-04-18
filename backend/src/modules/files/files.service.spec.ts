import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilesService } from './files.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyticsService } from '../analytics/analytics.service';

// pdf-parse spawns a PDF.js Web Worker that outlives the Jest process.
// Mock it to return predictable parsed output and avoid the teardown error.
jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({ text: 'mocked pdf text content for unit tests', numpages: 5 }),
);

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

function makePrismaMock() {
  return {
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    noteChunk: {
      create: jest.fn(),
    },
    reminder: {
      create: jest.fn(),
    },
  };
}

const USER_ID = 'user-uuid-1234';

describe('FilesService', () => {
  let service: FilesService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let aiService: Partial<AiService>;
  let analyticsService: Partial<AnalyticsService>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    aiService = {
      summarizeContent: jest.fn().mockResolvedValue(
        JSON.stringify({
          overview: 'Test overview',
          topics: ['Topic A'],
          takeaways: ['Takeaway 1'],
        }),
      ),
      extractHighYieldFacts: jest.fn().mockResolvedValue([
        { question: 'What is X?', answer: 'X is Y.' },
      ]),
      extractKeyTerms: jest.fn().mockResolvedValue([
        { term: 'X', definition: 'A concept.' },
      ]),
    };

    analyticsService = {
      track: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def: string) => def,
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all notes for the user ordered by createdAt desc', async () => {
      const notes = [
        { id: 'n1', title: 'Note 1', fileType: 'PDF', processingStatus: 'DONE', masteryLevel: 2, createdAt: new Date() },
        { id: 'n2', title: 'Note 2', fileType: 'IMAGE', processingStatus: 'PENDING', masteryLevel: 0, createdAt: new Date() },
      ];
      prisma.note.findMany.mockResolvedValue(notes);

      const result = await service.findAll(USER_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns empty array when user has no notes', async () => {
      prisma.note.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('throws NotFoundException when note does not exist', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      const { NotFoundException } = await import('@nestjs/common');
      await expect(service.findOne('non-existent-id', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns note with chunks when found', async () => {
      const note = {
        id: 'note-1',
        userId: USER_ID,
        title: 'Lecture Notes',
        fileType: 'PDF',
        processingStatus: 'DONE',
        masteryLevel: 3,
        chunks: [
          { id: 'c1', content: 'Q: What is X?\nA: X is Y.', chunkIndex: 0 },
        ],
      };
      prisma.note.findFirst.mockResolvedValue(note);

      const result = await service.findOne('note-1', USER_ID);

      expect(result).toHaveProperty('id', 'note-1');
      expect(result).toHaveProperty('chunks');
      expect((result as any).chunks).toHaveLength(1);
    });
  });
});
