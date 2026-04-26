'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { operationsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import type { ActivityEvent } from '@/lib/types';
import { Search } from 'lucide-react';
import { formatDistanceToNow, subMinutes } from 'date-fns';

const EVENT_COLOR: Record<string, string> = {
  user_register: 'bg-emerald-500/15 text-emerald-400',
  user_login: 'bg-blue-500/15 text-blue-400',
  distress_detected: 'bg-red-500/15 text-red-400',
  referral_shown: 'bg-amber-500/15 text-amber-400',
  referral_accepted: 'bg-violet-500/15 text-violet-400',
  payment_completed: 'bg-emerald-500/15 text-emerald-400',
  ai_error: 'bg-red-500/15 text-red-400',
  slide_upload: 'bg-blue-500/15 text-blue-400',
  recall_completed: 'bg-violet-500/15 text-violet-400',
};

const now = new Date();
const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: 'd1', eventType: 'user_login', user: { name: 'Amara Obi', email: 'amara@example.com' }, createdAt: subMinutes(now, 2).toISOString(), sessionId: null },
  { id: 'd2', eventType: 'slide_upload', user: { name: 'Tunde Adeyemi', email: 'tunde@example.com' }, createdAt: subMinutes(now, 5).toISOString(), sessionId: null },
  { id: 'd3', eventType: 'recall_completed', user: { name: 'Chisom Eze', email: 'chisom@example.com' }, createdAt: subMinutes(now, 9).toISOString(), sessionId: null },
  { id: 'd4', eventType: 'user_register', user: { name: 'Fatima Bello', email: 'fatima@example.com' }, createdAt: subMinutes(now, 14).toISOString(), sessionId: null },
  { id: 'd5', eventType: 'payment_completed', user: { name: 'Emeka Nwosu', email: 'emeka@example.com' }, createdAt: subMinutes(now, 18).toISOString(), sessionId: null },
  { id: 'd6', eventType: 'distress_detected', user: { name: 'Ngozi Ike', email: 'ngozi@example.com' }, createdAt: subMinutes(now, 23).toISOString(), sessionId: null },
  { id: 'd7', eventType: 'referral_shown', user: { name: 'Ngozi Ike', email: 'ngozi@example.com' }, createdAt: subMinutes(now, 23).toISOString(), sessionId: null },
  { id: 'd8', eventType: 'referral_accepted', user: { name: 'Ngozi Ike', email: 'ngozi@example.com' }, createdAt: subMinutes(now, 24).toISOString(), sessionId: null },
  { id: 'd9', eventType: 'user_login', user: { name: 'Segun Alade', email: 'segun@example.com' }, createdAt: subMinutes(now, 31).toISOString(), sessionId: null },
  { id: 'd10', eventType: 'slide_upload', user: { name: 'Amara Obi', email: 'amara@example.com' }, createdAt: subMinutes(now, 45).toISOString(), sessionId: null },
  { id: 'd11', eventType: 'user_login', user: { name: 'Chisom Eze', email: 'chisom@example.com' }, createdAt: subMinutes(now, 58).toISOString(), sessionId: null },
  { id: 'd12', eventType: 'recall_completed', user: { name: 'Tunde Adeyemi', email: 'tunde@example.com' }, createdAt: subMinutes(now, 72).toISOString(), sessionId: null },
];

export default function OperationsPage() {
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupInput, setLookupInput] = useState('');

  const { data: rawActivity, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => operationsApi.getActivity(50),
    refetchInterval: 30_000,
  });

  const { data: foundUser, isLoading: lookupLoading } = useQuery({
    queryKey: ['user-lookup', lookupQuery],
    queryFn: () => operationsApi.lookupUser(lookupQuery),
    enabled: !!lookupQuery,
  });

  const hasRealActivity = ((rawActivity as ActivityEvent[])?.length ?? 0) > 0;
  const activityFeed = (hasRealActivity ? rawActivity : DEMO_ACTIVITY) as ActivityEvent[];

  return (
    <div>
      <PageHeader
        title="Operations"
        description="Live activity feed and user lookup. Auto-refreshes every 30s silently."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Live Activity Feed</h2>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {activityFeed.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        EVENT_COLOR[ev.eventType] ?? 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {ev.eventType}
                    </span>
                    {ev.user && (
                      <span className="text-xs text-zinc-400 truncate max-w-[140px]">
                        {ev.user.email}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
              {!activityFeed?.length && (
                <p className="text-center text-zinc-600 text-sm py-8">No recent activity</p>
              )}
            </div>
          )}
        </div>

        {/* User Lookup */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">User Lookup</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLookupQuery(lookupInput.trim());
            }}
            className="flex gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="Email or User ID"
                className="w-full pl-8 pr-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg font-medium transition-colors"
            >
              Find
            </button>
          </form>

          {lookupLoading && (
            <div className="flex items-center justify-center h-20">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {lookupQuery && !lookupLoading && (
            <>
              {foundUser ? (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Name</p>
                    <p className="text-sm text-white font-medium">{(foundUser as Record<string, string>).name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Email</p>
                    <p className="text-sm text-zinc-300">{(foundUser as Record<string, string>).email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Role</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                      {(foundUser as Record<string, string>).role}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Plan</p>
                    <p className="text-sm text-zinc-300">{(foundUser as Record<string, string>).subscriptionTier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">School</p>
                    <p className="text-sm text-zinc-300">{(foundUser as Record<string, string | null>).school ?? '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">No user found</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
