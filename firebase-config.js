// Firebase конфигурация для Vape Market
const firebaseConfig = {
    apiKey: "AIzaSyBgPG4EXFQHoIOVLt2_BdCmiUJEWTXsGN8",
    authDomain: "telegram-market-vape.firebaseapp.com",
    databaseURL: "https://telegram-market-vape-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "telegram-market-vape",
    storageBucket: "telegram-market-vape.firebasestorage.app",
    messagingSenderId: "35870048384",
    appId: "1:35870048384:web:acd6501459aa39180b6665",
    measurementId: "G-99R2PPBNF8"
};

// Проверяем не инициализирован ли Firebase уже
if (typeof firebase !== 'undefined') {
    try {
        // Пробуем получить существующее приложение
        const existingApp = firebase.apps[0];
        if (!existingApp) {
            // Инициализируем Firebase
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase инициализирован (клиент)');
        }
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
    }
}

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}

// Глобальный экспорт для использования в других скриптах
window.firebaseConfig = firebaseConfig;
