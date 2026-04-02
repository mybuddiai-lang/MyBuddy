import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sentimentScore?: number;
  createdAt: string;
}

export const chatApi = {
  async sendMessage(content: string): Promise<ChatMessage> {
    const { data } = await apiClient.post('/chat/message', { content });
    return data.data;
  },
  async getHistory(page = 1, limit = 30): Promise<{ messages: ChatMessage[]; total: number }> {
    const { data } = await apiClient.get('/chat/history', { params: { page, limit } });
    return data.data;
  },
  async clearHistory(): Promise<void> {
    await apiClient.delete('/chat/history');
  },
};
