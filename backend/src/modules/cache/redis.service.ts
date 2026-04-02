import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private connected = false;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD', ''),
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });

    this.client.connect()
      .then(() => { this.connected = true; this.logger.log('Redis connected'); })
      .catch((err) => this.logger.warn(`Redis unavailable — caching disabled: ${err.message}`));

    this.client.on('error', () => { this.connected = false; });
    this.client.on('connect', () => { this.connected = true; });
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (!this.connected) return;
    try { await this.client.setex(key, ttlSeconds, value); } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try { await this.client.del(key); } catch {}
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJson<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {}
  }

  async onModuleDestroy() {
    try { await this.client.quit(); } catch {}
  }
}
