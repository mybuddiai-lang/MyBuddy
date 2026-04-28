import { apiClient } from './client';

export type ExamType = 'MCQ' | 'SHORT_ANSWER' | 'MIXED';
export type ExamDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface ExamOption { label: string; text: string; }

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  questionType: 'MCQ' | 'SHORT_ANSWER';
  questionText: string;
  options: ExamOption[] | null;
  correctAnswer?: string; // hidden while IN_PROGRESS
  userAnswer: string | null;
  scoreAwarded: number | null;
  maxScore: number;
  aiFeedback: string | null;
  isCorrect: boolean | null;
}

export interface ExamSession {
  id: string;
  title: string;
  examType: ExamType;
  difficulty: ExamDifficulty;
  questionCount: number;
  timeLimitMins: number | null;
  status: ExamSessionStatus;
  totalScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  startedAt: string;
  completedAt: string | null;
  noteIds: string[];
  createdAt: string;
  questions: ExamQuestion[];
  previousScore?: number | null;
}

export interface CreateExamDto {
  noteIds: string[];
  examType: ExamType;
  difficulty: ExamDifficulty;
  questionCount: 5 | 10 | 15;
  timeLimitMins?: number;
  title?: string;
}

export const examApi = {
  async generate(dto: CreateExamDto): Promise<ExamSession> {
    const { data } = await apiClient.post('/exam/generate', dto);
    return data.data ?? data;
  },
  async getSessions(): Promise<ExamSession[]> {
    const { data } = await apiClient.get('/exam/sessions');
    return data.data ?? data ?? [];
  },
  async getSession(id: string): Promise<ExamSession> {
    const { data } = await apiClient.get(`/exam/sessions/${id}`);
    return data.data ?? data;
  },
  async submitAnswer(sessionId: string, questionId: string, answer: string): Promise<void> {
    await apiClient.post(`/exam/sessions/${sessionId}/answer`, { questionId, answer });
  },
  async submitExam(sessionId: string): Promise<ExamSession> {
    const { data } = await apiClient.post(`/exam/sessions/${sessionId}/submit`);
    return data.data ?? data;
  },
  async getResults(sessionId: string): Promise<ExamSession> {
    const { data } = await apiClient.get(`/exam/sessions/${sessionId}/results`);
    return data.data ?? data;
  },
  async abandon(sessionId: string): Promise<void> {
    await apiClient.delete(`/exam/sessions/${sessionId}`);
  },
};
