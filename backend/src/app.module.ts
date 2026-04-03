import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './modules/ai/ai.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { FilesModule } from './modules/files/files.module';
import { RecallModule } from './modules/recall/recall.module';
import { CommunityModule } from './modules/community/community.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RedisModule } from './modules/cache/redis.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    AiModule,
    RemindersModule,
    FilesModule,
    RecallModule,
    CommunityModule,
    PaymentsModule,
    AnalyticsModule,
    AdminModule,
    HealthModule,
    NotificationsModule,
    RedisModule,
    EmailModule,
  ],
})
export class AppModule {}
