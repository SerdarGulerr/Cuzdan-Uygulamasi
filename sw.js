// %100 Çevrimdışı (Offline-First) Service Worker
const CACHE_NAME = 'faiz-takip-offline-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './wallet.css',
  './app.js',
  './wallet.js',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-While-Revalidate stratejisi: İnternet olmasa da anında önbellekten yükle, internet varsa arka planda güncelle
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ağ hatası veya çevrimdışı - önbellek zaten dönecek
      });

      return cachedResponse || fetchPromise;
    })
  );
});

