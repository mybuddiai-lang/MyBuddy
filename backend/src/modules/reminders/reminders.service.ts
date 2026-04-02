import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
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
      data: { ...data, scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined },
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
    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
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
