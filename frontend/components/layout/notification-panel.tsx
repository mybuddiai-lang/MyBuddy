'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCheck, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi, type UserNotification } from '@/lib/api/notifications';

const TYPE_COLORS: Record<string, string> = {
  reminder: 'bg-brand-500/15 text-brand-500',
  note: 'bg-emerald-500/15 text-emerald-500',
  community: 'bg-violet-500/15 text-violet-500',
  general: 'bg-zinc-500/15 text-zinc-500',
};

const TYPE_ICONS: Record<string, string> = {
  reminder: '⏰',
  note: '✅',
  community: '👥',
  general: '🔔',
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetch();
  }, [open, fetch]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  async function handleClick(n: UserNotification) {
    if (!n.read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.url) {
      router.push(n.url);
    }
    onClose();
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-zinc-500 hover:text-brand-500 flex items-center gap-1 transition"
              title="Mark all as read"
            >
              <CheckCheck size={13} />
              All read
            </button>
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={28} className="text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-400 dark:text-zinc-600">No notifications yet</p>
          </div>
        )}

        {!loading && notifications.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base ${TYPE_COLORS[n.type] ?? TYPE_COLORS.general}`}>
              {TYPE_ICONS[n.type] ?? '🔔'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className={`text-xs font-semibold leading-snug line-clamp-1 ${!n.read ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {n.title}
                </p>
                {!n.read && (
                  <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-0.5" />
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-2 mt-0.5">{n.body}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
          Read notifications disappear after 7 days
        </p>
      </div>
    </div>
  );
}

// Standalone unread count fetcher for the bell badge
export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    notificationsApi.list().then(r => setCount(r.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.list().then(r => setCount(r.unreadCount)).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
