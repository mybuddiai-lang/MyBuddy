import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query('status') status?: string) {
    return this.remindersService.findAll(userId, status);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<CreateReminderDto>) {
    return this.remindersService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.remindersService.remove(id, userId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.remindersService.complete(id, userId);
  }

  @Post(':id/snooze')
  @ApiOperation({ summary: 'Snooze a reminder for N hours' })
  snooze(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('hours') hours: number,
  ) {
    return this.remindersService.snooze(id, userId, hours ?? 1);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip a reminder (auto-schedules next if recurring)' })
  skip(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.remindersService.skip(id, userId);
  }
}
