import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, subscription: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { avatarUrl, bio, timezone, notificationsEnabled, studyGoalHours, weeklyGoalCards, currentPassword, newPassword, ...userFields } = dto;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) throw new BadRequestException('Current password is required to set a new one');
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      const valid = user && await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Current password is incorrect');
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }

    const updates: any[] = [];

    if (Object.keys(userFields).length > 0) {
      updates.push(
        this.prisma.user.update({
          where: { id: userId },
          data: { ...userFields, examDate: userFields.examDate ? new Date(userFields.examDate) : undefined },
        }),
      );
    }

    if (avatarUrl !== undefined || bio !== undefined || timezone !== undefined || notificationsEnabled !== undefined || studyGoalHours !== undefined || weeklyGoalCards !== undefined) {
      updates.push(
        this.prisma.userProfile.upsert({
          where: { userId },
          create: { userId, avatarUrl, bio, timezone, notificationsEnabled, studyGoalHours, weeklyGoalCards },
          update: { avatarUrl, bio, timezone, notificationsEnabled, studyGoalHours, weeklyGoalCards },
        }),
      );
    }

    await Promise.all(updates);
    return this.getProfile(userId);
  }

  async getStats(userId: string) {
    const [noteCount, reminderCount, sessionCount, dueReminders] = await Promise.all([
      this.prisma.note.count({ where: { userId, processingStatus: 'DONE' } }),
      this.prisma.reminder.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.recallSession.count({ where: { userId } }),
      this.prisma.reminder.count({
        where: { userId, status: 'PENDING', scheduledFor: { lte: new Date() } },
      }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { studyStreak: true, resilienceScore: true, sentimentBaseline: true },
    });

    return {
      noteCount,
      pendingReminders: reminderCount,
      dueReminders,
      recallSessions: sessionCount,
      studyStreak: user?.studyStreak ?? 0,
      resilienceScore: user?.resilienceScore ?? 50,
    };
  }

  async getActivity(userId: string, limit = 5) {
    return this.prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20),
      select: { id: true, eventType: true, eventData: true, createdAt: true },
    });
  }

  async getResilienceScore(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { resilienceScore: true, studyStreak: true, sentimentBaseline: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      resilienceScore: Math.round(user.resilienceScore),
      studyStreak: user.studyStreak,
      sentimentBaseline: user.sentimentBaseline,
    };
  }

  async getPublicResilienceScore(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, school: true, resilienceScore: true, studyStreak: true, profile: { select: { avatarUrl: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      name: user.name,
      school: user.school,
      avatarUrl: user.profile?.avatarUrl ?? null,
      resilienceScore: Math.round(user.resilienceScore),
      studyStreak: user.studyStreak,
    };
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted' };
  }
}
