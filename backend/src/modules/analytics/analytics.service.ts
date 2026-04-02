import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
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
}
