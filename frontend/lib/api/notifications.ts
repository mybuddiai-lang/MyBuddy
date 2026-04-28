import { apiClient } from './client';

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  url?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: async (): Promise<{ notifications: UserNotification[]; unreadCount: number }> => {
    const { data } = await apiClient.get('/notifications');
    const payload = data?.data ?? data;
    return {
      notifications: payload?.notifications ?? [],
      unreadCount: payload?.unreadCount ?? 0,
    };
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  deleteAll: async (): Promise<void> => {
    await apiClient.delete('/notifications');
  },
};
