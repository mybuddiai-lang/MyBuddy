'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Bell, Users, CheckCircle, MessageCircle, X, Hash } from 'lucide-react';
import { useGlobalSocket } from '@/lib/hooks/use-global-socket';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

// ─── Soft chime via Web Audio API ────────────────────────────────────────────
// No audio file required — plays a 2-tone notification sound.

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = [880, 1100]; // A5 → C#6 (ascending interval)
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch { /* ignore — audio not available */ }
}

// ─── Toast component ──────────────────────────────────────────────────────────

function NotificationToast({ icon, title, body, onClick }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-lg rounded-2xl px-4 py-3 max-w-xs text-left w-full"
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{body}</p>
      </div>
    </button>
  );
}

const TOAST_STYLE: React.CSSProperties = {
  background: 'transparent',
  boxShadow: 'none',
  padding: 0,
  maxWidth: '360px',
};

// ─── Notification permission banner ──────────────────────────────────────────
// Shown once per session when permission hasn't been asked yet.
// On iOS, web push only works when the app is installed as a PWA (Add to Home Screen).
// We detect this and show the appropriate message.

const DISMISSED_KEY = 'buddi_notif_prompt_dismissed';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isIosPwa() {
  // navigator.standalone is true when running as a home screen PWA on iOS
  return isIos() && (navigator as any).standalone === true;
}

function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const { state, subscribe } = usePushNotifications();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const ios = isIos();
    const iosPwa = isIosPwa();

    // On iOS browser (not installed): show "Add to Home Screen" hint
    // On iOS PWA or non-iOS: show only when Notification API permission is 'default'
    if (ios && !iosPwa) {
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Hide once subscribed
  useEffect(() => {
    if (state === 'subscribed') setShow(false);
  }, [state]);

  if (!show) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  const handleEnable = async () => {
    await subscribe();
    dismiss();
  };

  const ios = isIos();
  const iosPwa = isIosPwa();
  // iOS in browser — show install instructions instead
  const showInstallHint = ios && !iosPwa;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 px-4 pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0 mt-0.5">
          <Bell size={16} className="text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Stay in the loop</p>
          {showInstallHint ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              To get notifications on iOS, install Buddi: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then re-open.
            </p>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Get alerts for replies, new posts, polls, and reminders.
            </p>
          )}
          {!showInstallHint && (
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleEnable}
                disabled={state === 'loading'}
                className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-60 transition hover:bg-brand-600"
              >
                {state === 'loading' ? 'Enabling…' : 'Enable notifications'}
              </button>
              <button onClick={dismiss} className="text-xs text-zinc-400 hover:text-zinc-600 transition px-1">
                Not now
              </button>
            </div>
          )}
          {showInstallHint && (
            <button onClick={dismiss} className="text-xs text-zinc-400 hover:text-zinc-600 transition mt-2 block">
              Got it
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-zinc-400 hover:text-zinc-600 transition shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main listener ────────────────────────────────────────────────────────────

export function NotificationListener() {
  const router = useRouter();

  const navigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  useGlobalSocket({
    onReminderDue: (data) => {
      playChime();
      const title = data.noteTitle ?? data.title ?? 'Study Reminder';
      const body = data.description ?? 'Time to review your notes!';
      toast.custom(
        (t) => (
          <NotificationToast
            icon={<Bell size={16} className="text-brand-500" />}
            title={title}
            body={body}
            onClick={() => { toast.dismiss(t.id); navigate('/recall'); }}
          />
        ),
        { duration: 6000, position: 'top-center', style: TOAST_STYLE },
      );
    },

    onMemberJoined: (data) => {
      toast.custom(
        (t) => (
          <NotificationToast
            icon={<Users size={16} className="text-green-500" />}
            title={data.communityName}
            body={`${data.userName} just joined`}
            onClick={() => { toast.dismiss(t.id); navigate(`/community/${data.communityId}`); }}
          />
        ),
        { duration: 4000, position: 'top-center', style: TOAST_STYLE },
      );
    },

    onJoinApproved: (data) => {
      playChime();
      toast.custom(
        (t) => (
          <NotificationToast
            icon={<CheckCircle size={16} className="text-brand-500" />}
            title="Join Request Approved!"
            body={`You can now post in ${data.communityName}`}
            onClick={() => { toast.dismiss(t.id); navigate(`/community/${data.communityId}`); }}
          />
        ),
        { duration: 5000, position: 'top-center', style: TOAST_STYLE },
      );
    },

    onReplyOnPost: (data) => {
      playChime();
      toast.custom(
        (t) => (
          <NotificationToast
            icon={<MessageCircle size={16} className="text-blue-500" />}
            title={`${data.replyerName} replied to your post`}
            body={data.content}
            onClick={() => { toast.dismiss(t.id); navigate(`/community/${data.communityId}?post=${data.postId}`); }}
          />
        ),
        { duration: 6000, position: 'top-center', style: TOAST_STYLE },
      );
    },

    onNewCommunity: (data) => {
      toast.custom(
        (t) => (
          <NotificationToast
            icon={<Hash size={16} className="text-violet-500" />}
            title="New community"
            body={`${data.name} — ${data.field}`}
            onClick={() => { toast.dismiss(t.id); navigate(`/community/${data.id}`); }}
          />
        ),
        { duration: 5000, position: 'top-center', style: TOAST_STYLE },
      );
    },
  });

  return <NotificationPermissionBanner />;
}
