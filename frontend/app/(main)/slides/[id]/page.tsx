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

  // Real-time processing status updates
  useEffect(() => {
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

  const rawPreview = note.content && !note.content.startsWith('[')
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
