import { Controller, Post, Delete, Get, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import { IsString, IsObject } from 'class-validator';

class SubscribeDto {
  @IsString() endpoint: string;
  @IsObject() keys: { p256dh: string; auth: string };
}

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushSubscriptionsController {
  constructor(private pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for client subscription' })
  getVapidKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Save push subscription' })
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribeDto,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.pushService.saveSubscription(userId, dto.endpoint, dto.keys, userAgent);
    return { message: 'Subscribed to push notifications' };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Remove push subscription' })
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: { endpoint: string },
  ) {
    await this.pushService.removeSubscription(userId, dto.endpoint);
    return { message: 'Unsubscribed from push notifications' };
  }
}
