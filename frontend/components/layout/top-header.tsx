'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/home': 'Buddi',
  '/chat': 'Chat',
  '/slides': 'Slides',
  '/recall': 'Recall',
  '/community': 'Community',
  '/profile': 'Profile',
};

export function TopHeader() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || 'Buddi';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-zinc-100 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {pathname === '/home' || pathname === '/chat' ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <span className="text-lg font-bold text-zinc-900">{title}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-zinc-900">{title}</span>
          )}
        </div>
        <button className="w-9 h-9 rounded-full bg-zinc-50 flex items-center justify-center hover:bg-zinc-100 transition relative">
          <Bell size={18} className="text-zinc-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-white" />
        </button>
      </div>
    </header>
  );
}
