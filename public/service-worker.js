const CACHE_NAME = 'vsk-planner-v10';
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
  // Always fetch from network for API calls (Supabase)
  if (event.request.url.includes('supabase')) {
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

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'VSK Planner', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Nova obvestilo',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      ...data
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VSK Planner', options)
  );
});

// Notification click event - open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
