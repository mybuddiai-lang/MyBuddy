import { apiClient } from './client';
import type { User } from './auth';

export interface UserStats {
  noteCount: number;
  pendingReminders: number;
  dueReminders: number;
  recallSessions: number;
  studyStreak: number;
  resilienceScore: number;
}

export interface UpdateProfileDto {
  name?: string;
  school?: string;
  department?: string;
  specialization?: string;
  examDate?: string;
}

export const usersApi = {
  async updateProfile(dto: UpdateProfileDto): Promise<User> {
    const { data } = await apiClient.put('/users/profile', dto);
    return data.data;
  },

  async getStats(): Promise<UserStats> {
    const { data } = await apiClient.get('/users/stats');
    return data.data;
  },

  async getVapidPublicKey(): Promise<string> {
    const { data } = await apiClient.get('/push/vapid-public-key');
    return data.data.publicKey;
  },

  async subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
    await apiClient.post('/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
  },

  async unsubscribePush(endpoint: string): Promise<void> {
    await apiClient.delete('/push/unsubscribe', { data: { endpoint } });
  },
};
