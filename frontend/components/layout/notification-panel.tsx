'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCheck, Clock, Zap, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi, type UserNotification } from '@/lib/api/notifications';
import { remindersApi, type Reminder } from '@/lib/api/reminders';

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
  defaultTab?: 'notifications' | 'due-today';
}

export function NotificationPanel({ open, onClose, defaultTab = 'notifications' }: NotificationPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'notifications' | 'due-today'>(defaultTab);

  // Notifications tab state
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Due Today tab state
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [loadingDue, setLoadingDue] = useState(false);

  // Sync defaultTab whenever the panel opens
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const result = await notificationsApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch { /* silent */ } finally {
      setLoadingNotifs(false);
    }
  }, []);

  const fetchDueReminders = useCallback(async () => {
    setLoadingDue(true);
    try {
      const all = await remindersApi.getAll();
      setDueReminders(
        all.filter(r => {
          if (r.status === 'SENT') return true;
          if (r.status === 'PENDING' && new Date(r.scheduledAt) <= new Date()) return true;
          return false;
        }),
      );
    } catch { /* silent */ } finally {
      setLoadingDue(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
    fetchDueReminders();
  }, [open, fetchNotifications, fetchDueReminders]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  async function handleNotifClick(n: UserNotification) {
    if (!n.read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.url) router.push(n.url);
    onClose();
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleDeleteNotif(id: string) {
    await notificationsApi.delete(id).catch(() => {});
    setNotifications(prev => {
      const removed = prev.find(n => n.id === id);
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== id);
    });
  }

  async function handleClearAllNotifs() {
    await notificationsApi.deleteAll().catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  }

  async function handleDeleteReminder(id: string) {
    await remindersApi.delete(id).catch(() => {});
    setDueReminders(prev => prev.filter(r => r.id !== id));
  }

  async function handleCompleteReminder(id: string) {
    await remindersApi.complete(id).catch(() => {});
    setDueReminders(prev => prev.filter(r => r.id !== id));
  }

  async function handleClearAllDue() {
    await Promise.allSettled(dueReminders.map(r => remindersApi.delete(r.id)));
    setDueReminders([]);
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-zinc-100 dark:border-zinc-800">
        {/* Tabs */}
        <div className="flex gap-1">
          {(['notifications', 'due-today'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                tab === t
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              {t === 'notifications' ? (
                <span className="flex items-center gap-1.5">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                      {unreadCount}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Due Today
                  {dueReminders.length > 0 && (
                    <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full leading-none">
                      {dueReminders.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pb-2">
          {tab === 'notifications' && notifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-zinc-500 hover:text-brand-500 flex items-center gap-1 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              <button
                onClick={handleClearAllNotifs}
                className="text-xs text-zinc-500 hover:text-red-500 flex items-center gap-1 transition"
                title="Clear all notifications"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {tab === 'due-today' && dueReminders.length > 0 && (
            <button
              onClick={handleClearAllDue}
              className="text-xs text-zinc-500 hover:text-red-500 flex items-center gap-1 transition"
              title="Clear all due"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">

        {/* ── Notifications tab ── */}
        {tab === 'notifications' && (
          <>
            {loadingNotifs && (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loadingNotifs && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={28} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-400 dark:text-zinc-600">No notifications yet</p>
              </div>
            )}
            {!loadingNotifs && notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 flex gap-3 ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
              >
                {/* Clickable area */}
                <button
                  onClick={() => handleNotifClick(n)}
                  className="flex gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base ${TYPE_COLORS[n.type] ?? TYPE_COLORS.general}`}>
                    {TYPE_ICONS[n.type] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs font-semibold leading-snug line-clamp-1 ${!n.read ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-0.5" />}
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
                {/* Delete button */}
                <button
                  onClick={() => handleDeleteNotif(n.id)}
                  title="Remove notification"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition shrink-0 self-start mt-0.5"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* ── Due Today tab ── */}
        {tab === 'due-today' && (
          <>
            {loadingDue && (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loadingDue && dueReminders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Zap size={28} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-400 dark:text-zinc-600">Nothing due right now</p>
              </div>
            )}
            {!loadingDue && dueReminders.map(r => {
              const due = new Date(r.scheduledAt);
              const isToday = due.toDateString() === new Date().toDateString();
              const timeLabel = isToday
                ? due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : due.toLocaleDateString([], { weekday: 'short' }) + ' ' + due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{timeLabel}</p>
                  </div>
                  {/* Complete */}
                  <button
                    onClick={() => handleCompleteReminder(r.id)}
                    title="Mark done"
                    className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-600 dark:hover:text-emerald-400 text-zinc-400 transition shrink-0"
                  >
                    <Check size={11} />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    title="Delete reminder"
                    className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 text-zinc-400 transition shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
          {tab === 'notifications' ? 'Read notifications disappear after 7 days' : 'Complete or delete reminders to clear them'}
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
