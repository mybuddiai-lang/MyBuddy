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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data ?? r.data),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getOverview: () => api.get('/admin/dashboard').then((r) => r.data),
  getSignupTrend: (days = 7) =>
    api.get(`/admin/dashboard/signup-trend?days=${days}`).then((r) => r.data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  countries: () => api.get('/admin/analytics/countries').then((r) => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (page = 1, limit = 20, search = '') =>
    api
      .get(
        `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      )
      .then((r) => r.data),
  detail: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data),
  updateRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  block: (id: string) => api.post(`/admin/users/${id}/block`).then((r) => r.data),
  unblock: (id: string) => api.post(`/admin/users/${id}/unblock`).then((r) => r.data),
  delete: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),
};

// ─── Admin Management ─────────────────────────────────────────────────────────
export const adminsApi = {
  list: () => api.get('/admin/admins').then((r) => r.data),
  create: (dto: { name: string; email: string; password: string; role: string }) =>
    api.post('/admin/admins', dto).then((r) => r.data),
};

// ─── Mental Health ────────────────────────────────────────────────────────────
export const mentalHealthApi = {
  getStats: () => api.get('/admin/mental-health').then((r) => r.data),
};

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referralsApi = {
  getStats: () => api.get('/admin/referrals').then((r) => r.data),
};

// ─── Monetization ─────────────────────────────────────────────────────────────
export const monetizationApi = {
  getStats: () => api.get('/admin/monetization').then((r) => r.data),
};

// ─── Professionals ────────────────────────────────────────────────────────────
export const professionalsApi = {
  list: (page = 1, limit = 20) =>
    api.get(`/admin/professionals?page=${page}&limit=${limit}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/admin/professionals', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/professionals/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/admin/professionals/${id}`).then((r) => r.data),
};

// ─── Operations ───────────────────────────────────────────────────────────────
export const operationsApi = {
  getActivity: (limit = 50) =>
    api.get(`/admin/operations/activity?limit=${limit}`).then((r) => r.data),
  lookupUser: (q: string) =>
    api.get(`/admin/operations/lookup?q=${encodeURIComponent(q)}`).then((r) => r.data),
};

// ─── AI Monitoring ────────────────────────────────────────────────────────────
export const aiApi = {
  getStats: (days = 30) => api.get(`/admin/ai?days=${days}`).then((r) => r.data),
};

// ─── System ───────────────────────────────────────────────────────────────────
export const systemApi = {
  getHealth: () => api.get('/admin/system').then((r) => r.data),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  export: (type: 'users' | 'subscriptions' | 'activity') =>
    api.get(`/admin/reports/export?type=${type}`).then((r) => r.data),
};
