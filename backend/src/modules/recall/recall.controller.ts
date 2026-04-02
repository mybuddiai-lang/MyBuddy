import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecallService } from './recall.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Recall')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recall')
export class RecallController {
  constructor(private recallService: RecallService) {}

  @Get('due-cards')
  getDueCards(@CurrentUser('id') userId: string) {
    return this.recallService.getDueCards(userId);
  }

  @Post('session/start')
  startSession(@CurrentUser('id') userId: string) {
    return this.recallService.startSession(userId);
  }

  @Post('session/:id/answer')
  submitAnswer(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { cardId: string; result: string; difficultyRating?: number },
  ) {
    return this.recallService.submitAnswer(sessionId, userId, body.cardId, body.result, body.difficultyRating || 3);
  }

  @Post('session/:id/complete')
  completeSession(@Param('id') sessionId: string, @CurrentUser('id') userId: string) {
    return this.recallService.completeSession(sessionId, userId);
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: string) {
    return this.recallService.getStats(userId);
  }
}
