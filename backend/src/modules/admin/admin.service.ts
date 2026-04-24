import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  // ─── Dashboard Overview ───────────────────────────────────────────────────
  async getDashboard() {
    const [dauWauMau, revenueStats, alertCount] = await Promise.all([
      this.analyticsService.getDauWauMau(),
      this.getMonetizationStats(),
      this.prisma.analyticsEvent.count({
        where: { eventType: 'distress_detected' },
      }),
    ]);

    return {
      ...dauWauMau,
      mrr: revenueStats.mrr,
      premiumUsers: revenueStats.premiumUsers,
      alertCount,
    };
  }

  async getSignupTrend(days = 7) {
    const results: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const count = await this.prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      results.push({ date: start.toISOString().split('T')[0], count });
    }
    return results;
  }

  // ─── Analytics: Country Breakdown ────────────────────────────────────────
  async getCountryStats() {
    const rows = await this.prisma.user.groupBy({
      by: ['country'],
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
    });
    return rows.map((r) => ({ country: r.country ?? 'Unknown', count: r._count._all }));
  }

  // ─── User Management ─────────────────────────────────────────────────────
  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { school: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          school: true,
          department: true,
          country: true,
          isBlocked: true,
          subscriptionTier: true,
          sentimentBaseline: true,
          studyStreak: true,
          lastActiveAt: true,
          createdAt: true,
          _count: {
            select: { chatMessages: true, notes: true, reminders: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        school: true,
        department: true,
        specialization: true,
        country: true,
        isBlocked: true,
        subscriptionTier: true,
        sentimentBaseline: true,
        resilienceScore: true,
        studyStreak: true,
        lastActiveAt: true,
        createdAt: true,
        subscription: { select: { planType: true, status: true, expiresAt: true } },
        _count: {
          select: {
            chatMessages: true,
            notes: true,
            reminders: true,
            recallSessions: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const recentActivity = await this.prisma.analyticsEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { eventType: true, createdAt: true, eventData: true },
    });

    return { ...user, recentActivity };
  }

  async updateUserRole(id: string, role: string, adminId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.auditLog.create({
      data: { adminId, action: 'UPDATE_USER_ROLE', target: id, detail: { newRole: role } },
    });

    return user;
  }

  async blockUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: true },
      select: { id: true, email: true, name: true, isBlocked: true },
    });

    await this.prisma.auditLog.create({
      data: { adminId, action: 'BLOCK_USER', target: id, detail: { email: user.email } },
    });
    this.analyticsService.track(null, 'user_blocked', { targetId: id, adminId }).catch(() => {});

    return updated;
  }

  async unblockUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: false },
      select: { id: true, email: true, name: true, isBlocked: true },
    });

    await this.prisma.auditLog.create({
      data: { adminId, action: 'UNBLOCK_USER', target: id, detail: { email: user.email } },
    });

    return updated;
  }

  async deleteUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'DELETE_USER',
        target: id,
        detail: { email: user.email, name: user.name },
      },
    });

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully', id };
  }

  // ─── Admin Management ────────────────────────────────────────────────────
  async listAdmins() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'ANALYST'] as any[] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastActiveAt: true,
        createdAt: true,
        isBlocked: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(
    dto: { name: string; email: string; password: string; role: string },
    adminId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const allowedRoles = ['ADMIN', 'SUPPORT', 'ANALYST'];
    if (!allowedRoles.includes(dto.role)) {
      throw new BadRequestException('Invalid role. Allowed: ADMIN, SUPPORT, ANALYST');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role as any,
        profile: { create: {} },
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'CREATE_ADMIN',
        target: user.id,
        detail: { email: user.email, role: dto.role },
      },
    });

    return user;
  }

  // ─── Mental Health (anonymized) ──────────────────────────────────────────
  async getMentalHealthStats() {
    const [distressUsers, sentimentBuckets, totalUsers] = await Promise.all([
      this.prisma.user.count({ where: { sentimentBaseline: { lt: 0.3 } } }),
      this.prisma.user.groupBy({ by: ['sentimentBaseline'], _count: true }),
      this.prisma.user.count(),
    ]);

    const buckets = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
    for (const row of sentimentBuckets) {
      const s = row.sentimentBaseline;
      if (s >= 0.7) buckets.minimal += row._count;
      else if (s >= 0.5) buckets.mild += row._count;
      else if (s >= 0.3) buckets.moderate += row._count;
      else buckets.severe += row._count;
    }

    const repeatedDistress = await this.prisma.user.count({
      where: { sentimentBaseline: { lt: 0.25 } },
    });

    return {
      totalUsers,
      distressUsers,
      distressPercent: totalUsers > 0 ? ((distressUsers / totalUsers) * 100).toFixed(1) : '0',
      repeatedDistress,
      buckets,
    };
  }

  // ─── Referrals ───────────────────────────────────────────────────────────
  async getReferralStats() {
    const [distressDetected, referralShown, referralAccepted] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { eventType: 'distress_detected' } }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'referral_shown' } }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'referral_accepted' } }),
    ]);

    const shownToAcceptedRate =
      referralShown > 0 ? ((referralAccepted / referralShown) * 100).toFixed(1) : '0';
    const distressToShownRate =
      distressDetected > 0 ? ((referralShown / distressDetected) * 100).toFixed(1) : '0';

    return {
      distressDetected,
      referralShown,
      referralAccepted,
      shownToAcceptedRate: `${shownToAcceptedRate}%`,
      distressToShownRate: `${distressToShownRate}%`,
    };
  }

  // ─── Monetization ────────────────────────────────────────────────────────
  async getMonetizationStats() {
    const [premiumUsers, freeUsers, totalRevenue, recentPayments] = await Promise.all([
      this.prisma.user.count({ where: { subscriptionTier: 'PREMIUM' } }),
      this.prisma.user.count({ where: { subscriptionTier: 'FREE' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { status: { in: ['COMPLETED', 'FAILED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          currency: true,
          provider: true,
          status: true,
          planType: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const totalUsers = premiumUsers + freeUsers;
    const totalRevenueAmount = totalRevenue._sum.amount ?? 0;
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: 'active' },
    });
    const mrr = activeSubscriptions * 9.99;
    const arpu = premiumUsers > 0 ? (totalRevenueAmount / 100 / premiumUsers).toFixed(2) : '0';

    return {
      premiumUsers,
      freeUsers,
      totalUsers,
      conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0',
      mrr: mrr.toFixed(2),
      arpu,
      totalRevenue: (totalRevenueAmount / 100).toFixed(2),
      recentPayments,
    };
  }

  // ─── Professionals ───────────────────────────────────────────────────────
  async getProfessionals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.professional.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.professional.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createProfessional(dto: {
    name: string;
    email: string;
    specialty: string;
    location?: string;
    bio?: string;
  }) {
    return this.prisma.professional.create({ data: dto });
  }

  async updateProfessional(id: string, dto: Partial<Record<string, unknown>>) {
    return this.prisma.professional.update({ where: { id }, data: dto as any });
  }

  async deleteProfessional(id: string) {
    await this.prisma.professional.delete({ where: { id } });
    return { message: 'Professional deleted' };
  }

  // ─── Operations ──────────────────────────────────────────────────────────
  async getActivityFeed(limit = 50) {
    return this.prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        sessionId: true,
        user: { select: { name: true, email: true } },
      },
    });
  }

  async lookupUser(query: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: query, mode: 'insensitive' } },
          { id: query },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        school: true,
        country: true,
        isBlocked: true,
        subscriptionTier: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  // ─── AI Monitoring ───────────────────────────────────────────────────────
  async getAiStats(days = 30) {
    const tokenCosts = await this.analyticsService.getTokenCosts(days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dailyUsage: Array<{ date: string; tokens: number; messages: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const agg = await this.prisma.chatMessage.aggregate({
        where: { role: 'ASSISTANT', createdAt: { gte: start, lte: end } },
        _sum: { tokenCount: true },
        _count: true,
      });
      dailyUsage.push({
        date: start.toISOString().split('T')[0],
        tokens: agg._sum.tokenCount ?? 0,
        messages: agg._count,
      });
    }

    const failureEvents = await this.prisma.analyticsEvent.count({
      where: { eventType: 'ai_error', createdAt: { gte: since } },
    });

    return {
      ...tokenCosts,
      failureEvents,
      failureRate:
        tokenCosts.totalMessages > 0
          ? ((failureEvents / tokenCosts.totalMessages) * 100).toFixed(2)
          : '0',
      dailyUsage,
    };
  }

  // ─── System Health ───────────────────────────────────────────────────────
  async getSystemHealth() {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const dbPing = Date.now() - start;

    const errorEvents = await this.prisma.analyticsEvent.count({
      where: {
        eventType: { in: ['api_error', 'ai_error'] },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    return {
      status: 'ok',
      dbPingMs: dbPing,
      errorEventsLastHour: errorEvents,
      uptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Reports ─────────────────────────────────────────────────────────────
  async exportData(type: 'users' | 'subscriptions' | 'activity') {
    switch (type) {
      case 'users':
        return this.prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            school: true,
            department: true,
            country: true,
            isBlocked: true,
            subscriptionTier: true,
            role: true,
            studyStreak: true,
            createdAt: true,
            lastActiveAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      case 'subscriptions':
        return this.prisma.subscription.findMany({
          select: {
            id: true,
            planType: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            autoRenew: true,
            user: { select: { email: true, name: true } },
          },
          orderBy: { startedAt: 'desc' },
        });
      case 'activity':
        return this.prisma.analyticsEvent.findMany({
          select: {
            id: true,
            eventType: true,
            createdAt: true,
            user: { select: { email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
    }
  }
}
