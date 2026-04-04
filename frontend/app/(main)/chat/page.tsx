'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, FileText, Image, Mic } from 'lucide-react';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useChatStore } from '@/lib/store/chat.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useSlides } from '@/lib/hooks/use-slides';
import type { Message } from '@/components/chat/message-bubble';

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with my studies 😓",
  "Help me review my pharmacology notes",
  "I haven't slept well before my exam",
  "Give me a quick quiz on my last upload",
];

// Demo messages shown when there's no chat history
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
  PDF: <FileText size={14} className="text-red-500" />,
  IMAGE: <Image size={14} className="text-blue-500" />,
  VOICE: <Mic size={14} className="text-green-500" />,
  TEXT: <FileText size={14} className="text-zinc-500" />,
};

export default function ChatPage() {
  const { messages, isTyping, isLoadingHistory, sendMessage, loadHistory } = useChatStore();
  const { user } = useAuthStore();
  const { notes } = useSlides();
  const [input, setInput] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadHistory().then(() => {
      // Check store directly after load resolves to avoid stale closure
      if (useChatStore.getState().messages.length === 0) {
        setShowDemo(true);
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showDemo]);

  const displayMessages = messages.length > 0 ? messages : (showDemo ? DEMO_MESSAGES : []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setShowDemo(false);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(text);
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1">
        {isLoadingHistory ? (
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
                      <p className="text-sm font-medium text-zinc-800 truncate">{note.title}</p>
                      {note.summary && <p className="text-xs text-zinc-400 truncate">{note.summary}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-4 py-2 border border-zinc-200 dark:border-zinc-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 transition">
          <button
            onClick={() => setShowAttach(v => !v)}
            className={`mb-1.5 transition shrink-0 ${showAttach ? 'text-brand-500' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Buddi..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 flex items-center justify-center shrink-0 mb-0.5 transition"
          >
            <Send size={14} className={input.trim() ? 'text-white' : 'text-zinc-400'} />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">Buddi is an AI companion. Not a substitute for professional advice.</p>
      </div>
    </div>
  );
}
