import { apiClient } from './client';

export interface Reminder {
  id: string;
  title: string;
  body?: string;
  type: 'SPACED_REPETITION' | 'EXAM_COUNTDOWN' | 'GENERAL' | 'BURNOUT_CHECK';
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  createdAt: string;
}

export interface CreateReminderDto {
  title: string;
  body?: string;
  type?: Reminder['type'];
  scheduledAt: string;
}

export const remindersApi = {
  getAll: () =>
    apiClient.get<Reminder[]>('/reminders').then(r => r.data),

  create: (data: CreateReminderDto) =>
    apiClient.post<Reminder>('/reminders', data).then(r => r.data),

  complete: (reminderId: string) =>
    apiClient.patch<Reminder>(`/reminders/${reminderId}/complete`).then(r => r.data),

  delete: (reminderId: string) =>
    apiClient.delete(`/reminders/${reminderId}`).then(r => r.data),
};
