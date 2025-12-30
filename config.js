// Конфигурация приложения
const CONFIG = {
    // Здесь будут настройки вашего сервера
    API_URL: 'https://your-server.com/api',
    
    // Настройки Telegram WebApp
    TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE', // Замените на реальный токен бота
    
    // Настройки приложения
    APP_NAME: 'Telegram Mini App',
    VERSION: '1.0.0',
    
    // Методы для работы с Telegram WebApp
    initTelegramApp: function() {
        // Этот метод будет вызван из app.js
        console.log('Telegram WebApp SDK загружен');
    },
    
    // Метод для проверки данных пользователя
    validateUserData: function(userData) {
        const errors = [];
        
        if (!userData.username || userData.username.trim().length < 3) {
            errors.push('Имя пользователя должно быть не менее 3 символов');
        }
        
        if (!userData.email || !userData.email.includes('@')) {
            errors.push('Введите корректный email');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    // Метод для отправки данных на сервер (заглушка)
    sendToServer: async function(userData) {
        try {
            // В реальном приложении здесь будет fetch запрос
            console.log('Отправка данных на сервер:', userData);
            
            // Пример реального запроса:
            // const response = await fetch(`${this.API_URL}/register`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${this.TELEGRAM_BOT_TOKEN}`
            //     },
            //     body: JSON.stringify(userData)
            // });
            
            // return await response.json();
            
            // Заглушка для демонстрации
            return {
                success: true,
                message: 'Регистрация успешна',
                userId: Date.now() // Временный ID
            };
            
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            return {
                success: false,
                message: 'Ошибка соединения с сервером'
            };
        }
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('Конфигурация приложения загружена');
    console.log('Версия приложения:', CONFIG.VERSION);
});
