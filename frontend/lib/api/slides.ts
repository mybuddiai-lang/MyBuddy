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

// Multipart uploads go through the Next.js proxy at /api/backend.
// The proxy now streams the body directly (req.body as ReadableStream)
// which correctly preserves multipart/form-data boundaries in Next.js 15.
async function directUpload(path: string, form: FormData): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
  const res = await fetch(`/api/backend${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || 'Upload failed'), { response: { status: res.status, data: err } });
  }
  return res.json();
}

export const slidesApi = {
  async upload(file: File): Promise<Note> {
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace(/\.[^/.]+$/, ''));
    const data = await directUpload('/files/upload', form);
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
