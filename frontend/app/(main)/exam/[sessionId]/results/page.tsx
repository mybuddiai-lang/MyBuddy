'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Minus, Trophy, ChevronDown, ChevronUp, GraduationCap, RotateCcw, Loader2 } from 'lucide-react';
import { examApi, type ExamSession } from '@/lib/api/exam';

function ScoreRing({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const passed = pct >= 70;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="rotate-[-90deg]" viewBox="0 0 100 100" width="112" height="112">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-100 dark:text-zinc-800" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke={passed ? '#10b981' : '#ef4444'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`text-2xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {pct.toFixed(0)}%
        </p>
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${passed ? 'text-emerald-500' : 'text-red-400'}`}>
          {passed ? 'Passed' : 'Failed'}
        </p>
      </div>
    </div>
  );
}

function QuestionReview({ q, index }: { q: ExamSession['questions'][0]; index: number }) {
  const [open, setOpen] = useState(false);

  const statusIcon = q.isCorrect === true
    ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
    : q.isCorrect === false
    ? <XCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
    : <Minus size={16} className="text-zinc-400 shrink-0" />;

  const bgClass = q.isCorrect === true
    ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10'
    : q.isCorrect === false
    ? 'border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10'
    : 'border-zinc-100 dark:border-zinc-800';

  return (
    <div className={`rounded-xl border ${bgClass} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
            Q{q.questionNumber} · {q.questionType === 'MCQ' ? 'MCQ' : 'Short Answer'}
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2">{q.questionText}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold ${q.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {q.scoreAwarded ?? 0}/{q.maxScore}
          </span>
          {open ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {/* Your answer */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Your Answer</p>
            <p className={`text-sm ${q.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
              {q.userAnswer || <span className="italic text-zinc-400">No answer given</span>}
            </p>
          </div>
          {/* Correct answer */}
          {q.correctAnswer && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Correct Answer</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{q.correctAnswer}</p>
            </div>
          )}
          {/* AI feedback */}
          {q.aiFeedback && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg px-3 py-2.5 border border-zinc-100 dark:border-zinc-700">
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">AI Feedback</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{q.aiFeedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamResultsPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examApi.getResults(sessionId).then(setSession).catch(() => {
      router.push('/exam');
    }).finally(() => setLoading(false));
  }, [sessionId, router]);

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading results…</p>
      </div>
    );
  }

  const pct = session.percentageScore ?? 0;
  const passed = pct >= 70;
  const improved = session.previousScore !== null && session.previousScore !== undefined && pct > session.previousScore;

  return (
    <div className="px-4 py-4 pb-10 space-y-5 max-w-lg mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Exam Results</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{session.title}</p>
      </div>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-5 border ${passed ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}
      >
        <ScoreRing pct={pct} />
        <div className="text-center mt-4 space-y-1">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            {session.totalScore?.toFixed(1)} / {session.maxScore} points
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {session.questionCount}Q · {session.difficulty} · {session.examType}
          </p>
          {improved && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              +{(pct - (session.previousScore ?? 0)).toFixed(0)}% improvement from last attempt!
            </p>
          )}
        </div>

        {/* Trophy for passing */}
        {passed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="flex justify-center mt-4"
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Trophy size={24} className="text-amber-500" />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Per-question breakdown */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Question Breakdown</p>
        <div className="space-y-2">
          {session.questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
            >
              <QuestionReview q={q} index={i} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push('/exam/new')}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl transition shadow-soft text-sm"
        >
          <GraduationCap size={17} /> New Exam
        </button>
        <button
          onClick={() => router.push('/exam')}
          className="w-full flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300 font-medium py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-sm hover:border-brand-300 dark:hover:border-brand-700 transition"
        >
          <RotateCcw size={15} /> Back to Exams
        </button>
      </div>
    </div>
  );
}
