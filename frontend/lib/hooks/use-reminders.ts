'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi, type Reminder } from '@/lib/api/reminders';

export function useReminders() {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      try {
        return await remindersApi.getAll();
      } catch {
        // Return empty on error so users don't see stale/fake reminders
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute — matches cron frequency
    retry: 1,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      remindersApi.snooze(id, hours),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  // Reminders that need the user's attention right now:
  //   • PENDING and past their scheduled time (overdue, notification not yet fired)
  //   • SENT — notification was delivered, user hasn't completed/snoozed yet
  const dueReminders = reminders.filter(r => {
    if (r.status === 'SENT') return true;
    if (r.status === 'PENDING' && new Date(r.scheduledAt) <= new Date()) return true;
    return false;
  });

  // Upcoming: PENDING reminders not yet due (future)
  const upcomingReminders = reminders.filter(
    r => r.status === 'PENDING' && new Date(r.scheduledAt) > new Date(),
  );

  return {
    reminders,
    dueReminders,
    upcomingReminders,
    isLoading,
    complete: completeMutation.mutate,
    snooze: snoozeMutation.mutate,
    remove: deleteMutation.mutate,
    isCompleting: completeMutation.isPending,
    isSnoozing: snoozeMutation.isPending,
  };
}
