'use client';

import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, CreditCard, Shield, ChevronRight, Flame, Brain, Target, Star } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const daysUntilExam = user?.examDate
    ? differenceInDays(new Date(user.examDate), new Date())
    : null;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const SETTINGS = [
    { icon: Bell, label: 'Notifications', desc: 'Reminders and alerts', href: '/profile/notifications' },
    { icon: CreditCard, label: 'Subscription', desc: user?.subscriptionTier === 'FREE' ? 'Free tier — Upgrade' : 'Premium', href: '/profile/subscription' },
    { icon: Shield, label: 'Privacy & Security', desc: 'Data and account', href: '/profile/security' },
  ];

  return (
    <div className="px-4 py-4 space-y-5 pb-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-card"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-brand-600">{initials}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{user?.name || 'Student'}</h2>
            <p className="text-sm text-zinc-500">{user?.school || 'University'}</p>
            <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              user?.subscriptionTier === 'PREMIUM' ? 'bg-amber-100 text-amber-700' :
              user?.subscriptionTier === 'INSTITUTIONAL' ? 'bg-purple-100 text-purple-700' :
              'bg-zinc-100 text-zinc-500'
            }`}>
              {user?.subscriptionTier || 'FREE'}
            </span>
          </div>
        </div>

        {/* Exam countdown */}
        {daysUntilExam !== null && daysUntilExam > 0 && (
          <div className="mt-4 bg-brand-50 rounded-xl p-3 flex items-center gap-3">
            <Target size={18} className="text-brand-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-700">{daysUntilExam} days until exam</p>
              <p className="text-xs text-brand-500">Keep going — you've got this!</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, value: user?.studyStreak ?? 0, label: 'Day streak', color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Brain, value: Math.round(user?.resilienceScore ?? 50), label: 'Resilience', color: 'text-brand-500', bg: 'bg-brand-50' },
          { icon: Star, value: user?.studyStreak ? `${Math.min(100, user.studyStreak * 5)}%` : '0%', label: 'Mastery avg', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map(({ icon: Icon, value, label, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className={`${bg} rounded-2xl p-4 text-center`}
          >
            <Icon size={20} className={`${color} mx-auto mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-card divide-y divide-zinc-50">
        {SETTINGS.map(({ icon: Icon, label, desc, href }) => (
          <button key={label} onClick={() => router.push(href)} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 transition text-left">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">{label}</p>
              <p className="text-xs text-zinc-400">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-zinc-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition"
      >
        <LogOut size={16} /> Sign Out
      </button>

      <p className="text-center text-xs text-zinc-300">Buddi v2.0 · Student Resilience Infrastructure</p>
    </div>
  );
}
