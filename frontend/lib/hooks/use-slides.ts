'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { slidesApi, type Note } from '@/lib/api/slides';
import toast from 'react-hot-toast';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function useSlides() {
  const queryClient = useQueryClient();
  const [activeUploads, setActiveUploads] = useState(0);

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['slides'],
    queryFn: async () => slidesApi.getAll(),
    staleTime: 3 * 60 * 1000,
    retry: 1,
    // On failure, keep whatever data is already in the cache instead of wiping it
    placeholderData: (prev) => prev,
    // Poll every 5 s while any note is still processing
    refetchInterval: (query) => {
      const data = query.state.data as Note[] | undefined;
      const hasProcessing = data?.some(
        n => !n.id.startsWith('optimistic-') &&
          (n.processingStatus === 'PROCESSING' || n.processingStatus === 'PENDING'),
      );
      return hasProcessing ? 5000 : false;
    },
  });

  // Each call is independent — multiple files can upload concurrently
  const upload = useCallback(async (file: File): Promise<Note> => {
    const optimistic: Note = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      fileType: file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : file.type.startsWith('audio/') ? 'VOICE' : 'IMAGE',
      processingStatus: 'PROCESSING',
      masteryLevel: 0,
      createdAt: new Date().toISOString(),
    };

    setActiveUploads(c => c + 1);
    queryClient.setQueryData(['slides'], (old: Note[] = []) => [optimistic, ...old]);

    try {
      const uploaded = await slidesApi.upload(file);
      queryClient.setQueryData(['slides'], (old: Note[] = []) =>
        old.map(n => n.id === optimistic.id ? uploaded : n),
      );
      toast.success(`"${optimistic.title}" uploaded — processing`);
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      return uploaded;
    } catch {
      queryClient.setQueryData(['slides'], (old: Note[] = []) =>
        old.map(n => n.id === optimistic.id ? { ...n, processingStatus: 'FAILED' } : n),
      );
      toast.error(`Failed to upload "${file.name}"`);
      return { ...optimistic, processingStatus: 'FAILED' };
    } finally {
      setActiveUploads(c => Math.max(0, c - 1));
    }
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => slidesApi.delete(id),
    onMutate: (id) => {
      queryClient.setQueryData(['slides'], (old: Note[] = []) => old.filter(n => n.id !== id));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    },
  });

  // Listen for real-time note processing status updates from the backend
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) return;
    let alive = true;
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socket.on('note:status', ({ noteId, status }: { noteId: string; status: string }) => {
      // Always update the processing status immediately so the spinner stops
      queryClient.setQueryData(['slides'], (old: Note[] = []) =>
        old.map(n => n.id === noteId ? { ...n, processingStatus: status } : n)
      );

      if (status === 'DONE') {
        // Fetch only this note to get its summary
        slidesApi.getById(noteId)
          .then(updated => {
            if (!alive) return;
            queryClient.setQueryData(['slides'], (old: Note[] = []) =>
              old.map(n => n.id === noteId ? { ...n, ...updated } : n)
            );
          })
          .catch(() => {
            // Status is already updated — refetchInterval will retry automatically
          });
      }
    });
    return () => { alive = false; socket.disconnect(); };
  }, [queryClient]);

  return {
    notes,
    isLoading,
    upload,
    activeUploads,
    remove: deleteMutation.mutate,
  };
}
