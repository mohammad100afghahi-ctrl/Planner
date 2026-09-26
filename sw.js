/* App-shell cache for مدار.
   Bump CACHE_NAME (e.g. medar-shell-v2) whenever index.html/manifest/icons change,
   so returning visitors pick up the new version instead of a stale cached copy. */
const CACHE_NAME = 'medar-shell-v26';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GET requests for the app shell. Supabase API calls,
  // Google Fonts, and the supabase-js CDN script are left untouched and always
  // go straight to the network, so live task data is never served stale.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      // Instant load from cache when available; cache is refreshed in the
      // background on every visit so the next open picks up new changes.
      return cached || network;
    })
  );
});

/* Push notifications — the morning digest sent by the send-push edge function.
   The payload is JSON { title, body, tag }; a same-tag notification replaces
   yesterday's instead of piling up. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'مدار', {
      body: data.body || '',
      tag: data.tag || 'medar',
      renotify: true,
      dir: 'rtl',
      lang: 'fa',
      icon: './icon-192.png',
      badge: './icon-192.png',
    })
  );
});

// Tapping the notification brings an open مدار tab forward, or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow('./');
    })
  );
});
