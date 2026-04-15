'use client';

import type React from 'react';
import toast from 'react-hot-toast';
import { Bell, Users, CheckCircle } from 'lucide-react';
import { useGlobalSocket } from '@/lib/hooks/use-global-socket';

function NotificationToast({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-lg rounded-2xl px-4 py-3 max-w-xs">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{body}</p>
      </div>
    </div>
  );
}

// Per-toast style that resets the global dark background applied by Providers' Toaster
const CUSTOM_TOAST_STYLE: React.CSSProperties = {
  background: 'transparent',
  boxShadow: 'none',
  padding: 0,
  maxWidth: '360px',
};

export function NotificationListener() {
  useGlobalSocket({
    onReminderDue: (data) => {
      const title = data.noteTitle ?? data.title ?? 'Study Reminder';
      const body = data.body ?? 'Time to review your notes!';
      toast.custom(
        () => (
          <NotificationToast
            icon={<Bell size={16} className="text-brand-500" />}
            title={title}
            body={body}
          />
        ),
        { duration: 6000, position: 'top-center', style: CUSTOM_TOAST_STYLE },
      );
    },

    onMemberJoined: (data) => {
      toast.custom(
        () => (
          <NotificationToast
            icon={<Users size={16} className="text-green-500" />}
            title={data.communityName}
            body={`${data.userName} just joined`}
          />
        ),
        { duration: 4000, position: 'top-center', style: CUSTOM_TOAST_STYLE },
      );
    },

    onJoinApproved: (data) => {
      toast.custom(
        () => (
          <NotificationToast
            icon={<CheckCircle size={16} className="text-brand-500" />}
            title="Join Request Approved!"
            body={`You can now post in ${data.communityName}`}
          />
        ),
        { duration: 5000, position: 'top-center', style: CUSTOM_TOAST_STYLE },
      );
    },
  });

  return null;
}
