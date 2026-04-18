import { apiClient } from './client';
import { uploadViaProxy } from './upload';

export interface Community {
  id: string;
  name: string;
  description?: string;
  field: string;
  memberCount: number;
  isPublic: boolean;
  requiresApproval: boolean;
  createdAt: string;
  myRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
}

export interface CommunityMember {
  id: string;
  userId: string;
  communityId: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  user: { id: string; name: string };
}

export interface CommunityPost {
  id: string;
  content: string;
  authorId: string;
  author: { id: string; name: string };
  attachmentUrl?: string;
  attachmentType?: 'FILE' | 'IMAGE' | 'VOICE';
  /** Local blob URL — only populated for optimistic posts in the current session */
  previewUrl?: string;
  likesCount: number;
  commentsCount: number;
  repliesCount: number;
  createdAt: string;
}

export interface CommunityPostReply {
  id: string;
  postId: string;
  authorId: string;
  author: { id: string; name: string };
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'FILE' | 'IMAGE' | 'VOICE';
  /** Local blob URL — only populated for optimistic replies in the current session */
  previewUrl?: string;
  createdAt: string;
}

export interface CommunityPollOption {
  id: string;
  text: string;
  votesCount: number;
  votedByMe: boolean;
}

export interface CommunityPoll {
  id: string;
  communityId: string;
  authorId: string;
  author: { id: string; name: string };
  question: string;
  endsAt?: string;
  createdAt: string;
  options: CommunityPollOption[];
  myVotedOptionId: string | null;
}

export interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { id: string; name: string };
}

export interface CreateCommunityDto {
  name: string;
  description?: string;
  field: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
}

export interface CreatePostDto {
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'FILE' | 'IMAGE' | 'VOICE';
}

export interface CreateReplyDto {
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'FILE' | 'IMAGE' | 'VOICE';
}

export const communityApi = {
  // Communities
  getAll: () => apiClient.get('/community'),
  getMy: () => apiClient.get('/community/my'),
  create: (data: CreateCommunityDto) => apiClient.post('/community', data),
  getOne: (communityId: string) => apiClient.get(`/community/${communityId}`),
  join: (communityId: string) => apiClient.post(`/community/${communityId}/join`),
  leave: (communityId: string) => apiClient.delete(`/community/${communityId}/leave`),

  // Members
  getMembers: (communityId: string) => apiClient.get(`/community/${communityId}/members`),
  assignRole: (communityId: string, userId: string, role: 'MEMBER' | 'MODERATOR' | 'ADMIN') =>
    apiClient.patch(`/community/${communityId}/members/${userId}/role`, { role }),
  removeMember: (communityId: string, userId: string) =>
    apiClient.delete(`/community/${communityId}/members/${userId}`),

  // Join requests
  getJoinRequests: (communityId: string) => apiClient.get(`/community/${communityId}/join-requests`),
  approveJoinRequest: (communityId: string, requestId: string) =>
    apiClient.post(`/community/${communityId}/join-requests/${requestId}/approve`),
  rejectJoinRequest: (communityId: string, requestId: string) =>
    apiClient.post(`/community/${communityId}/join-requests/${requestId}/reject`),

  // Posts
  getPosts: (communityId: string) => apiClient.get(`/community/${communityId}/posts`),
  createPost: (communityId: string, data: CreatePostDto) =>
    apiClient.post(`/community/${communityId}/posts`, data),
  deletePost: (communityId: string, postId: string) =>
    apiClient.delete(`/community/${communityId}/posts/${postId}`),
  likePost: (communityId: string, postId: string) =>
    apiClient.post(`/community/${communityId}/posts/${postId}/like`),
  unlikePost: (communityId: string, postId: string) =>
    apiClient.delete(`/community/${communityId}/posts/${postId}/like`),

  // Replies
  getReplies: (communityId: string, postId: string) =>
    apiClient.get(`/community/${communityId}/posts/${postId}/replies`),
  createReply: (communityId: string, postId: string, data: CreateReplyDto) =>
    apiClient.post(`/community/${communityId}/posts/${postId}/replies`, data),
  deleteReply: (communityId: string, postId: string, replyId: string) =>
    apiClient.delete(`/community/${communityId}/posts/${postId}/replies/${replyId}`),

  // Browser uploads directly to Cloudflare R2 via a backend-generated pre-signed URL.
  // Requires R2 CORS: Cloudflare Dashboard → R2 → buddi-bucket → Settings → CORS
  // AllowedOrigins: ["*"]  AllowedMethods: ["PUT"]  AllowedHeaders: ["*"]
  uploadAttachment: (file: File) => uploadViaProxy(file),

  // Polls
  getPolls: (communityId: string) => apiClient.get(`/community/${communityId}/polls`),
  createPoll: (communityId: string, data: { question: string; options: string[]; endsAt?: string }) =>
    apiClient.post(`/community/${communityId}/polls`, data),
  votePoll: (communityId: string, pollId: string, optionId: string) =>
    apiClient.post(`/community/${communityId}/polls/${pollId}/vote`, { optionId }),
};
