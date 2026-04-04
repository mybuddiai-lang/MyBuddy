import { create } from 'zustand';
import { chatApi } from '../api/chat';
import type { Message } from '../../components/chat/message-bubble';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isLoadingHistory: boolean;
  historyLoaded: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  isLoadingHistory: false,
  historyLoaded: false,

  sendMessage: async (content: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    set((state) => ({ messages: [...state.messages, userMsg], isTyping: true }));

    try {
      const response = await chatApi.sendMessage(content);
      // Guard against unexpected null/undefined response
      if (!response || !response.id) throw new Error('Invalid response from server');
      const assistantMsg: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        sentimentScore: response.sentimentScore,
        createdAt: new Date(response.createdAt),
      };
      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isTyping: false,
      }));
    } catch {
      set((state) => ({
        messages: [...state.messages, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please check your connection and try again.",
          createdAt: new Date(),
        }],
        isTyping: false,
      }));
    }
  },

  loadHistory: async () => {
    // Skip refetch if already loaded this session (unless messages were cleared)
    const { historyLoaded, messages } = get();
    if (historyLoaded && messages.length > 0) return;
    set({ isLoadingHistory: true });
    try {
      const { messages: fetched } = await chatApi.getHistory();
      const parsed: Message[] = fetched.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sentimentScore: m.sentimentScore,
        createdAt: new Date(m.createdAt),
      }));
      set({ messages: parsed, historyLoaded: true });
    } catch {
      // silent fail — keep any existing messages
      set({ historyLoaded: true });
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  clearMessages: () => set({ messages: [], historyLoaded: false }),
}));
