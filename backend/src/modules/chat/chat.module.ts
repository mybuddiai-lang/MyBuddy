import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { RedisModule } from '../cache/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatQuotaGuard } from '../../common/guards/chat-quota.guard';

@Module({
  imports: [AiModule, AnalyticsModule, RedisModule, PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, ChatQuotaGuard],
})
export class ChatModule {}
