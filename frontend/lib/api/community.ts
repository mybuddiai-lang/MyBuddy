import { apiClient } from './client';

export interface Community {
  id: string;
  name: string;
  description?: string;
  field: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: string;
  myRole?: 'ADMIN' | 'MEMBER';
}

export interface CommunityPost {
  id: string;
  content: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
  likesCount: number;
}

export interface CreateCommunityDto {
  name: string;
  description?: string;
  field: string;
  isPrivate?: boolean;
}

export interface CreatePostDto {
  content: string;
}

export const communityApi = {
  getAll: () =>
    apiClient.get<Community[]>('/community').then(r => r.data),

  getMy: () =>
    apiClient.get<Community[]>('/community/my').then(r => r.data),

  create: (data: CreateCommunityDto) =>
    apiClient.post<Community>('/community', data).then(r => r.data),

  join: (communityId: string) =>
    apiClient.post(`/community/${communityId}/join`).then(r => r.data),

  leave: (communityId: string) =>
    apiClient.delete(`/community/${communityId}/leave`).then(r => r.data),

  getPosts: (communityId: string) =>
    apiClient.get<CommunityPost[]>(`/community/${communityId}/posts`).then(r => r.data),

  createPost: (communityId: string, data: CreatePostDto) =>
    apiClient.post<CommunityPost>(`/community/${communityId}/posts`, data).then(r => r.data),
};
