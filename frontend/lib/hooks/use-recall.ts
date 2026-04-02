'use client';

import { useState, useCallback } from 'react';
import { recallApi, type RecallCard } from '@/lib/api/recall';

export interface RecallCardEx extends RecallCard {
  source?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const DUMMY_CARDS: RecallCardEx[] = [
  { id: '1', question: 'What is the mechanism of action of metformin?', answer: 'Metformin primarily inhibits hepatic gluconeogenesis by activating AMPK, which decreases mTOR signaling and reduces glucose production. It also improves insulin sensitivity in peripheral tissues.', noteChunkId: '1', source: 'Pharmacology — CNS Drugs', difficulty: 'medium' },
  { id: '2', question: 'What are the key branches of the brachial plexus?', answer: 'The brachial plexus has 5 roots (C5–T1), 3 trunks (superior, middle, inferior), 6 divisions, 3 cords (lateral, medial, posterior), and 5 terminal branches: musculocutaneous, median, ulnar, radial, and axillary nerves.', noteChunkId: '2', source: 'Anatomy Notes — Week 4', difficulty: 'hard' },
  { id: '3', question: 'Define the Frank-Starling law of the heart', answer: 'The Frank-Starling law states that stroke volume increases in response to an increase in end-diastolic volume (greater stretch of ventricular walls), enabling the heart to match its output to venous return.', noteChunkId: '3', source: 'Cardiology', difficulty: 'medium' },
  { id: '4', question: 'What is the difference between Type I and Type II errors?', answer: 'Type I error (α) = false positive — rejecting a true null hypothesis. Type II error (β) = false negative — failing to reject a false null hypothesis. Power = 1 - β.', noteChunkId: '4', source: 'Biostatistics', difficulty: 'easy' },
  { id: '5', question: 'List the layers of the epidermis from deep to superficial', answer: 'From deep to superficial: Stratum Basale → Stratum Spinosum → Stratum Granulosum → Stratum Lucidum (palms/soles only) → Stratum Corneum.', noteChunkId: '5', source: 'Histology', difficulty: 'easy' },
  { id: '6', question: 'What triggers the release of ADH (vasopressin)?', answer: 'ADH is released by the posterior pituitary in response to: (1) increased plasma osmolality (detected by hypothalamic osmoreceptors) and (2) decreased blood volume/pressure. Stress, nausea, and pain also stimulate release.', noteChunkId: '6', source: 'Physiology — Renal', difficulty: 'hard' },
  { id: '7', question: 'What is the central dogma of molecular biology?', answer: 'DNA → (Transcription) → mRNA → (Translation) → Protein. Reverse transcription (RNA → DNA) occurs in retroviruses. Some RNA viruses bypass DNA entirely.', noteChunkId: '7', source: 'Molecular Biology', difficulty: 'easy' },
  { id: '8', question: "What are the classic features of Cushing's syndrome?", answer: "Central obesity (buffalo hump, moon face), purple striae, proximal muscle weakness, hypertension, hyperglycemia, osteoporosis, hirsutism, thin skin, and easy bruising. Caused by prolonged cortisol excess.", noteChunkId: '8', source: 'Endocrinology', difficulty: 'medium' },
];

export type SessionState = 'idle' | 'loading' | 'ready' | 'active' | 'complete';

interface SessionScores {
  correct: number;
  partial: number;
  incorrect: number;
}

export function useRecall() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [cards, setCards] = useState<RecallCardEx[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<SessionScores>({ correct: 0, partial: 0, incorrect: 0 });

  const loadCards = useCallback(async () => {
    setSessionState('loading');
    try {
      const apiCards = await recallApi.getDueCards();
      setCards(apiCards.length > 0 ? apiCards : DUMMY_CARDS);
    } catch {
      setCards(DUMMY_CARDS);
    }
    setSessionState('ready');
  }, []);

  const startSession = useCallback(async () => {
    try {
      const { sessionId: sid } = await recallApi.startSession();
      setSessionId(sid);
    } catch {
      setSessionId(`local-${Date.now()}`);
    }
    setCurrentIndex(0);
    setScores({ correct: 0, partial: 0, incorrect: 0 });
    setSessionState('active');
  }, []);

  const submitAnswer = useCallback(async (rating: 'easy' | 'medium' | 'hard') => {
    const card = cards[currentIndex];
    if (!card) return;

    setScores(prev => ({
      ...prev,
      correct: rating === 'easy' ? prev.correct + 1 : prev.correct,
      partial: rating === 'medium' ? prev.partial + 1 : prev.partial,
      incorrect: rating === 'hard' ? prev.incorrect + 1 : prev.incorrect,
    }));

    if (sessionId && !sessionId.startsWith('local-')) {
      try {
        await recallApi.submitAnswer(sessionId, card.id, rating);
      } catch {
        // silent fail — scores tracked locally
      }
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1);
      return false; // more cards
    } else {
      // Complete session
      if (sessionId && !sessionId.startsWith('local-')) {
        try { await recallApi.completeSession(sessionId); } catch {}
      }
      setSessionState('complete');
      return true; // done
    }
  }, [cards, currentIndex, sessionId]);

  const reset = useCallback(() => {
    setSessionState('idle');
    setCards([]);
    setSessionId(null);
    setCurrentIndex(0);
    setScores({ correct: 0, partial: 0, incorrect: 0 });
  }, []);

  return {
    sessionState,
    cards,
    currentCard: cards[currentIndex] ?? null,
    currentIndex,
    totalCards: cards.length,
    scores,
    loadCards,
    startSession,
    submitAnswer,
    reset,
  };
}
