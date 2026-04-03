import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
console.log('ENV URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('BASE URL:', BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('buddi_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — refresh or redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('buddi_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('buddi_access_token', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('buddi_refresh_token', data.data.refreshToken);
        }
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('buddi_access_token');
        localStorage.removeItem('buddi_refresh_token');
        // Clear Zustand persisted auth state so middleware cookie check doesn't bounce back
        localStorage.removeItem('buddi-auth');
        document.cookie = 'buddi_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
