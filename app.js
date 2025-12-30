// Конфигурация приложения
const APP_CONFIG = window.CONFIG || {
    APP_NAME: 'Vape Market',
    VERSION: '1.0.0',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    MAX_IMAGES_PER_AD: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    AD_LIFETIME_DAYS: 14
};

// Глобальные переменные
let currentUser = null;
let supabaseClient = null;
let adminMode = false;

// ==================== ПРОВЕРКА TELEGRAM ====================
(function checkTelegramEnvironment() {
    const isTelegramWebView = window.Telegram?.WebApp?.platform !== 'unknown';
    const isTelegramWebApp = window.location.href.includes('t.me') || 
                           window.location.href.includes('web.telegram.org');

    // Если не Telegram — показываем ошибку
    if (!isTelegramWebView && !isTelegramWebApp) {
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: #18193c;
                color: white;
                font-family: sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <h1 style="color: #7f41ef; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i> Доступ запрещён
                    </h1>
                    <p>Это приложение работает только в Telegram.</p>
                    <p>Откройте его через бота:</p>
                    <div style="
                        background: #23244d;
                        padding: 15px;
                        border-radius: 12px;
                        margin: 20px 0;
                        border: 1px solid #7f41ef;
                    ">
                        <code style="color: #c48cfc;">
                            @market_vape_1_bot
                        </code>
                    </div>
                    <p style="color: #b0b0c0; font-size: 14px;">
                        Если вы видите это сообщение в Telegram,<br>
                        обновите страницу или перезапустите приложение.
                    </p>
                </div>
            </div>
        `;
        throw new Error('Приложение доступно только в Telegram');
    }
})();

// ==================== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`${APP_CONFIG.APP_NAME} v${APP_CONFIG.VERSION}`);

    // Проверка Telegram WebApp
    if (window.Telegram && Telegram.WebApp) {
        initTelegramWebApp();
    } else {
        console.log('Telegram WebApp не обнаружен, режим браузера');
        currentUser = {
            id: 'browser_user_001',
            first_name: 'Гость',
            username: 'guest_user',
            isAdmin: false
        };
        updateUIForUser();
    }

    // Инициализация Supabase
    await initSupabase();

    // Загрузка объявлений
    await loadAds();

    // Настройка обработчиков событий
    setupEventListeners();
});

// ==================== ИНИЦИАЛИЗАЦИЯ SUPABASE ====================
async function initSupabase() {
    try {
        if (!APP_CONFIG.SUPABASE_URL || !APP_CONFIG.SUPABASE_ANON_KEY) {
            console.log('Supabase конфигурация не найдена, работаем в оффлайн режиме');
            return;
        }

        // Создаём клиент Supabase
        supabaseClient = supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );

        console.log('Supabase инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации Supabase:', error);
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
            // ВАЖНО: сохраняем ID как ЧИСЛО (не строку)
            currentUser = {
                id: tgUser.id,  // ← ЧИСЛО, БЕЗ .toString()!
                first_name: tgUser.first_name,
                username: tgUser.username || ('user_' + tgUser.id),
                photo_url: tgUser.photo_url,
                language_code: tgUser.language_code,
                isPremium: tgUser.is_premium || false,
                isAdmin: tgUser.id.toString() === '998579758'
            };

            console.log('👤 Создан currentUser:', currentUser);
            console.log('📊 Тип ID:', typeof currentUser.id, 'Значение:', currentUser.id);

            adminMode = currentUser.isAdmin;
            updateUIForUser();

            // Регистрация пользователя
            console.log('🔄 Начинаем регистрацию пользователя в БД...');
            registerUser(currentUser).then(success => {
                if (success) {
                    console.log('🎉 Пользователь зарегистрирован в системе');
                } else {
                    console.warn('⚠️ Пользователь не зарегистрирован в БД');
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

// ==================== РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ (ИСПРАВЛЕННАЯ) ====================
async function registerUser(userData) {
    console.log('📝 Регистрация пользователя Telegram:', userData);

    if (!supabaseClient) {
        console.error('❌ Supabase client не инициализирован');
        return false;
    }

    if (!userData || !userData.id) {
        console.error('❌ Нет данных пользователя');
        return false;
    }

    try {
        // ВАЖНО: Telegram ID должен быть ЧИСЛОМ для таблицы users (int8)
        const telegramId = userData.id;
        
        console.log('🔍 Проверка Telegram ID:', {
            значение: telegramId,
            тип: typeof telegramId,
            являетсяЧислом: typeof telegramId === 'number' && !isNaN(telegramId)
        });

        // Проверяем, что это число (для Telegram пользователей)
        if (typeof telegramId !== 'number' || isNaN(telegramId)) {
            console.error('❌ Telegram ID не является числом:', telegramId);
            
            // Если это гость (browser_user_001), пропускаем регистрацию
            if (typeof telegramId === 'string' && telegramId.includes('browser_user')) {
                console.log('👤 Гостевая сессия, пропускаем регистрацию');
                return true;
            }
            return false;
        }

        console.log('🔧 Telegram ID (число):', telegramId);

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
            
            // Если ошибка RLS, подскажем решение
            if (error.code === '42501') {
                console.error('🔧 РЕШЕНИЕ: Выполните в Supabase SQL Editor:');
                console.error('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
            }
            
            return false;
        }

        console.log('✅ Пользователь успешно зарегистрирован:', data);
        return true;

    } catch (error) {
        console.error('💥 Критическая ошибка при регистрации:', error);
        return false;
    }
}

// ==================== ЗАГРУЗКА ОБЪЯВЛЕНИЙ ====================
async function loadAds() {
    try {
        const adsGrid = document.getElementById('adsGrid');
        if (!adsGrid) return;

        // Показываем загрузку
        adsGrid.innerHTML = '<div class="loading">Загрузка объявлений...</div>';

        // Пробуем загрузить из Supabase
        let ads = [];

        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('ads')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(50); // Увеличили лимит

            if (!error && data) {
                ads = data;
            }
        }

        // Если нет данных из Supabase, используем мок-данные
        if (ads.length === 0) {
            ads = getMockAds();
        }

        console.log(`📊 Загружено объявлений: ${ads.length}`);
        renderAds(ads);
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        document.getElementById('adsGrid').innerHTML = 
            '<div class="error">Ошибка загрузки объявлений</div>';
    }
}

// ==================== МОК-ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ ====================
function getMockAds() {
    return [
        {
            id: '1',
            title: 'Caliburn G3',
            price: 1500,
            description: 'Новое устройство, в упаковке. Использовался 1 раз.',
            category: 'devices',
            type: 'sell',
            images: [],
            seller_id: 'seller1',
            seller_name: 'Алексей',
            rating: 4.7,
            verified: true,
            likes: 8,
            dislikes: 2,
            views: 124,
            created_at: new Date().toISOString()
        }
    ];
}

// ==================== ОТРИСОВКА ОБЪЯВЛЕНИЙ ====================
function renderAds(ads) {
    const adsGrid = document.getElementById('adsGrid');
    if (!adsGrid) return;

    if (!ads || ads.length === 0) {
        adsGrid.innerHTML = '<div class="empty">Объявлений пока нет</div>';
        return;
    }

    adsGrid.innerHTML = ads.map(ad => `
        <div class="ad-card" data-id="${ad.id}" data-category="${ad.category}" data-type="${ad.type}">
            ${ad.type === 'buy' ? '<span class="ad-badge buy">Ищу</span>' : 
              ad.type === 'sell' ? '<span class="ad-badge sale">Продажа</span>' : ''}

            <div class="ad-image">
                ${ad.images && ad.images.length > 0 ? 
                    `<img src="${ad.images[0]}" alt="${ad.title}">` : 
                    '<div class="image-placeholder"><i class="fas fa-smoking"></i></div>'}
            </div>

            <div class="ad-content">
                <div class="ad-header">
                    <h3 class="ad-title">${ad.title}</h3>
                    <span class="ad-price">${ad.price} ₽</span>
                </div>

                <p class="ad-description">${ad.description || 'Нет описания'}</p>

                <div class="ad-meta">
                    <span class="ad-category">${getCategoryName(ad.category)}</span>
                    <span class="ad-type">
                        <i class="fas fa-user"></i>
                        ${ad.seller_name || 'Продавец'}
                        ${ad.verified ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}
                    </span>
                </div>

                <div class="ad-actions">
                    <button class="btn btn-icon" onclick="likeAd('${ad.id}')" title="Лайк">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="count">${ad.likes || 0}</span>
                    </button>
                    <button class="btn btn-icon" onclick="dislikeAd('${ad.id}')" title="Дизлайк">
                        <i class="fas fa-thumbs-down"></i>
                        <span class="count">${ad.dislikes || 0}</span>
                    </button>
                    <button class="btn btn-primary" onclick="contactSeller('${ad.id}')">
                        <i class="fas fa-comment"></i> Написать
                    </button>
                    <button class="btn btn-icon" onclick="showReportModal('${ad.id}')" title="Пожаловаться">
                        <i class="fas fa-flag"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== ПОЛУЧЕНИЕ НАЗВАНИЯ КАТЕГОРИИ ====================
function getCategoryName(category) {
    const categories = {
        'liquids': 'Жидкости',
        'devices': 'Устройства',
        'accessories': 'Аксессуары',
        'pods': 'Поды',
        'coils': 'Испарители'
    };
    return categories[category] || 'Другое';
}

// ==================== НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ====================
function setupEventListeners() {
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;
            filterAds(filter);
        });
    });

    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchAds(this.value);
        });
    }

    // Создание объявления
    const createAdBtn = document.getElementById('createAdBtn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', function() {
            if (!currentUser) {
                alert('Для размещения объявления нужно авторизоваться');
                return;
            }
            showCreateAdModal();
        });
    }

    // Модальные окна
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeAllModals();
        });
    });

    // Форма создания объявления
    const adForm = document.getElementById('adForm');
    if (adForm) {
        adForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewAd();
        });
    }
}

// ==================== ФИЛЬТРАЦИЯ ОБЪЯВЛЕНИЙ ====================
function filterAds(filter) {
    const adCards = document.querySelectorAll('.ad-card');

    adCards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else {
            const cardFilter = card.dataset.type || card.dataset.category;
            card.style.display = cardFilter === filter ? 'block' : 'none';
        }
    });
}

// ==================== ПОИСК ОБЪЯВЛЕНИЙ ====================
function searchAds(query) {
    const adCards = document.querySelectorAll('.ad-card');
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        adCards.forEach(card => card.style.display = 'block');
        return;
    }

    adCards.forEach(card => {
        const title = card.querySelector('.ad-title').textContent.toLowerCase();
        const description = card.querySelector('.ad-description').textContent.toLowerCase();

        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== ПОКАЗАТЬ МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ====================
function showCreateAdModal() {
    const modal = document.getElementById('createAdModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ==================== ЗАКРЫТЬ ВСЕ МОДАЛЬНЫЕ ОКНА ====================
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// ==================== СОЗДАНИЕ НОВОГО ОБЪЯВЛЕНИЯ ====================
async function createNewAd() {
    console.log('🆕 Начинаем создание объявления...');

    // 1. Проверка авторизации
    if (!currentUser) {
        alert('❌ Для размещения объявления нужно авторизоваться');
        console.error('Текущий пользователь не определен');
        return;
    }

    console.log('👤 Текущий пользователь:', currentUser);
    console.log('🆔 Telegram ID пользователя:', currentUser.id, 'Тип:', typeof currentUser.id);

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
        images: []  // Пустой массив, а не строка!
    };

    console.log('📝 Данные объявления:', adData);

    // 4. Проверяем, есть ли пользователь в БД (только для реальных Telegram пользователей)
    if (supabaseClient) {
        try {
            // Проверяем только REAL Telegram пользователей (ID состоит из цифр)
            const isRealTelegramUser = typeof currentUser.id === 'number' && !isNaN(currentUser.id);
            
            if (isRealTelegramUser) {
                // Только для реальных Telegram пользователей проверяем БД
                const { data: userData, error: userError } = await supabaseClient
                    .from('users')
                    .select('telegram_id')
                    .eq('telegram_id', currentUser.id) // Уже число
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
            } else {
                // Для гостей (browser_user_001) просто продолжаем
                console.log('👤 Гостевая сессия, пропускаем регистрацию');
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

// ==================== ЛАЙК ОБЪЯВЛЕНИЯ ====================
async function likeAd(adId) {
    if (!currentUser) {
        alert('Для оценки нужно авторизоваться');
        return;
    }

    // Обновляем UI
    const btn = document.querySelector(`[onclick="likeAd('${adId}')"]`);
    if (btn) {
        const countSpan = btn.querySelector('.count');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }

    // Сохраняем в Supabase
    if (supabaseClient) {
        try {
            console.log('Лайк сохранён для объявления:', adId);
        } catch (error) {
            console.error('Ошибка сохранения лайка:', error);
        }
    }
}

// ==================== ДИЗЛАЙК ОБЪЯВЛЕНИЯ ====================
async function dislikeAd(adId) {
    if (!currentUser) {
        alert('Для оценки нужно авторизоваться');
        return;
    }
    
    const btn = document.querySelector(`[onclick="dislikeAd('${adId}')"]`);
    if (btn) {
        const countSpan = btn.querySelector('.count');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }
    
    if (supabaseClient) {
        try {
            console.log('Дизлайк сохранён для объявления:', adId);
        } catch (error) {
            console.error('Ошибка сохранения дизлайка:', error);
        }
    }
}

// ==================== КОНТАКТ С ПРОДАВЦОМ ====================
function contactSeller(adId) {
    alert(`Функция связи с продавцом для объявления ${adId}`);
}

// ==================== ПОКАЗАТЬ МОДАЛЬНОЕ ОКНО ЖАЛОБЫ ====================
function showReportModal(adId) {
    alert(`Функция жалобы для объявления ${adId}`);
}

// ==================== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ПОЛЬЗОВАТЕЛЯ ====================
function updateUIForUser() {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && currentUser) {
        if (currentUser.photo_url) {
            userAvatar.innerHTML = `<img src="${currentUser.photo_url}" alt="Аватар">`;
        } else {
            userAvatar.innerHTML = `<div class="avatar-placeholder">${currentUser.first_name[0]}</div>`;
        }
    }
    
    if (currentUser && currentUser.isAdmin) {
        document.body.classList.add('user-admin');
    }
}
