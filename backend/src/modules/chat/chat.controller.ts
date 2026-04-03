import { Controller, Post, Get, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatQuotaGuard } from '../../common/guards/chat-quota.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('message')
  @UseGuards(ChatQuotaGuard)
  sendMessage(@CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Get('history')
  getHistory(@CurrentUser('id') userId: string, @Query() pagination: PaginationDto) {
    return this.chatService.getHistory(userId, pagination);
  }

  @Delete('history')
  clearHistory(@CurrentUser('id') userId: string) {
    return this.chatService.clearHistory(userId);
  }
}
