'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slidesApi, type Note } from '@/lib/api/slides';
import toast from 'react-hot-toast';

const DEMO_NOTES: Note[] = [
  {
    id: 'demo-1',
    title: 'Pharmacology — CNS Drugs',
    fileType: 'PDF',
    processingStatus: 'DONE',
    masteryLevel: 3,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    summary: 'Dopamine pathways, antipsychotics, mood stabilizers and sedatives',
  },
  {
    id: 'demo-2',
    title: 'Anatomy Notes — Upper Limb',
    fileType: 'IMAGE',
    processingStatus: 'DONE',
    masteryLevel: 2,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    summary: 'Upper limb musculature, brachial plexus and neurovascular supply',
  },
  {
    id: 'demo-3',
    title: 'Voice note — Cardiology',
    fileType: 'VOICE',
    processingStatus: 'DONE',
    masteryLevel: 4,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    summary: 'Heart sounds, murmurs, cardiac output and Frank-Starling mechanism',
  },
];

export function useSlides() {
  const queryClient = useQueryClient();

  const { data: notes = DEMO_NOTES, isLoading } = useQuery<Note[]>({
    queryKey: ['slides'],
    queryFn: async () => {
      try {
        const real = await slidesApi.getAll();
        // Always append demo notes so they're visible even on a fresh account
        const realIds = new Set(real.map(n => n.id));
        const demos = DEMO_NOTES.filter(d => !realIds.has(d.id));
        return [...real, ...demos];
      } catch {
        return DEMO_NOTES;
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
        toast.success('Note uploaded — Buddi is processing it');
        return uploaded;
      } catch {
        queryClient.setQueryData(['slides'], (old: Note[] = []) =>
          old.filter(n => n.id !== optimistic.id),
        );
        toast.error('Upload failed. Check your connection and try again.');
        return optimistic;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Demo notes are local-only — no API call needed
      if (id.startsWith('demo-')) return;
      return slidesApi.delete(id);
    },
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
