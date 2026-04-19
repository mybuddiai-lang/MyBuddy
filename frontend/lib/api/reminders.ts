import { apiClient } from './client';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: 'RECALL' | 'STUDY' | 'BREAK' | 'EXAM';
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'SKIPPED';
  scheduledAt: string;   // frontend alias for scheduledFor
  scheduledFor?: string; // backend field name
  difficultyLevel?: number;
  noteId?: string;
  note?: { id: string; title: string } | null;
  snoozeCount?: number;
  createdAt: string;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  type?: Reminder['type'];
  scheduledFor: string; // ISO date string
  difficultyLevel?: number;
  noteId?: string;
}

function normalise(r: any): Reminder {
  return { ...r, scheduledAt: r.scheduledAt ?? r.scheduledFor };
}

export const remindersApi = {
  getAll: async (): Promise<Reminder[]> => {
    const { data } = await apiClient.get('/reminders');
    const items: any[] = data?.data ?? data ?? [];
    return items.map(normalise);
  },

  create: async (dto: CreateReminderDto): Promise<Reminder> => {
    const { data } = await apiClient.post('/reminders', dto);
    return normalise(data?.data ?? data);
  },

  update: async (reminderId: string, dto: Partial<CreateReminderDto>): Promise<Reminder> => {
    const { data } = await apiClient.put(`/reminders/${reminderId}`, dto);
    return normalise(data?.data ?? data);
  },

  // Backend uses POST — not PATCH
  complete: async (reminderId: string): Promise<void> => {
    await apiClient.post(`/reminders/${reminderId}/complete`);
  },

  snooze: async (reminderId: string, hours: number): Promise<Reminder> => {
    const { data } = await apiClient.post(`/reminders/${reminderId}/snooze`, { hours });
    return normalise(data?.data ?? data);
  },

  skip: async (reminderId: string): Promise<void> => {
    await apiClient.post(`/reminders/${reminderId}/skip`);
  },

  delete: async (reminderId: string): Promise<void> => {
    await apiClient.delete(`/reminders/${reminderId}`);
  },
};
