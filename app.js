// Основной файл приложения

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ждем инициализации Telegram Web App
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
        }

        // Инициализируем компоненты
        await uiComponents.init();

        // Показываем уведомление о загрузке
        showNotification('Приложение загружено!', 'success');

        // Обновляем UI каждые 30 секунд для актуальных данных
        setInterval(() => {
            uiComponents.loadAdvertisements();
        }, 30000);

    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Ошибка инициализации приложения', 'error');
    }
});

// Глобальные функции для отладки
window.debug = {
    showUserInfo: () => {
        console.log('Current User:', authManager.currentUser);
        console.log('User Profile:', authManager.userProfile);
        console.log('User Votes:', userVotes);
    },
    
    clearLocalData: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    },
    
    testNotification: (type = 'success') => {
        showNotification(`Тестовое уведомление (${type})`, type);
    }
};

// Обработка ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    showNotification('Произошла ошибка в приложении', 'error');
    return true;
};

// Обработка обещаний без catch
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('Непредвиденная ошибка', 'error');
    event.preventDefault();
});
