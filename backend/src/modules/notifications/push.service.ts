import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private webpush: any;
  private vapidEnabled = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.initVapid();
  }

  private async initVapid() {
    try {
      // Dynamically import web-push to avoid hard boot failure if not installed
      this.webpush = require('web-push');
      const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
      const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
      const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:support@buddi.ai');

      if (publicKey && privateKey) {
        this.webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidEnabled = true;
        this.logger.log('Web Push (VAPID) enabled');
      } else {
        this.logger.warn('VAPID keys not configured — push notifications disabled');
      }
    } catch {
      this.logger.warn('web-push not installed — push notifications disabled');
    }
  }

  getVapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '');
  }

  async saveSubscription(
    userId: string,
    endpoint: string,
    keys: SubscriptionKeys,
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.vapidEnabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const sends = subscriptions.map(sub =>
      this.webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err: any) => {
        // 410 Gone = subscription expired, clean it up
        if (err.statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }),
    );

    await Promise.allSettled(sends);
  }
}
