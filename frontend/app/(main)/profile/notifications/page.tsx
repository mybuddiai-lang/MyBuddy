'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Brain, MessageCircle, Calendar, Users, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';
import { useUIStore } from '@/lib/store/ui.store';

interface NotifSetting {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  enabled: boolean;
}

const BASE_SETTINGS: Omit<NotifSetting, 'enabled'>[] = [
  { id: 'recall',    label: 'Recall Reminders',  desc: 'Get reminded when cards are due for review',    icon: Brain },
  { id: 'study',     label: 'Study Reminders',    desc: 'Daily study goal reminders',                    icon: Calendar },
  { id: 'chat',      label: 'Buddi Messages',     desc: 'Check-ins from Buddi when inactive',            icon: MessageCircle },
  { id: 'community', label: 'Community Updates',  desc: 'New posts in your study pods',                  icon: Users },
  { id: 'exam',      label: 'Exam Countdown',     desc: 'Show countdown banner on your home screen',     icon: Bell },
];

const DEFAULT_ENABLED: Record<string, boolean> = {
  recall: true,
  study: true,
  chat: false,
  community: true,
  exam: true,
};

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { state: pushState, subscribe, unsubscribe, error: pushError } = usePushNotifications();
  const { examBannerHidden, setExamBannerHidden } = useUIStore();

  const [settings, setSettings] = useState<NotifSetting[]>(() =>
    BASE_SETTINGS.map(s => ({ ...s, enabled: DEFAULT_ENABLED[s.id] ?? true }))
  );
  const [saving, setSaving] = useState(false);

  // Load saved preferences; exam state comes from UIStore
  useEffect(() => {
    try {
      const saved = localStorage.getItem('buddi_notif_prefs');
      const prefs: Record<string, boolean> = saved ? JSON.parse(saved) : {};
      setSettings(prev =>
        prev.map(s => {
          if (s.id === 'exam') return { ...s, enabled: !examBannerHidden };
          return { ...s, enabled: prefs[s.id] ?? s.enabled };
        })
      );
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep exam toggle in sync with UIStore (reacts immediately when store changes)
  useEffect(() => {
    setSettings(prev =>
      prev.map(s => (s.id === 'exam' ? { ...s, enabled: !examBannerHidden } : s))
    );
  }, [examBannerHidden]);

  const toggle = (id: string) => {
    setSettings(prev => {
      const next = prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      if (id === 'exam') {
        const nowEnabled = next.find(s => s.id === 'exam')?.enabled ?? true;
        setExamBannerHidden(!nowEnabled);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefs = Object.fromEntries(settings.map(s => [s.id, s.enabled]));
      localStorage.setItem('buddi_notif_prefs', JSON.stringify(prefs));
      toast.success('Preferences saved');
    } catch {
      toast.error('Could not save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (pushState === 'subscribed') {
      await unsubscribe();
      toast.success('Push notifications disabled');
    } else if (pushState === 'unsubscribed') {
      await subscribe();
      if (pushError) toast.error(pushError);
      else toast.success('Push notifications enabled! 🔔');
    }
  };

  const isPushActive = pushState === 'subscribed';
  const pushUnsupported = pushState === 'unsupported';
  const pushDenied = pushState === 'denied';
  const pushLoading = pushState === 'loading';

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-600 dark:text-zinc-300">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Notifications</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Manage your reminder preferences</p>
        </div>
      </div>

      {/* Push notification card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 border ${
          isPushActive
            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
            : pushDenied
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPushActive ? 'bg-brand-100 dark:bg-brand-800/50' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <Smartphone size={18} className={isPushActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Push Notifications</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {pushUnsupported
                ? 'Not supported in this browser'
                : pushDenied
                ? 'Blocked — enable in browser settings'
                : isPushActive
                ? "Enabled — you'll get real-time reminders"
                : 'Get notified even when Buddi is closed'}
            </p>
          </div>
          {pushUnsupported || pushDenied ? (
            <AlertCircle size={18} className={pushDenied ? 'text-red-400 shrink-0' : 'text-zinc-300 dark:text-zinc-600 shrink-0'} />
          ) : (
            <Toggle enabled={isPushActive} onToggle={pushLoading ? () => {} : handlePushToggle} />
          )}
        </div>
        {isPushActive && (
          <div className="flex items-center gap-1.5 mt-3">
            <CheckCircle size={13} className="text-brand-500" />
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Reminders will arrive even when you close the app</p>
          </div>
        )}
        {pushDenied && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            To enable: tap the lock icon in your browser address bar → Site settings → Notifications → Allow
          </p>
        )}
      </motion.div>

      {/* Notification type toggles */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card overflow-hidden">
        {settings.map(({ id, label, desc, icon: Icon, enabled }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 px-4 py-3.5 ${i < settings.length - 1 ? 'border-b border-zinc-50 dark:border-zinc-800' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-brand-50 dark:bg-brand-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
              <Icon size={16} className={enabled ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-snug">{label}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 leading-snug">{desc}</p>
            </div>
            <Toggle enabled={enabled} onToggle={() => toggle(id)} />
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-soft text-sm"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </span>
        ) : 'Save Preferences'}
      </button>
    </div>
  );
}
