import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExamService } from './exam.service';
import { CreateExamDto, SubmitAnswerDto } from './dto/create-exam.dto';

@Controller('exam')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private examService: ExamService) {}

  @Post('generate')
  generate(@CurrentUser('id') userId: string, @Body() dto: CreateExamDto) {
    return this.examService.generate(userId, dto);
  }

  @Get('sessions')
  getSessions(@CurrentUser('id') userId: string) {
    return this.examService.getSessions(userId);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.examService.getSession(id, userId);
  }

  @Post('sessions/:id/answer')
  submitAnswer(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.examService.submitAnswer(sessionId, userId, dto);
  }

  @Post('sessions/:id/submit')
  gradeAndComplete(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.examService.gradeAndComplete(sessionId, userId);
  }

  @Get('sessions/:id/results')
  getResults(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.examService.getResults(sessionId, userId);
  }

  @Delete('sessions/:id')
  abandon(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.examService.abandon(sessionId, userId);
  }
}
