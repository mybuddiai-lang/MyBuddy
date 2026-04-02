import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto) {
    // Get user context for personalised AI
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, school: true, department: true, examDate: true },
    });

    // Get recent conversation history (last 10 messages)
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const history = recentMessages.reverse().map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: { userId, role: 'USER', content: dto.content, tokenCount: 0 },
    });

    // Analyze sentiment of user message
    const sentimentScore = await this.aiService.analyzeSentiment(dto.content);
    await this.prisma.chatMessage.update({
      where: { id: userMessage.id },
      data: { sentimentScore },
    });

    // Get AI response
    const aiResponse = await this.aiService.sendChatMessage(userId, dto.content, history, user);

    // Save assistant message
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokenCount: aiResponse.outputTokens,
        sentimentScore: await this.aiService.analyzeSentiment(aiResponse.content),
      },
    });

    // Update user's sentiment baseline (exponential moving average — weight 20% new, 80% historical)
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { sentimentBaseline: true } });
    const prevBaseline = currentUser?.sentimentBaseline ?? 0.5;
    const newBaseline = 0.8 * prevBaseline + 0.2 * sentimentScore;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        sentimentBaseline: { set: Math.max(0, Math.min(1, newBaseline)) },
        lastActiveAt: new Date(),
      },
    });

    return {
      id: assistantMessage.id,
      role: 'assistant',
      content: assistantMessage.content,
      sentimentScore: assistantMessage.sentimentScore,
      createdAt: assistantMessage.createdAt,
    };
  }

  async getHistory(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 30 } = pagination;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.chatMessage.count({ where: { userId } }),
    ]);

    return {
      messages: messages.map(m => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        sentimentScore: m.sentimentScore,
        createdAt: m.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async clearHistory(userId: string) {
    await this.prisma.chatMessage.deleteMany({ where: { userId } });
    return { message: 'Chat history cleared' };
  }
}
