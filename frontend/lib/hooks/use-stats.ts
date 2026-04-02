'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi, type UserStats } from '../api/users';

const DUMMY_STATS: UserStats = {
  noteCount: 7,
  pendingReminders: 3,
  dueReminders: 2,
  recallSessions: 12,
  studyStreak: 5,
  resilienceScore: 67,
};

export function useStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getStats(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: DUMMY_STATS,
  });

  return {
    stats: data ?? DUMMY_STATS,
    isLoading,
    hasError: !!error && !data,
  };
}
