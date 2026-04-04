import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.communityService.findAll(userId);
  }

  @Get('my')
  getMy(@CurrentUser('id') userId: string) {
    return this.communityService.findMy(userId);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; description?: string; field?: string; isPrivate?: boolean; requiresApproval?: boolean },
  ) {
    return this.communityService.create(userId, {
      name: body.name,
      description: body.description,
      isPublic: !body.isPrivate,
      requiresApproval: body.requiresApproval,
      subjectFilter: body.field,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @Post(':id/join')
  join(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.join(communityId, userId);
  }

  @Delete(':id/leave')
  leave(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.leave(communityId, userId);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a community' })
  getMembers(@Param('id') communityId: string) {
    return this.communityService.getMembers(communityId);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Assign role to a member (admin only)' })
  assignRole(
    @Param('id') communityId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requestingUserId: string,
    @Body('role') role: 'MEMBER' | 'MODERATOR' | 'ADMIN',
  ) {
    return this.communityService.assignRole(communityId, targetUserId, requestingUserId, role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a community (admin only)' })
  removeMember(
    @Param('id') communityId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.communityService.removeMember(communityId, targetUserId, requestingUserId);
  }

  // ─── Join Requests ────────────────────────────────────────────────────────

  @Get(':id/join-requests')
  @ApiOperation({ summary: 'Get pending join requests (admin only)' })
  getJoinRequests(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.getJoinRequests(communityId, userId);
  }

  @Post(':id/join-requests/:requestId/approve')
  @ApiOperation({ summary: 'Approve a join request (admin only)' })
  approveJoinRequest(@Param('requestId') requestId: string, @CurrentUser('id') userId: string) {
    return this.communityService.approveJoinRequest(requestId, userId);
  }

  @Post(':id/join-requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a join request (admin only)' })
  rejectJoinRequest(@Param('requestId') requestId: string, @CurrentUser('id') userId: string) {
    return this.communityService.rejectJoinRequest(requestId, userId);
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  @Get(':id/posts')
  getPosts(@Param('id') communityId: string) {
    return this.communityService.getPosts(communityId);
  }

  @Post(':id/posts')
  createPost(
    @Param('id') communityId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; attachmentUrl?: string; attachmentType?: string },
  ) {
    return this.communityService.createPost(communityId, userId, body.content, body.attachmentUrl, body.attachmentType);
  }

  @Post(':communityId/posts/:postId/like')
  @ApiOperation({ summary: 'Like a community post' })
  likePost(@Param('postId') postId: string, @CurrentUser('id') userId: string) {
    return this.communityService.likePost(postId, userId);
  }

  @Delete(':communityId/posts/:postId/like')
  @ApiOperation({ summary: 'Unlike a community post' })
  unlikePost(@Param('postId') postId: string, @CurrentUser('id') userId: string) {
    return this.communityService.unlikePost(postId, userId);
  }

  @Get(':communityId/posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments on a post' })
  getComments(@Param('postId') postId: string) {
    return this.communityService.getComments(postId);
  }

  @Post(':communityId/posts/:postId/comments')
  @ApiOperation({ summary: 'Comment on a post' })
  createComment(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.communityService.createComment(postId, userId, content);
  }

  @Delete(':communityId/posts/:postId/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  deleteComment(@Param('commentId') commentId: string, @CurrentUser('id') userId: string) {
    return this.communityService.deleteComment(commentId, userId);
  }

  // ─── Replies ──────────────────────────────────────────────────────────────

  @Get(':communityId/posts/:postId/replies')
  @ApiOperation({ summary: 'Get replies for a post' })
  getReplies(@Param('postId') postId: string) {
    return this.communityService.getReplies(postId);
  }

  @Post(':communityId/posts/:postId/replies')
  @ApiOperation({ summary: 'Reply to a post (supports file/image/voice attachments)' })
  createReply(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; attachmentUrl?: string; attachmentType?: string },
  ) {
    return this.communityService.createReply(postId, userId, body.content, body.attachmentUrl, body.attachmentType);
  }

  @Delete(':communityId/posts/:postId/replies/:replyId')
  @ApiOperation({ summary: 'Delete a reply' })
  deleteReply(@Param('replyId') replyId: string, @CurrentUser('id') userId: string) {
    return this.communityService.deleteReply(replyId, userId);
  }

  // ─── Polls ────────────────────────────────────────────────────────────────

  @Get(':id/polls')
  @ApiOperation({ summary: 'Get polls in a community' })
  getPolls(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.getPolls(communityId, userId);
  }

  @Post(':id/polls')
  @ApiOperation({ summary: 'Create a poll in a community' })
  createPoll(
    @Param('id') communityId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { question: string; options: string[]; endsAt?: string },
  ) {
    return this.communityService.createPoll(
      communityId,
      userId,
      body.question,
      body.options,
      body.endsAt ? new Date(body.endsAt) : undefined,
    );
  }

  @Post(':communityId/polls/:pollId/vote')
  @ApiOperation({ summary: 'Vote on a poll option' })
  votePoll(
    @Param('pollId') pollId: string,
    @CurrentUser('id') userId: string,
    @Body('optionId') optionId: string,
  ) {
    return this.communityService.votePoll(pollId, optionId, userId);
  }
}
