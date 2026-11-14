// %100 Çevrimdışı (Offline-First) Service Worker
const CACHE_NAME = 'aile-finansi-offline-v49';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './wallet.css',
  './xlsx.full.min.js',
  './excel-sync.js',
  './app.js',
  './wallet.js',
  './notifications.js',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
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

  const url = new URL(event.request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  // Localhost (baslat.bat ile çalıştırma) durumunda her zaman güncel dosyaları çek
  if (isLocal) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
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

// Bildirime Tıklandığında Uygulamayı Aç ve İlgili Karta Odaklan
// Not: Kullanıcı isteği gereği bildirim tıklanınca KAPANMAZ (event.notification.close() çağrılmaz).
// Sadece uygulama içindeki bildirim butonundan okundu yapılınca telefondan silinir.
self.addEventListener('notificationclick', (event) => {
  const accId = event.notification.data ? event.notification.data.accountId : null;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (accId) {
            client.postMessage({ type: 'OPEN_CARD_PAY_MODAL', accountId: accId });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./?openCard=' + (accId || ''));
      }
    })
  );
});

// Uygulama içinden bildirim okundu yapıldığında bildirimi telefondan/tarayıcıdan sil
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CARD_NOTIFICATIONS') {
    const accId = event.data.accountId;
    event.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => {
          if (!accId || (notification.data && notification.data.accountId === accId) || (notification.tag && notification.tag.includes(accId))) {
            notification.close();
          }
        });
      })
    );
  }
});

