import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/auth';

const COOKIE_NAME = 'buddi_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; SameSite=Lax; max-age=${COOKIE_MAX_AGE}`;
}

function clearCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('buddi_access_token', accessToken);
          if (refreshToken) localStorage.setItem('buddi_refresh_token', refreshToken);
          setCookie('1'); // Signal to middleware that user is authenticated
        }
        set({ user, accessToken, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('buddi_access_token');
          localStorage.removeItem('buddi_refresh_token');
          clearCookie();
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'buddi-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-sync cookie with persisted auth state after hydration
        if (state?.isAuthenticated) {
          setCookie('1');
        }
      },
    }
  )
);
