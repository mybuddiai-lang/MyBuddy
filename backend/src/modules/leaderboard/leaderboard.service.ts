import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

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

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      school: u.school,
      department: u.department,
      resilienceScore: Math.round(u.resilienceScore),
      studyStreak: u.studyStreak,
      avatarUrl: u.profile?.avatarUrl ?? null,
      isCurrentUser: u.id === userId,
    }));

    // Find caller's rank if they didn't make top N
    const currentUserEntry = ranked.find((r) => r.isCurrentUser);
    let currentUserRank = currentUserEntry ?? null;
    if (!currentUserRank) {
      const higher = await this.prisma.user.count({
        where: { role: 'USER', resilienceScore: { gt: (await this.prisma.user.findUnique({ where: { id: userId }, select: { resilienceScore: true } }))?.resilienceScore ?? 0 } },
      });
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, school: true, department: true, resilienceScore: true, studyStreak: true, profile: { select: { avatarUrl: true } } },
      });
      if (me) {
        currentUserRank = {
          rank: higher + 1,
          id: me.id,
          name: me.name,
          school: me.school,
          department: me.department,
          resilienceScore: Math.round(me.resilienceScore),
          studyStreak: me.studyStreak,
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
      select: {
        id: true,
        name: true,
        school: true,
        studyStreak: true,
        profile: { select: { avatarUrl: true } },
      },
    });

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      school: u.school,
      studyStreak: u.studyStreak,
      avatarUrl: u.profile?.avatarUrl ?? null,
      isCurrentUser: u.id === userId,
    }));

    return { leaderboard: ranked };
  }

  async getCommunityLeaderboard(communityId: string, userId: string) {
    const members = await this.prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            resilienceScore: true,
            studyStreak: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    const sorted = members
      .sort((a, b) => b.user.resilienceScore - a.user.resilienceScore)
      .map((m, i) => ({
        rank: i + 1,
        id: m.user.id,
        name: m.user.name,
        resilienceScore: Math.round(m.user.resilienceScore),
        studyStreak: m.user.studyStreak,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        isCurrentUser: m.user.id === userId,
        role: m.role,
      }));

    return { leaderboard: sorted };
  }
}
