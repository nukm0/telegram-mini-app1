// Конфигурация приложения
const APP_CONFIG = {
    API_URL: 'https://telegram-market-vape.vercel.app/api',
    VAPEMARKET_VERSION: '1.0.0',
    MAX_IMAGES: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    AD_LIFETIME_DAYS: 14
};

// Текущий пользователь
let currentUser = null;
let adminMode = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Vape Market v' + APP_CONFIG.VAPEMARKET_VERSION);
    
    // Проверка Telegram WebApp
    if (window.Telegram && Telegram.WebApp) {
        initTelegramWebApp();
    } else {
        console.log('Telegram WebApp не обнаружен, режим браузера');
        // В режиме браузера используем мок-данные
        currentUser = {
            id: 'browser_user_001',
            first_name: 'Гость',
            username: 'guest_user',
            isAdmin: false
        };
        updateUIForUser();
    }
    
    // Инициализация Firebase
    await initSupabase();
    
    // Загрузка объявлений
    await loadAds();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Проверка авторизации
    checkAuth();
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
            isAdmin: tgUser.id === 998579758 // твой ID
        };
        
        adminMode = currentUser.isAdmin;
        updateUIForUser();
        
        // Регистрация/авторизация пользователя
        registerUser(currentUser);
    }
}

// Инициализация Supabase
async function initSupabase() {
    try {
        if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
            console.error('Supabase конфигурация не найдена в CONFIG');
            return;
        }
        
        // Создаём клиент Supabase
        window.supabaseClient = supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_ANON_KEY
        );
        
        console.log('Supabase инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации Supabase:', error);
    }
}

// Регистрация пользователя в системе
async function registerUser(userData) {
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Пользователь зарегистрирован:', data);
        }
    } catch (error) {
        console.error('Ошибка регистрации пользователя:', error);
    }
}

// Загрузка объявлений
async function loadAds() {
    try {
        const adsGrid = document.getElementById('adsGrid');
        if (!adsGrid) return;
        
        // Показываем загрузку
        adsGrid.innerHTML = '<div class="loading">Загрузка объявлений...</div>';
        
        // Здесь будет запрос к API
        // const response = await fetch(`${APP_CONFIG.API_URL}/ads`);
        // const ads = await response.json();
        
        // Временные мок-данные
        const mockAds = [
            {
                id: '1',
                title: 'Caliburn G3',
                price: 1500,
                description: 'Новое устройство, в упаковке. Использовался 1 раз.',
                category: 'devices',
                type: 'sale',
                images: [],
                seller: {
                    id: 'seller1',
                    name: 'Алексей',
                    rating: 4.7,
                    verified: true
                },
                createdAt: new Date(),
                likes: 8,
                dislikes: 2,
                views: 124
            },
            {
                id: '2',
                title: 'Жидкости Vampire Vape',
                price: 800,
                description: 'Набор из 3 жидкостей, 60ml каждая. Вкусы: Heisenberg, Pinkman, Energy',
                category: 'liquids',
                type: 'sale',
                images: [],
                seller: {
                    id: 'seller2',
                    name: 'Мария',
                    rating: 4.9,
                    verified: true
                },
                createdAt: new Date(Date.now() - 86400000), // 1 день назад
                likes: 15,
                dislikes: 1,
                views: 89
            },
            {
                id: '3',
                title: 'Нужны испарители для Vaporesso',
                price: 500,
                description: 'Ищу оригинальные испарители для Vaporesso GTX',
                category: 'accessories',
                type: 'buy',
                images: [],
                seller: {
                    id: 'buyer1',
                    name: 'Дмитрий',
                    rating: 4.5,
                    verified: false
                },
                createdAt: new Date(Date.now() - 172800000), // 2 дня назад
                likes: 3,
                dislikes: 0,
                views: 45
            }
        ];
        
        renderAds(mockAds);
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        document.getElementById('adsGrid').innerHTML = 
            '<div class="error">Ошибка загрузки объявлений</div>';
    }
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
                
                <p class="ad-description">${ad.description}</p>
                
                <div class="ad-meta">
                    <span class="ad-category">${getCategoryName(ad.category)}</span>
                    <span class="ad-type">
                        <i class="fas fa-user"></i>
                        ${ad.seller.name}
                        ${ad.seller.verified ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}
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
    
    // Форма жалобы
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitReport();
        });
    }
    
    // Загрузка файлов
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = 'rgba(127, 65, 239, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--border)';
            uploadArea.style.background = 'transparent';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border)';
            uploadArea.style.background = 'transparent';
            
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files);
            }
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

// Показать модальное окно жалобы
function showReportModal(adId) {
    const modal = document.getElementById('reportModal');
    modal.dataset.adId = adId;
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

// Обработка выбора файлов
function handleFileSelect(files) {
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;
    
    Array.from(files).slice(0, APP_CONFIG.MAX_IMAGES).forEach(file => {
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            alert(`Файл ${file.name} превышает максимальный размер 5MB`);
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            alert(`Файл ${file.name} не является изображением`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-file" onclick="removePreview(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// Удаление превью
function removePreview(button) {
    button.closest('.preview-item').remove();
}

// Создание нового объявления
async function createNewAd() {
    const form = document.getElementById('adForm');
    const formData = new FormData(form);
    
    const adData = {
        title: formData.get('title'),
        type: formData.get('type'),
        category: formData.get('category'),
        price: parseInt(formData.get('price')),
        description: formData.get('description'),
        sellerId: currentUser.id,
        sellerName: currentUser.first_name,
        sellerUsername: currentUser.username
    };
    
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/ads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adData)
        });
        
        if (response.ok) {
            alert('Объявление успешно создано!');
            closeAllModals();
            form.reset();
            document.getElementById('previewContainer').innerHTML = '';
            loadAds(); // Перезагружаем список
        } else {
            alert('Ошибка при создании объявления');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения');
    }
}

// Отправка жалобы
async function submitReport() {
    const form = document.getElementById('reportForm');
    const formData = new FormData(form);
    const adId = document.getElementById('reportModal').dataset.adId;
    
    const reportData = {
        adId: adId,
        reason: formData.get('reason'),
        comment: formData.get('comment'),
        reporterId: currentUser.id,
        reporterName: currentUser.first_name
    };
    
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
            alert('Жалоба отправлена модераторам');
            closeAllModals();
            form.reset();
        } else {
            alert('Ошибка при отправке жалобы');
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
    
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/ads/${adId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        if (response.ok) {
            // Обновляем счетчик на UI
            const btn = document.querySelector(`[onclick="likeAd('${adId}')"]`);
            const countSpan = btn.querySelector('.count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
        }
    } catch (error) {
        console.error('Ошибка лайка:', error);
    }
}

// Дизлайк объявления
async function dislikeAd(adId) {
    if (!currentUser) {
        alert('Для оценки нужно авторизоваться');
        return;
    }
    
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/ads/${adId}/dislike`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        if (response.ok) {
            // Обновляем счетчик на UI
            const btn = document.querySelector(`[onclick="dislikeAd('${adId}')"]`);
            const countSpan = btn.querySelector('.count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
        }
    } catch (error) {
        console.error('Ошибка дизлайка:', error);
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

// Проверка авторизации
function checkAuth() {
    const authCheckInterval = setInterval(() => {
        if (!currentUser) {
            // Показать приглашение к авторизации
            console.log('Ожидание авторизации...');
        } else {
            clearInterval(authCheckInterval);
        }
    }, 1000);
}

// Инициализация Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker зарегистрирован:', registration);
            })
            .catch(error => {
                console.log('Ошибка регистрации Service Worker:', error);
            });
    });
}
