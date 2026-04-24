'use client';
import { getUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import type { AdminUser } from '@/lib/types';
import { Menu } from 'lucide-react';

const roleBadgeColor: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-500/20 text-violet-300',
  ADMIN: 'bg-blue-500/20 text-blue-300',
  ANALYST: 'bg-emerald-500/20 text-emerald-300',
  SUPPORT: 'bg-amber-500/20 text-amber-300',
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-3 sticky top-0 z-10 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden lg:block flex-1" />

      {/* Right side: role badge + user */}
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
              roleBadgeColor[user.role] ?? 'bg-zinc-700 text-zinc-300'
            }`}
          >
            {user.role}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm text-zinc-300 truncate max-w-[120px]">
              {user.name}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
