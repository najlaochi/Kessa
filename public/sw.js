const CACHE_NAME = 'mama-tales-v4';

// Install: skip waiting immediately so new SW takes over right away
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v4 — skipWaiting');
    self.skipWaiting();
});

// Activate: delete ALL old caches, then claim all clients immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v4 — claiming clients');
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => {
                console.log('[SW] Deleting cache:', k);
                return caches.delete(k);
            })))
            .then(() => self.clients.claim())
            .then(() => {
                // Tell every open tab to reload so they get fresh JS
                return self.clients.matchAll({ type: 'window' }).then((clients) => {
                    clients.forEach((client) => client.navigate(client.url));
                });
            })
    );
});

// Fetch: Network-first for everything.
// Vite JS/CSS have hashed filenames — no caching needed (they're always fresh).
// HTML is always fetched from network (SPA routing works via rewrite).
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip cross-origin requests (Firebase, Google APIs, fonts, etc.)
    if (url.origin !== self.location.origin) return;

    // Skip Vite hashed assets — they're immutable by filename, no caching needed
    if (url.pathname.startsWith('/assets/')) {
        // Pure network fetch — Vite hashing guarantees freshness
        return;
    }

    // For HTML and everything else: network-first, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Only cache successful same-origin responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
});
