'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile } from 'lucide-react';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useChatStore } from '@/lib/store/chat.store';
import { useAuthStore } from '@/lib/store/auth.store';

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with my studies 😓",
  "Help me review my pharmacology notes",
  "I haven't slept well before my exam",
  "Give me a quick quiz on my last upload",
];

export default function ChatPage() {
  const { messages, isTyping, sendMessage } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🤝</span>
            </div>
            <h3 className="font-semibold text-zinc-800 text-lg">Hey {user?.name?.split(' ')[0] || 'there'}!</h3>
            <p className="text-zinc-500 text-sm mt-2 max-w-xs">
              I'm Buddi, your academic resilience companion. I'm here to help you study smarter and stay well.
            </p>
            <div className="mt-6 w-full max-w-sm space-y-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white border border-zinc-100 text-sm text-zinc-700 hover:border-brand-200 hover:bg-brand-50 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
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

      {/* Input bar */}
      <div className="px-4 py-3 bg-white border-t border-zinc-100">
        <div className="flex items-end gap-2 bg-zinc-50 rounded-2xl px-4 py-2 border border-zinc-200 focus-within:border-brand-300 transition">
          <button className="text-zinc-400 hover:text-zinc-600 mb-1.5 transition shrink-0">
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Buddi..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed"
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
        <p className="text-center text-xs text-zinc-400 mt-2">Buddi is an AI companion. Not a substitute for medical advice.</p>
      </div>
    </div>
  );
}
