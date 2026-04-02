'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronRight, Brain, Flame, BookOpen } from 'lucide-react';
import { useStats } from '@/lib/hooks/use-stats';

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const ALL_CARDS: FlashCard[] = [
  { id: '1', question: 'What is the mechanism of action of metformin?', answer: 'Metformin primarily inhibits hepatic gluconeogenesis by activating AMPK, which decreases mTOR signaling and reduces glucose production. It also improves insulin sensitivity in peripheral tissues and may alter gut microbiota.', source: 'Pharmacology — CNS Drugs', difficulty: 'medium' },
  { id: '2', question: 'What are the key branches of the brachial plexus?', answer: 'The brachial plexus has 5 roots (C5–T1), 3 trunks (superior, middle, inferior), 6 divisions, 3 cords (lateral, medial, posterior), and 5 terminal branches: musculocutaneous, median, ulnar, radial, and axillary nerves.', source: 'Anatomy Notes — Week 4', difficulty: 'hard' },
  { id: '3', question: 'Define the Frank-Starling law of the heart', answer: 'The Frank-Starling law states that stroke volume increases in response to an increase in end-diastolic volume (greater stretch of ventricular walls), enabling the heart to match its output to venous return.', source: 'Cardiology', difficulty: 'medium' },
  { id: '4', question: 'What is the difference between Type I and Type II errors?', answer: 'Type I error (α) = false positive — rejecting a true null hypothesis. Type II error (β) = false negative — failing to reject a false null hypothesis. Power = 1 - β.', source: 'Biostatistics', difficulty: 'easy' },
  { id: '5', question: 'List the layers of the epidermis from deep to superficial', answer: 'From deep to superficial: Stratum Basale → Stratum Spinosum → Stratum Granulosum → Stratum Lucidum (palms/soles only) → Stratum Corneum. Mnemonic: "Bastards Smell Great Lots of Crabs."', source: 'Histology', difficulty: 'easy' },
  { id: '6', question: 'What triggers the release of ADH (vasopressin)?', answer: 'ADH is released by the posterior pituitary in response to: (1) increased plasma osmolality (detected by hypothalamic osmoreceptors) and (2) decreased blood volume/pressure (detected by baroreceptors). Stress, nausea, and pain also stimulate release.', source: 'Physiology — Renal', difficulty: 'hard' },
  { id: '7', question: 'What is the central dogma of molecular biology?', answer: 'DNA → (Transcription) → mRNA → (Translation) → Protein. Reverse transcription (RNA → DNA) occurs in retroviruses. Some RNA viruses bypass DNA entirely.', source: 'Molecular Biology', difficulty: 'easy' },
  { id: '8', question: 'What are the classic features of Cushing\'s syndrome?', answer: 'Central obesity (buffalo hump, moon face), purple striae, proximal muscle weakness, hypertension, hyperglycemia, osteoporosis, hirsutism, thin skin, and easy bruising. Caused by prolonged cortisol excess.', source: 'Endocrinology', difficulty: 'medium' },
];

export default function RecallPage() {
  const { stats } = useStats();
  const [cards] = useState<FlashCard[]>(ALL_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [scores, setScores] = useState({ correct: 0, partial: 0, incorrect: 0 });
  const [sessionStarted, setSessionStarted] = useState(false);

  const current = cards[currentIndex];
  const progress = sessionStarted ? (currentIndex / cards.length) * 100 : 0;
  const studyStreak = stats.studyStreak ?? 5;

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

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionDone(false);
    setScores({ correct: 0, partial: 0, incorrect: 0 });
    setSessionStarted(true);
  };

  // Session complete screen
  if (sessionDone) {
    const total = scores.correct + scores.partial + scores.incorrect;
    const accuracy = Math.round((scores.correct / total) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center px-6 py-10 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-4xl">
          {accuracy >= 70 ? '🎉' : accuracy >= 40 ? '💪' : '📖'}
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Session Complete!</h2>
        <p className="text-zinc-500 text-sm mt-2">
          {accuracy}% accuracy — {accuracy >= 70 ? "You're crushing it!" : accuracy >= 40 ? "Keep practising, you're improving!" : "Review these topics again soon."}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-xs">
          {[
            ['Easy', scores.correct, 'emerald'],
            ['Medium', scores.partial, 'amber'],
            ['Hard', scores.incorrect, 'red'],
          ].map(([label, count, color]) => (
            <div key={label as string} className={`bg-${color}-50 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold text-${color}-600`}>{count as number}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-zinc-50 rounded-2xl p-4 w-full max-w-xs text-left border border-zinc-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Session Summary</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Cards reviewed</span>
              <span className="font-semibold text-zinc-800">{total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Accuracy</span>
              <span className="font-semibold text-zinc-800">{accuracy}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Study streak</span>
              <span className="font-semibold text-orange-500">{studyStreak + 1} days 🔥</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="mt-6 bg-brand-500 text-white font-semibold py-3 px-8 rounded-xl hover:bg-brand-600 transition shadow-soft flex items-center gap-2"
        >
          <RotateCcw size={16} /> Review Again
        </button>
      </motion.div>
    );
  }

  // Pre-session start screen
  if (!sessionStarted) {
    return (
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Quick Recall</h1>
          <p className="text-sm text-zinc-500">Spaced repetition — review and strengthen memory</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Brain, value: cards.length, label: 'Cards due', color: 'text-brand-500', bg: 'bg-brand-50' },
            { icon: Flame, value: `${studyStreak}d`, label: 'Study streak', color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(({ icon: Icon, value, label, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <Icon size={20} className={`${color} mx-auto mb-1.5`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Card preview list */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Today's Queue</p>
          <div className="space-y-2">
            {cards.slice(0, 4).map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-zinc-100 shadow-card"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  card.difficulty === 'easy' ? 'bg-emerald-400' :
                  card.difficulty === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700 truncate">{card.question}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{card.source}</p>
                </div>
              </motion.div>
            ))}
            {cards.length > 4 && (
              <p className="text-xs text-center text-zinc-400 py-1">+{cards.length - 4} more cards</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setSessionStarted(true)}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl transition shadow-soft flex items-center justify-center gap-2 text-sm"
        >
          <Brain size={18} /> Start Session ({cards.length} cards)
        </button>

        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
          <p className="text-xs text-zinc-500">Rate each card as <span className="text-emerald-600 font-medium">Easy</span>, <span className="text-amber-600 font-medium">Medium</span>, or <span className="text-red-600 font-medium">Hard</span> after revealing the answer. Buddi will space your next review based on your rating.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Brain size={16} className="text-brand-500" />
            <span className="font-semibold text-zinc-700">{cards.length - currentIndex} left</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Flame size={16} className="text-orange-500" />
            <span className="font-semibold text-zinc-700">{studyStreak} day streak</span>
          </div>
        </div>
        <span className="text-sm text-zinc-400">{currentIndex + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 rounded-full h-1.5">
        <motion.div
          className="bg-brand-500 h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Source tag */}
      <div className="flex items-center gap-2">
        <BookOpen size={13} className="text-zinc-400" />
        <span className="text-xs text-zinc-400">{current.source}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
          current.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
          current.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
        }`}>
          {current.difficulty}
        </span>
      </div>

      {/* Flashcard */}
      <div className="w-full relative" style={{ height: '300px', perspective: '1000px' }}>
        <motion.div
          key={current.id}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 80 }}
          style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-3xl shadow-soft border border-zinc-100 p-6 flex flex-col items-center justify-center cursor-pointer"
            style={{ backfaceVisibility: 'hidden' }}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            <Brain size={24} className="text-brand-200 mb-4" />
            <p className="text-zinc-800 text-base font-semibold text-center leading-relaxed">{current.question}</p>
            <p className="text-xs text-zinc-400 mt-6">Tap to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl shadow-soft p-6 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-4">Answer</p>
            <p className="text-white text-sm text-center leading-relaxed">{current.answer}</p>
          </div>
        </motion.div>
      </div>

      {/* Rating buttons */}
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
        <button
          onClick={() => setIsFlipped(true)}
          className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition shadow-soft flex items-center justify-center gap-2"
        >
          Show Answer <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
