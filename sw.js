const CACHE_NAME = 'travete-v3';
const assets = [
  './index.html',
  './manifest.json',
  './js/StorageService.js',
  './js/Producao.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
