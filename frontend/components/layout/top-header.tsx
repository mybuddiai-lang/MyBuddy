'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const ROOT_TITLES: Record<string, string> = {
  '/home': 'Buddi',
  '/chat': 'Chat',
  '/slides': 'Slides',
  '/recall': 'Recall',
  '/community': 'Community',
  '/profile': 'Profile',
  '/leaderboard': 'Leaderboard',
};

function getPageTitle(pathname: string): { title: string; showBack: boolean; backHref?: string } {
  if (ROOT_TITLES[pathname]) {
    return { title: ROOT_TITLES[pathname], showBack: false };
  }
  if (pathname.startsWith('/profile/notifications')) return { title: 'Notifications', showBack: true, backHref: '/profile' };
  if (pathname.startsWith('/profile/security')) return { title: 'Privacy & Security', showBack: true, backHref: '/profile' };
  if (pathname.startsWith('/profile/subscription')) return { title: 'Subscription', showBack: true, backHref: '/profile' };
  if (pathname.startsWith('/community/')) return { title: 'Study Pod', showBack: true, backHref: '/community' };
  if (pathname.startsWith('/slides/')) return { title: 'Note Details', showBack: true, backHref: '/slides' };
  if (pathname === '/leaderboard') return { title: 'Leaderboard', showBack: false };
  return { title: 'Buddi', showBack: false };
}

export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { title, showBack, backHref } = getPageTitle(pathname);
  const isHome = pathname === '/home' || pathname === '/chat';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => backHref ? router.push(backHref) : router.back()}
              className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition mr-1"
            >
              <ArrowLeft size={16} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          )}
          {isHome ? (
            <img src="/icons/logo.svg" alt="Buddi" className="h-6" />
          ) : (
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile/notifications"
            className="w-9 h-9 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition relative"
          >
            <Bell size={18} className="text-zinc-600 dark:text-zinc-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-white dark:border-zinc-900" />
          </Link>
        </div>
      </div>
    </header>
  );
}
