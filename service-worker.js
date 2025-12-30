// Простой Service Worker для кэширования
const CACHE_NAME = 'vape-market-v1';

self.addEventListener('install', event => {
    console.log('Service Worker установлен');
});

self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request));
});
