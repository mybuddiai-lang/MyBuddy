import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const communities = await this.prisma.community.findMany({
      where: { isPublic: true },
      orderBy: { memberCount: 'desc' },
      take: 50,
    });
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId, communityId: { in: communities.map(c => c.id) } },
      select: { communityId: true, role: true },
    });
    const memberMap = Object.fromEntries(memberships.map(m => [m.communityId, m.role]));
    return communities.map(c => ({ ...c, myRole: memberMap[c.id] ?? null }));
  }

  async findMy(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      include: { community: true },
    });
    return memberships.map(m => ({ ...m.community, myRole: m.role }));
  }

  async create(userId: string, data: { name: string; description?: string; isPublic?: boolean; schoolFilter?: string; subjectFilter?: string }) {
    const community = await this.prisma.community.create({
      data: { ...data, createdBy: userId, isPublic: data.isPublic ?? true },
    });
    await this.prisma.communityMember.create({
      data: { communityId: community.id, userId, role: 'ADMIN' },
    });
    return community;
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, name: true } } }, take: 10 } },
    });
    if (!community) throw new NotFoundException('Community not found');
    return community;
  }

  async join(communityId: string, userId: string) {
    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');
    await this.prisma.$transaction([
      this.prisma.communityMember.create({ data: { communityId, userId } }),
      this.prisma.community.update({ where: { id: communityId }, data: { memberCount: { increment: 1 } } }),
    ]);
    return { message: 'Joined successfully' };
  }

  async leave(communityId: string, userId: string) {
    await this.prisma.communityMember.delete({ where: { communityId_userId: { communityId, userId } } });
    await this.prisma.community.update({ where: { id: communityId }, data: { memberCount: { decrement: 1 } } });
    return { message: 'Left community' };
  }

  async getPosts(communityId: string) {
    return this.prisma.communityPost.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createPost(communityId: string, userId: string, content: string, attachmentUrl?: string) {
    return this.prisma.communityPost.create({
      data: { communityId, authorId: userId, content, attachmentUrl },
      include: { author: { select: { id: true, name: true } } },
    });
  }
}
