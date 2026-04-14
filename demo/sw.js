const CACHE_NAME = 'tulweb-v5';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './app.css',
    './manifest.json',
    '../src/tulweb.css',
    '../src/tulweb.js',
    '../assets/icon-512.png'
];

self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Pre-caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

self.addEventListener('activate', event => {
    // Ensure the service worker takes control of the page immediately
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(keys => {
                return Promise.all(
                    keys.filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                );
            })
        ])
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests and external resources (for simplicity in this demo)
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Strategy: Stale-While-Revalidate
    // 1. Serve from cache immediately if available
    // 2. Fetch from network in the background and update cache
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchedResponse = fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // If network fails, we already have the cache (if any)
                });

                return cachedResponse || fetchedResponse;
            });
        })
    );
});
