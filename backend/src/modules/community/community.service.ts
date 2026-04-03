import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  private mapCommunity(c: any, myRole?: string | null) {
    return {
      ...c,
      field: c.subjectFilter || 'General',
      myRole: myRole ?? null,
    };
  }

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
    return communities.map(c => this.mapCommunity(c, memberMap[c.id]));
  }

  async findMy(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      include: { community: true },
    });
    return memberships.map(m => this.mapCommunity(m.community, m.role));
  }

  async create(userId: string, data: { name: string; description?: string; isPublic?: boolean; schoolFilter?: string; subjectFilter?: string }) {
    const community = await this.prisma.community.create({
      data: { ...data, createdBy: userId, isPublic: data.isPublic ?? true },
    });
    await this.prisma.communityMember.create({
      data: { communityId: community.id, userId, role: 'ADMIN' },
    });
    return this.mapCommunity(community, 'ADMIN');
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, name: true } } }, take: 10 } },
    });
    if (!community) throw new NotFoundException('Community not found');
    return this.mapCommunity(community);
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

  async likePost(postId: string, userId: string) {
    const existing = await this.prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) return { liked: true, message: 'Already liked' };

    await this.prisma.$transaction([
      this.prisma.communityPostLike.create({ data: { postId, userId } }),
      this.prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }

  async unlikePost(postId: string, userId: string) {
    const existing = await this.prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) return { liked: false, message: 'Not liked' };

    await this.prisma.$transaction([
      this.prisma.communityPostLike.delete({ where: { postId_userId: { postId, userId } } }),
      this.prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
    ]);
    return { liked: false };
  }

  async getComments(postId: string) {
    return this.prisma.communityPostComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
      },
    });
  }

  async createComment(postId: string, authorId: string, content: string) {
    const [comment] = await this.prisma.$transaction([
      this.prisma.communityPostComment.create({
        data: { postId, authorId, content },
        include: { author: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } } },
      }),
      this.prisma.communityPost.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } }),
    ]);
    return comment;
  }

  async deleteComment(commentId: string, authorId: string) {
    const comment = await this.prisma.communityPostComment.findFirst({
      where: { id: commentId, authorId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.$transaction([
      this.prisma.communityPostComment.delete({ where: { id: commentId } }),
      this.prisma.communityPost.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } }),
    ]);
    return { deleted: true };
  }
}
