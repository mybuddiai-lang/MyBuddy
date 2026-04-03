'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, BookOpen, Brain, Flame, Target, TrendingUp, Bell, Clock, ChevronRight, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useStats } from '@/lib/hooks/use-stats';
import { useReminders } from '@/lib/hooks/use-reminders';
import { useActivity } from '@/lib/hooks/use-activity';
import { differenceInDays } from 'date-fns';

// QUOTES kept as motivational content, not dummy data
const QUOTES = [
  "The secret of getting ahead is getting started.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every expert was once a beginner. Keep going.",
  "Pressure makes diamonds. You've got this.",
  "Small daily improvements are the key to staggering long-term results.",
  "Done is better than perfect — start now.",
  "Your future self is watching. Make them proud.",
];

export default function HomePage() {
  const { user } = useAuthStore();
  const { stats } = useStats();
  const { dueReminders } = useReminders();
  const { activity } = useActivity();

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const daysUntilExam = user?.examDate ? differenceInDays(new Date(user.examDate), new Date()) : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const resilienceScore = stats.resilienceScore ?? user?.resilienceScore ?? 50;
  const studyStreak = stats.studyStreak ?? user?.studyStreak ?? 0;

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{firstName} 👋</h1>
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
          { icon: Flame, value: studyStreak, label: 'Day streak', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/50' },
          { icon: Brain, value: stats.dueReminders || 0, label: 'Cards due', color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/30' },
          { icon: TrendingUp, value: Math.round(resilienceScore), label: 'Resilience', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Due reminders */}
      {dueReminders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-zinc-500 dark:text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Due Today</p>
            </div>
            <Link href="/recall" className="text-xs text-brand-600 font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {dueReminders.slice(0, 3).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <Link
                  href="/recall"
                  className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-100 dark:border-zinc-800 shadow-card hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-900/20 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{r.title}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(r.scheduledAt) <= new Date() ? 'Due now' : 'Due soon'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/chat', icon: MessageCircle, title: 'Chat with Buddi', desc: 'Talk, ask, vent', color: 'from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-900/50', iconColor: 'text-brand-600 dark:text-brand-400' },
            { href: '/recall', icon: Brain, title: 'Quick Recall', desc: `${stats.dueReminders || 2} cards waiting`, color: 'from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/50', iconColor: 'text-violet-600 dark:text-violet-400' },
            { href: '/slides', icon: BookOpen, title: 'Upload Notes', desc: 'Add new material', color: 'from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-800/80', iconColor: 'text-zinc-600 dark:text-zinc-400' },
            { href: '/community', icon: Clock, title: 'Study Pods', desc: 'Join your group', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          ].map(({ href, icon: Icon, title, desc, color, iconColor }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
            >
              <Link
                href={href}
                className={`block bg-gradient-to-br ${color} rounded-2xl p-4 border border-white/50 dark:border-zinc-700/50 hover:shadow-card-hover transition`}
              >
                <Icon size={22} className={`${iconColor} mb-2`} />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Recent Activity</p>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card divide-y divide-zinc-50 dark:divide-zinc-800">
          {activity.map(({ id, icon, text, time }) => (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 dark:text-zinc-200 truncate">{text}</p>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{time}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Daily quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 shadow-card"
      >
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Today's Reminder</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 italic leading-relaxed">"{quote}"</p>
      </motion.div>
    </div>
  );
}
