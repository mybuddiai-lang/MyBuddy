import { create } from 'zustand';
import { chatApi } from '../api/chat';
import type { Message } from '../../components/chat/message-bubble';
import toast from 'react-hot-toast';

interface SendPayload {
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'FILE' | 'VOICE';
  previewUrl?: string; // local blob URL — shown immediately in optimistic message
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isLoadingHistory: boolean;
  historyLoaded: boolean;
  currentPage: number;
  totalPages: number;
  sendMessage: (payload: SendPayload) => Promise<void>;
  loadHistory: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  isLoadingHistory: false,
  historyLoaded: false,
  currentPage: 1,
  totalPages: 1,

  sendMessage: async ({ content, attachmentUrl, attachmentType, previewUrl }) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      attachmentUrl,
      attachmentType,
      previewUrl, // blob URL — lets the image render instantly from local cache
      createdAt: new Date(),
    };
    set((state) => ({ messages: [...state.messages, userMsg], isTyping: true }));

    try {
      const response = await chatApi.sendMessage({ content, attachmentUrl, attachmentType });
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

      // If the AI detected an explicit reminder request, notify the user
      if (response.reminderSet) {
        const time = new Date(response.reminderSet.scheduledFor).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const date = new Date(response.reminderSet.scheduledFor).toLocaleDateString([], {
          weekday: 'short', month: 'short', day: 'numeric',
        });
        toast.success(`⏰ Reminder set — ${response.reminderSet.title} · ${date} at ${time}`, {
          duration: 5000,
          style: { fontSize: '13px' },
        });
      }
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
    const { historyLoaded, messages } = get();
    if (historyLoaded && messages.length > 0) return;
    set({ isLoadingHistory: true });
    try {
      const result = await chatApi.getHistory(1, 30);
      const parsed: Message[] = result.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sentimentScore: m.sentimentScore,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: new Date(m.createdAt),
      }));
      set({
        messages: parsed,
        historyLoaded: true,
        currentPage: 1,
        totalPages: result.pages ?? 1,
      });
    } catch {
      set({ historyLoaded: true });
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  loadOlderMessages: async () => {
    const { currentPage, totalPages, isLoadingHistory } = get();
    if (isLoadingHistory || currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    set({ isLoadingHistory: true });
    try {
      const result = await chatApi.getHistory(nextPage, 30);
      const older: Message[] = result.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sentimentScore: m.sentimentScore,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: new Date(m.createdAt),
      }));
      // Prepend older messages, dedup by id
      set((state) => {
        const existingIds = new Set(state.messages.map(m => m.id));
        const unique = older.filter(m => !existingIds.has(m.id));
        return {
          messages: [...unique, ...state.messages],
          currentPage: nextPage,
        };
      });
    } catch { /* silent */ } finally {
      set({ isLoadingHistory: false });
    }
  },

  clearMessages: () => set({ messages: [], historyLoaded: false, currentPage: 1, totalPages: 1 }),
}));
