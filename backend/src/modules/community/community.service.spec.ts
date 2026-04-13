import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Minimal Prisma mock factory
// ---------------------------------------------------------------------------
function makePrismaMock() {
  return {
    community: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    communityMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    communityPost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    communityPostReply: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    joinRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

const USER_ID = 'user-uuid-1234';
const COMMUNITY_ID = 'comm-uuid-5678';

describe('CommunityService', () => {
  let service: CommunityService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('saves community to DB and returns object with id', async () => {
      const createdCommunity = {
        id: COMMUNITY_ID,
        name: 'MBBS Finals 2026',
        description: 'Study pod for medicine students',
        isPublic: true,
        requiresApproval: false,
        subjectFilter: 'Medicine',
        memberCount: 1,
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.community.create.mockResolvedValue(createdCommunity);
      prisma.communityMember.create.mockResolvedValue({ id: 'member-1', role: 'ADMIN' });

      const result = await service.create(USER_ID, {
        name: 'MBBS Finals 2026',
        description: 'Study pod for medicine students',
        isPublic: true,
        subjectFilter: 'Medicine',
      });

      // Must have an id
      expect(result).toHaveProperty('id', COMMUNITY_ID);
      // field is mapped from subjectFilter
      expect(result).toHaveProperty('field', 'Medicine');
      // Creator is ADMIN
      expect(result).toHaveProperty('myRole', 'ADMIN');
      // Prisma create was called once
      expect(prisma.community.create).toHaveBeenCalledTimes(1);
      // Creator was added as a member
      expect(prisma.communityMember.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID, role: 'ADMIN' }) }),
      );
    });

    it('uses isPublic:true by default when not specified', async () => {
      const communityData = {
        id: COMMUNITY_ID,
        name: 'Test Pod',
        subjectFilter: 'General',
        isPublic: true,
        requiresApproval: false,
        memberCount: 1,
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.community.create.mockResolvedValue(communityData);
      prisma.communityMember.create.mockResolvedValue({});

      await service.create(USER_ID, { name: 'Test Pod', subjectFilter: 'General' });

      expect(prisma.community.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPublic: true }),
        }),
      );
    });

    it('falls back to "General" when subjectFilter is absent', async () => {
      const communityData = {
        id: COMMUNITY_ID, name: 'Test', subjectFilter: null, isPublic: true,
        requiresApproval: false, memberCount: 1, createdBy: USER_ID,
        createdAt: new Date(), updatedAt: new Date(),
      };
      prisma.community.create.mockResolvedValue(communityData);
      prisma.communityMember.create.mockResolvedValue({});

      const result = await service.create(USER_ID, { name: 'Test' });

      expect(result.field).toBe('General');
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns an array of communities with membership info', async () => {
      const communities = [
        { id: 'c1', name: 'Pod A', subjectFilter: 'Law', isPublic: true, memberCount: 5 },
        { id: 'c2', name: 'Pod B', subjectFilter: 'Medicine', isPublic: true, memberCount: 3 },
      ];
      const memberships = [{ communityId: 'c1', role: 'MEMBER' }];

      prisma.community.findMany.mockResolvedValue(communities);
      prisma.communityMember.findMany.mockResolvedValue(memberships);

      const result = await service.findAll(USER_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      // Pod A — user is a member
      const podA = result.find(c => c.id === 'c1');
      expect(podA).toHaveProperty('myRole', 'MEMBER');
      // Pod B — user is not a member
      const podB = result.find(c => c.id === 'c2');
      expect(podB).toHaveProperty('myRole', null);
    });

    it('maps subjectFilter to field', async () => {
      prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Pod', subjectFilter: 'Engineering', isPublic: true, memberCount: 1 },
      ]);
      prisma.communityMember.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_ID);

      expect(result[0]).toHaveProperty('field', 'Engineering');
    });

    it('returns empty array when user has no communities', async () => {
      prisma.community.findMany.mockResolvedValue([]);
      prisma.communityMember.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── join ──────────────────────────────────────────────────────────────────
  describe('join', () => {
    it('throws NotFoundException when community does not exist', async () => {
      prisma.community.findUnique.mockResolvedValue(null);

      await expect(service.join(COMMUNITY_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when user is already a member', async () => {
      prisma.community.findUnique.mockResolvedValue({
        id: COMMUNITY_ID, requiresApproval: false,
      });
      prisma.communityMember.findUnique.mockResolvedValue({
        communityId: COMMUNITY_ID, userId: USER_ID, role: 'MEMBER',
      });

      await expect(service.join(COMMUNITY_ID, USER_ID)).rejects.toThrow(ConflictException);
    });

    it('adds member via transaction for public communities', async () => {
      prisma.community.findUnique.mockResolvedValue({
        id: COMMUNITY_ID, requiresApproval: false,
      });
      prisma.communityMember.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.join(COMMUNITY_ID, USER_ID);

      expect(result).toHaveProperty('message', 'Joined successfully');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createPost ────────────────────────────────────────────────────────────
  describe('createPost', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: COMMUNITY_ID });
      prisma.communityMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createPost(COMMUNITY_ID, USER_ID, 'Hello world'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a post when user is a member', async () => {
      const post = {
        id: 'post-1',
        communityId: COMMUNITY_ID,
        authorId: USER_ID,
        content: 'Hello world',
        likesCount: 0,
        commentsCount: 0,
        repliesCount: 0,
        createdAt: new Date(),
        author: { id: USER_ID, name: 'Alice' },
      };

      prisma.community.findUnique.mockResolvedValue({ id: COMMUNITY_ID });
      prisma.communityMember.findUnique.mockResolvedValue({
        communityId: COMMUNITY_ID, userId: USER_ID, role: 'MEMBER',
      });
      prisma.communityPost.create.mockResolvedValue(post);

      const result = await service.createPost(COMMUNITY_ID, USER_ID, 'Hello world');

      expect(result).toHaveProperty('id', 'post-1');
      expect(result).toHaveProperty('content', 'Hello world');
    });
  });
});
