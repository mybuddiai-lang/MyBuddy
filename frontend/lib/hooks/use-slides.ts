'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slidesApi, type Note } from '@/lib/api/slides';

const DUMMY_NOTES: Note[] = [
  {
    id: '1',
    title: 'Pharmacology — CNS Drugs',
    fileType: 'PDF',
    processingStatus: 'DONE',
    masteryLevel: 3,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    summary: 'Covers dopamine pathways, antipsychotics, and mood stabilizers',
  },
  {
    id: '2',
    title: 'Anatomy Notes — Week 4',
    fileType: 'IMAGE',
    processingStatus: 'DONE',
    masteryLevel: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    summary: 'Upper limb musculature and brachial plexus',
  },
  {
    id: '3',
    title: 'Voice note — Cardiology',
    fileType: 'VOICE',
    processingStatus: 'PROCESSING',
    masteryLevel: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function useSlides() {
  const queryClient = useQueryClient();

  const { data: notes = DUMMY_NOTES, isLoading } = useQuery<Note[]>({
    queryKey: ['slides'],
    queryFn: async () => {
      try {
        return await slidesApi.getAll();
      } catch {
        return DUMMY_NOTES;
      }
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Optimistic add
      const optimistic: Note = {
        id: `optimistic-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileType: file.name.endsWith('.pdf') ? 'PDF' : file.type.startsWith('audio') ? 'VOICE' : 'IMAGE',
        processingStatus: 'PROCESSING',
        masteryLevel: 0,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['slides'], (old: Note[] = []) => [optimistic, ...old]);
      try {
        const uploaded = await slidesApi.upload(file);
        queryClient.setQueryData(['slides'], (old: Note[] = []) =>
          old.map(n => n.id === optimistic.id ? uploaded : n),
        );
        return uploaded;
      } catch {
        // keep optimistic entry as processing
        return optimistic;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => slidesApi.delete(id),
    onMutate: (id) => {
      queryClient.setQueryData(['slides'], (old: Note[] = []) => old.filter(n => n.id !== id));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    },
  });

  return {
    notes,
    isLoading,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    remove: deleteMutation.mutate,
  };
}
