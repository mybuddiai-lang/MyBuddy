import { apiClient } from './client';

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
  isQuiz: boolean;
  /** Only present after quiz timer expires (null while quiz is active) */
  correctOptionId: string | null;
  /** Total vote count across all options */
  totalVotes: number;
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

  // Uses the exact same upload mechanism as slides (/files/upload via directUpload pattern).
  // Browser POSTs multipart form-data directly to Railway, bypassing the Vercel proxy.
  // Returns { url, type } extracted from the Note the backend creates.
  uploadAttachment: async (file: File): Promise<{ url: string; type: 'IMAGE' | 'FILE' | 'VOICE' }> => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace(/\.[^/.]+$/, ''));
    const res = await fetch(`${backendUrl}/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.message || 'Upload failed'), { response: { status: res.status, data: err } });
    }
    const json = await res.json();
    const note = json.data ?? json;
    // A relative fileUrl (starts with '/') means R2 silently failed and the
    // backend stored a local server path that doesn't exist — return a clear
    // error instead of saving a broken URL in the community post.
    if (!note.fileUrl || !note.fileUrl.startsWith('http')) {
      throw new Error('File uploaded but could not be stored. Please try again.');
    }
    const ft: string = note.fileType ?? '';
    const type: 'IMAGE' | 'FILE' | 'VOICE' = ft === 'IMAGE' ? 'IMAGE' : ft === 'VOICE' ? 'VOICE' : 'FILE';
    return { url: note.fileUrl, type };
  },

  // Polls & Quizzes
  getPolls: (communityId: string) => apiClient.get(`/community/${communityId}/polls`),
  createPoll: (communityId: string, data: {
    question: string;
    options: string[];
    endsAt?: string;
    isQuiz?: boolean;
    correctOptionText?: string;
  }) => apiClient.post(`/community/${communityId}/polls`, data),
  votePoll: (communityId: string, pollId: string, optionId: string) =>
    apiClient.post(`/community/${communityId}/polls/${pollId}/vote`, { optionId }),
  deletePoll: (communityId: string, pollId: string) =>
    apiClient.delete(`/community/${communityId}/polls/${pollId}`),
};
