const CACHE_NAME = 'vsk-planner-v9';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json?v=3',
  '/icon-192.png?v=3',
  '/icon-512.png?v=3'
];

// Install event - cache core files and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Take over immediately
  );
});

// Activate event - clean ALL old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force all clients to use new service worker
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to refresh
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_UPDATED' }));
      });
    })
  );
});

// Message event - handle skipWaiting requests
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network first with offline fallback
self.addEventListener('fetch', (event) => {
  // Always fetch from network for API calls
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return empty response for failed API calls (handled by app)
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // For other requests - network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            if (event.request.url.startsWith(self.location.origin)) {
              cache.put(event.request, responseClone);
            }
          });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
