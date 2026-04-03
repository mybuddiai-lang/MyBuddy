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
  // All methods return the full axios response so callers can do res?.data to get the transform wrapper's data field
  getAll: () => apiClient.get('/community'),
  getMy: () => apiClient.get('/community/my'),
  create: (data: CreateCommunityDto) => apiClient.post('/community', data),
  join: (communityId: string) => apiClient.post(`/community/${communityId}/join`),
  leave: (communityId: string) => apiClient.delete(`/community/${communityId}/leave`),
  getPosts: (communityId: string) => apiClient.get(`/community/${communityId}/posts`),
  createPost: (communityId: string, data: CreatePostDto) =>
    apiClient.post(`/community/${communityId}/posts`, data),
};
