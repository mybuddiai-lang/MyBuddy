import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushService } from '../notifications/push.service';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private push: PushService,
  ) {}

  private mapCommunity(c: any, myRole?: string | null) {
    return {
      ...c,
      field: c.subjectFilter || 'General',
      myRole: myRole ?? null,
    };
  }

  async findAll(userId: string) {
    // Return all public communities PLUS any private communities the user belongs to
    const communities = await this.prisma.community.findMany({
      where: {
        OR: [
          { isPublic: true },
          { members: { some: { userId } } },
        ],
      },
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
      // memberCount starts at 1 — the creator is immediately added as ADMIN below
      data: { ...data, createdBy: userId, isPublic: data.isPublic ?? true, memberCount: 1 },
    });
    await this.prisma.communityMember.create({
      data: { communityId: community.id, userId, role: 'ADMIN' },
    });
    const result = this.mapCommunity(community, 'ADMIN');
    // Broadcast to everyone EXCEPT the creator. The creator's UI is already
    // handled by the API response (optimistic update). Sending to the creator
    // would cause a duplicate. Other users receive myRole:null because they
    // are not members — they should see it in "Discover", not "My Pods".
    this.gateway.broadcastExcept(`user:${userId}`, 'community:new', this.mapCommunity(community, null));
    return result;
  }

  async findOne(id: string, userId?: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, name: true } } }, take: 10 } },
    });
    if (!community) throw new NotFoundException('Community not found');

    let myRole: string | null = null;
    if (userId) {
      const membership = await this.prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: id, userId } },
        select: { role: true },
      });
      myRole = membership?.role ?? null;
    }

    return this.mapCommunity(community, myRole);
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

    // Notify admins that a new member joined — non-blocking
    this.notifyAdminsOfNewMember(communityId, userId, community.name).catch(() => {});

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

    // Notify the approved user — non-blocking
    this.prisma.community.findUnique({ where: { id: request.communityId }, select: { name: true } })
      .then(comm => {
        if (!comm) return;
        const communityName = comm.name;
        const communityId = request.communityId;
        this.gateway.notifyUser(request.userId, 'community:join_approved', { communityId, communityName });
        this.push.sendToUser(request.userId, {
          title: 'Join request approved!',
          body: `You can now post in ${communityName}`,
          url: `/community/${communityId}`,
          tag: `join-approved-${communityId}`,
        }).catch(() => {});
      }).catch(() => {});

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
    // Verify community exists and the user is a member
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');

    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!membership) throw new ForbiddenException('You must be a member to post in this community');

    const post = await this.prisma.communityPost.create({
      data: { communityId, authorId: userId, content, attachmentUrl, attachmentType: attachmentType as any },
      include: { author: { select: { id: true, name: true } } },
    });
    this.gateway.broadcastToCommunity(communityId, 'community:new_post', post);

    // Push to community members not currently in the WS room — non-blocking
    this.pushNewPostToMembers(communityId, userId, post.author?.name ?? 'Someone', content, community.name).catch(() => {});

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
    this.gateway.broadcastToCommunity(communityId, 'community:delete_post', { postId });
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
    // Verify post exists first so we have the communityId and authorId for notifications
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { communityId: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Verify the user is a member of the community this post belongs to
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId: authorId } },
    });
    if (!membership) throw new ForbiddenException('You must be a member to reply in this community');

    const [reply] = await this.prisma.$transaction([
      this.prisma.communityPostReply.create({
        data: { postId, authorId, content, attachmentUrl, attachmentType: attachmentType as any },
        include: { author: { select: { id: true, name: true } } },
      }),
      this.prisma.communityPost.update({ where: { id: postId }, data: { repliesCount: { increment: 1 } } }),
    ]);

    this.gateway.broadcastToCommunity(post.communityId, 'community:new_reply', { postId, reply });

    // Notify the post author when someone else replies to their post — non-blocking
    if (post.authorId !== authorId) {
      this.notifyPostAuthorOfReply(
        post.communityId, postId, post.authorId,
        (reply as any).author?.name ?? 'Someone', content,
      ).catch(() => {});
    }

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

    this.gateway.broadcastToCommunity(
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

  // ─── Private notification helpers ─────────────────────────────────────────

  private async notifyAdminsOfNewMember(communityId: string, newUserId: string, communityName: string) {
    const [newUser, allMembers] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: newUserId }, select: { name: true } }),
      this.prisma.communityMember.findMany({ where: { communityId }, select: { userId: true, role: true } }),
    ]);
    const memberName = newUser?.name ?? 'Someone';
    const data = { communityId, communityName, userId: newUserId, userName: memberName };

    for (const member of allMembers) {
      if (member.userId === newUserId) continue; // don't notify the person who joined
      // Real-time WS for everyone in the community
      this.gateway.notifyUser(member.userId, 'community:member_joined', data);
      // Push only to admins (avoid notification flood for large communities)
      if (member.role === 'ADMIN') {
        this.push.sendToUser(member.userId, {
          title: communityName,
          body: `${memberName} just joined`,
          url: `/community/${communityId}`,
          tag: `member-joined-${communityId}`,
        }).catch(() => {});
      }
    }
  }

  private async notifyPostAuthorOfReply(
    communityId: string,
    postId: string,
    postAuthorId: string,
    replyerName: string,
    content: string,
  ) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    const communityName = community?.name ?? 'Community';
    const preview = content.length > 80 ? content.slice(0, 77) + '...' : content;

    // Real-time WS (if the author is online)
    this.gateway.notifyUser(postAuthorId, 'community:reply_on_post', {
      communityId,
      postId,
      communityName,
      replyerName,
      content: preview,
    });

    // Push (when app is in background / closed) — URL includes post ID so the
    // community page can scroll directly to the replied-to post on open
    await this.push.sendToUser(postAuthorId, {
      title: `${replyerName} replied to your post`,
      body: preview,
      url: `/community/${communityId}?post=${postId}`,
      tag: `reply-${postId}`,
    });
  }

  private async pushNewPostToMembers(communityId: string, authorId: string, authorName: string, content: string, communityName: string) {
    const members = await this.prisma.communityMember.findMany({
      where: { communityId },
      select: { userId: true },
    });
    const body = content.length > 80 ? content.slice(0, 77) + '...' : content;
    for (const member of members) {
      if (member.userId === authorId) continue;
      this.push.sendToUser(member.userId, {
        title: `${communityName} — new post`,
        body: `${authorName}: ${body}`,
        url: `/community/${communityId}`,
        tag: `community-post-${communityId}`,
      }).catch(() => {});
    }
  }

  private async pushPollToMembers(communityId: string, authorId: string, authorName: string, question: string, communityName: string) {
    const members = await this.prisma.communityMember.findMany({
      where: { communityId },
      select: { userId: true },
    });
    const preview = question.length > 80 ? question.slice(0, 77) + '...' : question;
    for (const member of members) {
      if (member.userId === authorId) continue;
      this.push.sendToUser(member.userId, {
        title: `${communityName} — new poll`,
        body: `${authorName}: ${preview}`,
        url: `/community/${communityId}?tab=polls`,
        tag: `community-poll-${communityId}`,
      }).catch(() => {});
    }
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
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { name: true } });

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
    this.gateway.broadcastToCommunity(communityId, 'community:new_poll', poll);

    // Push notification to all members except the creator — non-blocking
    this.pushPollToMembers(communityId, authorId, (poll as any).author?.name ?? 'Someone', question, community?.name ?? 'Community').catch(() => {});

    return poll;
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.communityPoll.findUnique({
      where: { id: pollId },
      include: { options: { include: { votes: { where: { userId } } } } },
    });
    if (!poll) throw new NotFoundException('Poll not found');

    // Verify the user is a member of the community this poll belongs to
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: poll.communityId, userId } },
    });
    if (!membership) throw new ForbiddenException('You must be a member to vote in this community');

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
    if (updatedPoll) this.gateway.broadcastToCommunity(poll.communityId, 'community:poll_update', updatedPoll);

    return { voted: true, optionId };
  }
}
