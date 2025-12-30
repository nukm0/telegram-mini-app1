// Конфигурация Supabase
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co', // Замените на ваш URL
    anonKey: 'your-anon-key' // Замените на ваш ключ
};

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Глобальные переменные
let currentUser = null;
let selectedCategory = 'all';
let userVotes = {}; // Хранит голоса пользователя {adId: 'like'/'dislike'}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    tg.expand(); // Раскрываем приложение на весь экран
    tg.enableClosingConfirmation(); // Включаем подтверждение закрытия
    
    // Устанавливаем тему Telegram
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
});
