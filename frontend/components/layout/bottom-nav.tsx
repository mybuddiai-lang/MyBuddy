'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, BookOpen, Brain, Users, User } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/slides', icon: BookOpen, label: 'Slides' },
  { href: '/recall', icon: Brain, label: 'Recall' },
  { href: '/community', icon: Users, label: 'Community' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2" style={{ height: '64px' }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition min-w-0',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} className="transition" />
              <span className={clsx('text-[10px] font-medium truncate', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-500')}>
                {label}
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-brand-500 absolute bottom-2" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
