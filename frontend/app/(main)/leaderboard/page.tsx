'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Brain, TrendingUp, Crown, Medal, Star, Lock } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

interface LeaderEntry {
  rank: number;
  userId: string;
  name: string;
  school: string;
  studyStreak: number;
  resilienceScore: number;
  recallAccuracy: number;
  isCurrentUser?: boolean;
}

const DUMMY_GLOBAL: LeaderEntry[] = [
  { rank: 1, userId: 'u1', name: 'Amara Okonkwo', school: 'UNILAG', studyStreak: 47, resilienceScore: 94, recallAccuracy: 91 },
  { rank: 2, userId: 'u2', name: 'Tobi Adeyemi', school: 'UI Ibadan', studyStreak: 38, resilienceScore: 89, recallAccuracy: 88 },
  { rank: 3, userId: 'u3', name: 'Chisom Eze', school: 'UNIBEN', studyStreak: 34, resilienceScore: 86, recallAccuracy: 85 },
  { rank: 4, userId: 'u4', name: 'Emeka Nwosu', school: 'UNIPORT', studyStreak: 29, resilienceScore: 81, recallAccuracy: 79 },
  { rank: 5, userId: 'u5', name: 'Lara Kolawole', school: 'OAU Ife', studyStreak: 25, resilienceScore: 77, recallAccuracy: 75 },
  { rank: 6, userId: 'u6', name: 'Bolu Fashola', school: 'ABU Zaria', studyStreak: 22, resilienceScore: 73, recallAccuracy: 70 },
  { rank: 7, userId: 'u7', name: 'Zara Musa', school: 'BUK Kano', studyStreak: 19, resilienceScore: 68, recallAccuracy: 66 },
  { rank: 8, userId: 'u8', name: 'Kofi Mensah', school: 'KNUST Ghana', studyStreak: 17, resilienceScore: 65, recallAccuracy: 63 },
  { rank: 9, userId: 'u9', name: 'Adaeze Obi', school: 'UNN Nsukka', studyStreak: 14, resilienceScore: 61, recallAccuracy: 58 },
  { rank: 10, userId: 'u10', name: 'Femi Akindele', school: 'LASU', studyStreak: 11, resilienceScore: 57, recallAccuracy: 54 },
];

type Tab = 'streak' | 'resilience' | 'recall';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; field: keyof LeaderEntry; unit?: string; color: string }[] = [
  { id: 'streak', label: 'Streak', icon: Flame, field: 'studyStreak', unit: 'd', color: 'text-orange-500' },
  { id: 'resilience', label: 'Resilience', icon: TrendingUp, field: 'resilienceScore', unit: '%', color: 'text-brand-500' },
  { id: 'recall', label: 'Recall', icon: Brain, field: 'recallAccuracy', unit: '%', color: 'text-violet-500' },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={18} className="text-amber-400" />;
  if (rank === 2) return <Medal size={18} className="text-zinc-400" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return <span className="text-sm font-bold text-zinc-400 w-[18px] text-center">{rank}</span>;
}

function RankCard({ entry, tab, index }: { entry: LeaderEntry; tab: Tab; index: number }) {
  const config = TAB_CONFIG.find(t => t.id === tab)!;
  const value = entry[config.field] as number;
  const isTop3 = entry.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition ${
        entry.isCurrentUser
          ? 'bg-brand-50 border-brand-200 shadow-md'
          : isTop3
          ? 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 shadow-card'
          : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'
      }`}
    >
      {/* Rank */}
      <div className="w-6 flex items-center justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
        isTop3 ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white' : 'bg-zinc-100 text-zinc-600'
      }`}>
        {entry.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-brand-700' : 'text-zinc-800'}`}>
            {entry.name}
          </p>
          {entry.isCurrentUser && (
            <span className="shrink-0 text-[10px] font-bold text-brand-500 bg-brand-100 px-1.5 py-0.5 rounded-full">You</span>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate">{entry.school}</p>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p className={`text-base font-bold ${config.color}`}>
          {value}{config.unit}
        </p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('streak');
  const isPremium = user?.subscriptionTier !== 'FREE';

  const ENDPOINT: Record<Tab, string> = {
    streak: '/leaderboard/streaks',
    resilience: '/leaderboard',
    recall: '/leaderboard/recall',
  };

  const { data: apiData } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: async () => {
      try {
        const res = await apiClient.get(ENDPOINT[activeTab]);
        const payload = res.data?.data ?? res.data;
        const list = payload?.leaderboard ?? (Array.isArray(payload) ? payload : []);
        // Normalise: backend uses userId or id
        return list.map((e: any) => ({
          ...e,
          userId: e.userId ?? e.id,
          school: e.school ?? '',
          resilienceScore: e.resilienceScore ?? 50,
          recallAccuracy: e.recallAccuracy ?? 0,
          studyStreak: e.studyStreak ?? 0,
        })) as LeaderEntry[];
      } catch {
        return null;
      }
    },
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  const rawEntries = apiData ?? DUMMY_GLOBAL;

  // Inject current user's position from auth store
  const userEntry = rawEntries.find(e => e.userId === user?.id);
  const entries = rawEntries.map(e => ({
    ...e,
    isCurrentUser: e.userId === user?.id,
  }));

  // Current user's rank card at top if not in top 10
  const userInTop10 = entries.some(e => e.isCurrentUser);
  const myRank = userEntry?.rank ?? 42;

  const config = TAB_CONFIG.find(t => t.id === activeTab)!;

  return (
    <div className="px-4 py-4 space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Trophy size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Leaderboard</h1>
          <p className="text-xs text-zinc-400">Top students across Buddi</p>
        </div>
      </motion.div>

      {/* Premium gate */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Lock size={18} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Premium feature</p>
            <p className="text-xs text-amber-700 mt-0.5">Upgrade to see your full rank and compete on the leaderboard.</p>
          </div>
          <Link
            href="/profile/subscription"
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            Upgrade
          </Link>
        </motion.div>
      )}

      {/* Your rank card */}
      {!userInTop10 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-50 border border-brand-200 rounded-2xl p-4"
        >
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">Your Current Rank</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center text-sm font-bold text-brand-700">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-800">{user?.name || 'You'}</p>
              <p className="text-xs text-brand-500">{user?.school || 'Your school'}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-brand-600">#{isPremium ? myRank : '?'}</p>
              <p className="text-xs text-brand-400">global rank</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 bg-zinc-100 rounded-2xl p-1">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === id ? 'bg-white shadow text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div className="flex items-end justify-center gap-3 py-2">
        {[entries[1], entries[0], entries[2]].filter(Boolean).map((entry, i) => {
          const podiumOrder = [2, 1, 3];
          const heights = ['h-20', 'h-28', 'h-16'];
          const bgColors = ['bg-zinc-200', 'bg-amber-400', 'bg-amber-600'];
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                {entry.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-semibold text-zinc-700 max-w-[64px] text-center truncate">{entry.name.split(' ')[0]}</p>
              <p className={`text-xs font-bold ${config.color}`}>
                {entry[config.field] as number}{config.unit}
              </p>
              <div className={`w-16 ${heights[i]} ${bgColors[i]} rounded-t-xl flex items-start justify-center pt-2`}>
                <span className="text-white text-sm font-bold">#{podiumOrder[i]}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Full ranking list */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Top Students · {config.label}
        </p>
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {entries.map((entry, i) => (
              <RankCard key={entry.userId} entry={entry} tab={activeTab} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Motivational footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-2"
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Star size={12} className="text-amber-400" />
          <p className="text-xs font-semibold text-zinc-500">Leaderboard updates daily</p>
          <Star size={12} className="text-amber-400" />
        </div>
        <p className="text-xs text-zinc-400">Keep your streak alive to climb the ranks!</p>
      </motion.div>
    </div>
  );
}
