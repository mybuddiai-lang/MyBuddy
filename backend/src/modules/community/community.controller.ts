import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get('pods')
  findAll(@CurrentUser('id') userId: string) {
    return this.communityService.findAll(userId);
  }

  @Post('pods')
  create(@CurrentUser('id') userId: string, @Body() body: { name: string; description?: string; isPublic?: boolean }) {
    return this.communityService.create(userId, body);
  }

  @Get('pods/:id')
  findOne(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @Post('pods/:id/join')
  join(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.join(communityId, userId);
  }

  @Post('pods/:id/leave')
  leave(@Param('id') communityId: string, @CurrentUser('id') userId: string) {
    return this.communityService.leave(communityId, userId);
  }

  @Get('pods/:id/posts')
  getPosts(@Param('id') communityId: string) {
    return this.communityService.getPosts(communityId);
  }

  @Post('pods/:id/posts')
  createPost(@Param('id') communityId: string, @CurrentUser('id') userId: string, @Body() body: { content: string; attachmentUrl?: string }) {
    return this.communityService.createPost(communityId, userId, body.content, body.attachmentUrl);
  }
}
