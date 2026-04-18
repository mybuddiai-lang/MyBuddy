import { apiClient } from './client';
import { uploadToR2 } from './upload';

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
    // Step 1: Upload directly from browser to R2 (Railway can't connect to R2)
    const { url: publicUrl } = await uploadToR2(file, { maxBytes: 50 * 1024 * 1024 });

    // Step 2: Register with backend — creates note record & triggers AI processing
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    const res = await fetch('/api/backend/files/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        publicUrl,
        originalFilename: file.name,
        contentType: file.type || 'application/octet-stream',
        title: file.name.replace(/\.[^/.]+$/, ''),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error((err as any).message || 'Upload registration failed'), {
        response: { status: res.status, data: err },
      });
    }
    const data = await res.json();
    return (data.data ?? data) as Note;
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
