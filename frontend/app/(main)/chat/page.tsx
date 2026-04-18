'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, X, FileText, Image as ImageIcon,
  Mic, ImagePlus, RefreshCw, AlertCircle,
} from 'lucide-react';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useChatStore } from '@/lib/store/chat.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useSlides } from '@/lib/hooks/use-slides';
import { useVoiceRecorder } from '@/lib/hooks/use-voice-recorder';
import toast from 'react-hot-toast';
import type { Message } from '@/components/chat/message-bubble';
import { uploadViaProxy } from '@/lib/api/upload';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with my studies 😓",
  'Help me review my pharmacology notes',
  "I haven't slept well before my exam",
  'Give me a quick quiz on my last upload',
];

const DEMO_MESSAGES: Message[] = [
  {
    id: 'demo-1',
    role: 'user',
    content: "Hi Buddi, I have my finals in 3 weeks and I feel like I haven't studied enough",
    createdAt: new Date(Date.now() - 2 * 60000),
  },
  {
    id: 'demo-2',
    role: 'assistant',
    content:
      "Hey — first, I want you to take a breath. 3 weeks is actually meaningful time if you use it strategically.\n\nThe feeling of 'not having studied enough' is almost universal before finals — even among students who are very well prepared. That anxiety is your brain trying to help, not predict the future.\n\nLet's make a plan together. What subjects are you most worried about right now, and roughly how many hours a day can you realistically set aside?",
    createdAt: new Date(Date.now() - 90000),
  },
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  PDF: <FileText size={14} className="text-red-500" />,
  IMAGE: <ImageIcon size={14} className="text-blue-500" />,
  VOICE: <Mic size={14} className="text-green-500" />,
  TEXT: <FileText size={14} className="text-zinc-500" />,
};

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — browser uploads directly to R2

// ─── Attachment state ──────────────────────────────────────────────────────────
// Upload is fire-and-forget: the file is shown immediately via a local blob URL
// while the R2 upload runs in the background. Status drives the UI overlay.

type AttachmentType = 'IMAGE' | 'FILE' | 'VOICE';
type UploadStatus = 'uploading' | 'done' | 'error';

interface PendingAttachment {
  /** Original File — kept so we can retry without re-opening the picker. */
  file: File;
  name: string;
  type: AttachmentType;
  /** Blob URL — valid immediately, shows the image before upload finishes. */
  previewUrl?: string;
  /** R2 public URL — set only after a successful upload. */
  uploadedUrl?: string;
  status: UploadStatus;
}

// ─── Attachment preview component ─────────────────────────────────────────────

function AttachmentPreviewCard({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const { type, previewUrl, name, status } = attachment;
  const uploading = status === 'uploading';
  const failed = status === 'error';

  return (
    <div className="relative inline-block">
      {type === 'IMAGE' && previewUrl ? (
        /* ── Image preview ── */
        <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={name}
            className={`block max-h-36 max-w-[240px] w-auto object-cover transition-opacity duration-200 ${
              uploading || failed ? 'opacity-60' : 'opacity-100'
            }`}
          />

          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-7 h-7 border-[3px] border-white/70 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error overlay */}
          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40">
              <AlertCircle size={18} className="text-white" />
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-xs text-white font-medium bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── File / PDF chip ── */
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 min-w-0 max-w-[220px]">
          <FileText size={16} className="text-red-400 shrink-0" />
          <span className="text-xs text-zinc-700 dark:text-zinc-200 font-medium truncate flex-1">
            {name}
          </span>
          {uploading && (
            <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-brand-500 rounded-full animate-spin shrink-0" />
          )}
          {failed && (
            <button onClick={onRetry} title="Retry upload">
              <RefreshCw size={13} className="text-red-400 hover:text-red-600 transition shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Remove (×) button — always visible */}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center shadow-sm transition hover:bg-zinc-600 dark:hover:bg-zinc-400"
        title="Remove attachment"
      >
        <X size={10} className="text-white dark:text-zinc-900" />
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { messages, isTyping, isLoadingHistory, currentPage, totalPages, sendMessage, loadHistory, loadOlderMessages } =
    useChatStore();
  const { user } = useAuthStore();
  const { notes } = useSlides();

  const [input, setInput] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Scroll helpers ──────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    loadHistory().then(() => {
      if (useChatStore.getState().messages.length === 0) setShowDemo(true);
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isTyping) scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Revoke the pending blob URL when the page unmounts so it doesn't leak
  useEffect(() => {
    return () => {
      setPendingAttachment(prev => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
    };
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  // Runs in the background — does not block the input.
  // Uses the file object saved on the attachment so retry works without
  // re-opening the file picker.

  const doUpload = useCallback(async (file: File) => {
    try {
      const { url, type: detectedType } = await uploadViaProxy(file, { maxBytes: MAX_FILE_BYTES });
      setPendingAttachment(prev =>
        prev?.file === file
          ? { ...prev, uploadedUrl: url, type: detectedType as AttachmentType, status: 'done' }
          : prev,
      );
    } catch (err) {
      console.error('[chat upload]', err);
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      toast.error(msg);
      setPendingAttachment(prev => (prev?.file === file ? { ...prev, status: 'error' } : prev));
    }
  }, []);

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // reset so the same file can be re-selected after removal
      if (!file) return;

      if (file.size > MAX_FILE_BYTES) {
        toast.error('File too large. Maximum size is 25 MB.');
        return;
      }

      // Revoke the previous blob URL to avoid memory leaks
      setPendingAttachment(prev => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });

      const isImage = file.type.startsWith('image/');
      const type: AttachmentType = isImage ? 'IMAGE' : 'FILE';
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      // Show immediately while upload runs in the background
      setPendingAttachment({ file, name: file.name, type, previewUrl, status: 'uploading' });
      doUpload(file);
    },
    [doUpload],
  );

  // ── Retry / remove ──────────────────────────────────────────────────────────

  const handleRetryUpload = useCallback(() => {
    if (!pendingAttachment) return;
    setPendingAttachment(prev => (prev ? { ...prev, status: 'uploading' } : null));
    doUpload(pendingAttachment.file);
  }, [pendingAttachment, doUpload]);

  const handleRemoveAttachment = useCallback(() => {
    setPendingAttachment(prev => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (pendingAttachment?.status === 'uploading') {
      toast('Upload in progress — please wait a moment.', { icon: '⏳' });
      return;
    }
    if (pendingAttachment?.status === 'error') {
      toast.error('Attachment upload failed — retry or remove it before sending.');
      return;
    }
    const text = input.trim();
    if (!text && pendingAttachment?.status !== 'done') return;

    setShowDemo(false);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '24px';

    const attachment = pendingAttachment;
    setPendingAttachment(null);
    // Keep the blob previewUrl alive — MessageBubble uses it until the R2 URL loads

    await sendMessage({
      content: text,
      attachmentUrl: attachment?.uploadedUrl,
      attachmentType: attachment?.type,
      previewUrl: attachment?.previewUrl,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Slide notes ─────────────────────────────────────────────────────────────

  const handleAttachNote = (noteTitle: string) => {
    const prefix = `Let's review my notes on "${noteTitle}". `;
    setInput(prev => (prev.startsWith(prefix) ? prev : prefix + prev));
    setShowAttach(false);
    textareaRef.current?.focus();
  };

  // ── Voice recording ─────────────────────────────────────────────────────────

  const handleVoiceFile = useCallback(
    async (file: File) => {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
      if (!token) return;

      // Show a non-blocking spinner in the ImagePlus slot while transcribing
      setPendingAttachment({ file, name: file.name, type: 'VOICE', status: 'uploading' });

      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/backend/files/transcribe', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) throw new Error('Transcription failed');
        const json = await res.json();
        const text: string = json.data?.text ?? json.text ?? '';
        if (text.trim()) {
          setInput(text.trim());
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height =
              Math.min(textareaRef.current.scrollHeight, 120) + 'px';
          }
          textareaRef.current?.focus();
          setPendingAttachment(null); // transcription done — no attachment needed
        } else {
          toast.error("Couldn't understand the audio. Please try again.");
          setPendingAttachment(null);
        }
      } catch {
        toast.error('Voice transcription failed. Please try again.');
        setPendingAttachment(null);
      }
    },
    [],
  );

  const { isRecording, recordingTime, toggleRecording } = useVoiceRecorder(handleVoiceFile);

  const handleMicToggle = useCallback(async () => {
    try {
      await toggleRecording();
    } catch {
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, [toggleRecording]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const isUploadingAttachment = pendingAttachment?.status === 'uploading';
  const canSend =
    (input.trim().length > 0 || pendingAttachment?.status === 'done') && !isRecording;

  const displayMessages = messages.length > 0 ? messages : showDemo ? DEMO_MESSAGES : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-zinc-50 dark:bg-zinc-950"
      style={{
        position: 'fixed',
        top: 'calc(56px + env(safe-area-inset-top, 0px))',
        bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Messages ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1">
        {isLoadingHistory && messages.length === 0 ? (
          <div className="flex flex-col gap-4 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                {i % 2 !== 0 && (
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 shrink-0 animate-pulse" />
                )}
                <div
                  className={`h-12 rounded-2xl animate-pulse bg-zinc-100 dark:bg-zinc-800 ${
                    i % 2 === 0 ? 'w-48' : 'w-56'
                  }`}
                />
              </div>
            ))}
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🤝</span>
            </div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 text-lg">
              Hey {user?.name?.split(' ')[0] || 'there'}!
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-xs">
              I'm Buddi, your academic resilience companion. I'm here to help you study smarter and stay well.
            </p>
            <div className="mt-6 w-full max-w-sm space-y-2">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200 hover:border-brand-200 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {!showDemo && currentPage < totalPages && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={loadOlderMessages}
                  disabled={isLoadingHistory}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 transition disabled:opacity-40"
                >
                  {isLoadingHistory ? (
                    <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[10px]">↑</span>
                  )}
                  Load older messages
                </button>
              </div>
            )}

            {showDemo && (
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                  Sample conversation
                </span>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              </div>
            )}

            <AnimatePresence initial={false}>
              {displayMessages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-end gap-2 pl-2"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm shrink-0">
                  B
                </div>
                <TypingIndicator />
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Slide note picker ── */}
      <AnimatePresence>
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Attach a note</p>
              <button
                onClick={() => setShowAttach(false)}
                className="text-zinc-400 hover:text-zinc-600 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {notes.filter(n => n.processingStatus === 'DONE').length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-zinc-500">No processed notes yet.</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload slides first, then attach them here.
                  </p>
                </div>
              ) : (
                notes
                  .filter(n => n.processingStatus === 'DONE')
                  .map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleAttachNote(note.title)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition text-left border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
                        {FILE_ICONS[note.fileType] || <FileText size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
                          {note.title}
                        </p>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pending attachment preview ── */}
      <AnimatePresence>
        {pendingAttachment && pendingAttachment.type !== 'VOICE' && (
          <motion.div
            key="attachment-preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="px-4 pb-2"
          >
            <AttachmentPreviewCard
              attachment={pendingAttachment}
              onRemove={handleRemoveAttachment}
              onRetry={handleRetryUpload}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ── */}
      <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-3 py-2 border border-zinc-200 dark:border-zinc-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 transition">

          {/* Attach slide note */}
          <button
            onClick={() => setShowAttach(v => !v)}
            className={`shrink-0 mb-0.5 transition ${
              showAttach ? 'text-brand-500' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Paperclip size={18} />
          </button>

          {/* Upload image / PDF */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
            className="shrink-0 mb-0.5 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition"
            title="Attach image or PDF"
          >
            {isUploadingAttachment ? (
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImagePlus size={18} />
            )}
          </button>

          {/* Mic */}
          <button
            onClick={handleMicToggle}
            disabled={isUploadingAttachment}
            title={isRecording ? 'Stop recording' : 'Record voice note'}
            className={`shrink-0 mb-0.5 transition disabled:opacity-40 ${
              isRecording ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500'
            }`}
          >
            <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
          </button>

          {/* Text input / recording indicator */}
          {isRecording ? (
            <div className="flex-1 flex items-center gap-2 min-h-[24px]">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm font-mono text-red-500 tabular-nums">{recordingTime}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Tap mic to stop</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Buddi..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none leading-relaxed"
              style={{ minHeight: '24px', maxHeight: '120px', overflowY: 'auto' }}
            />
          )}

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 flex items-center justify-center shrink-0 mb-0.5 transition"
          >
            <Send size={14} className={canSend ? 'text-white' : 'text-zinc-400'} />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          Buddi is an AI companion. Not a substitute for professional advice.
        </p>
      </div>
    </div>
  );
}
