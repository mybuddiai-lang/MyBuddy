'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Clock, Loader2, CheckCircle } from 'lucide-react';
import { examApi, type ExamDifficulty, type ExamType } from '@/lib/api/exam';
import { slidesApi, type Note } from '@/lib/api/slides';
import toast from 'react-hot-toast';

const DIFFICULTY_OPTIONS: { value: ExamDifficulty; label: string; desc: string; color: string }[] = [
  { value: 'EASY',   label: 'Easy',   desc: 'Definitions & recall',   color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Application & analysis', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' },
  { value: 'HARD',   label: 'Hard',   desc: 'Critical & edge cases',  color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' },
];

const TYPE_OPTIONS: { value: ExamType; label: string; desc: string }[] = [
  { value: 'MCQ',          label: 'MCQ',           desc: '4-choice questions' },
  { value: 'SHORT_ANSWER', label: 'Short Answer',  desc: 'Written responses' },
  { value: 'MIXED',        label: 'Mixed',         desc: 'Both MCQ & written' },
];

const Q_COUNTS = [5, 10, 15] as const;

const MASTERY_LABELS = ['Untested', 'Starting', 'Learning', 'Progress', 'Almost', 'Mastered'];
const MASTERY_COLORS = ['bg-zinc-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-emerald-500'];

export default function NewExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preNoteId = searchParams.get('noteId');

  const [notes, setNotes]         = useState<Note[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set(preNoteId ? [preNoteId] : []));
  const [examType, setExamType]   = useState<ExamType>('MCQ');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('MEDIUM');
  const [qCount, setQCount]       = useState<5 | 10 | 15>(10);
  const [timed, setTimed]         = useState(false);
  const [minutes, setMinutes]     = useState(30);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);

  useEffect(() => {
    slidesApi.getAll().then(setNotes).catch(() => {}).finally(() => setFetching(false));
  }, []);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleGenerate = async () => {
    if (selected.size === 0) { toast.error('Select at least one note'); return; }
    setLoading(true);
    try {
      const session = await examApi.generate({
        noteIds: [...selected],
        examType,
        difficulty,
        questionCount: qCount,
        ...(timed ? { timeLimitMins: minutes } : {}),
      });
      router.push(`/exam/${session.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not generate exam. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const readyNotes = notes.filter(n => n.processingStatus === 'done' || (n.processingStatus as string) === 'DONE');

  return (
    <div className="px-4 py-4 pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Configure Exam</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Buddi will generate questions from your notes</p>
      </div>

      {/* Note selector */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Select Notes</p>
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

      {/* Exam type */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Question Type</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.value}
              onClick={() => setExamType(t.value)}
              className={`py-3 px-2 rounded-xl border text-center transition ${examType === t.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}
            >
              <p className={`text-xs font-bold ${examType === t.value ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{t.label}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Difficulty</p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`py-3 px-2 rounded-xl border text-center transition ${difficulty === d.value ? d.color + ' border-2' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}
            >
              <p className="text-xs font-bold">{d.label}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-snug">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Number of Questions</p>
        <div className="flex gap-2">
          {Q_COUNTS.map(n => (
            <button
              key={n}
              onClick={() => setQCount(n)}
              className={`flex-1 py-3 rounded-xl border font-bold text-sm transition ${qCount === n ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-500 dark:text-zinc-400" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Timed exam</p>
          </div>
          <button
            onClick={() => setTimed(p => !p)}
            className={`relative w-10 h-5 rounded-full transition-colors ${timed ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${timed ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {timed && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Minutes:</p>
            <div className="flex gap-2">
              {[15, 20, 30, 45, 60].map(m => (
                <button key={m} onClick={() => setMinutes(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${minutes === m ? 'bg-brand-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}
                >{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate */}
      <motion.button
        onClick={handleGenerate}
        disabled={loading || selected.size === 0}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition shadow-soft text-base"
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Generating your exam…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <GraduationCap size={18} />
            Generate Exam ({selected.size} note{selected.size !== 1 ? 's' : ''}, {qCount}Q)
          </span>
        )}
      </motion.button>
    </div>
  );
}
