import axios from 'axios';
import { getToken, logout } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      logout();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Helper: unwrap NestJS response envelope { success, data, timestamp }
const unwrap = <T>(r: { data: { data?: T } | T }): T => {
  const outer = r.data as { data?: T };
  return (outer?.data ?? r.data) as T;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(unwrap),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getOverview: () => api.get('/admin/dashboard').then(unwrap),
  getSignupTrend: (days = 7) =>
    api.get(`/admin/dashboard/signup-trend?days=${days}`).then(unwrap),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  countries: () => api.get('/admin/analytics/countries').then(unwrap),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (page = 1, limit = 20, search = '') =>
    api
      .get(
        `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      )
      .then(unwrap),
  detail: (id: string) => api.get(`/admin/users/${id}`).then(unwrap),
  updateRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }).then(unwrap),
  block: (id: string) => api.post(`/admin/users/${id}/block`).then(unwrap),
  unblock: (id: string) => api.post(`/admin/users/${id}/unblock`).then(unwrap),
  delete: (id: string) => api.delete(`/admin/users/${id}`).then(unwrap),
};

// ─── Admin Management ─────────────────────────────────────────────────────────
export const adminsApi = {
  list: () => api.get('/admin/admins').then(unwrap),
  create: (dto: { name: string; email: string; password: string; role: string }) =>
    api.post('/admin/admins', dto).then(unwrap),
};

// ─── Mental Health ────────────────────────────────────────────────────────────
export const mentalHealthApi = {
  getStats: () => api.get('/admin/mental-health').then(unwrap),
};

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referralsApi = {
  getStats: () => api.get('/admin/referrals').then(unwrap),
};

// ─── Monetization ─────────────────────────────────────────────────────────────
export const monetizationApi = {
  getStats: () => api.get('/admin/monetization').then(unwrap),
};

// ─── Professionals ────────────────────────────────────────────────────────────
export const professionalsApi = {
  list: (page = 1, limit = 20) =>
    api.get(`/admin/professionals?page=${page}&limit=${limit}`).then(unwrap),
  create: (data: Record<string, unknown>) =>
    api.post('/admin/professionals', data).then(unwrap),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/professionals/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete(`/admin/professionals/${id}`).then(unwrap),
};

// ─── Operations ───────────────────────────────────────────────────────────────
export const operationsApi = {
  getActivity: (limit = 50) =>
    api.get(`/admin/operations/activity?limit=${limit}`).then(unwrap),
  lookupUser: (q: string) =>
    api.get(`/admin/operations/lookup?q=${encodeURIComponent(q)}`).then(unwrap),
};

// ─── AI Monitoring ────────────────────────────────────────────────────────────
export const aiApi = {
  getStats: (days = 30) => api.get(`/admin/ai?days=${days}`).then(unwrap),
};

// ─── System ───────────────────────────────────────────────────────────────────
export const systemApi = {
  getHealth: () => api.get('/admin/system').then(unwrap),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  export: (type: 'users' | 'subscriptions' | 'activity') =>
    api.get(`/admin/reports/export?type=${type}`).then(unwrap),
};
