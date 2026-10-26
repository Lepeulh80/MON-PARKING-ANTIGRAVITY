const CACHE_NAME = 'mon-parking-v2.4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/animations.css',
  './js/i18n.js',
  './js/utils.js',
  './js/a11y.js',
  './js/db.js',
  './js/sync.js',
  './js/auth.js',
  './js/router.js',
  './js/rates.js',
  './js/audit.js',
  './js/security-plates.js',
  './js/plate-learning.js',
  './js/subscriptions.js',
  './js/plate-scanner.js',
  './js/tickets.js',
  './js/slots.js',
  './js/dashboard.js',
  './js/photo-enhanced.js',
  './js/vehicles.js',
  './js/sales.js',
  './js/rentals.js',
  './js/invoices.js',
  './js/cash-register.js',
  './js/stock.js',
  './js/maintenance.js',
  './js/clients.js',
  './js/attendance.js',
  './js/employees.js',
  './js/banking.js',
  './js/accounting.js',
  './js/reports.js',
  './js/settings.js',
  './js/showroom3d.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache individual items gracefully
        return Promise.allSettled(
          ASSETS.map(asset => cache.add(asset).catch(err => console.warn('Cache error for', asset, err)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  // Network-First strategy: fetch fresh copy from server, update cache, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
