'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, Mic, Search, ChevronRight, Clock, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useSlides } from '@/lib/hooks/use-slides';
import toast from 'react-hot-toast';
import type { Note } from '@/lib/api/slides';

function summaryPreview(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.overview === 'string') return parsed.overview;
  } catch { /* plain-text summary */ }
  return raw;
}

const fileTypeIcon: Record<string, React.ReactNode> = {
  PDF:   <FileText size={16} className="text-red-500" />,
  IMAGE: <Image   size={16} className="text-blue-500" />,
  VOICE: <Mic     size={16} className="text-green-500" />,
  TEXT:  <FileText size={16} className="text-zinc-500" />,
};

const masteryColors = ['bg-zinc-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-emerald-400'];
const masteryLabels = ['Untested', 'Just started', 'Learning', 'Getting there', 'Almost mastered', 'Mastered'];

function noteStatus(n: Note) {
  return n.processingStatus?.toLowerCase() as 'pending' | 'processing' | 'done' | 'failed';
}

export default function SlidesPage() {
  const { notes, upload, activeUploads, remove } = useSlides();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this note? This cannot be undone.')) return;
    remove(noteId);
    toast.success('Note deleted');
  };

  // All files upload in parallel — each gets its own optimistic entry immediately
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    await Promise.allSettled(acceptedFiles.map(file => upload(file)));
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'audio/*': ['.mp3', '.m4a', '.wav'],
    },
    maxSize: 20 * 1024 * 1024,
    // Zone stays active even while files are uploading
  });

  const filtered = notes.filter(n => (n.title ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">My Slides</h1>
          <p className="text-sm text-zinc-500">Upload notes — Buddi extracts flashcards and key terms</p>
        </div>
        {activeUploads > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
            <Loader2 size={12} className="animate-spin" />
            {activeUploads === 1 ? 'Uploading…' : `Uploading ${activeUploads}…`}
          </div>
        )}
      </div>

      {/* Upload zone — always interactive */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
          isDragActive
            ? 'border-brand-400 bg-brand-50 scale-[1.01]'
            : 'border-zinc-200 hover:border-brand-300 hover:bg-zinc-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Upload size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700">
              {isDragActive ? 'Drop to upload' : 'Upload slides or notes'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">PDFs, images, voice notes · Max 20 MB · Multiple files OK</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {notes.length > 2 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your notes..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>
      )}

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-zinc-600 font-medium">
            {search ? 'No matching notes' : 'No notes yet'}
          </p>
          <p className="text-zinc-400 text-sm mt-1">
            {search ? 'Try a different search' : 'Drop a PDF, image, or voice note above'}
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-3">
            {filtered.map((note, i) => {
              const status = noteStatus(note);
              const isOptimistic = note.id.startsWith('optimistic-');
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ delay: isOptimistic ? 0 : i * 0.04 }}
                  className={`bg-white rounded-2xl p-4 border shadow-card flex items-center gap-3 transition ${
                    isOptimistic || status === 'processing' || status === 'pending'
                      ? 'border-amber-100 cursor-default'
                      : status === 'failed'
                      ? 'border-red-100 cursor-pointer hover:border-red-200'
                      : 'border-zinc-100 cursor-pointer hover:border-brand-200'
                  }`}
                  onClick={() => !isOptimistic && router.push(`/slides/${note.id}`)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === 'processing' || status === 'pending' ? 'bg-amber-50' : 'bg-zinc-50'
                  }`}>
                    {status === 'processing' || status === 'pending'
                      ? <Loader2 size={16} className="text-amber-500 animate-spin" />
                      : fileTypeIcon[note.fileType] ?? <FileText size={16} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{note.title}</p>
                    {note.summary && status === 'done' && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{summaryPreview(note.summary)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {status === 'processing' || status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {isOptimistic ? 'Uploading' : 'Processing'}
                        </span>
                      ) : status === 'failed' ? (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          Upload failed — tap to retry
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${masteryColors[note.masteryLevel] ?? masteryColors[0]}`} />
                          <span className="text-xs text-zinc-400">{masteryLabels[note.masteryLevel] ?? 'Untested'}</span>
                        </div>
                      )}
                      <span className="text-xs text-zinc-300">·</span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isOptimistic && (
                      <button
                        onClick={e => handleDelete(e, note.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {!isOptimistic && status !== 'failed' && (
                      <ChevronRight size={18} className="text-zinc-300" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
