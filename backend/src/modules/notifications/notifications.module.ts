import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { EventsListener } from './events.listener';
import { PushService } from './push.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PushSubscriptionsController, NotificationsController],
  providers: [NotificationsGateway, EventsListener, PushService, NotificationsService],
  exports: [NotificationsGateway, PushService, NotificationsService],
})
export class NotificationsModule {}
