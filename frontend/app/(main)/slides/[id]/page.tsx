'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Brain, Clock, Zap,
  ChevronDown, ChevronUp, BookOpen, AlignLeft, Tag,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { slidesApi, type Note } from '@/lib/api/slides';
import { formatDate } from '@/lib/utils';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface NoteDetail extends Note {
  content?: string;
  pageCount?: number;
  chunks?: Array<{ id: string; content: string; chunkIndex: number }>;
}

interface StructuredSummary {
  overview: string;
  topics: string[];
  takeaways: string[];
}

function parseSummary(raw?: string): StructuredSummary | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.overview && Array.isArray(parsed.topics)) return parsed as StructuredSummary;
  } catch { /* plain-text summary */ }
  return null;
}

const masteryColors = ['bg-zinc-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-emerald-400'];
const masteryLabels = ['Untested', 'Just started', 'Learning', 'Getting there', 'Almost there', 'Mastered'];

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [showRawContent, setShowRawContent] = useState(false);
  const [rawExpanded, setRawExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const DUMMY_DETAIL: Record<string, NoteDetail> = {
      'demo-1': {
        id: 'demo-1', title: 'Pharmacology — CNS Drugs', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 3, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), pageCount: 12,
        summary: JSON.stringify({
          overview: 'Covers the major CNS drug classes including dopamine pathway modulators, antipsychotics, SSRIs, and mood stabilizers. Focuses on mechanisms of action and clinical applications.',
          topics: ['Dopamine pathways', 'Antipsychotics', 'Mood stabilizers', 'SSRIs', 'Serotonin syndrome'],
          takeaways: [
            'Haloperidol blocks D2 receptors in the mesolimbic pathway — typical antipsychotic.',
            'Lithium inhibits GSK-3 and inositol monophosphatase for mood stabilization.',
            'Serotonin syndrome triad: mental status changes + autonomic instability + neuromuscular abnormalities.',
          ],
        }),
        chunks: [
          { id: 'c1', chunkIndex: 0, content: 'Q: What is the mechanism of haloperidol?\nA: Haloperidol is a typical antipsychotic that blocks D2 dopamine receptors in the mesolimbic pathway, reducing positive symptoms of schizophrenia.' },
          { id: 'c2', chunkIndex: 1, content: 'Q: How does lithium work as a mood stabilizer?\nA: Lithium inhibits inositol monophosphatase and GSK-3, reducing second messenger signaling downstream of neurotransmitter receptors.' },
          { id: 'c3', chunkIndex: 2, content: 'Q: What is serotonin syndrome?\nA: A potentially life-threatening condition caused by excess serotonergic activity. Triad: mental status changes, autonomic instability, and neuromuscular abnormalities.' },
          { id: 't1', chunkIndex: 100, content: 'TERM: Mesolimbic pathway\nDEF: Dopaminergic pathway from the ventral tegmental area to the nucleus accumbens — primary target of antipsychotic drugs.' },
          { id: 't2', chunkIndex: 101, content: 'TERM: Extrapyramidal side effects\nDEF: Movement-related adverse effects (dystonia, akathisia, parkinsonism, tardive dyskinesia) caused by D2 blockade in the nigrostriatal pathway.' },
          { id: 't3', chunkIndex: 102, content: 'TERM: Clozapine\nDEF: Atypical antipsychotic with low EPS risk; blocks multiple receptors (D4, 5-HT2A). Risk of agranulocytosis requires regular blood monitoring.' },
        ],
      },
      'demo-2': {
        id: 'demo-2', title: 'Anatomy Notes — Upper Limb', fileType: 'IMAGE', processingStatus: 'DONE',
        masteryLevel: 2, createdAt: new Date(Date.now() - 86400000).toISOString(),
        summary: JSON.stringify({
          overview: 'Covers the musculature and neurovascular supply of the upper limb with emphasis on the brachial plexus and clinical nerve injury correlations.',
          topics: ['Brachial plexus', 'Nerve injuries', 'Upper limb muscles', 'Clinical correlations'],
          takeaways: [
            'Radial nerve injury → wrist drop; median nerve injury at wrist → ape hand; ulnar nerve → claw hand.',
            'The brachial plexus is formed from roots C5–T1.',
            'Thenar muscles are innervated by the recurrent branch of the median nerve.',
          ],
        }),
        chunks: [
          { id: 'c4', chunkIndex: 0, content: 'Q: What muscles are innervated by the radial nerve?\nA: The radial nerve innervates the triceps, brachioradialis, and all wrist/finger extensors. Injury causes wrist drop.' },
          { id: 'c5', chunkIndex: 1, content: 'Q: What is the clinical sign of median nerve injury at the wrist?\nA: Loss of thumb opposition and thenar wasting (ape hand deformity). Loss of sensation in lateral 3½ fingers.' },
          { id: 'c6', chunkIndex: 2, content: 'Q: What nerve is tested by pinching the first dorsal web space?\nA: The deep branch of the radial nerve (posterior interosseous nerve). Weakness in finger extension but not wrist extension.' },
          { id: 't4', chunkIndex: 100, content: 'TERM: Saturday night palsy\nDEF: Radial nerve compression at the spiral groove causing wrist drop; typically from prolonged arm compression over a hard surface.' },
          { id: 't5', chunkIndex: 101, content: 'TERM: Carpal tunnel syndrome\nDEF: Compression of the median nerve under the flexor retinaculum, causing pain and paresthesia in the lateral 3½ fingers.' },
        ],
      },
      'demo-3': {
        id: 'demo-3', title: 'Contract Law — Essentials', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 4, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), pageCount: 8,
        summary: JSON.stringify({
          overview: 'Covers the foundational pillars of contract law: offer, acceptance, consideration, privity, and remedies for breach. Includes landmark cases and legal principles.',
          topics: ['Offer & Acceptance', 'Consideration', 'Privity of contract', 'Breach & Remedies'],
          takeaways: [
            'All five elements must be present for a binding contract: offer, acceptance, consideration, intention, capacity.',
            'The postal rule: acceptance is complete on posting (Adams v Lindsell 1818).',
            'Carlill v Carbolic Smoke Ball established that advertisements can constitute unilateral offers.',
          ],
        }),
        chunks: [
          { id: 'c7', chunkIndex: 0, content: 'Q: What are the essential elements of a valid contract?\nA: Offer, acceptance, consideration, intention to create legal relations, and capacity. All must be present for enforceability.' },
          { id: 'c8', chunkIndex: 1, content: 'Q: What is the rule in Carlill v Carbolic Smoke Ball Co?\nA: An advertisement can constitute a binding unilateral offer if it is sufficiently certain and the offeror shows intention to be bound, e.g., by depositing money.' },
          { id: 'c9', chunkIndex: 2, content: 'Q: What is the postal rule?\nA: Acceptance of a contract is complete when the letter is posted, not when received — established in Adams v Lindsell (1818).' },
          { id: 't6', chunkIndex: 100, content: 'TERM: Consideration\nDEF: Something of value exchanged between contracting parties. Must be sufficient but need not be adequate — a peppercorn suffices.' },
          { id: 't7', chunkIndex: 101, content: 'TERM: Privity of contract\nDEF: Only parties to a contract can sue on it. Third parties generally cannot enforce contractual obligations (Tweddle v Atkinson).' },
        ],
      },
      'demo-4': {
        id: 'demo-4', title: 'Thermodynamics Lecture 3', fileType: 'PDF', processingStatus: 'DONE',
        masteryLevel: 1, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), pageCount: 18,
        summary: JSON.stringify({
          overview: 'Introduces the four laws of thermodynamics with emphasis on entropy, heat engines, and the Carnot cycle. Fundamental for engineering and physics examinations.',
          topics: ['Laws of thermodynamics', 'Entropy', 'Carnot cycle', 'Heat engines'],
          takeaways: [
            'Carnot efficiency η = 1 − (T_cold / T_hot) — the theoretical maximum for any heat engine.',
            'Second law: entropy of an isolated system always increases (ΔS ≥ 0).',
            'Zeroth law defines thermal equilibrium and underpins temperature measurement.',
          ],
        }),
        chunks: [
          { id: 'c10', chunkIndex: 0, content: 'Q: State the Second Law of Thermodynamics.\nA: Heat cannot spontaneously flow from a colder body to a hotter body. Entropy of an isolated system always increases over time.' },
          { id: 'c11', chunkIndex: 1, content: 'Q: What is the Carnot efficiency formula?\nA: η = 1 − (T_cold / T_hot), where temperatures are in Kelvin. It represents the maximum possible efficiency of any heat engine.' },
          { id: 'c12', chunkIndex: 2, content: 'Q: What is entropy?\nA: A measure of disorder or randomness in a system. In a reversible process dS = dQ/T; in irreversible processes entropy always increases.' },
          { id: 't8', chunkIndex: 100, content: 'TERM: Carnot cycle\nDEF: Theoretical heat engine cycle consisting of two isothermal and two adiabatic processes, operating at the maximum thermodynamic efficiency.' },
          { id: 't9', chunkIndex: 101, content: 'TERM: Enthalpy (H)\nDEF: H = U + PV; a state function representing total heat content of a system at constant pressure. ΔH = q_p.' },
        ],
      },
      'demo-5': {
        id: 'demo-5', title: 'Voice note — Cardiology', fileType: 'VOICE', processingStatus: 'DONE',
        masteryLevel: 2, createdAt: new Date(Date.now() - 3600000).toISOString(),
        summary: JSON.stringify({
          overview: 'Reviews heart sounds, murmurs, and the Frank-Starling mechanism. High-yield material for clinical examinations covering normal and pathological cardiac physiology.',
          topics: ['Heart sounds', 'Murmurs', 'Frank-Starling law', 'Cardiac output'],
          takeaways: [
            'S3 in adults = pathological (heart failure / volume overload); normal in children.',
            'Frank-Starling: stroke volume increases with preload up to a physiological limit.',
            'Mitral stenosis: rumbling mid-diastolic murmur at apex with opening snap.',
          ],
        }),
        chunks: [
          { id: 'c13', chunkIndex: 0, content: 'Q: What causes S3 heart sound?\nA: S3 (ventricular gallop) is caused by rapid ventricular filling in early diastole — normal in young people, pathological in adults (suggests heart failure or volume overload).' },
          { id: 'c14', chunkIndex: 1, content: 'Q: What is the Frank-Starling law?\nA: As venous return (preload) increases, the heart stretches and contracts more forcefully up to a point — the heart pumps what it receives.' },
          { id: 'c15', chunkIndex: 2, content: 'Q: What murmur is classic for mitral stenosis?\nA: A low-pitched, rumbling mid-diastolic murmur best heard at the apex with the patient in left lateral decubitus, often with an opening snap.' },
          { id: 't10', chunkIndex: 100, content: 'TERM: Preload\nDEF: The degree of ventricular stretch at end-diastole, determined by venous return (end-diastolic volume). Increases stroke volume via Frank-Starling.' },
          { id: 't11', chunkIndex: 101, content: 'TERM: Ejection fraction\nDEF: Fraction of end-diastolic volume ejected per beat (SV/EDV). Normal ≥55%. Reduced in systolic heart failure.' },
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
      // Never null out a real note — show processing placeholder so user doesn't think it was lost
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
    let alive = true;
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socket.on('note:status', ({ noteId, status }: { noteId: string; status: string }) => {
      if (!alive || noteId !== id) return;
      if (status === 'DONE') {
        // Refetch full note detail (summary + chunks now available)
        slidesApi.getById(id)
          .then(data => { if (alive) setNote(data as NoteDetail); })
          .catch(() => {});
      } else {
        setNote(prev => prev ? { ...prev, processingStatus: status } : prev);
      }
    });
    return () => { alive = false; socket.disconnect(); };
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

  // Parse summary — may be structured JSON or plain text
  const structuredSummary = parseSummary(note.summary);

  // Separate chunks by type based on content prefix
  const allChunks = (note.chunks || []);
  const flashcards = allChunks
    .filter(c => c.content.startsWith('Q:'))
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(chunk => {
      const lines = chunk.content.split('\n');
      return {
        id: chunk.id,
        question: lines[0]?.replace(/^Q:\s*/, '') || 'Review',
        answer: lines[1]?.replace(/^A:\s*/, '') || chunk.content,
      };
    });

  const keyTerms = allChunks
    .filter(c => c.content.startsWith('TERM:'))
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(chunk => {
      const lines = chunk.content.split('\n');
      return {
        id: chunk.id,
        term: lines[0]?.replace(/^TERM:\s*/, '') || 'Term',
        definition: lines[1]?.replace(/^DEF:\s*/, '') || chunk.content,
      };
    });

  const rawPreview = note.content && !note.content.startsWith('[Image upload')
    ? note.content
    : null;

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
            {note.pageCount ? ` · ${note.pageCount} pages` : ''}
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
            <div className={`w-2.5 h-2.5 rounded-full ${masteryColors[Math.max(0, Math.min(5, note.masteryLevel ?? 0))]}`} />
            <span className="text-xs text-zinc-500">{masteryLabels[Math.max(0, Math.min(5, note.masteryLevel ?? 0))]}</span>
          </div>
        </div>
        {(note.processingStatus === 'PROCESSING' || note.processingStatus === 'PENDING') && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-xl p-3">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Buddi is extracting content and building your study pack…</p>
          </div>
        )}
        {note.processingStatus === 'FAILED' && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 rounded-xl p-3">
            <p className="text-xs text-red-600 font-medium">Processing failed — try uploading again.</p>
          </div>
        )}
      </motion.div>

      {/* AI Overview + Topics (structured) */}
      {structuredSummary ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-brand-50 rounded-2xl p-4 border border-brand-100 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-brand-600" />
            <p className="text-sm font-semibold text-brand-700">AI Overview</p>
          </div>
          <p className="text-sm text-brand-800 leading-relaxed">{structuredSummary.overview}</p>
          {structuredSummary.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {structuredSummary.topics.map((topic, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-medium">
                  <Tag size={9} />
                  {topic}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ) : note.summary ? (
        /* Plain-text fallback for older notes */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-brand-600" />
            <p className="text-sm font-semibold text-brand-700">AI Summary</p>
          </div>
          <p className="text-sm text-brand-800 leading-relaxed whitespace-pre-line">{note.summary}</p>
        </motion.div>
      ) : null}

      {/* Key Takeaways */}
      {structuredSummary && structuredSummary.takeaways.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-amber-500" />
            <p className="text-sm font-semibold text-zinc-800">Key Takeaways</p>
          </div>
          <ul className="space-y-2">
            {structuredSummary.takeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-zinc-700 leading-snug">{point}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Key Terms / Glossary */}
      {keyTerms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-violet-500" />
            <p className="text-sm font-semibold text-zinc-800">Key Terms ({keyTerms.length})</p>
          </div>
          <div className="space-y-2">
            {keyTerms.map((term, i) => (
              <motion.div
                key={term.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-zinc-100 shadow-card overflow-hidden"
              >
                <button
                  onClick={() => toggleChunk(term.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <p className="text-sm font-semibold text-zinc-800 truncate">{term.term}</p>
                  </div>
                  {expandedChunks.has(term.id)
                    ? <ChevronUp size={16} className="text-zinc-400 shrink-0" />
                    : <ChevronDown size={16} className="text-zinc-400 shrink-0" />}
                </button>
                {expandedChunks.has(term.id) && (
                  <div className="px-4 pb-4 pt-0 border-t border-zinc-50">
                    <p className="text-sm text-zinc-600 leading-relaxed mt-3">{term.definition}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* High-Yield Flashcards */}
      {flashcards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-brand-500" />
            <p className="text-sm font-semibold text-zinc-800">High-Yield Questions ({flashcards.length})</p>
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
                  {expandedChunks.has(card.id)
                    ? <ChevronUp size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                    : <ChevronDown size={16} className="text-zinc-400 shrink-0 mt-0.5" />}
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

      {/* Raw extracted content preview */}
      {rawPreview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-zinc-100 shadow-card overflow-hidden">
          <button
            onClick={() => setShowRawContent(v => !v)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <AlignLeft size={15} className="text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-700">Extracted Content</p>
              <span className="text-xs text-zinc-400">{Math.ceil(rawPreview.length / 1000)}k chars</span>
            </div>
            {showRawContent
              ? <ChevronUp size={16} className="text-zinc-400 shrink-0" />
              : <ChevronDown size={16} className="text-zinc-400 shrink-0" />}
          </button>
          {showRawContent && (
            <div className="px-4 pb-4 pt-0 border-t border-zinc-50">
              <pre className="text-xs text-zinc-500 leading-relaxed mt-3 whitespace-pre-wrap break-words font-mono">
                {rawExpanded ? rawPreview : rawPreview.slice(0, 800)}
              </pre>
              {rawPreview.length > 800 && (
                <button
                  onClick={() => setRawExpanded(v => !v)}
                  className="mt-2 text-xs text-brand-600 font-medium"
                >
                  {rawExpanded ? 'Show less' : `Show all (${rawPreview.length.toLocaleString()} chars)`}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state when fully processed but nothing extracted */}
      {flashcards.length === 0 && keyTerms.length === 0 && note.processingStatus === 'DONE' && !note.summary && (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-zinc-500 text-sm">No content could be extracted from this file.</p>
        </div>
      )}
    </div>
  );
}
