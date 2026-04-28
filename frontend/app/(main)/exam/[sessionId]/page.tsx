'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Send, Loader2, AlertTriangle } from 'lucide-react';
import { examApi, type ExamSession, type ExamQuestion } from '@/lib/api/exam';
import toast from 'react-hot-toast';

function TimerBar({ totalSecs, onExpire }: { totalSecs: number; onExpire: () => void }) {
  const [secsLeft, setSecsLeft] = useState(totalSecs);
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecsLeft(prev => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          clearInterval(interval);
          onExpire();
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onExpire]);

  const pct = (secsLeft / totalSecs) * 100;
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const danger = pct < 20;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${danger ? 'text-red-500 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          <Clock size={12} className={danger ? 'animate-pulse' : ''} />
          <span>{mins}:{secs.toString().padStart(2, '0')} left</span>
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${danger ? 'bg-red-500' : 'bg-brand-500'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export default function ExamSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);

  useEffect(() => {
    examApi.getSession(sessionId).then(s => {
      if (s.status === 'COMPLETED') {
        router.replace(`/exam/${sessionId}/results`);
        return;
      }
      setSession(s);
      // Restore any already-answered questions
      const saved: Record<string, string> = {};
      s.questions.forEach(q => { if (q.userAnswer) saved[q.id] = q.userAnswer; });
      setAnswers(saved);
    }).catch(() => {
      toast.error('Could not load exam');
      router.push('/exam');
    }).finally(() => setLoading(false));
  }, [sessionId, router]);

  const currentQ: ExamQuestion | undefined = session?.questions[currentIdx];

  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!answer.trim()) return;
    setSavingAnswer(true);
    try {
      await examApi.submitAnswer(sessionId, questionId, answer);
    } catch {
      // silent — don't disrupt UX
    } finally {
      setSavingAnswer(false);
    }
  }, [sessionId]);

  const handleSelectOption = (questionId: string, label: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: label }));
    saveAnswer(questionId, label);
  };

  const handleSAChange = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSABlur = (questionId: string) => {
    const ans = answers[questionId];
    if (ans) saveAnswer(questionId, ans);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await examApi.submitExam(sessionId);
      router.push(`/exam/${sessionId}/results`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Submit failed. Try again.');
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  };

  const handleTimerExpire = useCallback(() => {
    toast('Time is up! Submitting your exam…', { icon: '⏰' });
    examApi.submitExam(sessionId).then(() => {
      router.push(`/exam/${sessionId}/results`);
    }).catch(() => {
      router.push(`/exam/${sessionId}/results`);
    });
  }, [sessionId, router]);

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={28} className="text-brand-500 animate-spin" />
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading exam…</p>
      </div>
    );
  }

  const questions = session.questions;
  const answered = questions.filter(q => answers[q.id]?.trim()).length;
  const unanswered = questions.length - answered;

  return (
    <div className="px-4 py-4 pb-32 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => router.push('/exam')} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition">
            <ChevronLeft size={18} />
          </button>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate flex-1">{session.title}</p>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{answered}/{questions.length}</span>
        </div>

        {/* Timer */}
        {session.timeLimitMins && (
          <TimerBar totalSecs={session.timeLimitMins * 60} onExpire={handleTimerExpire} />
        )}
      </div>

      {/* Question dots */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
              i === currentIdx
                ? 'bg-brand-500 text-white'
                : answers[q.id]
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-card space-y-4"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                Q{currentQ.questionNumber} · {currentQ.questionType === 'MCQ' ? 'Multiple Choice' : 'Short Answer'}
              </span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mt-2 leading-relaxed">{currentQ.questionText}</p>
            </div>

            {currentQ.questionType === 'MCQ' && currentQ.options ? (
              <div className="space-y-2">
                {currentQ.options.map(opt => {
                  const selected = answers[currentQ.id] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelectOption(currentQ.id, opt.label)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition ${
                        selected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-zinc-100 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-brand-700'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 transition ${
                        selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500'
                      }`}>
                        {opt.label}
                      </span>
                      <span className={`text-sm leading-relaxed ${selected ? 'text-brand-700 dark:text-brand-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={e => handleSAChange(currentQ.id, e.target.value)}
                  onBlur={() => handleSABlur(currentQ.id)}
                  placeholder="Type your answer here…"
                  rows={5}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
                />
                {savingAnswer && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                    <Loader2 size={9} className="animate-spin" /> Saving…
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-medium disabled:opacity-40 transition hover:border-brand-300 dark:hover:border-brand-700"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        {currentIdx < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition shadow-soft"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setConfirmSubmit(true)}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition shadow-soft disabled:opacity-50"
          >
            <Send size={15} /> Submit Exam
          </button>
        )}
      </div>

      {/* Confirm submit modal */}
      <AnimatePresence>
        {confirmSubmit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setConfirmSubmit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
            >
              <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">Submit exam?</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {unanswered > 0 ? `${unanswered} question${unanswered !== 1 ? 's' : ''} unanswered.` : 'All questions answered.'} You cannot change answers after submitting.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSubmit(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-medium"
                >
                  Keep going
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={15} className="animate-spin" /> Grading…
                    </span>
                  ) : 'Submit & Grade'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
