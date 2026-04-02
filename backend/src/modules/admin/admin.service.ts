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
}
