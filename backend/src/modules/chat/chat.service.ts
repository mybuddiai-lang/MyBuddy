import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private analyticsService: AnalyticsService,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto) {
    // Get user context for personalised AI
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, school: true, department: true, examDate: true },
    });

    // Get recent conversation history (last 20 messages for richer memory)
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const history = recentMessages.reverse().map(m => {
      const meta = m.metadata as { attachmentUrl?: string; attachmentType?: string } | null;
      let content = m.content || '';
      // Enrich history with attachment context so AI knows what was shared
      if (meta?.attachmentType) {
        const label = meta.attachmentType === 'IMAGE' ? 'an image' : meta.attachmentType === 'VOICE' ? 'a voice note' : 'a file';
        content = content ? `${content} [attached ${label}]` : `[shared ${label}]`;
      }
      return { role: m.role.toLowerCase() as 'user' | 'assistant', content };
    });

    // Save user message immediately (sentiment updated async in background)
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'USER',
        content: dto.content,
        tokenCount: 0,
        ...(dto.attachmentUrl ? { metadata: { attachmentUrl: dto.attachmentUrl, attachmentType: dto.attachmentType ?? 'FILE' } } : {}),
      },
    });

    // Get AI response — single blocking OpenAI call
    const aiResponse = await this.aiService.sendChatMessage(userId, dto.content, history, user);

    // Save assistant message immediately — return this to the client fast
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokenCount: aiResponse.outputTokens,
        sentimentScore: 0.5, // default; updated in background below
      },
    });

    // ── Background tasks (non-blocking — do not await) ────────────────────────
    // Sentiment analysis + baseline update run after the HTTP response is sent
    this.runBackgroundTasks(userId, userMessage.id, assistantMessage.id, dto.content, aiResponse.content);
    this.analyticsService.track(userId, 'message_sent', { contentLength: dto.content.length }).catch(() => {});

    return {
      id: assistantMessage.id,
      role: 'assistant',
      content: assistantMessage.content,
      sentimentScore: assistantMessage.sentimentScore,
      createdAt: assistantMessage.createdAt,
    };
  }

  // Runs after the HTTP response is already sent — failures are silent
  private runBackgroundTasks(
    userId: string,
    userMessageId: string,
    assistantMessageId: string,
    userContent: string,
    aiContent: string,
  ) {
    (async () => {
      try {
        const [userSentiment, aiSentiment] = await Promise.all([
          this.aiService.analyzeSentiment(userContent),
          this.aiService.analyzeSentiment(aiContent),
        ]);

        await Promise.all([
          this.prisma.chatMessage.update({ where: { id: userMessageId }, data: { sentimentScore: userSentiment } }),
          this.prisma.chatMessage.update({ where: { id: assistantMessageId }, data: { sentimentScore: aiSentiment } }),
        ]);

        const currentUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { sentimentBaseline: true } });
        const prevBaseline = currentUser?.sentimentBaseline ?? 0.5;
        const newBaseline = Math.max(0, Math.min(1, 0.8 * prevBaseline + 0.2 * userSentiment));
        await this.prisma.user.update({
          where: { id: userId },
          data: { sentimentBaseline: { set: newBaseline }, lastActiveAt: new Date() },
        });
      } catch (err) {
        this.logger.warn('Background sentiment update failed (non-critical)', err);
      }
    })();
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
      messages: messages.map(m => {
        const meta = m.metadata as { attachmentUrl?: string; attachmentType?: string } | null;
        return {
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          sentimentScore: m.sentimentScore,
          createdAt: m.createdAt,
          attachmentUrl: meta?.attachmentUrl,
          attachmentType: meta?.attachmentType,
        };
      }),
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
