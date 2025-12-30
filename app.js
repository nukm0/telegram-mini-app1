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

// Инициализация при загрузке страницы
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

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    
    const tgUser = Telegram.WebApp.initDataUnsafe?.user;
    if (tgUser) {
        currentUser = {
            id: tgUser.id.toString(),
            first_name: tgUser.first_name,
            username: tgUser.username || 'user_' + tgUser.id,
            photo_url: tgUser.photo_url,
            language_code: tgUser.language_code,
            isPremium: tgUser.is_premium || false,
            isAdmin: tgUser.id.toString() === '998579758' // твой ID
        };
        
        adminMode = currentUser.isAdmin;
        updateUIForUser();
        
        // Регистрация пользователя в Supabase
        registerUser(currentUser);
    }
}

// Инициализация Supabase
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

// Регистрация пользователя в системе
async function registerUser(userData) {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .upsert({
                telegram_id: userData.id,
                username: userData.username,
                first_name: userData.first_name,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'telegram_id'
            });
        
        if (error) {
            console.error('Ошибка регистрации пользователя:', error);
        } else {
            console.log('Пользователь зарегистрирован:', data);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Загрузка объявлений
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
                .limit(20);
            
            if (!error && data) {
                ads = data;
            }
        }
        
        // Если нет данных из Supabase, используем мок-данные
        if (ads.length === 0) {
            ads = getMockAds();
        }
        
        renderAds(ads);
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        document.getElementById('adsGrid').innerHTML = 
            '<div class="error">Ошибка загрузки объявлений</div>';
    }
}

// Мок-данные для тестирования
function getMockAds() {
    return [
        {
            id: '1',
            title: 'Caliburn G3',
            price: 1500,
            description: 'Новое устройство, в упаковке. Использовался 1 раз.',
            category: 'devices',
            type: 'sale',
            images: [],
            seller_id: 'seller1',
            seller_name: 'Алексей',
            rating: 4.7,
            verified: true,
            likes: 8,
            dislikes: 2,
            views: 124,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Жидкости Vampire Vape',
            price: 800,
            description: 'Набор из 3 жидкостей, 60ml каждая. Вкусы: Heisenberg, Pinkman, Energy',
            category: 'liquids',
            type: 'sale',
            images: [],
            seller_id: 'seller2',
            seller_name: 'Мария',
            rating: 4.9,
            verified: true,
            likes: 15,
            dislikes: 1,
            views: 89,
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: '3',
            title: 'Нужны испарители для Vaporesso',
            price: 500,
            description: 'Ищу оригинальные испарители для Vaporesso GTX',
            category: 'accessories',
            type: 'buy',
            images: [],
            seller_id: 'buyer1',
            seller_name: 'Дмитрий',
            rating: 4.5,
            verified: false,
            likes: 3,
            dislikes: 0,
            views: 45,
            created_at: new Date(Date.now() - 172800000).toISOString()
        }
    ];
}

// Отрисовка объявлений
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
              ad.type === 'sale' ? '<span class="ad-badge sale">Продажа</span>' : ''}
            
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

// Получение названия категории
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

// Настройка обработчиков событий
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

// Фильтрация объявлений
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

// Поиск объявлений
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

// Показать модальное окно создания объявления
function showCreateAdModal() {
    const modal = document.getElementById('createAdModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть все модальные окна
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Создание нового объявления
async function createNewAd() {
    const form = document.getElementById('adForm');
    const formData = new FormData(form);
    
    const adData = {
        title: formData.get('title'),
        type: formData.get('type'),
        category: formData.get('category'),
        price: parseInt(formData.get('price')) || 0,
        description: formData.get('description'),
        seller_id: currentUser.id,
        seller_name: currentUser.first_name,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + APP_CONFIG.AD_LIFETIME_DAYS * 86400000).toISOString()
    };
    
    try {
        // Сохраняем в Supabase если есть соединение
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('ads')
                .insert([adData]);
            
            if (error) {
                console.error('Ошибка сохранения в Supabase:', error);
                alert('Ошибка при создании объявления');
                return;
            }
            
            alert('Объявление успешно создано!');
            closeAllModals();
            form.reset();
            loadAds(); // Перезагружаем список
        } else {
            // Локальное сохранение (для демо)
            alert('Объявление создано (демо-режим)');
            closeAllModals();
            form.reset();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения');
    }
}

// Лайк объявления
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
            // Здесь можно добавить логику сохранения лайков
            console.log('Лайк сохранён для объявления:', adId);
        } catch (error) {
            console.error('Ошибка сохранения лайка:', error);
        }
    }
}

// Дизлайк объявления
async function dislikeAd(adId) {
    if (!currentUser) {
        alert('Для оценки нужно авторизоваться');
        return;
    }
    
    // Обновляем UI
    const btn = document.querySelector(`[onclick="dislikeAd('${adId}')"]`);
    if (btn) {
        const countSpan = btn.querySelector('.count');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }
}

// Связь с продавцом
function contactSeller(adId) {
    if (!currentUser) {
        alert('Для связи нужно авторизоваться');
        return;
    }
    
    // В Telegram WebApp открываем чат
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink(`https://t.me/${currentUser.username}`);
    } else {
        alert('Функция связи доступна только в Telegram');
    }
}

// Обновление UI для пользователя
function updateUIForUser() {
    if (!currentUser) return;
    
    // Аватар пользователя
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        const placeholder = userAvatar.querySelector('.avatar-placeholder');
        if (placeholder) {
            placeholder.textContent = currentUser.first_name.charAt(0);
        }
    }
    
    // Админ-элементы
    if (currentUser.isAdmin) {
        document.body.classList.add('user-admin');
        const adminBanner = document.getElementById('adminBanner');
        if (adminBanner) {
            adminBanner.style.display = 'flex';
        }
    }
}

// Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker зарегистрирован:', registration);
            })
            .catch(error => {
                console.log('Service Worker не требуется:', error);
            });
    });
}

// Глобальные функции для onclick
window.likeAd = likeAd;
window.dislikeAd = dislikeAd;
window.contactSeller = contactSeller;
window.showReportModal = function(adId) {
    alert('Жалоба отправлена (демо-режим)');
};
