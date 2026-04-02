import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecallService {
  constructor(private prisma: PrismaService) {}

  async getDueCards(userId: string) {
    // Get chunks from notes that are done and need review
    const notes = await this.prisma.note.findMany({
      where: { userId, processingStatus: 'DONE' },
      include: { chunks: { take: 5 } },
      take: 20,
    });

    const cards = notes.flatMap(note =>
      note.chunks.map(chunk => {
        const lines = chunk.content.split('\n');
        const question = lines[0]?.replace('Q: ', '') || 'Review this concept';
        const answer = lines[1]?.replace('A: ', '') || chunk.content;
        return {
          id: chunk.id,
          question,
          answer,
          noteChunkId: chunk.id,
          noteTitle: note.title,
        };
      }),
    );

    return cards.slice(0, 15);
  }

  async startSession(userId: string) {
    const session = await this.prisma.recallSession.create({
      data: { userId },
    });
    return { sessionId: session.id };
  }

  async submitAnswer(sessionId: string, userId: string, cardId: string, result: string, difficultyRating: number) {
    const session = await this.prisma.recallSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');

    const resultMap: Record<string, string> = {
      easy: 'CORRECT',
      medium: 'PARTIAL',
      hard: 'INCORRECT',
    };

    await this.prisma.recallCard.create({
      data: {
        sessionId,
        noteChunkId: cardId,
        question: 'Review',
        answer: 'Review',
        result: (resultMap[result] || 'CORRECT') as any,
        difficultyRating,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.recallSession.update({
      where: { id: sessionId },
      data: {
        cardsReviewed: { increment: 1 },
        correctAnswers: result === 'easy' ? { increment: 1 } : undefined,
      },
    });

    return { success: true };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.recallSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.recallSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
    });

    // Update user streak
    await this.prisma.user.update({
      where: { id: userId },
      data: { studyStreak: { increment: 1 }, lastActiveAt: new Date() },
    });

    return { message: 'Session complete', cardsReviewed: session.cardsReviewed };
  }

  async getStats(userId: string) {
    const [sessions, totalNotes, dueReminders] = await Promise.all([
      this.prisma.recallSession.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      this.prisma.note.count({ where: { userId, processingStatus: 'DONE' } }),
      this.prisma.reminder.count({ where: { userId, status: 'PENDING', type: 'RECALL', scheduledFor: { lte: new Date() } } }),
    ]);

    const totalCards = sessions.reduce((a, s) => a + s.cardsReviewed, 0);
    const totalCorrect = sessions.reduce((a, s) => a + s.correctAnswers, 0);
    const accuracy = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;

    return {
      totalCards,
      dueToday: dueReminders,
      masteredCards: totalCorrect,
      averageAccuracy: accuracy,
      totalNotes,
      sessionsCompleted: sessions.length,
    };
  }
}
