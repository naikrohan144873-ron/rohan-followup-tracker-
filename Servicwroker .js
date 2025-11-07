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
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      return caches.open(CACHE_NAME).then(c => { c.put(e.request, res.clone()); return res; });
    })).catch(()=>caches.match('/index.html'))
  );
});
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const {title, options} = e.data.payload;
    self.registration.showNotification(title, options);
  }
});
