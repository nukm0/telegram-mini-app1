// UI компоненты приложения

class UIComponents {
    constructor() {
        this.dbManager = dbManager;
        this.authManager = authManager;
    }

    // Инициализация компонентов
    init() {
        this.initCategories();
        this.initEventListeners();
        this.loadAdvertisements();
        this.loadUserVotes();
    }

    // Инициализация категорий
    initCategories() {
        const categoriesContainer = document.getElementById('categories');
        const categories = this.dbManager.getCategories();

        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.innerHTML = `
                <i class="${category.icon}"></i>
                <span>${category.name}</span>
            `;
            button.dataset.category = category.id;

            if (category.id === 'all') {
                button.classList.add('active');
            }

            button.addEventListener('click', () => this.filterByCategory(category.id));
            categoriesContainer.appendChild(button);
        });
    }

    // Фильтрация по категории
    async filterByCategory(categoryId) {
        // Обновляем активную кнопку
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === categoryId) {
                btn.classList.add('active');
            }
        });

        selectedCategory = categoryId;
        await this.loadAdvertisements();
    }

    // Загрузка объявлений
    async loadAdvertisements() {
        this.showLoader();
        
        try {
            const ads = await this.dbManager.loadAdvertisements(selectedCategory);
            this.renderAdvertisements(ads);
        } catch (error) {
            console.error('Error loading ads:', error);
        } finally {
            this.hideLoader();
        }
    }

    // Отрисовка объявлений
    renderAdvertisements(ads) {
        const adsList = document.getElementById('adsList');
        adsList.innerHTML = '';

        if (ads.length === 0) {
            adsList.innerHTML = `
                <div class="no-ads">
                    <i class="fas fa-inbox"></i>
                    <h3>Объявления не найдены</h3>
                    <p>Будьте первым, кто добавит объявление!</p>
                </div>
            `;
            return;
        }

        ads.forEach(ad => {
            const adElement = this.createAdElement(ad);
            adsList.appendChild(adElement);
        });
    }

    // Создание элемента объявления
    createAdElement(ad) {
        const adElement = document.createElement('div');
        adElement.className = 'advertisement-card';
        adElement.dataset.adId = ad.id;

        // Форматируем цену
        const formattedPrice = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(ad.price);

        // Получаем название категории
        const category = this.dbManager.categories.find(c => c.id === ad.category);
        const categoryName = category ? category.name : ad.category;

        // Определяем активные кнопки голосования
        const userVote = userVotes[ad.id];
        const likeActive = userVote === 'like' ? 'active' : '';
        const dislikeActive = userVote === 'dislike' ? 'active' : '';

        adElement.innerHTML = `
            <!-- Заголовок продавца -->
            <div class="seller-header">
                <div class="seller-avatar">
                    ${ad.seller?.avatar ? 
                        `<img src="${ad.seller.avatar}" alt="${ad.seller.firstName}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="seller-info">
                    <div class="seller-name">${ad.seller?.firstName || 'Продавец'}</div>
                    <div class="seller-username">@${ad.seller?.username || 'user'}</div>
                    <div class="seller-stats">
                        <div class="seller-stat stat-rating">
                            <i class="fas fa-star"></i>
                            <span>${ad.seller?.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Галерея фотографий -->
            <div class="photo-gallery">
                ${ad.photos.length > 0 ? 
                    ad.photos.map((photo, index) => `
                        <div class="photo-item" data-photo-index="${index}">
                            <img src="${photo}" alt="Фото товара ${index + 1}">
                            <span class="photo-label">${index + 1}/${ad.photos.length}</span>
                        </div>
                    `).join('') : 
                    `<div class="photo-item">
                        <div class="photo-placeholder">
                            <i class="fas fa-camera"></i>
                            <span>Нет фото</span>
                        </div>
                    </div>`
                }
            </div>

            <!-- Информация о товаре -->
            <div class="product-info">
                <h3 class="product-title">${ad.title}</h3>
                <span class="product-category">${categoryName}</span>
                <div class="product-price">${formattedPrice}</div>
                <p class="product-description">${ad.description || 'Нет описания'}</p>
            </div>

            <!-- Кнопки действий -->
            <div class="action-grid">
                <button class="rate-btn like-btn ${likeActive}" data-action="like">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                
                <div class="vote-stats">
                    <div class="stat-likes">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${ad.likes || 0}</span>
                    </div>
                    <div class="stat-dislikes">
                        <i class="fas fa-thumbs-down"></i>
                        <span>${ad.dislikes || 0}</span>
                    </div>
                </div>
                
                <button class="rate-btn dislike-btn ${dislikeActive}" data-action="dislike">
                    <i class="fas fa-thumbs-down"></i>
                </button>
            </div>
        `;

        // Добавляем обработчики событий
        this.addAdEventListeners(adElement, ad);
        return adElement;
    }

    // Добавление обработчиков событий для объявления
    addAdEventListeners(adElement, ad) {
        // Обработчики для фотографий
        const photoItems = adElement.querySelectorAll('.photo-item');
        photoItems.forEach(item => {
            item.addEventListener('click', () => {
                const photoIndex = item.dataset.photoIndex;
                if (ad.photos[photoIndex]) {
                    this.showPhotoOverlay(ad.photos[photoIndex]);
                }
            });
        });

        // Обработчики для кнопок голосования
        const likeBtn = adElement.querySelector('.like-btn');
        const dislikeBtn = adElement.querySelector('.dislike-btn');

        likeBtn.addEventListener('click', async () => {
            await this.handleVote(ad.id, 'like', adElement);
        });

        dislikeBtn.addEventListener('click', async () => {
            await this.handleVote(ad.id, 'dislike', adElement);
        });

        // Увеличиваем счетчик просмотров при клике
        adElement.addEventListener('click', (e) => {
            if (!e.target.closest('.rate-btn') && !e.target.closest('.photo-item')) {
                this.dbManager.incrementViews(ad.id);
            }
        });
    }

    // Обработка голосования
    async handleVote(adId, voteType, adElement) {
        if (!this.authManager.isAuthenticated()) {
            showNotification('Для голосования нужно авторизоваться', 'error');
            return;
        }

        const success = await this.dbManager.voteForAd(adId, voteType);
        
        if (success) {
            // Обновляем состояние кнопок
            userVotes[adId] = userVotes[adId] === voteType ? null : voteType;
            
            // Обновляем UI
            this.updateVoteUI(adElement, adId, voteType);
            
            // Перезагружаем объявление для обновления счетчиков
            setTimeout(() => this.loadAdvertisements(), 500);
        }
    }

    // Обновление UI голосования
    updateVoteUI(adElement, adId, voteType) {
        const likeBtn = adElement.querySelector('.like-btn');
        const dislikeBtn = adElement.querySelector('.dislike-btn');
        const currentVote = userVotes[adId];

        // Сбрасываем все активные состояния
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');

        // Устанавливаем новое активное состояние
        if (currentVote === 'like') {
            likeBtn.classList.add('active');
        } else if (currentVote === 'dislike') {
            dislikeBtn.classList.add('active');
        }
    }

    // Показ оверлея с фото
    showPhotoOverlay(photoUrl) {
        const overlay = document.getElementById('photoOverlay');
        const overlayImage = document.getElementById('overlayImage');
        
        overlayImage.src = photoUrl;
        overlay.classList.add('active');
    }

    // Загрузка голосов пользователя
    async loadUserVotes() {
        const userId = this.authManager.getUserId();
        if (userId) {
            userVotes = await this.dbManager.loadUserVotes(userId);
        }
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Кнопка показа/скрытия формы
        const toggleFormBtn = document.getElementById('toggleFormBtn');
        const addForm = document.getElementById('addForm');
        
        toggleFormBtn.addEventListener('click', () => {
            if (!this.authManager.isAuthenticated()) {
                showNotification('Для добавления объявления нужно авторизоваться', 'error');
                return;
            }
            
            addForm.classList.toggle('active');
            toggleFormBtn.innerHTML = addForm.classList.contains('active') ? 
                `<i class="fas fa-times"></i><span>Отмена</span>` : 
                `<i class="fas fa-plus"></i><span>Добавить</span>`;
        });

        // Кнопка отправки формы
        const submitBtn = document.getElementById('submitAdBtn');
        submitBtn.addEventListener('click', () => this.handleSubmitAd());

        // Оверлей для фото
        const closeOverlayBtn = document.getElementById('closeOverlay');
        const photoOverlay = document.getElementById('photoOverlay');
        
        closeOverlayBtn.addEventListener('click', () => {
            photoOverlay.classList.remove('active');
        });

        photoOverlay.addEventListener('click', (e) => {
            if (e.target === photoOverlay) {
                photoOverlay.classList.remove('active');
            }
        });
    }

    // Обработка отправки формы
    async handleSubmitAd() {
        // Собираем данные формы
        const adData = {
            title: document.getElementById('adTitle').value.trim(),
            category: document.getElementById('adCategory').value,
            price: document.getElementById('adPrice').value,
            description: document.getElementById('adDescription').value.trim(),
            photos: [] // Здесь будет логика загрузки фото
        };

        // Валидация
        if (!adData.title || !adData.category || !adData.price) {
            showNotification('Заполните обязательные поля', 'error');
            return;
        }

        this.showLoader();

        try {
            const result = await this.dbManager.addAdvertisement(adData);
            
            if (result) {
                // Сбрасываем форму
                this.resetForm();
                
                // Обновляем список объявлений
                await this.loadAdvertisements();
                
                // Скрываем форму
                document.getElementById('addForm').classList.remove('active');
                document.getElementById('toggleFormBtn').innerHTML = 
                    `<i class="fas fa-plus"></i><span>Добавить</span>`;
            }
        } catch (error) {
            console.error('Error submitting ad:', error);
        } finally {
            this.hideLoader();
        }
    }

    // Сброс формы
    resetForm() {
        document.getElementById('adTitle').value = '';
        document.getElementById('adCategory').value = '';
        document.getElementById('adPrice').value = '';
        document.getElementById('adDescription').value = '';
        document.getElementById('adPhoto').value = '';
    }

    // Показать загрузчик
    showLoader() {
        document.getElementById('loader').classList.add('active');
    }

    // Скрыть загрузчик
    hideLoader() {
        document.getElementById('loader').classList.remove('active');
    }
}

// Создаем глобальный экземпляр UI компонентов
const uiComponents = new UIComponents();
window.uiComponents = uiComponents;
