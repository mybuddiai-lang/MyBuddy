'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,   // 2 min before background refetch
        gcTime: CACHE_TTL,           // keep unused data for 24h (enables persistence)
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  }));

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: 'buddi-rq-cache-v2',
    })
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(registration => {
        // Force check for a new SW on every page load
        registration.update().catch(() => {});
      })
      .catch(() => {});

    // When a new SW takes control, reload once to get fresh JS bundles
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_TTL }}
      >
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#18181b',
              color: '#fff',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#6b5cf6', secondary: '#fff' } },
          }}
        />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
