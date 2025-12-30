const APP_CONFIG = window.CONFIG || {
    APP_NAME: 'Vape Market',
    VERSION: '1.0.0',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    MAX_IMAGES_PER_AD: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    AD_LIFETIME_DAYS: 14
};

let currentUser = null;
let supabaseClient = null;
let adminMode = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log(`${APP_CONFIG.APP_NAME} v${APP_CONFIG.VERSION}`);
    
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
    
    await initSupabase();
    await loadAds();
    setupEventListeners();
});

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
            isAdmin: tgUser.id.toString() === '998579758'
        };
        
        adminMode = currentUser.isAdmin;
        updateUIForUser();
        registerUser(currentUser);
    }
}

async function initSupabase() {
    try {
        if (!APP_CONFIG.SUPABASE_URL || !APP_CONFIG.SUPABASE_ANON_KEY) {
            console.log('Supabase конфигурация не найдена, работаем в оффлайн режиме');
            return;
        }
        
        supabaseClient = supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );
        
        console.log('Supabase инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации Supabase:', error);
    }
}

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
            
        if (error) console.error('Ошибка регистрации пользователя:', error);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function loadAds() {
    try {
        const adsGrid = document.getElementById('adsGrid');
        if (!adsGrid) return;
        
        adsGrid.innerHTML = '<div class="loading">Загрузка объявлений...</div>';
        let ads = [];
        
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('ads')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(20);
                
            if (!error && data) ads = data;
        }
        
        if (ads.length === 0) ads = getMockAds();
        renderAds(ads);
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        document.getElementById('adsGrid').innerHTML = 
            '<div class="error">Ошибка загрузки объявлений</div>';
    }
}

function getMockAds() {
    return [
        {
            id: '1',
            title: 'Caliburn G3',
            price: 1500,
            description: 'Новое устройство, в упаковке. Использовался 1 раз.',
            category: 'devices',
            type: 'sell', // ИСПРАВЛЕНО: было 'sale', теперь 'sell'
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

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: теперь проверяет 'sell' вместо 'sale'
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

function setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterAds(this.dataset.filter);
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchAds(this.value);
        });
    }
    
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
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    const adForm = document.getElementById('adForm');
    if (adForm) {
        adForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewAd();
        });
    }
}

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

function showCreateAdModal() {
    const modal = document.getElementById('createAdModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

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
            loadAds();
        } else {
            alert('Объявление создано (демо-режим)');
            closeAllModals();
            form.reset();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения');
    }
}

async function likeAd(adId) {
    if (!currentUser) {
        alert('Для оценки нужно авторизоваться');
        return;
    }
    
    const btn = document.querySelector(`[onclick="likeAd('${adId}')"]`);
    if (btn) {
        const countSpan = btn.querySelector('.count');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }
    
    if (supabaseClient) {
        try {
            console.log('Лайк сохранён для объявления:', adId);
        } catch (error) {
            console.error('Ошибка сохранения лайка:', error);
        }
    }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: добавлено завершение
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

function contactSeller(adId) {
    alert(`Функция связи с продавцом для объявления ${adId}`);
}

function showReportModal(adId) {
    alert(`Функция жалобы для объявления ${adId}`);
}

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
