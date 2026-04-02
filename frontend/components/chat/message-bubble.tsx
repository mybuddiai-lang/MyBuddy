import { motion } from 'framer-motion';
import { format } from 'date-fns';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sentimentScore?: number;
  createdAt: Date;
}

function getSentimentEmoji(score?: number): string {
  if (score === undefined) return '';
  if (score >= 0.7) return '😊';
  if (score >= 0.4) return '😐';
  return '😔';
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
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 shrink-0 mb-1">
          B
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-500 text-white rounded-br-sm'
              : 'bg-white border border-zinc-100 text-zinc-800 rounded-bl-sm shadow-card'
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-zinc-400">
            {format(message.createdAt, 'HH:mm')}
          </span>
          {!isUser && message.sentimentScore !== undefined && (
            <span className="text-xs">{getSentimentEmoji(message.sentimentScore)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
