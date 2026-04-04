import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Global resilience score leaderboard (top 50)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getResilienceLeaderboard(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getResilienceLeaderboard(userId, limit ? +limit : 50);
  }

  @Get('streaks')
  @ApiOperation({ summary: 'Global study streak leaderboard (top 50)' })
  getStreakLeaderboard(@CurrentUser('id') userId: string) {
    return this.leaderboardService.getStreakLeaderboard(userId);
  }

  @Get('recall')
  @ApiOperation({ summary: 'Global recall accuracy leaderboard (last 30 days, min 5 cards)' })
  getRecallLeaderboard(@CurrentUser('id') userId: string) {
    return this.leaderboardService.getRecallLeaderboard(userId);
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Community-specific resilience leaderboard' })
  getCommunityLeaderboard(
    @Param('communityId') communityId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leaderboardService.getCommunityLeaderboard(communityId, userId);
  }
}
