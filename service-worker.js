const CACHE_NAME = 'rohan-followup-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/add.html',
  '/list.html',
  '/settings.html',
  '/about.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-512.svg'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  try {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        }).catch(() => caches.match('/index.html'))
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(res => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, res.clone()));
          return res;
        });
      }).catch(()=>caches.match('/index.html'))
    );
  } catch (e) {
    event.respondWith(fetch(event.request));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const {title, options} = event.data.payload;
    self.registration.showNotification(title, options);
  }
});
