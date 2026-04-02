import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { EventsListener } from './events.listener';
import { PushService } from './push.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PushSubscriptionsController],
  providers: [NotificationsGateway, EventsListener, PushService],
  exports: [NotificationsGateway, PushService],
})
export class NotificationsModule {}
