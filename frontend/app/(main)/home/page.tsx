'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, BookOpen, Brain, Flame, Target, TrendingUp, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { differenceInDays, format } from 'date-fns';

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every expert was once a beginner. Keep going.",
  "Pressure makes diamonds. You've got this.",
];

export default function HomePage() {
  const { user } = useAuthStore();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const daysUntilExam = user?.examDate
    ? differenceInDays(new Date(user.examDate), new Date())
    : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-zinc-500 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-zinc-900">{firstName} 👋</h1>
      </motion.div>

      {/* Exam countdown */}
      {daysUntilExam !== null && daysUntilExam > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-100 text-xs font-medium">Next exam in</p>
              <p className="text-3xl font-bold mt-0.5">{daysUntilExam} days</p>
              <p className="text-brand-100 text-xs mt-1">Stay consistent — you've got this!</p>
            </div>
            <Target size={40} className="text-brand-200 opacity-50" />
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, value: user?.studyStreak ?? 0, label: 'Day streak', color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Brain, value: '12', label: 'Cards due', color: 'text-brand-500', bg: 'bg-brand-50' },
          { icon: TrendingUp, value: `${Math.round(user?.resilienceScore ?? 50)}`, label: 'Resilience', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ icon: Icon, value, label, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className={`${bg} rounded-2xl p-4 text-center`}
          >
            <Icon size={18} className={`${color} mx-auto mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/chat', icon: MessageCircle, title: 'Chat with Buddi', desc: 'Talk, ask, vent', color: 'from-brand-50 to-brand-100', iconColor: 'text-brand-600' },
            { href: '/recall', icon: Brain, title: 'Quick Recall', desc: '12 cards waiting', color: 'from-violet-50 to-violet-100', iconColor: 'text-violet-600' },
            { href: '/slides', icon: BookOpen, title: 'Upload Notes', desc: 'Add new material', color: 'from-zinc-50 to-zinc-100', iconColor: 'text-zinc-600' },
            { href: '/community', icon: Clock, title: 'Study Pods', desc: 'Join your group', color: 'from-emerald-50 to-emerald-100', iconColor: 'text-emerald-600' },
          ].map(({ href, icon: Icon, title, desc, color, iconColor }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
            >
              <Link
                href={href}
                className={`block bg-gradient-to-br ${color} rounded-2xl p-4 border border-white/50 hover:shadow-card-hover transition`}
              >
                <Icon size={22} className={`${iconColor} mb-2`} />
                <p className="text-sm font-semibold text-zinc-800">{title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Daily quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
      >
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Today's Reminder</p>
        <p className="text-sm text-zinc-700 italic leading-relaxed">"{quote}"</p>
      </motion.div>
    </div>
  );
}
