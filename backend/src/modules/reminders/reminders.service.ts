import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

// Reminders older than this at processing time are silently marked SENT
// without firing a notification — they're too stale to be useful.
// Must be >= cron interval (1 min) with generous buffer for Railway restarts.
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

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

  // Runs every minute for near-exact delivery timing.
  // Stale reminders (older than STALE_THRESHOLD_MS) are silently expired so a
  // Railway restart / deployment gap never floods users with old notifications.
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_THRESHOLD_MS);

    // ── Step 1: expire stale reminders silently ──────────────────────────────
    // Any PENDING reminder whose scheduledFor is older than STALE_THRESHOLD_MS
    // is too late to be useful — mark SENT without firing a notification.
    const { count: staleCount } = await this.prisma.reminder.updateMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lt: cutoff },
      },
      data: { status: 'SENT' },
    });
    if (staleCount > 0) {
      this.logger.warn(`Expired ${staleCount} stale reminder(s) without notification`);
    }

    // ── Step 2: find reminders due in the recent window ──────────────────────
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { gte: cutoff, lte: now },
      },
      orderBy: { scheduledFor: 'asc' }, // oldest first
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (dueReminders.length === 0) return;

    // ── Step 3: mark all as SENT atomically before emitting ──────────────────
    // updateMany prevents duplicate delivery if a concurrent cron tick fires
    // (shouldn't happen with EVERY_MINUTE on Railway single-instance, but safe).
    await this.prisma.reminder.updateMany({
      where: { id: { in: dueReminders.map(r => r.id) } },
      data: { status: 'SENT' },
    });

    // ── Step 4: fire WebSocket + push notification for each ──────────────────
    for (const reminder of dueReminders) {
      this.eventEmitter.emit('reminder.due', { reminder, user: reminder.user });
    }

    this.logger.log(`Dispatched ${dueReminders.length} reminder notification(s)`);
  }
}
