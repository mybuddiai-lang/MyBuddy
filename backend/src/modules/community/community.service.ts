import { Injectable, NotFoundException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    @Optional() private gateway?: NotificationsGateway,
  ) {}

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

  async create(userId: string, data: { name: string; description?: string; isPublic?: boolean; requiresApproval?: boolean; schoolFilter?: string; subjectFilter?: string }) {
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
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');

    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');

    if (community.requiresApproval) {
      const existingRequest = await this.prisma.joinRequest.findUnique({
        where: { communityId_userId: { communityId, userId } },
      });
      if (existingRequest) {
        if (existingRequest.status === 'PENDING') throw new ConflictException('Join request already pending');
        await this.prisma.joinRequest.update({
          where: { communityId_userId: { communityId, userId } },
          data: { status: 'PENDING' },
        });
      } else {
        await this.prisma.joinRequest.create({ data: { communityId, userId } });
      }
      return { pending: true, message: 'Join request sent — waiting for admin approval' };
    }

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

  async getMembers(communityId: string) {
    return this.prisma.communityMember.findMany({
      where: { communityId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async assignRole(communityId: string, targetUserId: string, requestingUserId: string, role: 'MEMBER' | 'MODERATOR' | 'ADMIN') {
    const requester = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: requestingUserId } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new ForbiddenException('Only admins can assign roles');

    const target = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    return this.prisma.communityMember.update({
      where: { communityId_userId: { communityId, userId: targetUserId } },
      data: { role },
    });
  }

  async removeMember(communityId: string, targetUserId: string, requestingUserId: string) {
    const requester = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: requestingUserId } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new ForbiddenException('Only admins can remove members');

    const target = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    await this.prisma.$transaction([
      this.prisma.communityMember.delete({ where: { communityId_userId: { communityId, userId: targetUserId } } }),
      this.prisma.community.update({ where: { id: communityId }, data: { memberCount: { decrement: 1 } } }),
    ]);
    return { removed: true };
  }

  // ─── Join Requests ────────────────────────────────────────────────────────

  async getJoinRequests(communityId: string, requestingUserId: string) {
    const requester = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: requestingUserId } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new ForbiddenException('Only admins can view join requests');

    return this.prisma.joinRequest.findMany({
      where: { communityId, status: 'PENDING' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveJoinRequest(requestId: string, requestingUserId: string) {
    const request = await this.prisma.joinRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Join request not found');

    const requester = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: request.communityId, userId: requestingUserId } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new ForbiddenException('Only admins can approve requests');

    await this.prisma.$transaction([
      this.prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } }),
      this.prisma.communityMember.create({ data: { communityId: request.communityId, userId: request.userId } }),
      this.prisma.community.update({ where: { id: request.communityId }, data: { memberCount: { increment: 1 } } }),
    ]);
    return { approved: true };
  }

  async rejectJoinRequest(requestId: string, requestingUserId: string) {
    const request = await this.prisma.joinRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Join request not found');

    const requester = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: request.communityId, userId: requestingUserId } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new ForbiddenException('Only admins can reject requests');

    await this.prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    return { rejected: true };
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  async getPosts(communityId: string) {
    return this.prisma.communityPost.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createPost(communityId: string, userId: string, content: string, attachmentUrl?: string, attachmentType?: string) {
    const post = await this.prisma.communityPost.create({
      data: { communityId, authorId: userId, content, attachmentUrl, attachmentType: attachmentType as any },
      include: { author: { select: { id: true, name: true } } },
    });
    this.gateway?.broadcastToCommunity(communityId, 'community:new_post', post);
    return post;
  }

  async deletePost(communityId: string, postId: string, userId: string) {
    const [post, membership, user] = await Promise.all([
      this.prisma.communityPost.findFirst({ where: { id: postId, communityId } }),
      this.prisma.communityMember.findFirst({ where: { communityId, userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);

    if (!post) throw new NotFoundException('Post not found');

    const canDelete =
      post.authorId === userId ||
      user?.role === 'ADMIN' ||
      membership?.role === 'ADMIN' ||
      membership?.role === 'MODERATOR';

    if (!canDelete) throw new ForbiddenException('Not authorized to delete this post');

    await this.prisma.communityPost.delete({ where: { id: postId } });
    this.gateway?.broadcastToCommunity(communityId, 'community:delete_post', { postId });
    return { deleted: true };
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

  // ─── Replies ──────────────────────────────────────────────────────────────

  async getReplies(postId: string) {
    return this.prisma.communityPostReply.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createReply(postId: string, authorId: string, content: string, attachmentUrl?: string, attachmentType?: string) {
    const [reply] = await this.prisma.$transaction([
      this.prisma.communityPostReply.create({
        data: { postId, authorId, content, attachmentUrl, attachmentType: attachmentType as any },
        include: { author: { select: { id: true, name: true } } },
      }),
      this.prisma.communityPost.update({ where: { id: postId }, data: { repliesCount: { increment: 1 } } }),
    ]);

    // Get communityId to broadcast
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId }, select: { communityId: true } });
    if (post) this.gateway?.broadcastToCommunity(post.communityId, 'community:new_reply', { postId, reply });

    return reply;
  }

  async deleteReply(replyId: string, userId: string) {
    const reply = await this.prisma.communityPostReply.findUnique({
      where: { id: replyId },
      include: {
        post: {
          include: {
            community: { include: { members: { where: { userId }, select: { role: true } } } },
          },
        },
      },
    });
    if (!reply) throw new NotFoundException('Reply not found');

    const membership = reply.post.community.members[0];
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const canDelete =
      reply.authorId === userId ||
      user?.role === 'ADMIN' ||
      membership?.role === 'ADMIN' ||
      membership?.role === 'MODERATOR';

    if (!canDelete) throw new ForbiddenException('Not authorized to delete this reply');

    await this.prisma.$transaction([
      this.prisma.communityPostReply.delete({ where: { id: replyId } }),
      this.prisma.communityPost.update({ where: { id: reply.postId }, data: { repliesCount: { decrement: 1 } } }),
    ]);

    this.gateway?.broadcastToCommunity(
      reply.post.communityId,
      'community:delete_reply',
      { postId: reply.postId, replyId },
    );
    return { deleted: true };
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

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

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.communityPostComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            community: { include: { members: { where: { userId }, select: { role: true } } } },
          },
        },
      },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const membership = comment.post.community.members[0];
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const canDelete =
      comment.authorId === userId ||
      user?.role === 'ADMIN' ||
      membership?.role === 'ADMIN' ||
      membership?.role === 'MODERATOR';

    if (!canDelete) throw new ForbiddenException('Not authorized to delete this comment');

    await this.prisma.$transaction([
      this.prisma.communityPostComment.delete({ where: { id: commentId } }),
      this.prisma.communityPost.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } }),
    ]);
    return { deleted: true };
  }

  // ─── Polls ────────────────────────────────────────────────────────────────

  async getPolls(communityId: string, userId: string) {
    const polls = await this.prisma.communityPoll.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        options: {
          include: { votes: { where: { userId }, select: { id: true } } },
        },
      },
    });

    return polls.map(poll => ({
      ...poll,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votesCount: opt.votesCount,
        votedByMe: opt.votes.length > 0,
      })),
      myVotedOptionId: poll.options.find(o => o.votes.length > 0)?.id ?? null,
    }));
  }

  async createPoll(communityId: string, authorId: string, question: string, options: string[], endsAt?: Date) {
    const poll = await this.prisma.communityPoll.create({
      data: {
        communityId,
        authorId,
        question,
        endsAt,
        options: { create: options.map(text => ({ text })) },
      },
      include: {
        author: { select: { id: true, name: true } },
        options: true,
      },
    });
    this.gateway?.broadcastToCommunity(communityId, 'community:new_poll', poll);
    return poll;
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.communityPoll.findUnique({
      where: { id: pollId },
      include: { options: { include: { votes: { where: { userId } } } } },
    });
    if (!poll) throw new NotFoundException('Poll not found');

    const alreadyVoted = poll.options.some(o => o.votes.length > 0);
    if (alreadyVoted) throw new ConflictException('Already voted in this poll');

    const option = poll.options.find(o => o.id === optionId);
    if (!option) throw new NotFoundException('Option not found');

    await this.prisma.$transaction([
      this.prisma.communityPollVote.create({ data: { optionId, userId } }),
      this.prisma.communityPollOption.update({ where: { id: optionId }, data: { votesCount: { increment: 1 } } }),
    ]);

    // Broadcast updated poll to community room
    const updatedPoll = await this.getPolls(poll.communityId, userId).then(polls => polls.find(p => p.id === pollId));
    if (updatedPoll) this.gateway?.broadcastToCommunity(poll.communityId, 'community:poll_update', updatedPoll);

    return { voted: true, optionId };
  }
}
