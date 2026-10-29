const CACHE_NAME = 'pulselift-workout-v19';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './anatomical3d.js',
  './script.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { cache: 'no-store' })
            .then((res) => {
              if (res && res.ok) {
                return cache.put(url, res);
              }
            })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) =>
        Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          // Notify active tabs so they flush their backup vault before any reload
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      })
  );
});

// Network-first strategy so local development & updates always serve the latest code immediately,
// while falling back to the cached copy when offline. Never cache backup endpoints.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (
    reqUrl.pathname.includes('/api/backup') ||
    reqUrl.pathname.endsWith('workout-backup.json') ||
    reqUrl.pathname.includes('/backups/')
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches
          .match(event.request, { ignoreSearch: true })
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html', { ignoreSearch: true });
            }
          });
      })
  );
});
