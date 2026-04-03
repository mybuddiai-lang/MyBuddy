import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
  create(@CurrentUser('id') userId: string, @Body() body: { name: string; description?: string; field?: string; isPrivate?: boolean }) {
    return this.communityService.create(userId, {
      name: body.name,
      description: body.description,
      isPublic: !body.isPrivate,
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

  @Get(':id/posts')
  getPosts(@Param('id') communityId: string) {
    return this.communityService.getPosts(communityId);
  }

  @Post(':id/posts')
  createPost(
    @Param('id') communityId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; attachmentUrl?: string },
  ) {
    return this.communityService.createPost(communityId, userId, body.content, body.attachmentUrl);
  }

  @Post(':communityId/posts/:postId/like')
  @ApiOperation({ summary: 'Like a community post' })
  likePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.communityService.likePost(postId, userId);
  }

  @Delete(':communityId/posts/:postId/like')
  @ApiOperation({ summary: 'Unlike a community post' })
  unlikePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
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
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.communityService.deleteComment(commentId, userId);
  }
}
