import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { buildSchedule } from './timetable.algorithm';

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private prisma: PrismaService,
    private remindersService: RemindersService,
  ) {}

  async generate(userId: string, dto: CreateTimetableDto) {
    // Resolve exam date: dto → user.examDate
    let examDate: Date | null = dto.examDate ? new Date(dto.examDate) : null;
    if (!examDate) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { examDate: true } });
      if (user?.examDate) examDate = new Date(user.examDate);
    }
    if (!examDate || examDate <= new Date()) {
      throw new BadRequestException('A valid future exam date is required. Set it in your profile or pass examDate.');
    }

    // Fetch notes
    const notes = await this.prisma.note.findMany({
      where: { id: { in: dto.noteIds }, userId, processingStatus: 'DONE' },
      select: { id: true, title: true, masteryLevel: true },
    });
    if (notes.length === 0) {
      throw new BadRequestException('No processed notes found. Please wait for your notes to finish processing.');
    }

    // Build schedule
    let dayPlans: ReturnType<typeof buildSchedule>;
    try {
      dayPlans = buildSchedule(
        notes.map(n => ({ noteId: n.id, noteTitle: n.title, masteryLevel: n.masteryLevel })),
        examDate,
        dto.hoursPerDay,
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    const reminderTime = dto.reminderTime || '08:00';
    const [rHour, rMin] = reminderTime.split(':').map(Number);

    // Archive existing active timetable
    const existing = await this.prisma.studyTimetable.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { days: { select: { reminderId: true } } },
    });
    if (existing) {
      const reminderIds = existing.days.map(d => d.reminderId).filter(Boolean) as string[];
      if (reminderIds.length > 0) {
        await this.prisma.reminder.deleteMany({
          where: { id: { in: reminderIds }, status: 'PENDING' },
        });
      }
      await this.prisma.studyTimetable.update({
        where: { id: existing.id },
        data: { status: 'ARCHIVED' },
      });
    }

    const title = dto.title || `Study Plan — ${examDate.toLocaleDateString()}`;

    // Create timetable + days + slots in one transaction
    const timetable = await this.prisma.$transaction(async (tx) => {
      const t = await tx.studyTimetable.create({
        data: {
          userId,
          title,
          examDate,
          hoursPerDay: dto.hoursPerDay,
          noteIds: dto.noteIds,
        },
      });

      for (const day of dayPlans) {
        // Schedule reminder for this day at reminderTime
        const reminderDate = new Date(day.date);
        reminderDate.setHours(rHour, rMin, 0, 0);
        const isPast = reminderDate <= new Date();

        let reminderId: string | null = null;
        if (!isPast) {
          try {
            const reminder = await this.remindersService.create(userId, {
              title: `📅 Study day ${day.dayNumber}: ${day.slots.map(s => s.noteTitle).join(', ')}`,
              scheduledFor: reminderDate.toISOString(),
              type: 'STUDY' as any,
            });
            reminderId = reminder.id;
          } catch (err) {
            this.logger.warn(`Failed to create reminder for timetable day ${day.dayNumber}`, err);
          }
        }

        const d = await tx.timetableDay.create({
          data: {
            timetableId: t.id,
            dayNumber: day.dayNumber,
            date: day.date,
            reminderId,
          },
        });

        await tx.timetableDaySlot.createMany({
          data: day.slots.map(s => ({
            dayId: d.id,
            noteId: s.noteId,
            noteTitle: s.noteTitle,
            minutes: s.minutes,
            order: s.order,
          })),
        });
      }

      return tx.studyTimetable.findUnique({
        where: { id: t.id },
        include: { days: { include: { slots: { orderBy: { order: 'asc' } } }, orderBy: { dayNumber: 'asc' } } },
      });
    });

    return timetable;
  }

  async getActive(userId: string) {
    return this.prisma.studyTimetable.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { days: { include: { slots: { orderBy: { order: 'asc' } } }, orderBy: { dayNumber: 'asc' } } },
    });
  }

  async getById(id: string, userId: string) {
    const t = await this.prisma.studyTimetable.findFirst({
      where: { id, userId },
      include: { days: { include: { slots: { orderBy: { order: 'asc' } } }, orderBy: { dayNumber: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Timetable not found');
    return t;
  }

  async markDayComplete(dayId: string, userId: string) {
    // Verify ownership
    const day = await this.prisma.timetableDay.findFirst({
      where: { id: dayId, timetable: { userId } },
    });
    if (!day) throw new NotFoundException('Day not found');

    const updated = await this.prisma.timetableDay.update({
      where: { id: dayId },
      data: { isCompleted: true, completedAt: new Date() },
    });

    // Complete linked reminder if pending
    if (day.reminderId) {
      await this.prisma.reminder.updateMany({
        where: { id: day.reminderId, status: 'PENDING' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }).catch(() => {});
    }

    // Check if all days done → mark timetable complete
    const remaining = await this.prisma.timetableDay.count({
      where: { timetableId: day.timetableId, isCompleted: false },
    });
    if (remaining === 0) {
      await this.prisma.studyTimetable.update({
        where: { id: day.timetableId },
        data: { status: 'COMPLETED' },
      });
    }

    return updated;
  }

  async regenerate(id: string, userId: string, overrides: Partial<CreateTimetableDto>) {
    const existing = await this.prisma.studyTimetable.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Timetable not found');
    return this.generate(userId, {
      noteIds: overrides.noteIds ?? existing.noteIds,
      hoursPerDay: overrides.hoursPerDay ?? existing.hoursPerDay,
      examDate: overrides.examDate ?? existing.examDate.toISOString(),
      title: overrides.title ?? existing.title,
      reminderTime: overrides.reminderTime,
    });
  }

  async archive(id: string, userId: string) {
    const t = await this.prisma.studyTimetable.findFirst({
      where: { id, userId },
      include: { days: { select: { reminderId: true } } },
    });
    if (!t) throw new NotFoundException('Timetable not found');
    const reminderIds = t.days.map(d => d.reminderId).filter(Boolean) as string[];
    if (reminderIds.length > 0) {
      await this.prisma.reminder.deleteMany({ where: { id: { in: reminderIds }, status: 'PENDING' } });
    }
    await this.prisma.studyTimetable.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }
}
