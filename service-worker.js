// service-worker.js - разрешаем запросы к Supabase
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Пропускаем запросы к Supabase
    if (url.includes('supabase.co')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Пропускаем запросы к API
    if (url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Для остальных используем сеть
    event.respondWith(fetch(event.request));
});
