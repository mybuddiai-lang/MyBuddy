'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { logout } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ShieldHalf,
  CreditCard,
  Stethoscope,
  Activity,
  Bot,
  Server,
  FileBarChart,
  LogOut,
  X,
  ShieldCheck,
  Lock,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/admins', label: 'Admin Users', icon: ShieldCheck },
  { href: '/dashboard/mental-health', label: 'Early Outcomes', icon: FlaskConical },
  { href: '/dashboard/referrals', label: 'Safety & Referrals', icon: ShieldHalf },
  { href: '/dashboard/monetization', label: 'Revenue', icon: CreditCard },
  { href: '/dashboard/professionals', label: 'Professionals', icon: Stethoscope },
  { href: '/dashboard/operations', label: 'Operations', icon: Activity },
  { href: '/dashboard/ai-monitoring', label: 'AI Monitoring', icon: Bot },
  { href: '/dashboard/system', label: 'System', icon: Server },
  { href: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
  { href: '/dashboard/compliance', label: 'Compliance', icon: Lock },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const content = (
    <div className="w-60 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Buddi</p>
            <p className="text-zinc-500 text-xs mt-0.5">Admin Console</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden text-zinc-500 hover:text-white transition-colors p-1 rounded"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-600/15 text-violet-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-950/20 w-full transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden lg:flex flex-shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile: fixed overlay sidebar */}
      <aside
        className={clsx(
          'lg:hidden fixed inset-y-0 left-0 z-50 flex flex-shrink-0 transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {content}
      </aside>
    </>
  );
}
