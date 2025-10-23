// Service Worker untuk offline functionality
const CACHE_NAME = 'inventory-sepeda-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/database.js',
    '/js/print.js',
    '/js/qrcode.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});
