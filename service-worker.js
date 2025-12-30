// Простой Service Worker
self.addEventListener('fetch', event => {
    // Просто пропускаем все запросы
    event.respondWith(fetch(event.request));
});
