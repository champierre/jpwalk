const CACHE_NAME = 'jpwalk-v1';
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './js/app.js',
  './js/controller.js', 
  './js/model.js',
  './js/view.js',
  './sqlite-worker.js',
  './icon.png',
  './manifest.json',
  // External dependencies
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it's a stream
            const responseToCache = response.clone();

            // Cache the new response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('Network request failed, serving offline page:', error);
            
            // For navigation requests, return the main page from cache
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
      })
  );
});

// Data synchronization storage
let syncedData = {
  lastSync: 0,
  pendingUpdates: []
};

// Handle messages from clients for data synchronization
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  console.log('🔄 ServiceWorker received message:', type, data);
  
  if (type === 'DATA_SYNC_REQUEST') {
    // Client is requesting sync data
    event.ports[0].postMessage({
      type: 'DATA_SYNC_RESPONSE',
      data: syncedData
    });
  } else if (type === 'DATA_UPDATE') {
    // Client is notifying of data changes
    syncedData.pendingUpdates.push({
      ...data,
      timestamp: Date.now(),
      source: event.source.id
    });
    syncedData.lastSync = Date.now();
    
    console.log('📡 Broadcasting data update to all clients:', data);
    
    // Broadcast to all other clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        if (client.id !== event.source.id) {
          client.postMessage({
            type: 'DATA_SYNC_UPDATE',
            data: data
          });
        }
      });
    });
  }
});

// Handle background sync for data when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Notify the main thread that sync is available
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            payload: 'Connection restored'
          });
        });
      })
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'ウォーキングの時間です！',
    icon: './icon.png',
    badge: './icon.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'start-walking',
        title: '開始する'
      },
      {
        action: 'dismiss',
        title: '閉じる'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Japanese Walking', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'start-walking') {
    // Open the app and start a walking session
    event.waitUntil(
      clients.openWindow('./').then((client) => {
        if (client) {
          client.postMessage({
            type: 'START_WALKING_FROM_NOTIFICATION'
          });
        }
      })
    );
  } else {
    // Just open the app
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});