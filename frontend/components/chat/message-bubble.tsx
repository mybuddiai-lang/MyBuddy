'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { FileText, Mic, Download, X } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sentimentScore?: number;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'FILE' | 'VOICE';
  previewUrl?: string; // local blob URL — valid only for current session
  createdAt: Date | string;
}

function getSentimentEmoji(score?: number): string {
  if (score === undefined) return '';
  if (score >= 0.7) return '😊';
  if (score >= 0.4) return '😐';
  return '😔';
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
      >
        <X size={20} className="text-white" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-full object-contain rounded-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

function AttachmentPreview({ url, previewUrl, type, isUser }: { url: string; previewUrl?: string; type?: string; isUser: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  // When the blob previewUrl fails, flip this to true to switch src to the remote URL.
  // Without this, the error handler would call setImgLoaded(false) without changing src,
  // causing the browser to retry the same failing URL indefinitely.
  const [useFallback, setUseFallback] = useState(false);

  const imgSrc = (!useFallback && previewUrl) ? previewUrl : url;

  if (type === 'IMAGE' && !imgError) {
    return (
      <>
        <button
          onClick={() => setLightbox(true)}
          className="block text-left focus:outline-none"
        >
          <div className={`relative rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-700 ${imgLoaded ? '' : 'min-h-[120px]'}`}>
            <img
              src={imgSrc}
              alt="attachment"
              className={`max-w-[200px] w-full object-cover rounded-2xl transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                if (!useFallback && previewUrl) {
                  // Blob/preview URL failed — switch to the remote URL
                  setUseFallback(true);
                  setImgLoaded(false);
                } else {
                  // Remote URL also failed (or no preview existed)
                  setImgError(true);
                }
              }}
            />
            {!imgLoaded && !imgError && (
              <div className="w-[200px] h-[130px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {imgLoaded && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition rounded-2xl flex items-center justify-center">
                <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg transition">
                  View full
                </span>
              </div>
            )}
          </div>
        </button>
        {lightbox && <ImageLightbox src={previewUrl || url} onClose={() => setLightbox(false)} />}
      </>
    );
  }

  if (type === 'IMAGE' && imgError) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isUser ? 'bg-brand-600/40' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
        <span className="text-xs text-zinc-400">🖼️ Image unavailable</span>
      </div>
    );
  }

  if (type === 'VOICE') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isUser ? 'bg-brand-600/40' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
        <Mic size={14} className={isUser ? 'text-white/80' : 'text-green-500'} />
        <audio controls src={url} className="h-7 max-w-[180px]" />
      </div>
    );
  }

  // FILE or fallback
  const filename = url.split('/').pop()?.split('?')[0] ?? 'attachment';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${
        isUser ? 'bg-brand-600/40 hover:bg-brand-600/60' : 'bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600'
      }`}
    >
      <FileText size={14} className={isUser ? 'text-white/80' : 'text-red-400'} />
      <span className={`text-xs font-medium truncate max-w-[160px] ${isUser ? 'text-white/90' : 'text-zinc-700 dark:text-zinc-200'}`}>
        {filename}
      </span>
      <Download size={12} className={isUser ? 'text-white/60 shrink-0' : 'text-zinc-400 shrink-0'} />
    </a>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isUser ? 'justify-end msg-user' : 'justify-start msg-assistant'} mb-1`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 shrink-0 mb-1">
          B
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        {/* Attachment preview sits above the text bubble */}
        {message.attachmentUrl && (
          <AttachmentPreview
            url={message.attachmentUrl}
            previewUrl={message.previewUrl}
            type={message.attachmentType}
            isUser={isUser}
          />
        )}

        {/* Only render the text bubble if there's actual content */}
        {message.content && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isUser
                ? 'bg-brand-500 text-white rounded-br-sm'
                : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-bl-sm shadow-card'
            }`}
          >
            {message.content}
          </div>
        )}

        <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {isValid(new Date(message.createdAt)) ? format(new Date(message.createdAt), 'HH:mm') : ''}
          </span>
          {!isUser && message.sentimentScore !== undefined && (
            <span className="text-xs">{getSentimentEmoji(message.sentimentScore)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
