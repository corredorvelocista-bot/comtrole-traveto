const CACHE_NAME = 'travete-v4';

const assets = [
  './',
  './index.html',
  './manifest.json',
  './src/js/StorageService.js',
  './src/js/Producao.js',
  './src/js/app.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
