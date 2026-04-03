'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi, type Reminder } from '@/lib/api/reminders';

const DUMMY_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    title: 'Review: Pharmacology — CNS Drugs',
    description: 'Spaced repetition due — time to test yourself!',
    type: 'RECALL',
    status: 'PENDING',
    scheduledAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'r2',
    title: 'Review: Anatomy Notes — Week 4',
    type: 'RECALL',
    status: 'PENDING',
    scheduledAt: new Date(Date.now() + 7200000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'r3',
    title: 'Exam in 14 days — start final review',
    type: 'EXAM',
    status: 'PENDING',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export function useReminders() {
  const queryClient = useQueryClient();

  const { data: reminders = DUMMY_REMINDERS, isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      try {
        return await remindersApi.getAll() as unknown as Reminder[];
      } catch {
        return DUMMY_REMINDERS;
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const dueReminders = reminders.filter(r => {
    if (r.status !== 'PENDING') return false;
    return new Date(r.scheduledAt) <= new Date(Date.now() + 4 * 3600000);
  });

  return {
    reminders,
    dueReminders,
    isLoading,
    complete: completeMutation.mutate,
    remove: deleteMutation.mutate,
  };
}
