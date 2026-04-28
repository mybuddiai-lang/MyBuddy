import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';

@Controller('timetable')
@UseGuards(JwtAuthGuard)
export class TimetableController {
  constructor(private timetableService: TimetableService) {}

  @Post('generate')
  generate(@CurrentUser('id') userId: string, @Body() dto: CreateTimetableDto) {
    return this.timetableService.generate(userId, dto);
  }

  @Get('active')
  getActive(@CurrentUser('id') userId: string) {
    return this.timetableService.getActive(userId);
  }

  @Get(':id')
  getById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.timetableService.getById(id, userId);
  }

  @Post('days/:dayId/complete')
  markDayComplete(@CurrentUser('id') userId: string, @Param('dayId') dayId: string) {
    return this.timetableService.markDayComplete(dayId, userId);
  }

  @Post(':id/regenerate')
  regenerate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() overrides: Partial<CreateTimetableDto>,
  ) {
    return this.timetableService.regenerate(id, userId, overrides);
  }

  @Delete(':id')
  archive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.timetableService.archive(id, userId);
  }
}
