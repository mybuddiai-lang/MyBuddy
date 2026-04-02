import { apiClient } from './client';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto {
  name: string; email: string; password: string;
  school?: string; department?: string; specialization?: string; examDate?: string;
}
export interface User {
  id: string; name: string; email: string; school?: string; department?: string;
  specialization?: string; examDate?: string; subscriptionTier: string;
  studyStreak: number; resilienceScore: number;
}

export const authApi = {
  async login(dto: LoginDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { data } = await apiClient.post('/auth/login', dto);
    return data.data;
  },
  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { data } = await apiClient.post('/auth/register', dto);
    return data.data;
  },
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
  async me(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
};
