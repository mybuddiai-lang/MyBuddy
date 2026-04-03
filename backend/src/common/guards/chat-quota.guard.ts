import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../modules/cache/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

const FREE_DAILY_LIMIT = 10;

@Injectable()
export class ChatQuotaGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.id;
    if (!userId) return true; // JwtAuthGuard handles missing auth

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    // Premium / institutional users have no cap
    if (user?.subscriptionTier !== 'FREE') return true;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `chat_quota:${userId}:${today}`;

    const count = await this.redis.get(key);
    const current = count ? parseInt(count, 10) : 0;

    if (current >= FREE_DAILY_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Free plan is limited to ${FREE_DAILY_LIMIT} messages per day. Upgrade to Premium for unlimited access.`,
          remainingMessages: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment — TTL set to 25 hours so it expires safely after midnight
    const ttl = 25 * 60 * 60;
    await this.redis.set(key, String(current + 1), ttl);

    // Attach remaining quota to request for optional response enrichment
    request.quotaRemaining = FREE_DAILY_LIMIT - current - 1;
    return true;
  }
}
