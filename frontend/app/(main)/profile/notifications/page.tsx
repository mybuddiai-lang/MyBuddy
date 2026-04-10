'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Brain, MessageCircle, Calendar, Users, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

interface NotifSetting { id: string; label: string; desc: string; icon: React.ElementType; enabled: boolean; }

export default function NotificationsPage() {
  const router = useRouter();
  const { state: pushState, subscribe, unsubscribe, error: pushError } = usePushNotifications();

  const DEFAULT_SETTINGS: NotifSetting[] = [
    { id: 'recall', label: 'Recall Reminders', desc: 'Get reminded when cards are due for review', icon: Brain, enabled: true },
    { id: 'study', label: 'Study Reminders', desc: 'Daily study goal reminders', icon: Calendar, enabled: true },
    { id: 'chat', label: 'Buddi Messages', desc: 'Check-ins from Buddi when inactive', icon: MessageCircle, enabled: false },
    { id: 'community', label: 'Community Updates', desc: 'New posts in your study pods', icon: Users, enabled: true },
    { id: 'exam', label: 'Exam Countdown', desc: 'Show countdown banner on your home screen', icon: Bell, enabled: true },
  ];

  const [settings, setSettings] = useState<NotifSetting[]>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  // Restore saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('buddi_notif_prefs');
      if (saved) {
        const prefs: Record<string, boolean> = JSON.parse(saved);
        setSettings(prev => prev.map(s => ({ ...s, enabled: prefs[s.id] ?? s.enabled })));
      }
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefs = Object.fromEntries(settings.map(s => [s.id, s.enabled]));
      localStorage.setItem('buddi_notif_prefs', JSON.stringify(prefs));
      toast.success('Notification preferences saved');
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
      if (pushError) {
        toast.error(pushError);
      } else {
        toast.success('Push notifications enabled! 🔔');
      }
    }
  };

  const isPushActive = pushState === 'subscribed';
  const pushUnsupported = pushState === 'unsupported';
  const pushDenied = pushState === 'denied';
  const pushLoading = pushState === 'loading';

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
          <ArrowLeft size={18} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Notifications</h1>
          <p className="text-xs text-zinc-400">Manage your reminder preferences</p>
        </div>
      </div>

      {/* Push notification toggle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 border ${
          isPushActive ? 'bg-brand-50 border-brand-200' :
          pushDenied ? 'bg-red-50 border-red-200' :
          'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPushActive ? 'bg-brand-100' : 'bg-zinc-100'}`}>
            <Smartphone size={18} className={isPushActive ? 'text-brand-600' : 'text-zinc-500'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-800">Push Notifications</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {pushUnsupported ? 'Not supported in this browser' :
               pushDenied ? 'Blocked — enable in browser settings' :
               isPushActive ? 'Enabled — you\'ll get real-time reminders' :
               'Get notified even when Buddi is closed'}
            </p>
          </div>
          {pushUnsupported || pushDenied ? (
            <div className="shrink-0">
              {pushDenied
                ? <AlertCircle size={18} className="text-red-400" />
                : <AlertCircle size={18} className="text-zinc-300" />}
            </div>
          ) : (
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isPushActive ? 'bg-brand-500' : 'bg-zinc-200'} ${pushLoading ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPushActive ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          )}
        </div>
        {isPushActive && (
          <div className="flex items-center gap-1.5 mt-3">
            <CheckCircle size={13} className="text-brand-500" />
            <p className="text-xs text-brand-600 font-medium">Reminders will arrive even when you close the app</p>
          </div>
        )}
        {pushDenied && (
          <p className="text-xs text-red-600 mt-2">
            To enable: tap the lock icon in your browser address bar → Site settings → Notifications → Allow
          </p>
        )}
      </motion.div>

      {/* Notification types */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-card divide-y divide-zinc-50">
        {settings.map(({ id, label, desc, icon: Icon, enabled }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-4 p-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-brand-50' : 'bg-zinc-100'}`}>
              <Icon size={18} className={enabled ? 'text-brand-600' : 'text-zinc-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">{label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => toggle(id)}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-brand-500' : 'bg-zinc-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-soft text-sm"
      >
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Save Preferences'}
      </button>
    </div>
  );
}
