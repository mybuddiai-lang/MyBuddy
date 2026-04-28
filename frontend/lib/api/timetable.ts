import { apiClient } from './client';

export type TimetableStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface TimetableDaySlot {
  id: string;
  noteId: string;
  noteTitle: string;
  minutes: number;
  order: number;
}

export interface TimetableDay {
  id: string;
  dayNumber: number;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
  reminderId: string | null;
  slots: TimetableDaySlot[];
}

export interface StudyTimetable {
  id: string;
  title: string;
  examDate: string;
  hoursPerDay: number;
  status: TimetableStatus;
  noteIds: string[];
  createdAt: string;
  days: TimetableDay[];
}

export interface CreateTimetableDto {
  noteIds: string[];
  examDate?: string;
  hoursPerDay: number;
  title?: string;
  reminderTime?: string;
}

export const timetableApi = {
  async generate(dto: CreateTimetableDto): Promise<StudyTimetable> {
    const { data } = await apiClient.post('/timetable/generate', dto);
    return data.data ?? data;
  },
  async getActive(): Promise<StudyTimetable | null> {
    const { data } = await apiClient.get('/timetable/active');
    return data.data ?? null;
  },
  async getById(id: string): Promise<StudyTimetable> {
    const { data } = await apiClient.get(`/timetable/${id}`);
    return data.data ?? data;
  },
  async markDayComplete(dayId: string): Promise<TimetableDay> {
    const { data } = await apiClient.post(`/timetable/days/${dayId}/complete`);
    return data.data ?? data;
  },
  async regenerate(id: string, overrides?: Partial<CreateTimetableDto>): Promise<StudyTimetable> {
    const { data } = await apiClient.post(`/timetable/${id}/regenerate`, overrides ?? {});
    return data.data ?? data;
  },
  async archive(id: string): Promise<void> {
    await apiClient.delete(`/timetable/${id}`);
  },
};
