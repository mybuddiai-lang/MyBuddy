import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private analyticsService: AnalyticsService,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        scheduledFor: new Date(dto.scheduledFor),
        noteId: dto.noteId,
        type: (dto.type as any) || 'RECALL',
        difficultyLevel: dto.difficultyLevel || 1,
      },
    });
  }

  async findAll(userId: string, status?: string) {
    return this.prisma.reminder.findMany({
      where: { userId, ...(status ? { status: status as any } : {}) },
      orderBy: { scheduledFor: 'asc' },
      include: { note: { select: { id: true, title: true } } },
    });
  }

  async update(id: string, userId: string, data: Partial<CreateReminderDto>) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.scheduledFor !== undefined && { scheduledFor: new Date(data.scheduledFor) }),
        ...(data.difficultyLevel !== undefined && { difficultyLevel: data.difficultyLevel }),
        ...(data.type !== undefined && { type: data.type as any }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    await this.prisma.reminder.delete({ where: { id } });
    return { message: 'Reminder deleted' };
  }

  async complete(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    const result = await this.prisma.reminder.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    // Recalculate resilience score after completing a study activity
    this.analyticsService.recalculateForUser(userId).catch(() => {});
    return result;
  }

  async snooze(id: string, userId: string, hours: number) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    return this.prisma.reminder.update({
      where: { id },
      data: {
        snoozedUntil,
        snoozeCount: { increment: 1 },
        scheduledFor: snoozedUntil,
        status: 'PENDING',
      },
    });
  }

  async skip(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');

    // If recurring, auto-schedule next occurrence
    if (reminder.repeatType && reminder.repeatType !== 'NONE' && reminder.repeatInterval) {
      const next = this.nextOccurrence(reminder.scheduledFor, reminder.repeatType, reminder.repeatInterval);
      await this.prisma.reminder.create({
        data: {
          userId,
          noteId: reminder.noteId,
          title: reminder.title,
          description: reminder.description,
          scheduledFor: next,
          difficultyLevel: reminder.difficultyLevel,
          type: reminder.type,
          repeatType: reminder.repeatType,
          repeatInterval: reminder.repeatInterval,
        },
      });
    }

    return this.prisma.reminder.update({ where: { id }, data: { status: 'SKIPPED' } });
  }

  private nextOccurrence(from: Date, repeatType: string, interval: number): Date {
    const d = new Date(from);
    switch (repeatType) {
      case 'DAILY': d.setDate(d.getDate() + interval); break;
      case 'WEEKLY': d.setDate(d.getDate() + interval * 7); break;
      case 'MONTHLY': d.setMonth(d.getMonth() + interval); break;
    }
    return d;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDueReminders() {
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
      },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const reminder of dueReminders) {
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT' },
      });
      this.eventEmitter.emit('reminder.due', { reminder, user: reminder.user });
    }
  }
}
