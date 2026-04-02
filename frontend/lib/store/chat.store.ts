import { create } from 'zustand';
import { chatApi } from '../api/chat';
import type { Message } from '../../components/chat/message-bubble';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isLoadingHistory: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  isLoadingHistory: false,

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
    } catch (err) {
      set((state) => ({
        messages: [...state.messages, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment. 💙",
          createdAt: new Date(),
        }],
        isTyping: false,
      }));
    }
  },

  loadHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const { messages } = await chatApi.getHistory();
      const parsed: Message[] = messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sentimentScore: m.sentimentScore,
        createdAt: new Date(m.createdAt),
      }));
      set({ messages: parsed });
    } catch {
      // silent fail
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
