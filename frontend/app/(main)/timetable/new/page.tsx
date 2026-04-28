'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, BookOpen, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { timetableApi } from '@/lib/api/timetable';
import { slidesApi, type Note } from '@/lib/api/slides';
import { useAuthStore } from '@/lib/store/auth.store';
import toast from 'react-hot-toast';

const MASTERY_LABELS = ['Untested', 'Starting', 'Learning', 'Progress', 'Almost', 'Mastered'];
const MASTERY_COLORS = ['bg-zinc-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-emerald-500'];
const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export default function NewTimetablePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [notes, setNotes]         = useState<Note[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [fetching, setFetching]   = useState(true);
  const [hoursPerDay, setHoursPerDay] = useState<number>(2);
  const [examDate, setExamDate]   = useState(
    user?.examDate ? new Date(user.examDate).toISOString().slice(0, 10) : ''
  );
  const [reminderTime, setReminderTime] = useState('08:00');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    slidesApi.getAll()
      .then(ns => {
        const ready = ns.filter(n => n.processingStatus === 'done' || (n.processingStatus as string) === 'DONE');
        setNotes(ready);
        // Pre-select all if coming fresh
        setSelected(new Set(ready.map(n => n.id)));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleGenerate = async () => {
    if (selected.size === 0) { toast.error('Select at least one note'); return; }
    if (!examDate && !user?.examDate) { toast.error('Set an exam date first'); return; }
    setLoading(true);
    try {
      const timetable = await timetableApi.generate({
        noteIds: [...selected],
        hoursPerDay,
        ...(examDate ? { examDate: new Date(examDate).toISOString() } : {}),
        reminderTime,
      });
      toast.success('Study plan created!');
      router.push(`/timetable`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not generate plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const readyNotes = notes;

  return (
    <div className="px-4 py-4 pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Generate Study Plan</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Buddi will build a personalised schedule from your notes</p>
      </div>

      {/* Note selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Select Notes</p>
          {readyNotes.length > 0 && (
            <button
              onClick={() => setSelected(selected.size === readyNotes.length ? new Set() : new Set(readyNotes.map(n => n.id)))}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium"
            >
              {selected.size === readyNotes.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : readyNotes.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <BookOpen size={28} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No processed notes yet</p>
            <button onClick={() => router.push('/slides')} className="text-xs text-brand-600 dark:text-brand-400 mt-1">Upload notes →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {readyNotes.map(n => {
              const on = selected.has(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => toggle(n.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition ${on ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-brand-200 dark:hover:border-brand-800'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${on ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {on && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{n.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${MASTERY_COLORS[n.masteryLevel ?? 0]}`} />
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">{MASTERY_LABELS[n.masteryLevel ?? 0]}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hours per day */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Study Hours per Day</p>
        <div className="flex gap-2 flex-wrap">
          {HOURS_OPTIONS.map(h => (
            <button
              key={h}
              onClick={() => setHoursPerDay(h)}
              className={`flex-1 min-w-[3rem] py-3 rounded-xl border font-bold text-sm transition ${hoursPerDay === h ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900'}`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Exam date */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Exam Date {user?.examDate ? <span className="normal-case font-normal text-zinc-400">(pre-filled from profile)</span> : ''}
        </p>
        <input
          type="date"
          value={examDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setExamDate(e.target.value)}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        {!examDate && !user?.examDate && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Required — or set it in your profile</p>
        )}
      </div>

      {/* Reminder time */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-zinc-500 dark:text-zinc-400" />
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Daily reminder time</p>
        </div>
        <input
          type="time"
          value={reminderTime}
          onChange={e => setReminderTime(e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">You'll get a push reminder at this time each study day</p>
      </div>

      {/* Generate */}
      <motion.button
        onClick={handleGenerate}
        disabled={loading || selected.size === 0 || (!examDate && !user?.examDate)}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition shadow-soft text-base"
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Building your plan…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CalendarDays size={18} />
            Generate Plan ({selected.size} note{selected.size !== 1 ? 's' : ''}, {hoursPerDay}h/day)
          </span>
        )}
      </motion.button>
    </div>
  );
}
