import type { AdminUser } from './types';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'ANALYST'];

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function hasAdminAccess(user: AdminUser | null): boolean {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
}

export function login(token: string, user: AdminUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  // Set a cookie for middleware to detect presence
  document.cookie = `admin_token=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  document.cookie = 'admin_token=; path=/; max-age=0';
}
