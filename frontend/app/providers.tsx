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
    // ── Service Worker: register + poll for updates every 5 min ──────────────
    if ('serviceWorker' in navigator) {
      let refreshing = false;

      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then(reg => {
          reg.update().catch(() => {});
          // Keep checking for a newer SW while the app is open
          const swPoller = setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
          return () => clearInterval(swPoller);
        })
        .catch(() => {});

      // New SW took over → reload once to get fresh JS bundles
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    // ── Version polling: silently reload when a new build is deployed ─────────
    let currentBuildId: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (buildId === 'dev') return; // skip in local development
        if (currentBuildId !== null && currentBuildId !== buildId) {
          // New build detected — reload silently
          window.location.reload();
          return;
        }
        currentBuildId = buildId;
      } catch { /* network offline — ignore */ }
    };

    checkVersion(); // Check immediately on load
    const versionPoller = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(versionPoller);
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
