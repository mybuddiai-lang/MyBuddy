'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Brain, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { slidesApi, type Note } from '@/lib/api/slides';
import { formatDate } from '@/lib/utils';

interface NoteDetail extends Note {
  content?: string;
  chunks?: Array<{ id: string; content: string; chunkIndex: number }>;
}

const masteryColors = ['bg-zinc-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-emerald-400'];
const masteryLabels = ['Untested', 'Just started', 'Learning', 'Getting there', 'Almost there', 'Mastered'];

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const DUMMY_DETAIL: Record<string, NoteDetail> = {
      '1': {
        id: '1', title: 'Pharmacology — CNS Drugs', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 3, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        summary: 'Covers dopamine pathways, antipsychotics (haloperidol, clozapine), SSRIs, and mood stabilizers including lithium and valproate.',
        chunks: [
          { id: 'c1', chunkIndex: 0, content: 'Q: What is the mechanism of haloperidol?\nA: Haloperidol is a typical antipsychotic that blocks D2 dopamine receptors in the mesolimbic pathway, reducing positive symptoms of schizophrenia.' },
          { id: 'c2', chunkIndex: 1, content: 'Q: How does lithium work as a mood stabilizer?\nA: Lithium inhibits inositol monophosphatase and GSK-3, reducing second messenger signaling downstream of neurotransmitter receptors.' },
          { id: 'c3', chunkIndex: 2, content: 'Q: What is serotonin syndrome?\nA: A potentially life-threatening condition caused by excess serotonergic activity. Triad: mental status changes, autonomic instability, and neuromuscular abnormalities.' },
        ],
      },
      '2': {
        id: '2', title: 'Anatomy Notes — Week 4', fileType: 'IMAGE', processingStatus: 'DONE',
        masteryLevel: 1, createdAt: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Upper limb musculature and brachial plexus with clinical correlations for nerve injuries.',
        chunks: [
          { id: 'c4', chunkIndex: 0, content: 'Q: What muscles are innervated by the radial nerve?\nA: The radial nerve innervates the triceps, brachioradialis, and all wrist/finger extensors. Injury causes wrist drop.' },
          { id: 'c5', chunkIndex: 1, content: 'Q: What is the clinical sign of median nerve injury at the wrist?\nA: Loss of thumb opposition and thenar wasting (ape hand deformity). Loss of sensation in lateral 3½ fingers.' },
        ],
      },
    };

    slidesApi.getById(id).then(data => {
      setNote(data as NoteDetail);
      setLoading(false);
    }).catch(() => {
      setNote(DUMMY_DETAIL[id] ?? null);
      setLoading(false);
    });
  }, [id]);

  const toggleChunk = (chunkId: string) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      next.has(chunkId) ? next.delete(chunkId) : next.add(chunkId);
      return next;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!note) return (
    <div className="px-4 py-12 text-center">
      <p className="text-zinc-500">Note not found.</p>
      <button onClick={() => router.back()} className="mt-4 text-brand-600 font-medium text-sm">Go back</button>
    </div>
  );

  // Parse Q&A from chunks
  const flashcards = (note.chunks || []).map(chunk => {
    const lines = chunk.content.split('\n');
    return {
      id: chunk.id,
      question: lines[0]?.replace('Q: ', '') || 'Review',
      answer: lines[1]?.replace('A: ', '') || chunk.content,
    };
  });

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition shrink-0">
          <ArrowLeft size={18} className="text-zinc-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-zinc-900 truncate">{note.title}</h1>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock size={10} /> {note.createdAt ? formatDate(note.createdAt) : ''}
          </p>
        </div>
      </div>

      {/* Status card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700">{note.fileType}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${masteryColors[note.masteryLevel]}`} />
            <span className="text-xs text-zinc-500">{masteryLabels[note.masteryLevel]}</span>
          </div>
        </div>
        {note.processingStatus === 'PROCESSING' && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-xl p-3">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Buddi is processing your notes…</p>
          </div>
        )}
      </motion.div>

      {/* AI Summary */}
      {note.summary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-brand-600" />
            <p className="text-sm font-semibold text-brand-700">AI Summary</p>
          </div>
          <p className="text-sm text-brand-800 leading-relaxed">{note.summary}</p>
        </motion.div>
      )}

      {/* Flashcards */}
      {flashcards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-brand-500" />
            <p className="text-sm font-semibold text-zinc-800">High-Yield Facts ({flashcards.length})</p>
          </div>
          <div className="space-y-2">
            {flashcards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-zinc-100 shadow-card overflow-hidden"
              >
                <button
                  onClick={() => toggleChunk(card.id)}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left"
                >
                  <p className="text-sm font-medium text-zinc-800 leading-snug">{card.question}</p>
                  {expandedChunks.has(card.id) ? <ChevronUp size={16} className="text-zinc-400 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-zinc-400 shrink-0 mt-0.5" />}
                </button>
                {expandedChunks.has(card.id) && (
                  <div className="px-4 pb-4 pt-0 border-t border-zinc-50">
                    <p className="text-sm text-zinc-600 leading-relaxed mt-3">{card.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {flashcards.length === 0 && note.processingStatus === 'DONE' && (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-zinc-500 text-sm">No flashcards extracted yet</p>
        </div>
      )}
    </div>
  );
}
