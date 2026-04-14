const CACHE_NAME = 'tulweb-v3';
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
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        // Don't cache external fonts or analytics in this simple version
                        if (event.request.url.startsWith(self.location.origin)) {
                            cache.put(event.request.url, fetchRes.clone());
                        }
                        return fetchRes;
                    });
                });
            }).catch(() => {
                // Return offline page if needed, but for now just fail
            })
    );
});
