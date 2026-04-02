import { apiClient } from './client';

export interface RecallCard {
  id: string;
  question: string;
  answer: string;
  noteChunkId: string;
}

export interface RecallStats {
  totalCards: number;
  dueToday: number;
  masteredCards: number;
  averageAccuracy: number;
}

export const recallApi = {
  async getDueCards(): Promise<RecallCard[]> {
    const { data } = await apiClient.get('/recall/due-cards');
    return data.data;
  },
  async startSession(): Promise<{ sessionId: string }> {
    const { data } = await apiClient.post('/recall/session/start');
    return data.data;
  },
  async submitAnswer(sessionId: string, cardId: string, result: 'easy' | 'medium' | 'hard'): Promise<void> {
    await apiClient.post(`/recall/session/${sessionId}/answer`, { cardId, result });
  },
  async completeSession(sessionId: string): Promise<void> {
    await apiClient.post(`/recall/session/${sessionId}/complete`);
  },
  async getStats(): Promise<RecallStats> {
    const { data } = await apiClient.get('/recall/stats');
    return data.data;
  },
};
