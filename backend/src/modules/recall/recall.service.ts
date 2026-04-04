import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

/**
 * SM-2 Spaced Repetition Algorithm
 * Returns { interval (days), newEF }
 *
 * quality: 0 (hard/blackout) → 5 (easy/perfect)
 * Maps from user ratings: easy=5, medium=3, hard=1
 */
function sm2(easinessFactor: number, repetitions: number, quality: number): { interval: number; newEF: number; newRepetitions: number } {
  // Clamp EF: minimum 1.3
  let newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newRepetitions = repetitions;
  let interval: number;

  if (quality < 3) {
    // Failed — reset repetitions
    newRepetitions = 0;
    interval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(repetitions * newEF);
    }
  }

  return { interval, newEF, newRepetitions };
}

function ratingToQuality(result: string): number {
  switch (result) {
    case 'easy': return 5;
    case 'medium': return 3;
    case 'hard': return 1;
    default: return 3;
  }
}

@Injectable()
export class RecallService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  async getDueCards(userId: string) {
    // Get note chunks that are due for review (nextReviewAt <= now or never reviewed)
    const notes = await this.prisma.note.findMany({
      where: { userId, processingStatus: 'DONE' },
      include: {
        chunks: {
          where: {
            OR: [
              { nextReviewAt: null },
              { nextReviewAt: { lte: new Date() } },
            ],
          },
          take: 15,
        },
      },
      take: 20,
    });

    const cards = notes.flatMap(note =>
      note.chunks.map(chunk => {
        const lines = chunk.content.split('\n');
        const question = lines[0]?.replace(/^Q:\s*/, '') || 'Review this concept';
        const answer = lines[1]?.replace(/^A:\s*/, '') || chunk.content;
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

    // Apply SM-2 to the note chunk
    await this.applySpacedRepetition(cardId, result);

    return { success: true };
  }

  private async applySpacedRepetition(chunkId: string, result: string) {
    try {
      const chunk = await this.prisma.noteChunk.findUnique({ where: { id: chunkId } });
      if (!chunk) return;

      const quality = ratingToQuality(result);
      const currentEF: number = (chunk as any).easinessFactor ?? 2.5;
      const currentReps: number = (chunk as any).repetitions ?? 0;

      const { interval, newEF, newRepetitions } = sm2(currentEF, currentReps, quality);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await this.prisma.noteChunk.update({
        where: { id: chunkId },
        data: {
          nextReviewAt: nextReview,
          easinessFactor: newEF,
          repetitions: newRepetitions,
        } as any,
      });
    } catch {
      // Graceful fail — SM-2 update is non-critical
    }
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

    this.analyticsService.track(userId, 'recall_session_complete', {
      sessionId,
      cardsReviewed: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
    }).catch(() => {});

    // Update resilience score immediately after session (non-blocking)
    this.analyticsService.recalculateForUser(userId).catch(() => {});

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
