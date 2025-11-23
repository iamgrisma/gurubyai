// public/sw.js
const CACHE_NAME = 'guruba-cache-v1';
const URLS_TO_CACHE = ['/', '/index.html'];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) return cachedResponse;

      // Otherwise fetch from network and only cache if not already present
      return fetch(event.request).then((networkResponse) => {
        // Clone the response because streams can be consumed only once
        const responseClone = networkResponse.clone();

        // Open cache and attempt to store, but first check existence
        caches.open(CACHE_NAME).then((cache) => {
          cache.match(event.request).then((existing) => {
            if (!existing) {
              // Only put if the entry does NOT already exist
              cache.put(event.request, responseClone);
            }
          });
        });

        return networkResponse;
      });
    })
  );
});