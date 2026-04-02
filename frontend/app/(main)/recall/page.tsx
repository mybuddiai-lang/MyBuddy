'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronRight, Brain, Flame, Target } from 'lucide-react';

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  source: string;
}

const MOCK_CARDS: FlashCard[] = [
  { id: '1', question: 'What is the mechanism of action of metformin?', answer: 'Metformin primarily inhibits hepatic gluconeogenesis by activating AMPK, which decreases mTOR signaling and reduces glucose production. It also improves insulin sensitivity in peripheral tissues.', source: 'Pharmacology — CNS Drugs' },
  { id: '2', question: 'What are the key branches of the brachial plexus?', answer: 'The brachial plexus has 5 roots (C5-T1), 3 trunks (superior, middle, inferior), 6 divisions, 3 cords (lateral, medial, posterior), and terminal branches (musculocutaneous, median, ulnar, radial, axillary).', source: 'Anatomy Notes — Week 4' },
  { id: '3', question: 'Define the Frank-Starling law of the heart', answer: 'The Frank-Starling law states that the stroke volume of the heart increases in response to an increase in the volume of blood filling the heart (end-diastolic volume), resulting in greater stretch of ventricular walls.', source: 'Cardiology' },
];

export default function RecallPage() {
  const [cards] = useState(MOCK_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [scores, setScores] = useState({ correct: 0, partial: 0, incorrect: 0 });

  const current = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  const handleRate = (rating: 'easy' | 'medium' | 'hard') => {
    setScores(prev => ({
      ...prev,
      correct: rating === 'easy' ? prev.correct + 1 : prev.correct,
      partial: rating === 'medium' ? prev.partial + 1 : prev.partial,
      incorrect: rating === 'hard' ? prev.incorrect + 1 : prev.incorrect,
    }));
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setSessionDone(true);
      }
    }, 300);
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center py-20">
        <span className="text-5xl mb-4">🧠</span>
        <h3 className="font-bold text-zinc-800 text-lg">No cards due</h3>
        <p className="text-zinc-500 text-sm mt-2">Upload some slides and Buddi will create recall cards for you.</p>
      </div>
    );
  }

  if (sessionDone) {
    const accuracy = Math.round((scores.correct / cards.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-4xl">
          {accuracy >= 70 ? '🎉' : accuracy >= 40 ? '💪' : '📖'}
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Session Complete!</h2>
        <p className="text-zinc-500 text-sm mt-2">{accuracy}% accuracy — {accuracy >= 70 ? "You're crushing it!" : "Keep practising, you're improving!"}</p>
        <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-xs">
          {[['Easy', scores.correct, 'emerald'], ['Medium', scores.partial, 'amber'], ['Hard', scores.incorrect, 'red']].map(([label, count, color]) => (
            <div key={label as string} className={`bg-${color}-50 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold text-${color}-600`}>{count as number}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label as string}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setCurrentIndex(0); setIsFlipped(false); setSessionDone(false); setScores({ correct: 0, partial: 0, incorrect: 0 }); }}
          className="mt-8 bg-brand-500 text-white font-semibold py-3 px-8 rounded-xl hover:bg-brand-600 transition shadow-soft flex items-center gap-2"
        >
          <RotateCcw size={16} /> Review Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Brain size={16} className="text-brand-500" />
            <span className="font-semibold text-zinc-700">{cards.length} due</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Flame size={16} className="text-orange-500" />
            <span className="font-semibold text-zinc-700">7 day streak</span>
          </div>
        </div>
        <span className="text-sm text-zinc-400">{currentIndex + 1} / {cards.length}</span>
      </div>

      {/* Progress */}
      <div className="w-full bg-zinc-100 rounded-full h-1.5">
        <motion.div
          className="bg-brand-500 h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Flash card */}
      <div className="flip-card w-full" style={{ height: '320px' }}>
        <motion.div
          className={`flip-card-inner w-full h-full relative ${isFlipped ? 'flipped' : ''}`}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="flip-card-front absolute inset-0 bg-white rounded-3xl shadow-soft border border-zinc-100 p-6 flex flex-col items-center justify-center cursor-pointer"
            style={{ backfaceVisibility: 'hidden' }}
            onClick={() => setIsFlipped(true)}
          >
            <p className="text-xs font-medium text-brand-500 uppercase tracking-wide mb-4">{current.source}</p>
            <p className="text-zinc-800 text-base font-semibold text-center leading-relaxed">{current.question}</p>
            <p className="text-xs text-zinc-400 mt-6">Tap to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="flip-card-back absolute inset-0 bg-brand-500 rounded-3xl shadow-soft p-6 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-4">Answer</p>
            <p className="text-white text-sm text-center leading-relaxed">{current.answer}</p>
          </div>
        </motion.div>
      </div>

      {/* Rating buttons (shown after flip) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: 'Hard', emoji: '😓', color: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100', rating: 'hard' as const },
              { label: 'Medium', emoji: '🤔', color: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100', rating: 'medium' as const },
              { label: 'Easy', emoji: '😊', color: 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100', rating: 'easy' as const },
            ].map(({ label, emoji, color, rating }) => (
              <button
                key={label}
                onClick={() => handleRate(rating)}
                className={`py-3 rounded-xl border font-medium text-sm flex flex-col items-center gap-1 transition ${color}`}
              >
                <span className="text-lg">{emoji}</span>
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!isFlipped && (
        <button onClick={() => setIsFlipped(true)} className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition shadow-soft flex items-center justify-center gap-2">
          Show Answer <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
