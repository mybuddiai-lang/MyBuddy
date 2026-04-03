'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

const DUMMY_ACTIVITY: ActivityItem[] = [
  { id: '1', icon: '🧠', text: 'Completed 3 recall cards', time: '1h ago' },
  { id: '2', icon: '📄', text: 'Uploaded Cardiology notes', time: '3h ago' },
  { id: '3', icon: '💬', text: 'Chatted with Buddi', time: 'Yesterday' },
];

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const EVENT_ICONS: Record<string, string> = {
  message_sent: '💬',
  note_uploaded: '📄',
  recall_session_complete: '🧠',
  user_login: '✅',
  reminder_due: '⏰',
};

const EVENT_LABELS: Record<string, string> = {
  message_sent: 'Chatted with Buddi',
  note_uploaded: 'Uploaded notes',
  recall_session_complete: 'Completed recall session',
  user_login: 'Signed in',
  reminder_due: 'Review reminder triggered',
};

export function useActivity() {
  const { data } = useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/activity?limit=5');
      return data.data as Array<{ id: string; eventType: string; createdAt: string; eventData?: any }>;
    },
    retry: 0,
    staleTime: 2 * 60 * 1000,
  });

  if (!data || data.length === 0) {
    return { activity: DUMMY_ACTIVITY };
  }

  const activity: ActivityItem[] = data.map(event => {
    let text = EVENT_LABELS[event.eventType] || event.eventType;

    // Enrich label from eventData
    if (event.eventType === 'note_uploaded' && event.eventData?.filename) {
      const name = event.eventData.filename.replace(/\.[^/.]+$/, '');
      text = `Uploaded "${name.slice(0, 30)}"`;
    } else if (event.eventType === 'recall_session_complete' && event.eventData?.cardsReviewed) {
      text = `Completed ${event.eventData.cardsReviewed} recall card${event.eventData.cardsReviewed !== 1 ? 's' : ''}`;
    } else if (event.eventType === 'message_sent') {
      text = 'Chatted with Buddi';
    }

    return {
      id: event.id,
      icon: EVENT_ICONS[event.eventType] || '📌',
      text,
      time: formatTimeAgo(new Date(event.createdAt)),
    };
  });

  return { activity };
}
