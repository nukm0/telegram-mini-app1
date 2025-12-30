// ==================== ФУНКЦИЯ РЕГИСТРАЦИИ ПОЛЬЗОВАТЕЛЯ ====================
async function registerUser(userData) {
    console.log('📝 Начало регистрации пользователя:', userData);
    
    if (!supabaseClient) {
        console.error('❌ Supabase client не инициализирован');
        return false;
    }
    
    if (!userData || !userData.id) {
        console.error('❌ Нет данных пользователя');
        return false;
    }
    
    try {
        // ВАЖНО: ваша таблица users ожидает telegram_id как int8 (число)
        const telegramId = parseInt(userData.id);
        
        if (isNaN(telegramId)) {
            console.error('❌ Неверный Telegram ID (не число):', userData.id);
            return false;
        }
        
        console.log('🔧 Преобразованный Telegram ID:', telegramId, '(тип:', typeof telegramId, ')');
        
        // Подготавливаем данные для вашей таблицы users
        const userRecord = {
            telegram_id: telegramId,  // int8 - ЧИСЛО (самое важное!)
            username: userData.username || ('user_' + telegramId),
            first_name: userData.first_name || 'Пользователь',
            rating: 4.5,            // Значение по умолчанию из вашей таблицы
            is_verified: false,     // Значение по умолчанию из вашей таблицы
            is_admin: userData.isAdmin || false,
            deals_count: 0,         // Начинаем с 0 сделок
            likes_count: 0,         // Начинаем с 0 лайков
            created_at: new Date().toISOString()
        };
        
        console.log('📤 Отправляем данные в Supabase:', userRecord);
        
        // Выполняем upsert (обновить или создать)
        const { data, error } = await supabaseClient
            .from('users')
            .upsert(userRecord, {
                onConflict: 'telegram_id',  // Конфликт по telegram_id
                ignoreDuplicates: false
            });
            
        if (error) {
            console.error('❌ Ошибка регистрации в Supabase:', error);
            console.error('Детали ошибки:', error.message, error.code, error.details);
            return false;
        }
        
        console.log('✅ Пользователь успешно зарегистрирован:', data);
        return true;
        
    } catch (error) {
        console.error('💥 Критическая ошибка при регистрации:', error);
        return false;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP ====================
function initTelegramWebApp() {
    console.log('🔍 Проверяем наличие Telegram WebApp...');
    
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
        console.log('✅ Telegram WebApp обнаружен');
        tg.ready();
        tg.expand();
        
        const tgUser = tg.initDataUnsafe?.user;
        console.log('👤 Данные пользователя Telegram:', tgUser);
        
        if (tgUser) {
            // Создаем объект currentUser
            currentUser = {
                id: tgUser.id,  // Оставляем как есть (будет преобразовано в регистрации)
                first_name: tgUser.first_name,
                username: tgUser.username || ('user_' + tgUser.id),
                photo_url: tgUser.photo_url,
                language_code: tgUser.language_code,
                isPremium: tgUser.is_premium || false,
                isAdmin: tgUser.id.toString() === '998579758'
            };
            
            console.log('👤 Создан currentUser:', currentUser);
            
            adminMode = currentUser.isAdmin;
            updateUIForUser();
            
            // ВАЖНО: Регистрируем пользователя в Supabase
            console.log('🔄 Начинаем регистрацию пользователя в БД...');
            registerUser(currentUser).then(success => {
                if (success) {
                    console.log('🎉 Пользователь зарегистрирован в системе');
                } else {
                    console.warn('⚠️ Пользователь не зарегистрирован в БД (работаем в режиме гостя)');
                }
            });
            
        } else {
            console.warn('⚠️ Пользователь Telegram не найден в initData');
        }
    } else {
        console.log('🌐 Telegram WebApp не обнаружен, режим браузера');
        currentUser = {
            id: 'browser_user_001',
            first_name: 'Гость',
            username: 'guest_user',
            isAdmin: false
        };
        updateUIForUser();
    }
}

// ==================== СОЗДАНИЕ ОБЪЯВЛЕНИЯ ====================
async function createNewAd() {
    console.log('🆕 Начинаем создание объявления...');
    
    // 1. Проверка авторизации
    if (!currentUser) {
        alert('❌ Для размещения объявления нужно авторизоваться');
        console.error('Текущий пользователь не определен');
        return;
    }
    
    console.log('👤 Текущий пользователь:', currentUser);
    console.log('🆔 Telegram ID пользователя:', currentUser.id);
    
    // 2. Получаем данные из формы
    const form = document.getElementById('adForm');
    const formData = new FormData(form);
    
    // 3. Подготавливаем данные для объявления
    const adData = {
        title: formData.get('title'),
        type: formData.get('type'),
        category: formData.get('category'),
        price: parseInt(formData.get('price')) || 0,
        description: formData.get('description'),
        seller_id: currentUser.id.toString(),  // Для таблицы ads это текст
        seller_name: currentUser.first_name,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + APP_CONFIG.AD_LIFETIME_DAYS * 86400000).toISOString(),
        likes: 0,
        dislikes: 0,
        views: 0,
        images: ''
    };
    
    console.log('📝 Данные объявления:', adData);
    
    // 4. Проверяем, есть ли пользователь в БД
    if (supabaseClient) {
        try {
            // Проверяем существование пользователя в таблице users
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('telegram_id')
                .eq('telegram_id', parseInt(currentUser.id))
                .single();
            
            if (userError || !userData) {
                console.warn('⚠️ Пользователь не найден в таблице users, пробуем зарегистрировать...');
                const registered = await registerUser(currentUser);
                if (!registered) {
                    console.error('❌ Не удалось зарегистрировать пользователя');
                    alert('Ошибка регистрации пользователя');
                    return;
                }
            }
            
            // 5. Сохраняем объявление
            console.log('💾 Сохраняем объявление в таблицу ads...');
            const { data, error } = await supabaseClient
                .from('ads')
                .insert([adData]);
                
            if (error) {
                console.error('❌ Ошибка сохранения объявления:', error);
                alert('Ошибка при создании объявления: ' + error.message);
                return;
            }
            
            console.log('✅ Объявление успешно создано:', data);
            alert('Объявление успешно создано!');
            
            // 6. Обновляем интерфейс
            closeAllModals();
            form.reset();
            await loadAds();
            
        } catch (error) {
            console.error('💥 Ошибка при создании объявления:', error);
            alert('Произошла ошибка соединения');
        }
    } else {
        console.log('📴 Supabase недоступен, демо-режим');
        alert('Объявление создано (демо-режим)');
        closeAllModals();
        form.reset();
    }
}
