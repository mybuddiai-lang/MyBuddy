'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  LayoutDashboard, Users, BarChart2, Bell, LogOut, Shield,
  Heart, ArrowUpRight, DollarSign, UserCheck, Radio,
  Cpu, Server, Download, Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
    ],
  },
  {
    label: 'Wellbeing',
    items: [
      { href: '/admin/mental-health', icon: Heart, label: 'Mental Health' },
      { href: '/admin/referrals', icon: ArrowUpRight, label: 'Referrals' },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/admin/monetization', icon: DollarSign, label: 'Monetization' },
      { href: '/admin/professionals', icon: UserCheck, label: 'Professionals' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/users', icon: Users, label: 'Users' },
      { href: '/admin/operations', icon: Radio, label: 'Operations' },
      { href: '/admin/alerts', icon: Bell, label: 'Alerts' },
      { href: '/admin/ai-monitoring', icon: Cpu, label: 'AI Monitor' },
      { href: '/admin/system', icon: Server, label: 'System Health' },
      { href: '/admin/reports', icon: Download, label: 'Reports' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.role !== 'ADMIN') {
      router.replace('/home');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Buddi Admin</p>
              <p className="text-zinc-500 text-xs">Control panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, icon: Icon, label }) => {
                  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition',
                        active
                          ? 'bg-brand-500 text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
                      )}
                    >
                      <Icon size={15} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-zinc-300 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
