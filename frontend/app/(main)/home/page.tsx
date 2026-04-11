'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, BookOpen, Brain, Flame, Target, TrendingUp, Bell, Clock, ChevronRight, Zap, X, CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStats } from '@/lib/hooks/use-stats';
import { useReminders } from '@/lib/hooks/use-reminders';
import { usersApi } from '@/lib/api/users';
import toast from 'react-hot-toast';
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
  const { user, setUser } = useAuthStore();
  const { stats } = useStats();
  const { dueReminders } = useReminders();

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const daysUntilExam = user?.examDate ? differenceInDays(new Date(user.examDate), new Date()) : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const resilienceScore = stats.resilienceScore ?? user?.resilienceScore ?? 50;
  const studyStreak = stats.studyStreak ?? user?.studyStreak ?? 0;

  const { examBannerHidden, setExamBannerHidden } = useUIStore();
  const dismissExamBanner = () => setExamBannerHidden(true);

  // Inline exam date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  const handleSaveExamDate = async () => {
    if (!dateInput) return;
    setSavingDate(true);
    try {
      const updated = await usersApi.updateProfile({ examDate: dateInput });
      setUser(updated);
      setShowDatePicker(false);
      setDateInput('');
      toast.success('Exam date saved!');
    } catch {
      toast.error('Could not save date');
    } finally {
      setSavingDate(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{firstName} 👋</h1>
      </motion.div>

      {/* Exam countdown — hidden entirely when toggle is off */}
      {!examBannerHidden && (
        daysUntilExam !== null && daysUntilExam > 0 ? (
          /* Full countdown banner */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-4 text-white"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-brand-100 text-xs font-medium">Next exam in</p>
                <p className="text-3xl font-bold mt-0.5">{daysUntilExam} days</p>
                <p className="text-brand-100 text-xs mt-1">Stay consistent — you've got this!</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={dismissExamBanner}
                  className="text-brand-200 hover:text-white transition p-0.5 rounded"
                  title="Hide countdown"
                >
                  <X size={14} />
                </button>
                <Target size={36} className="text-brand-200 opacity-50" />
              </div>
            </div>
          </motion.div>
        ) : (
          /* No exam date set — prompt to add inline */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <CalendarDays size={16} className="text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Set your exam date</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Track your countdown from here</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDatePicker(true)}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg"
              >
                Add date
              </button>
              <button
                onClick={dismissExamBanner}
                className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition p-1 rounded"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )
      )}

      {/* Exam date picker bottom sheet */}
      <AnimatePresence>
        {showDatePicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowDatePicker(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">When is your exam?</h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">We'll count down the days for you</p>
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                >
                  <X size={14} />
                </button>
              </div>

              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Exam date
              </label>
              <input
                type="date"
                value={dateInput}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setDateInput(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent mb-4"
              />

              <button
                onClick={handleSaveExamDate}
                disabled={!dateInput || savingDate}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                {savingDate ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Save exam date'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
