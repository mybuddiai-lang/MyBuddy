const CACHE_NAME = 'buddi-v7'; // auto-stamped at build time by scripts/prebuild.js

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
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Buddi', {
      body: data.body || 'Time to review! 📚',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'buddi-reminder',
      data: { url: data.url || '/recall' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
