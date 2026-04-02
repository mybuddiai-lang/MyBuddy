'use client';

import { useEffect } from 'react';
import { useChatStore } from '../store/chat.store';

export function useChat() {
  const { messages, isTyping, isLoadingHistory, sendMessage, loadHistory, clearMessages } = useChatStore();

  useEffect(() => {
    if (messages.length === 0) {
      loadHistory();
    }
  }, []);

  return { messages, isTyping, isLoadingHistory, sendMessage, clearMessages };
}
