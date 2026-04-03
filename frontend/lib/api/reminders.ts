import { apiClient } from './client';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: 'RECALL' | 'BURNOUT' | 'EXAM' | 'GENERAL';
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;   // frontend alias for scheduledFor
  scheduledFor?: string; // backend field name
  createdAt: string;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  type?: Reminder['type'];
  scheduledFor: string;
}

export const remindersApi = {
  getAll: async (): Promise<Reminder[]> => {
    const { data } = await apiClient.get('/reminders');
    const items: any[] = data?.data ?? data ?? [];
    // Normalize scheduledFor → scheduledAt for frontend consistency
    return items.map((r: any) => ({ ...r, scheduledAt: r.scheduledAt ?? r.scheduledFor }));
  },

  create: async (dto: CreateReminderDto): Promise<Reminder> => {
    const { data } = await apiClient.post('/reminders', dto);
    return data?.data ?? data;
  },

  complete: async (reminderId: string): Promise<void> => {
    await apiClient.patch(`/reminders/${reminderId}/complete`);
  },

  delete: async (reminderId: string): Promise<void> => {
    await apiClient.delete(`/reminders/${reminderId}`);
  },
};
