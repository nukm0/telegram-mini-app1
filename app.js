document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const loadingEl = document.getElementById('loading');
    const appEl = document.getElementById('app');
    const registrationForm = document.getElementById('registration-form');
    const userInfo = document.getElementById('user-info');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const messageEl = document.getElementById('message');
    
    // Поля формы
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    
    // Элементы информации о пользователе
    const userIdEl = document.getElementById('user-id');
    const userFirstNameEl = document.getElementById('user-first-name');
    const userLastNameEl = document.getElementById('user-last-name');
    const userUsernameEl = document.getElementById('user-username');
    const userEmailEl = document.getElementById('user-email');
    
    // Проверяем, запущено ли в Telegram WebApp
    let tg;
    let isTelegramWebApp = false;
    
    function initTelegramWebApp() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                tg = window.Telegram.WebApp;
                isTelegramWebApp = true;
                
                // Инициализация WebApp
                tg.ready();
                tg.expand();
                
                // Показываем основную кнопку
                tg.MainButton.setText('Открыть профиль').show();
                tg.MainButton.onClick(showUserInfo);
                
                console.log('Telegram WebApp инициализирован');
                console.log('Данные инициализации:', tg.initDataUnsafe);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка инициализации Telegram WebApp:', error);
            return false;
        }
    }
    
    function showMessage(text, type = 'info') {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
    
    function showUserInfo() {
        if (!isTelegramWebApp) {
            showMessage('Функция доступна только в Telegram WebApp', 'error');
            return;
        }
        
        const user = tg.initDataUnsafe.user || {};
        
        userIdEl.textContent = user.id || 'Не доступно';
        userFirstNameEl.textContent = user.first_name || 'Не указано';
        userLastNameEl.textContent = user.last_name || 'Не указано';
        userUsernameEl.textContent = user.username ? `@${user.username}` : 'Не указано';
        
        // Показываем сохраненный email из localStorage
        const savedEmail = localStorage.getItem('user_email');
        userEmailEl.textContent = savedEmail || 'Не указано';
        
        registrationForm.style.display = 'none';
        userInfo.style.display = 'block';
        
        if (tg.MainButton) {
            tg.MainButton.setText('Вернуться к регистрации');
            tg.MainButton.onClick(showRegistrationForm);
        }
    }
    
    function showRegistrationForm() {
        registrationForm.style.display = 'block';
        userInfo.style.display = 'none';
        
        if (tg && tg.MainButton) {
            tg.MainButton.setText('Открыть профиль');
            tg.MainButton.onClick(showUserInfo);
        }
    }
    
    async function registerUser() {
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        
        // Валидация
        if (!username) {
            showMessage('Введите имя пользователя', 'error');
            return;
        }
        
        if (!email || !email.includes('@')) {
            showMessage('Введите корректный email', 'error');
            return;
        }
        
        // Если в Telegram WebApp, получаем данные пользователя
        let telegramUserData = {};
        if (isTelegramWebApp) {
            telegramUserData = tg.initDataUnsafe.user || {};
        }
        
        // Создаем объект пользователя
        const userData = {
            username: username,
            email: email,
            telegram_id: telegramUserData.id || null,
            first_name: telegramUserData.first_name || null,
            last_name: telegramUserData.last_name || null,
            telegram_username: telegramUserData.username || null,
            registration_date: new Date().toISOString(),
            platform: isTelegramWebApp ? 'telegram_webapp' : 'web'
        };
        
        try {
            // В режиме разработки просто сохраняем в localStorage
            localStorage.setItem('user_data', JSON.stringify(userData));
            localStorage.setItem('user_email', email);
            
            showMessage('Регистрация успешна!', 'success');
            
            // Если в Telegram WebApp, показываем кнопку профиля
            if (isTelegramWebApp) {
                showUserInfo();
            } else {
                // В браузере просто очищаем форму
                usernameInput.value = '';
                emailInput.value = '';
            }
            
            // Здесь должен быть реальный запрос на сервер:
            // const response = await fetch('https://your-server.com/register', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(userData)
            // });
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            showMessage('Ошибка при регистрации', 'error');
        }
    }
    
    function logout() {
        // Очищаем localStorage
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_email');
        
        // Показываем форму регистрации
        showRegistrationForm();
        
        showMessage('Вы вышли из системы', 'info');
    }
    
    // Инициализация приложения
    function initApp() {
        console.log('Инициализация приложения...');
        
        // Пытаемся инициализировать Telegram WebApp
        const isTelegram = initTelegramWebApp();
        
        // Проверяем, есть ли сохраненные данные
        const savedData = localStorage.getItem('user_data');
        
        if (savedData && isTelegram) {
            // Если есть сохраненные данные и это Telegram, показываем профиль
            showUserInfo();
        } else {
            // Иначе показываем форму регистрации
            showRegistrationForm();
        }
        
        // Показываем приложение
        loadingEl.style.display = 'none';
        appEl.style.display = 'block';
        
        // Если не в Telegram WebApp, предупреждаем пользователя
        if (!isTelegram) {
            showMessage('Приложение лучше работает в Telegram. Откройте его через Telegram бота.', 'info');
        }
    }
    
    // Обработчики событий
    registerBtn.addEventListener('click', registerUser);
    
    // Обработка нажатия Enter в полях ввода
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') registerUser();
    });
    
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') registerUser();
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Запуск приложения
    initApp();
});
