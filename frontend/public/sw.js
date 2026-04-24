const CACHE_NAME = 'buddi-1776994914734'; // auto-stamped at build time by scripts/prebuild.js

const STATIC_ASSETS = [
  '/manifest.json',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: wipe every cache except the current one
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // ── version.json: always network, never cache (polled with ?_ timestamps) ──
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request).catch(() => new Response('{"buildId":"unknown"}', {
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // ── API / cross-origin: network-only, no SW caching ──────────────────────
  // React Query handles caching + offline persistence for API responses.
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    event.respondWith(fetch(request));
    return;
  }

  // ── HTML pages: always network-first ─────────────────────────────────────
  const isHtml = request.headers.get('accept')?.includes('text/html');
  if (isHtml) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // ── Next.js static chunks (/_next/static/): cache-first ──────────────────
  // Safe because Next.js content-hashes every filename — stale = unreachable.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Other static assets (icons, fonts, manifest): cache-first ────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      }).catch(() => caches.match('/offline'));
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  // Determine vibration pattern and persistence based on notification type
  const tag = data.tag || 'buddi-general';
  const isMessage = tag.startsWith('reply-') || tag.startsWith('community-post-');
  const isCritical = tag.startsWith('reminder-') || tag.startsWith('join-approved-');

  event.waitUntil(
    self.registration.showNotification(data.title || 'Buddi', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
      // Keep message notifications visible until user acts on them (WhatsApp-style)
      requireInteraction: isMessage || isCritical,
      // Vibration: short-short-long for messages, single pulse for others
      vibrate: isMessage ? [100, 50, 100, 50, 300] : [150],
      // Reuse existing notification with same tag (prevents spam)
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing app window and navigate it to the target URL
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // No open window — open a new one
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
