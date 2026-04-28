'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Clock, CheckCircle, XCircle, ChevronRight, Trophy } from 'lucide-react';
import { examApi, type ExamSession } from '@/lib/api/exam';
import { formatDistanceToNow } from 'date-fns';

function ScoreBadge({ pct }: { pct: number }) {
  const passed = pct >= 70;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

export default function ExamPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examApi.getSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const completed  = sessions.filter(s => s.status === 'COMPLETED');
  const inProgress = sessions.find(s => s.status === 'IN_PROGRESS');

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">AI Exam Simulator</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Generate a real exam from your notes</p>
      </div>

      {/* Resume in-progress exam */}
      {inProgress && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4"
        >
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">In Progress</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate max-w-48">{inProgress.title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{inProgress.questionCount} questions · {inProgress.difficulty}</p>
            </div>
            <button
              onClick={() => router.push(`/exam/${inProgress.id}`)}
              className="text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-xl"
            >
              Resume →
            </button>
          </div>
        </motion.div>
      )}

      {/* New exam CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        onClick={() => router.push('/exam/new')}
        className="w-full bg-gradient-to-r from-violet-500 to-brand-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl transition"
      >
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <GraduationCap size={24} />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-base">Start New Exam</p>
          <p className="text-violet-100 text-xs mt-0.5">Pick your notes, set difficulty, and go</p>
        </div>
        <Plus size={20} className="shrink-0" />
      </motion.button>

      {/* History */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : completed.length === 0 ? (
        <div className="text-center py-12">
          <Trophy size={40} className="text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No exams taken yet</p>
          <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">Start your first exam above</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Past Exams</p>
          <div className="space-y-2">
            {completed.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/exam/${s.id}/results`)}
                className="w-full text-left bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-brand-200 dark:hover:border-brand-700 transition shadow-card"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${(s.percentageScore ?? 0) >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {(s.percentageScore ?? 0) >= 70
                    ? <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                    : <XCircle size={18} className="text-red-500 dark:text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{s.questionCount}Q · {s.difficulty}</p>
                    {s.completedAt && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                        <Clock size={9} /> {formatDistanceToNow(new Date(s.completedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                {s.percentageScore !== null && <ScoreBadge pct={s.percentageScore} />}
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
