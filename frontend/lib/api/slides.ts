import { apiClient } from './client';

export interface Note {
  id: string;
  title: string;
  originalFilename?: string;
  fileType: string;
  processingStatus: string;
  masteryLevel: number;
  summary?: string;
  createdAt: string;
}

export const slidesApi = {
  async upload(file: File): Promise<Note> {
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace(/\.[^/.]+$/, ''));
    // Do NOT set Content-Type manually — Axios/browser must auto-set it with the multipart boundary
    const { data } = await apiClient.post('/files/upload', form);
    return data.data;
  },
  async getAll(): Promise<Note[]> {
    const { data } = await apiClient.get('/files');
    return data.data;
  },
  async getById(id: string): Promise<Note> {
    const { data } = await apiClient.get(`/files/${id}`);
    return data.data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },
};
