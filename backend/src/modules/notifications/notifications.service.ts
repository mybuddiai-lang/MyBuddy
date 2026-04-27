import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, title: string, body: string, type: string, url?: string) {
    return this.prisma.userNotification.create({
      data: { userId, title, body, type, url },
    });
  }

  async listForUser(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const notifications = await this.prisma.userNotification.findMany({
      where: {
        userId,
        NOT: { AND: [{ read: true }, { createdAt: { lt: sevenDaysAgo } }] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    return { notifications, unreadCount };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.userNotification.update({
      where: { id, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  // Runs at midnight every day — delete read notifications older than 7 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOld() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.userNotification.deleteMany({
      where: { read: true, createdAt: { lt: sevenDaysAgo } },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} old read notifications`);
    }
  }
}
