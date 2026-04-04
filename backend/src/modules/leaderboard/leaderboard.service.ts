import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  private async getAccuracyMap(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) return {};
    const stats = await this.prisma.recallSession.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, completedAt: { not: null } },
      _sum: { cardsReviewed: true, correctAnswers: true },
    });
    return Object.fromEntries(
      stats.map(s => [
        s.userId,
        s._sum.cardsReviewed
          ? Math.round((s._sum.correctAnswers! / s._sum.cardsReviewed!) * 100)
          : 0,
      ]),
    );
  }

  async getResilienceLeaderboard(userId: string, limit = 50) {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { resilienceScore: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        school: true,
        department: true,
        resilienceScore: true,
        studyStreak: true,
        createdAt: true,
        profile: { select: { avatarUrl: true } },
      },
    });

    const accuracyMap = await this.getAccuracyMap(users.map(u => u.id));

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      school: u.school ?? '',
      department: u.department,
      resilienceScore: Math.round(u.resilienceScore),
      studyStreak: u.studyStreak,
      recallAccuracy: accuracyMap[u.id] ?? 0,
      avatarUrl: u.profile?.avatarUrl ?? null,
      isCurrentUser: u.id === userId,
    }));

    // Find caller's rank if they didn't make top N
    const currentUserEntry = ranked.find((r) => r.isCurrentUser);
    let currentUserRank = currentUserEntry ?? null;
    if (!currentUserRank) {
      const meScore = (await this.prisma.user.findUnique({ where: { id: userId }, select: { resilienceScore: true } }))?.resilienceScore ?? 0;
      const higher = await this.prisma.user.count({ where: { role: 'USER', resilienceScore: { gt: meScore } } });
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, school: true, department: true, resilienceScore: true, studyStreak: true, profile: { select: { avatarUrl: true } } },
      });
      if (me) {
        const myAccuracy = (await this.getAccuracyMap([userId]))[userId] ?? 0;
        currentUserRank = {
          rank: higher + 1,
          userId: me.id,
          name: me.name,
          school: me.school ?? '',
          department: me.department,
          resilienceScore: Math.round(me.resilienceScore),
          studyStreak: me.studyStreak,
          recallAccuracy: myAccuracy,
          avatarUrl: me.profile?.avatarUrl ?? null,
          isCurrentUser: true,
        };
      }
    }

    return { leaderboard: ranked, currentUser: currentUserRank };
  }

  async getStreakLeaderboard(userId: string, limit = 50) {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER', studyStreak: { gt: 0 } },
      orderBy: { studyStreak: 'desc' },
      take: limit,
      select: { id: true, name: true, school: true, studyStreak: true, resilienceScore: true, profile: { select: { avatarUrl: true } } },
    });

    const accuracyMap = await this.getAccuracyMap(users.map(u => u.id));

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      school: u.school ?? '',
      studyStreak: u.studyStreak,
      resilienceScore: Math.round(u.resilienceScore),
      recallAccuracy: accuracyMap[u.id] ?? 0,
      avatarUrl: u.profile?.avatarUrl ?? null,
      isCurrentUser: u.id === userId,
    }));

    return { leaderboard: ranked };
  }

  async getRecallLeaderboard(userId: string, limit = 50) {
    // Aggregate recall sessions from the last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stats = await this.prisma.recallSession.groupBy({
      by: ['userId'],
      where: { completedAt: { gte: since, not: null } },
      _sum: { cardsReviewed: true, correctAnswers: true },
      having: { cardsReviewed: { _sum: { gte: 5 } } }, // at least 5 cards reviewed
    });

    // Sort by accuracy
    const withAccuracy = stats
      .map(s => ({
        userId: s.userId,
        totalCards: s._sum.cardsReviewed ?? 0,
        totalCorrect: s._sum.correctAnswers ?? 0,
        recallAccuracy: s._sum.cardsReviewed
          ? Math.round((s._sum.correctAnswers! / s._sum.cardsReviewed!) * 100)
          : 0,
      }))
      .sort((a, b) => b.recallAccuracy - a.recallAccuracy)
      .slice(0, limit);

    if (withAccuracy.length === 0) return { leaderboard: [] };

    const userIds = withAccuracy.map(s => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, school: true, studyStreak: true, resilienceScore: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const ranked = withAccuracy.map((s, i) => {
      const u = userMap[s.userId];
      if (!u) return null;
      return {
        rank: i + 1,
        userId: u.id,
        name: u.name,
        school: u.school ?? '',
        studyStreak: u.studyStreak,
        resilienceScore: Math.round(u.resilienceScore),
        recallAccuracy: s.recallAccuracy,
        isCurrentUser: u.id === userId,
      };
    }).filter(Boolean);

    return { leaderboard: ranked };
  }

  async getCommunityLeaderboard(communityId: string, userId: string) {
    const members = await this.prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: {
          select: { id: true, name: true, resilienceScore: true, studyStreak: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });

    const userIds = members.map(m => m.user.id);
    const accuracyMap = await this.getAccuracyMap(userIds);

    const sorted = members
      .sort((a, b) => b.user.resilienceScore - a.user.resilienceScore)
      .map((m, i) => ({
        rank: i + 1,
        userId: m.user.id,
        name: m.user.name,
        resilienceScore: Math.round(m.user.resilienceScore),
        studyStreak: m.user.studyStreak,
        recallAccuracy: accuracyMap[m.user.id] ?? 0,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        isCurrentUser: m.user.id === userId,
        role: m.role,
      }));

    return { leaderboard: sorted };
  }
}
