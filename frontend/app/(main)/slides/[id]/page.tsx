'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Brain, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { io } from 'socket.io-client';
import { slidesApi, type Note } from '@/lib/api/slides';
import { formatDate } from '@/lib/utils';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

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
    let mounted = true;
    const DUMMY_DETAIL: Record<string, NoteDetail> = {
      'demo-1': {
        id: 'demo-1', title: 'Pharmacology — CNS Drugs', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 3, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        summary: 'Covers dopamine pathways, antipsychotics (haloperidol, clozapine), SSRIs, and mood stabilizers including lithium and valproate.',
        chunks: [
          { id: 'c1', chunkIndex: 0, content: 'Q: What is the mechanism of haloperidol?\nA: Haloperidol is a typical antipsychotic that blocks D2 dopamine receptors in the mesolimbic pathway, reducing positive symptoms of schizophrenia.' },
          { id: 'c2', chunkIndex: 1, content: 'Q: How does lithium work as a mood stabilizer?\nA: Lithium inhibits inositol monophosphatase and GSK-3, reducing second messenger signaling downstream of neurotransmitter receptors.' },
          { id: 'c3', chunkIndex: 2, content: 'Q: What is serotonin syndrome?\nA: A potentially life-threatening condition caused by excess serotonergic activity. Triad: mental status changes, autonomic instability, and neuromuscular abnormalities.' },
        ],
      },
      'demo-2': {
        id: 'demo-2', title: 'Anatomy Notes — Upper Limb', fileType: 'IMAGE', processingStatus: 'DONE',
        masteryLevel: 2, createdAt: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Upper limb musculature and brachial plexus with clinical correlations for nerve injuries.',
        chunks: [
          { id: 'c4', chunkIndex: 0, content: 'Q: What muscles are innervated by the radial nerve?\nA: The radial nerve innervates the triceps, brachioradialis, and all wrist/finger extensors. Injury causes wrist drop.' },
          { id: 'c5', chunkIndex: 1, content: 'Q: What is the clinical sign of median nerve injury at the wrist?\nA: Loss of thumb opposition and thenar wasting (ape hand deformity). Loss of sensation in lateral 3½ fingers.' },
          { id: 'c6', chunkIndex: 2, content: 'Q: What nerve is tested by pinching the first dorsal web space?\nA: The deep branch of the radial nerve (posterior interosseous nerve). Weakness in finger extension but not wrist extension.' },
        ],
      },
      'demo-3': {
        id: 'demo-3', title: 'Contract Law — Essentials', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 4, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        summary: 'Offer, acceptance, consideration, privity and breach remedies — the foundational pillars of contract law.',
        chunks: [
          { id: 'c7', chunkIndex: 0, content: 'Q: What are the essential elements of a valid contract?\nA: Offer, acceptance, consideration, intention to create legal relations, and capacity. All must be present for enforceability.' },
          { id: 'c8', chunkIndex: 1, content: 'Q: What is the rule in Carlill v Carbolic Smoke Ball Co?\nA: An advertisement can constitute a binding unilateral offer if it is sufficiently certain and the offeror shows intention to be bound, e.g., by depositing money.' },
          { id: 'c9', chunkIndex: 2, content: 'Q: What is the postal rule?\nA: Acceptance of a contract is complete when the letter is posted, not when received — established in Adams v Lindsell (1818).' },
        ],
      },
      'demo-4': {
        id: 'demo-4', title: 'Thermodynamics Lecture 3', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 1, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        summary: 'Laws of thermodynamics, entropy, Carnot cycle and efficiency — core concepts for engineering exams.',
        chunks: [
          { id: 'c10', chunkIndex: 0, content: 'Q: State the Second Law of Thermodynamics.\nA: Heat cannot spontaneously flow from a colder body to a hotter body. Entropy of an isolated system always increases over time.' },
          { id: 'c11', chunkIndex: 1, content: 'Q: What is the Carnot efficiency formula?\nA: η = 1 − (T_cold / T_hot), where temperatures are in Kelvin. It represents the maximum possible efficiency of any heat engine.' },
          { id: 'c12', chunkIndex: 2, content: 'Q: What is entropy?\nA: A measure of disorder or randomness in a system. In a reversible process dS = dQ/T; in irreversible processes entropy always increases.' },
        ],
      },
      'demo-5': {
        id: 'demo-5', title: 'Voice note — Cardiology', fileType: 'VOICE', processingStatus: 'DONE',
        masteryLevel: 2, createdAt: new Date(Date.now() - 3600000).toISOString(),
        summary: 'Heart sounds, murmurs, cardiac output and Frank-Starling mechanism — high-yield for clinical exams.',
        chunks: [
          { id: 'c13', chunkIndex: 0, content: 'Q: What causes S3 heart sound?\nA: S3 (ventricular gallop) is caused by rapid ventricular filling in early diastole — normal in young people, pathological in adults (suggests heart failure or volume overload).' },
          { id: 'c14', chunkIndex: 1, content: 'Q: What is the Frank-Starling law?\nA: As venous return (preload) increases, the heart stretches and contracts more forcefully up to a point — the heart pumps what it receives.' },
          { id: 'c15', chunkIndex: 2, content: 'Q: What murmur is classic for mitral stenosis?\nA: A low-pitched, rumbling mid-diastolic murmur best heard at the apex with the patient in left lateral decubitus, often with an opening snap.' },
        ],
      },
    };

    // Skip API for demo notes — serve locally
    if (id.startsWith('demo-')) {
      setNote(DUMMY_DETAIL[id] ?? null);
      setLoading(false);
      return () => { mounted = false; };
    }

    slidesApi.getById(id).then(data => {
      if (!mounted) return;
      setNote(data as NoteDetail);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      // Never null out a real note — show a processing placeholder so the
      // user sees their note and doesn't think it was lost.
      setNote({
        id,
        title: 'Note',
        fileType: 'PDF',
        processingStatus: 'PROCESSING',
        masteryLevel: 0,
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [id]);

  // Real-time processing status for uploaded (non-demo) notes
  useEffect(() => {
    if (id.startsWith('demo-')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) return;
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
    });
    socket.on('note:status', ({ noteId, status }: { noteId: string; status: string }) => {
      if (noteId !== id) return;
      if (status === 'DONE') {
        // Refetch full note detail (summary + chunks now available)
        slidesApi.getById(id).then(data => setNote(data as NoteDetail)).catch(() => {});
      } else {
        setNote(prev => prev ? { ...prev, processingStatus: status } : prev);
      }
    });
    return () => { socket.disconnect(); };
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
