import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateExamDto, SubmitAnswerDto } from './dto/create-exam.dto';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async generate(userId: string, dto: CreateExamDto) {
    // Fetch notes, verify ownership
    const notes = await this.prisma.note.findMany({
      where: { id: { in: dto.noteIds }, userId, processingStatus: 'DONE' },
    });
    if (notes.length === 0) {
      throw new BadRequestException('No processed notes found. Please upload and wait for notes to finish processing.');
    }

    // Aggregate content
    const content = notes
      .map(n => [n.title, n.content ?? '', n.summary ?? ''].join('\n'))
      .join('\n\n')
      .slice(0, 14000);

    if (content.trim().length < 100) {
      throw new BadRequestException('Note content too short to generate an exam.');
    }

    // Generate questions via AI
    const generated = await this.aiService.generateExamQuestions(
      content,
      dto.examType,
      dto.questionCount,
      dto.difficulty,
    );

    if (generated.length === 0) {
      throw new BadRequestException('Could not generate exam questions from these notes. Please try again.');
    }

    const title = dto.title || `${notes.map(n => n.title).join(', ')} — ${dto.difficulty} ${dto.examType}`;

    // Persist session + questions in a transaction
    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.examSession.create({
        data: {
          userId,
          title: title.slice(0, 200),
          examType: dto.examType as any,
          difficulty: dto.difficulty as any,
          questionCount: generated.length,
          timeLimitMins: dto.timeLimitMins,
          noteIds: dto.noteIds,
        },
      });
      await tx.examQuestion.createMany({
        data: generated.map(q => ({
          sessionId: s.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          questionType: q.questionType as any,
          options: (q.options ?? null) as any,
          correctAnswer: q.correctAnswer,
        })),
      });
      return tx.examSession.findUnique({
        where: { id: s.id },
        include: { questions: { orderBy: { questionNumber: 'asc' } } },
      });
    });

    return this.sanitizeForClient(session!);
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { orderBy: { questionNumber: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Exam session not found');
    return this.sanitizeForClient(session);
  }

  async getSessions(userId: string) {
    return this.prisma.examSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, examType: true, difficulty: true, questionCount: true,
        timeLimitMins: true, status: true, totalScore: true, maxScore: true,
        percentageScore: true, startedAt: true, completedAt: true, noteIds: true, createdAt: true,
      },
    });
  }

  async submitAnswer(sessionId: string, userId: string, dto: SubmitAnswerDto) {
    // Verify ownership
    const session = await this.prisma.examSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'IN_PROGRESS') throw new BadRequestException('Exam already submitted');

    const question = await this.prisma.examQuestion.findFirst({
      where: { id: dto.questionId, sessionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.examQuestion.update({
      where: { id: dto.questionId },
      data: { userAnswer: dto.answer },
    });
  }

  async gradeAndComplete(sessionId: string, userId: string) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'COMPLETED') return this.getResults(sessionId, userId);

    const now = new Date();

    // Grade each question
    const mcqQuestions = session.questions.filter(q => q.questionType === 'MCQ');
    const saQuestions  = session.questions.filter(q => q.questionType === 'SHORT_ANSWER');

    // MCQ: deterministic
    const mcqGrades = mcqQuestions.map(q => ({
      id: q.id,
      isCorrect: q.userAnswer?.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase(),
      scoreAwarded: q.userAnswer?.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase() ? q.maxScore : 0,
      aiFeedback: q.userAnswer?.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
        ? 'Correct!'
        : `Incorrect. The correct answer is ${q.correctAnswer}.`,
    }));

    // SHORT_ANSWER: AI grading
    let saGrades: any[] = [];
    if (saQuestions.length > 0) {
      const toGrade = saQuestions
        .filter(q => q.userAnswer)
        .map(q => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer!,
        }));

      if (toGrade.length > 0) {
        const graded = await this.aiService.gradeShortAnswers(toGrade);
        saGrades = saQuestions.map(q => {
          const g = graded.find(x => x.questionNumber === q.questionNumber);
          if (!g || !q.userAnswer) {
            return { id: q.id, isCorrect: false, scoreAwarded: 0, aiFeedback: 'Not answered.' };
          }
          return {
            id: q.id,
            isCorrect: g.isCorrect,
            scoreAwarded: Math.round(g.scoreAwarded * q.maxScore * 100) / 100,
            aiFeedback: g.aiFeedback,
          };
        });
      } else {
        saGrades = saQuestions.map(q => ({ id: q.id, isCorrect: false, scoreAwarded: 0, aiFeedback: 'Not answered.' }));
      }
    }

    const allGrades = [...mcqGrades, ...saGrades];
    const totalScore = allGrades.reduce((s, g) => s + (g.scoreAwarded ?? 0), 0);
    const maxScore   = session.questions.reduce((s, q) => s + q.maxScore, 0);
    const pct        = maxScore > 0 ? Math.round((totalScore / maxScore) * 100 * 10) / 10 : 0;

    // Update in transaction
    await this.prisma.$transaction([
      ...allGrades.map(g =>
        this.prisma.examQuestion.update({
          where: { id: g.id },
          data: { scoreAwarded: g.scoreAwarded, isCorrect: g.isCorrect, aiFeedback: g.aiFeedback },
        }),
      ),
      this.prisma.examSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', completedAt: now, totalScore, maxScore, percentageScore: pct },
      }),
    ]);

    return this.getResults(sessionId, userId);
  }

  async getResults(sessionId: string, userId: string) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { orderBy: { questionNumber: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    // Find previous score on same note set for improvement tracking
    const previous = await this.prisma.examSession.findFirst({
      where: {
        userId,
        status: 'COMPLETED',
        id: { not: sessionId },
        noteIds: { hasSome: session.noteIds },
      },
      orderBy: { completedAt: 'desc' },
      select: { percentageScore: true },
    });

    return { ...session, previousScore: previous?.percentageScore ?? null };
  }

  async abandon(sessionId: string, userId: string) {
    const session = await this.prisma.examSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'ABANDONED' },
    });
  }

  // Strip correctAnswer from questions while exam is IN_PROGRESS
  private sanitizeForClient(session: any) {
    if (session.status !== 'IN_PROGRESS') return session;
    return {
      ...session,
      questions: session.questions.map((q: any) => {
        const { correctAnswer: _c, ...rest } = q;
        return rest;
      }),
    };
  }
}
