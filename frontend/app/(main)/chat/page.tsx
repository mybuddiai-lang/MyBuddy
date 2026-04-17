'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Mic, ImagePlus } from 'lucide-react';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useChatStore } from '@/lib/store/chat.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useSlides } from '@/lib/hooks/use-slides';
import { useVoiceRecorder } from '@/lib/hooks/use-voice-recorder';
import toast from 'react-hot-toast';
import type { Message } from '@/components/chat/message-bubble';

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with my studies 😓",
  "Help me review my pharmacology notes",
  "I haven't slept well before my exam",
  "Give me a quick quiz on my last upload",
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
    content: "Hey — first, I want you to take a breath. 3 weeks is actually meaningful time if you use it strategically.\n\nThe feeling of 'not having studied enough' is almost universal before finals — even among students who are very well prepared. That anxiety is your brain trying to help, not predict the future.\n\nLet's make a plan together. What subjects are you most worried about right now, and roughly how many hours a day can you realistically set aside?",
    createdAt: new Date(Date.now() - 90000),
  },
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  PDF:   <FileText size={14} className="text-red-500" />,
  IMAGE: <ImageIcon size={14} className="text-blue-500" />,
  VOICE: <Mic size={14} className="text-green-500" />,
  TEXT:  <FileText size={14} className="text-zinc-500" />,
};

type AttachmentType = 'IMAGE' | 'FILE' | 'VOICE';

interface PendingAttachment {
  url: string;
  type: AttachmentType;
  previewUrl?: string; // local blob URL for images
  name: string;
}

export default function ChatPage() {
  const { messages, isTyping, isLoadingHistory, currentPage, totalPages, sendMessage, loadHistory, loadOlderMessages } = useChatStore();
  const { user } = useAuthStore();
  const { notes } = useSlides();
  const [input, setInput] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory().then(() => {
      if (useChatStore.getState().messages.length === 0) setShowDemo(true);
    });
  }, []);

  // Scroll to bottom instantly (no smooth) to avoid glitch when new messages appear
  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isTyping]);

  // NOTE: blob previewUrls are only revoked when the user explicitly cancels the
  // attachment (via the X button). We intentionally do NOT revoke on send so the
  // MessageBubble can keep showing the local image while the remote URL loads.

  const displayMessages = messages.length > 0 ? messages : (showDemo ? DEMO_MESSAGES : []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !pendingAttachment) return;
    setShowDemo(false);
    setInput('');
    // Reset textarea height back to one line
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
    const attachment = pendingAttachment;
    setPendingAttachment(null);
    await sendMessage({
      content: text,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      previewUrl: attachment?.previewUrl, // keep blob URL in message so image renders instantly
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachNote = (noteTitle: string) => {
    const prefix = `Let's review my notes on "${noteTitle}". `;
    setInput(prev => prev.startsWith(prefix) ? prev : prefix + prev);
    setShowAttach(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) { toast.error('Not authenticated'); return; }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/backend/files/upload-attachment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const { url, type } = json.data ?? json;

      // Create a local preview URL for images so the user can see it before sending
      const previewUrl = type === 'IMAGE' ? URL.createObjectURL(file) : undefined;
      setPendingAttachment({ url, type, previewUrl, name: file.name });
    } catch {
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Transcribe recorded voice and populate the text input so Buddi can respond
  const handleVoiceFile = useCallback(async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) return;
    setIsUploading(true);
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
        // Resize textarea to fit the transcription
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
        textareaRef.current?.focus();
      } else {
        toast.error("Couldn't understand the audio. Please try again.");
      }
    } catch {
      toast.error('Voice transcription failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { isRecording, recordingTime, toggleRecording } = useVoiceRecorder(handleVoiceFile);

  const handleMicToggle = useCallback(async () => {
    try { await toggleRecording(); }
    catch { toast.error('Could not access microphone. Please check permissions.'); }
  }, [toggleRecording]);

  const canSend = (input.trim().length > 0 || !!pendingAttachment) && !isUploading && !isRecording;

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1">
        {isLoadingHistory && messages.length === 0 ? (
          <div className="flex flex-col gap-4 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 shrink-0 animate-pulse" />}
                <div className={`h-12 rounded-2xl animate-pulse bg-zinc-100 dark:bg-zinc-800 ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
              </div>
            ))}
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🤝</span>
            </div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 text-lg">Hey {user?.name?.split(' ')[0] || 'there'}!</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-xs">
              I'm Buddi, your academic resilience companion. I'm here to help you study smarter and stay well.
            </p>
            <div className="mt-6 w-full max-w-sm space-y-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200 hover:border-brand-200 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Load older messages — only show when there are more pages and we have real history */}
            {!showDemo && currentPage < totalPages && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={loadOlderMessages}
                  disabled={isLoadingHistory}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 transition disabled:opacity-40"
                >
                  {isLoadingHistory
                    ? <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    : <span className="text-[10px]">↑</span>
                  }
                  Load older messages
                </button>
              </div>
            )}

            {showDemo && (
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">Sample conversation</span>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              </div>
            )}
            <AnimatePresence initial={false}>
              {displayMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2 pl-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm shrink-0">B</div>
                <TypingIndicator />
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attach slide picker */}
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
              <button onClick={() => setShowAttach(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {notes.filter(n => n.processingStatus === 'DONE').length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-zinc-500">No processed notes yet.</p>
                  <p className="text-xs text-zinc-400 mt-1">Upload slides first, then attach them here.</p>
                </div>
              ) : (
                notes.filter(n => n.processingStatus === 'DONE').map(note => (
                  <button
                    key={note.id}
                    onClick={() => handleAttachNote(note.title)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition text-left border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
                      {FILE_ICONS[note.fileType] || <FileText size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{note.title}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending attachment preview — ChatGPT-style large image or file chip */}
      <AnimatePresence>
        {pendingAttachment && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="px-4 pb-2"
          >
            {pendingAttachment.type === 'IMAGE' && pendingAttachment.previewUrl ? (
              <div className="relative inline-block">
                <img
                  src={pendingAttachment.previewUrl}
                  alt={pendingAttachment.name}
                  className="h-16 w-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = pendingAttachment.url; }}
                />
                <button
                  onClick={() => {
                    if (pendingAttachment.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
                    setPendingAttachment(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-100 flex items-center justify-center shadow transition hover:bg-zinc-600 dark:hover:bg-zinc-300"
                >
                  <X size={10} className="text-white dark:text-zinc-900" />
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-200 dark:border-zinc-700">
                {pendingAttachment.type === 'VOICE' ? (
                  <Mic size={15} className="text-green-500 shrink-0" />
                ) : (
                  <FileText size={15} className="text-red-500 shrink-0" />
                )}
                <span className="text-xs text-zinc-700 dark:text-zinc-200 font-medium max-w-[160px] truncate">
                  {pendingAttachment.name}
                </span>
                <button
                  onClick={() => {
                    if (pendingAttachment.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
                    setPendingAttachment(null);
                  }}
                  className="ml-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar — grows with content like ChatGPT */}
      <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-3 py-2 border border-zinc-200 dark:border-zinc-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 transition">
          {/* Attach note from slides */}
          <button
            onClick={() => setShowAttach(v => !v)}
            className={`shrink-0 mb-0.5 transition ${showAttach ? 'text-brand-500' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Paperclip size={18} />
          </button>

          {/* Upload image/file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isRecording}
            className="shrink-0 mb-0.5 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition"
          >
            {isUploading
              ? <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              : <ImagePlus size={18} />
            }
          </button>

          {/* Mic — record voice note directly */}
          <button
            onClick={handleMicToggle}
            disabled={isUploading}
            title={isRecording ? 'Stop recording' : 'Record voice note'}
            className={`shrink-0 mb-0.5 transition disabled:opacity-40 ${
              isRecording ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500'
            }`}
          >
            <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
          </button>

          {/* Textarea or recording indicator */}
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

          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 flex items-center justify-center shrink-0 mb-0.5 transition"
          >
            <Send size={14} className={canSend ? 'text-white' : 'text-zinc-400'} />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">Buddi is an AI companion. Not a substitute for professional advice.</p>
      </div>
    </div>
  );
}
