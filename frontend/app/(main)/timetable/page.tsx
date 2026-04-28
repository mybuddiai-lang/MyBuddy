'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarDays, Plus, CheckCircle, Clock, BookOpen,
  Loader2, Archive, ChevronRight, Zap
} from 'lucide-react';
import { timetableApi, type StudyTimetable, type TimetableDay } from '@/lib/api/timetable';
import { differenceInCalendarDays, format, isToday, isPast } from 'date-fns';
import toast from 'react-hot-toast';

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : (completed / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{completed} of {total} days done</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-brand-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function DayCard({ day, onComplete }: { day: TimetableDay; onComplete: (id: string) => void }) {
  const date = new Date(day.date);
  const today = isToday(date);
  const past = isPast(date) && !today;
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(day.id);
    } finally {
      setCompleting(false);
    }
  };

  const totalMins = day.slots.reduce((s, sl) => s + sl.minutes, 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const durationLabel = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return (
    <div className={`rounded-xl border overflow-hidden transition ${
      today ? 'border-brand-400 dark:border-brand-600 shadow-md' :
      day.isCompleted ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-900/10 opacity-70' :
      past ? 'border-zinc-100 dark:border-zinc-800 opacity-60' :
      'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
    }`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Day badge */}
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
          today ? 'bg-brand-500 text-white' :
          day.isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
        }`}>
          <span className="text-[10px] font-bold uppercase leading-none">{format(date, 'EEE')}</span>
          <span className="text-sm font-bold leading-none mt-0.5">{format(date, 'd')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className={`text-xs font-bold uppercase tracking-wider ${today ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Day {day.dayNumber} {today ? '· Today' : ''}
            </p>
            {day.isCompleted && <CheckCircle size={11} className="text-emerald-500 shrink-0" />}
          </div>
          <div className="space-y-0.5">
            {day.slots.map(s => (
              <p key={s.id} className="text-xs text-zinc-600 dark:text-zinc-300 truncate flex items-center gap-1.5">
                <BookOpen size={9} className="text-zinc-400 shrink-0" />
                <span className="truncate">{s.noteTitle}</span>
                <span className="text-zinc-400 shrink-0">· {s.minutes}m</span>
              </p>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={9} className="text-zinc-400" />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{durationLabel} total</p>
          </div>
        </div>

        {/* Mark complete */}
        {!day.isCompleted && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-500 hover:text-white hover:border-brand-500 transition shrink-0 disabled:opacity-50"
          >
            {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TimetablePage() {
  const router = useRouter();
  const [timetable, setTimetable] = useState<StudyTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    timetableApi.getActive().then(setTimetable).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleMarkComplete = async (dayId: string) => {
    try {
      const updated = await timetableApi.markDayComplete(dayId);
      setTimetable(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map(d => d.id === dayId ? { ...d, isCompleted: updated.isCompleted, completedAt: updated.completedAt } : d),
        };
      });
      toast.success('Day marked complete!');
    } catch {
      toast.error('Could not update day');
    }
  };

  const handleArchive = async () => {
    if (!timetable) return;
    setArchiving(true);
    try {
      await timetableApi.archive(timetable.id);
      setTimetable(null);
      toast.success('Timetable archived');
    } catch {
      toast.error('Could not archive timetable');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading your study plan…</p>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="px-4 py-4 pb-10 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Study Timetable</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">AI-generated schedule tailored to your notes</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <CalendarDays size={48} className="text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No active study plan</p>
          <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">Generate a personalised timetable based on your notes and exam date</p>
          <button
            onClick={() => router.push('/timetable/new')}
            className="mt-6 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-2xl transition shadow-soft text-sm"
          >
            <Plus size={16} /> Generate Study Plan
          </button>
        </motion.div>
      </div>
    );
  }

  const days = timetable.days;
  const completed = days.filter(d => d.isCompleted).length;
  const daysUntilExam = differenceInCalendarDays(new Date(timetable.examDate), new Date());
  const todayDay = days.find(d => isToday(new Date(d.date)));

  return (
    <div className="px-4 py-4 pb-10 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">{timetable.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {daysUntilExam > 0 ? `${daysUntilExam} days to exam` : daysUntilExam === 0 ? 'Exam is today!' : 'Exam passed'}
            {' · '}{timetable.hoursPerDay}h/day
          </p>
        </div>
        <button
          onClick={() => router.push('/timetable/new')}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-xl shrink-0"
        >
          <Plus size={12} className="inline mr-1" />New Plan
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
        <ProgressBar completed={completed} total={days.length} />
      </div>

      {/* Today's session highlight */}
      {todayDay && !todayDay.isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-500 rounded-2xl p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} />
            <p className="text-xs font-bold uppercase tracking-wider">Today's study session</p>
          </div>
          <div className="space-y-1 mb-3">
            {todayDay.slots.map(s => (
              <p key={s.id} className="text-sm font-medium flex items-center gap-2">
                <BookOpen size={12} className="text-brand-200 shrink-0" />
                <span className="truncate">{s.noteTitle}</span>
                <span className="text-brand-200 shrink-0 text-xs">{s.minutes}m</span>
              </p>
            ))}
          </div>
          <button
            onClick={() => handleMarkComplete(todayDay.id)}
            className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            <CheckCircle size={15} /> Mark today complete
          </button>
        </motion.div>
      )}

      {/* Day list */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">All Days</p>
        <div className="space-y-2">
          {days.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <DayCard day={d} onComplete={handleMarkComplete} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Archive */}
      <button
        onClick={handleArchive}
        disabled={archiving}
        className="w-full flex items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 font-medium py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-sm transition disabled:opacity-50"
      >
        {archiving ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
        Archive this plan
      </button>
    </div>
  );
}
