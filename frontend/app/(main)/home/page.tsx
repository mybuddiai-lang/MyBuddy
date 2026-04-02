'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, BookOpen, Brain, Flame, Target, TrendingUp, Bell, Clock, ChevronRight, Zap, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useStats } from '@/lib/hooks/use-stats';
import { differenceInDays } from 'date-fns';

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every expert was once a beginner. Keep going.",
  "Pressure makes diamonds. You've got this.",
  "Small daily improvements are the key to staggering long-term results.",
  "Done is better than perfect — start now.",
  "Your future self is watching. Make them proud.",
];

const DUMMY_REMINDERS = [
  { id: '1', title: 'Review: Pharmacology — CNS Drugs', type: 'RECALL', minutesAgo: 0, dueLabel: 'Due now' },
  { id: '2', title: 'Review: Anatomy Notes — Week 4', type: 'RECALL', minutesAgo: 0, dueLabel: 'Due in 2h' },
];

const DUMMY_ACTIVITY = [
  { id: '1', icon: '🧠', text: 'Completed 3 recall cards', time: '1h ago' },
  { id: '2', icon: '📄', text: 'Uploaded Cardiology notes', time: '3h ago' },
  { id: '3', icon: '💬', text: 'Chatted with Buddi', time: 'Yesterday' },
];

export default function HomePage() {
  const { user } = useAuthStore();
  const { stats } = useStats();

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
          { icon: Flame, value: studyStreak, label: 'Day streak', color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Brain, value: stats.dueReminders || 0, label: 'Cards due', color: 'text-brand-500', bg: 'bg-brand-50' },
          { icon: TrendingUp, value: Math.round(resilienceScore), label: 'Resilience', color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Due reminders */}
      {DUMMY_REMINDERS.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-zinc-500" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Due Today</p>
            </div>
            <Link href="/recall" className="text-xs text-brand-600 font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {DUMMY_REMINDERS.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <Link
                  href="/recall"
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-zinc-100 shadow-card hover:border-brand-200 hover:bg-brand-50/30 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{r.title}</p>
                    <p className="text-xs text-zinc-400">{r.dueLabel}</p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-300 shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/chat', icon: MessageCircle, title: 'Chat with Buddi', desc: 'Talk, ask, vent', color: 'from-brand-50 to-brand-100', iconColor: 'text-brand-600' },
            { href: '/recall', icon: Brain, title: 'Quick Recall', desc: `${stats.dueReminders || 2} cards waiting`, color: 'from-violet-50 to-violet-100', iconColor: 'text-violet-600' },
            { href: '/slides', icon: BookOpen, title: 'Upload Notes', desc: 'Add new material', color: 'from-zinc-50 to-zinc-100', iconColor: 'text-zinc-600' },
            { href: '/community', icon: Clock, title: 'Study Pods', desc: 'Join your group', color: 'from-emerald-50 to-emerald-100', iconColor: 'text-emerald-600' },
          ].map(({ href, icon: Icon, title, desc, color, iconColor }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
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

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent Activity</p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-card divide-y divide-zinc-50">
          {DUMMY_ACTIVITY.map(({ id, icon, text, time }) => (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 truncate">{text}</p>
              </div>
              <p className="text-xs text-zinc-400 shrink-0">{time}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Daily quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
      >
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Today's Reminder</p>
        <p className="text-sm text-zinc-700 italic leading-relaxed">"{quote}"</p>
      </motion.div>
    </div>
  );
}
