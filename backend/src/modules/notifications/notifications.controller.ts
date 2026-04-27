import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.notificationsService.listForUser(req.user.id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    await this.notificationsService.markAllRead(req.user.id);
    return { success: true };
  }

  @Post(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
