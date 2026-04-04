import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async track(userId: string | null, eventType: string, eventData?: any, sessionId?: string) {
    return this.prisma.analyticsEvent.create({
      data: { userId, eventType, eventData, sessionId },
    });
  }

  async getDauWauMau() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau, totalUsers] = await Promise.all([
      this.prisma.user.count({ where: { lastActiveAt: { gte: dayAgo } } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
      this.prisma.user.count(),
    ]);

    return { dau, wau, mau, totalUsers };
  }

  async getSentimentRisks() {
    return this.prisma.user.findMany({
      where: { sentimentBaseline: { lt: 0.3 } },
      select: { id: true, name: true, email: true, sentimentBaseline: true, lastActiveAt: true },
      orderBy: { sentimentBaseline: 'asc' },
      take: 20,
    });
  }

  async getTokenCosts(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const messages = await this.prisma.chatMessage.aggregate({
      where: { role: 'ASSISTANT', createdAt: { gte: since } },
      _sum: { tokenCount: true },
      _count: true,
    });
    return {
      totalTokens: messages._sum.tokenCount ?? 0,
      totalMessages: messages._count,
      estimatedCostUSD: ((messages._sum.tokenCount ?? 0) / 1_000_000) * 3.0,
    };
  }

  @OnEvent('reminder.due')
  onReminderDue({ reminder }: any) {
    this.track(reminder.userId, 'reminder_due', { reminderId: reminder.id }).catch(() => {});
  }

  /** Run nightly at 02:00 — scan for burnout risk and create admin alerts */
  @Cron('0 2 * * *')
  async detectBurnoutRisks() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const riskyUsers = await this.prisma.user.findMany({
      where: { sentimentBaseline: { lt: 0.35 }, lastActiveAt: { gte: weekAgo } },
      select: { id: true, name: true, sentimentBaseline: true },
    });

    for (const user of riskyUsers) {
      const existing = await this.prisma.adminAlert.findFirst({
        where: { userId: user.id, type: 'BURNOUT_RISK', resolvedAt: null },
      });
      if (existing) continue;

      const severity = user.sentimentBaseline < 0.2 ? 'HIGH' : 'MEDIUM';
      await this.prisma.adminAlert.create({
        data: {
          type: 'BURNOUT_RISK',
          severity: severity as any,
          title: `Burnout risk: ${user.name}`,
          description: `Sentiment baseline dropped to ${(user.sentimentBaseline * 100).toFixed(0)}%`,
          userId: user.id,
        },
      });
    }

    if (riskyUsers.length > 0) {
      this.logger.warn(`Burnout scan: ${riskyUsers.length} at-risk user(s) flagged`);
    }
  }

  /** Recalculate & persist resilience score for a single user — called after key events */
  async recalculateForUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { sentimentBaseline: true, studyStreak: true },
      });
      if (!user) return;

      const sessions = await this.prisma.recallSession.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: { cardsReviewed: true, correctAnswers: true },
      });

      const totalCards = sessions.reduce((a, s) => a + s.cardsReviewed, 0);
      const totalCorrect = sessions.reduce((a, s) => a + s.correctAnswers, 0);
      const recallAccuracy = totalCards > 0 ? totalCorrect / totalCards : 0.5;
      const streakScore = Math.min((user.studyStreak ?? 0) / 30, 1);
      const sentimentScore = user.sentimentBaseline ?? 0.5;

      // 40% sentiment · 30% streak · 30% recall accuracy
      const score = (sentimentScore * 0.4 + streakScore * 0.3 + recallAccuracy * 0.3) * 100;

      await this.prisma.user.update({
        where: { id: userId },
        data: { resilienceScore: Math.round(score * 10) / 10 },
      });
    } catch {
      // Non-critical
    }
  }

  /** Run nightly at 00:05 — reset streaks for users who skipped recall yesterday */
  @Cron('5 0 * * *')
  async resetStaleStreaks() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    // Users who completed at least one recall session yesterday
    const activeYesterday = await this.prisma.recallSession.findMany({
      where: { completedAt: { gte: yesterday, lt: today } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const activeIds = activeYesterday.map(s => s.userId);

    const where = activeIds.length > 0
      ? { studyStreak: { gt: 0 }, id: { notIn: activeIds } }
      : { studyStreak: { gt: 0 } };

    const result = await this.prisma.user.updateMany({ where, data: { studyStreak: 0 } });
    if (result.count > 0) {
      this.logger.warn(`Streak reset: ${result.count} user(s) missed their daily recall`);
    }
  }

  /** Run nightly at 03:00 — recalculate resilience scores */
  @Cron('0 3 * * *')
  async updateResilienceScores() {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: { lastActiveAt: { gte: monthAgo } },
      select: { id: true, sentimentBaseline: true, studyStreak: true },
    });

    for (const user of users) {
      // Pull last 10 recall sessions for accuracy
      const sessions = await this.prisma.recallSession.findMany({
        where: { userId: user.id, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: { cardsReviewed: true, correctAnswers: true },
      });

      const totalCards = sessions.reduce((a, s) => a + s.cardsReviewed, 0);
      const totalCorrect = sessions.reduce((a, s) => a + s.correctAnswers, 0);
      const recallAccuracy = totalCards > 0 ? totalCorrect / totalCards : 0.5;
      const streakScore = Math.min(user.studyStreak / 30, 1); // max out at 30-day streak
      const sentimentScore = user.sentimentBaseline;

      // Weighted formula: 40% sentiment, 30% streak, 30% recall accuracy
      const resilienceScore = (sentimentScore * 0.4 + streakScore * 0.3 + recallAccuracy * 0.3) * 100;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { resilienceScore: Math.round(resilienceScore * 10) / 10 },
      });
    }

    this.logger.log(`Resilience scores updated for ${users.length} active user(s)`);
  }
}
