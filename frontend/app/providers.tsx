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
    let swPoller: ReturnType<typeof setInterval> | null = null;
    let refreshing = false;

    // ── Service Worker ────────────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
          swPoller = setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
        })
        .catch(() => {});

      // When new SW takes control → reload once so fresh JS is used
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    // ── Version polling: reload when a new build is detected ─────────────────
    let currentBuildId: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (!buildId || buildId === 'dev') return;
        if (currentBuildId !== null && currentBuildId !== buildId) {
          window.location.reload();
          return;
        }
        currentBuildId = buildId;
      } catch { /* offline — ignore */ }
    };

    checkVersion();
    const versionPoller = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      clearInterval(versionPoller);
      if (swPoller !== null) clearInterval(swPoller);
    };
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
