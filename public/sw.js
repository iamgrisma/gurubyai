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
  // Only cache GET requests - other methods (HEAD, POST, PATCH, etc.) cannot be cached
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) return cachedResponse;

      // Otherwise fetch from network and cache the response
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        // Clone the response because streams can be consumed only once
        const responseClone = networkResponse.clone();

        // Cache the successful response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      });
    })
  );
});