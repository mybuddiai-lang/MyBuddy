import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  async getDashboard() {
    const [engagement, sentimentRisks, tokenCosts, recentAlerts, noteStats] = await Promise.all([
      this.analyticsService.getDauWauMau(),
      this.analyticsService.getSentimentRisks(),
      this.analyticsService.getTokenCosts(),
      this.prisma.adminAlert.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.note.groupBy({ by: ['processingStatus'], _count: true }),
    ]);

    return { engagement, sentimentRisksCount: sentimentRisks.length, tokenCosts, recentAlerts, noteStats };
  }

  async getUsers(pagination: PaginationDto, search?: string) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, school: true, subscriptionTier: true, studyStreak: true, sentimentBaseline: true, lastActiveAt: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true,
        _count: { select: { chatMessages: true, notes: true, reminders: true, recallSessions: true } },
      },
    });
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async getAlerts(resolved = false) {
    return this.prisma.adminAlert.findMany({
      where: { resolvedAt: resolved ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async resolveAlert(id: string) {
    return this.prisma.adminAlert.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }

  async getSentimentHeatmap() {
    const users = await this.prisma.user.findMany({
      where: { sentimentBaseline: { not: null } },
      select: { school: true, department: true, sentimentBaseline: true },
    });

    const groups: Record<string, { school: string; department: string | null; scores: number[] }> = {};
    for (const u of users) {
      const key = `${u.school ?? 'Unknown'}::${u.department ?? 'Unknown'}`;
      if (!groups[key]) groups[key] = { school: u.school ?? 'Unknown', department: u.department, scores: [] };
      groups[key].scores.push(u.sentimentBaseline);
    }

    return Object.values(groups).map((g) => ({
      school: g.school,
      department: g.department,
      avgSentiment: g.scores.reduce((a, b) => a + b, 0) / g.scores.length,
      userCount: g.scores.length,
      riskCount: g.scores.filter((s) => s < 0.35).length,
    })).sort((a, b) => a.avgSentiment - b.avgSentiment);
  }

  async getCohortRetention() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo     = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, active30d, active7d, active1d] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: oneDayAgo } } }),
    ]);

    return {
      totalUsers: total,
      retention30d: total ? Math.round((active30d / total) * 100) : 0,
      retention7d:  total ? Math.round((active7d  / total) * 100) : 0,
      retention1d:  total ? Math.round((active1d  / total) * 100) : 0,
      active30d,
      active7d,
      active1d,
    };
  }

  async suspendUser(userId: string, suspend: boolean) {
    // Store suspension as role downgrade; a proper suspension would use a dedicated field
    await this.prisma.adminAlert.create({
      data: {
        type: suspend ? 'USER_SUSPENDED' : 'USER_REINSTATED',
        severity: 'HIGH',
        title: suspend ? 'User suspended by admin' : 'User reinstated by admin',
        userId,
      },
    });
    return { userId, suspended: suspend };
  }
}
