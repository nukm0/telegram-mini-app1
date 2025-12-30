// Функции авторизации и управления пользователями

// Инициализация Supabase
const supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Проверяем сессию при загрузке
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            this.currentUser = session.user;
            await this.loadOrCreateUserProfile();
            this.updateUI();
        } else {
            // Пробуем авторизоваться через Telegram
            await this.authWithTelegram();
        }
    }

    async authWithTelegram() {
        try {
            const tg = window.Telegram.WebApp;
            const initData = tg.initData;
            
            if (!initData) {
                console.log('No Telegram init data');
                this.showLoginForm();
                return;
            }

            // Авторизация через Telegram
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'telegram',
                token: initData
            });

            if (error) throw error;

            this.currentUser = data.user;
            await this.loadOrCreateUserProfile();
            this.updateUI();
            
        } catch (error) {
            console.error('Telegram auth error:', error);
            this.showLoginForm();
        }
    }

    async loadOrCreateUserProfile() {
        if (!this.currentUser) return;

        // Проверяем, есть ли профиль пользователя
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Профиля нет, создаем новый
            await this.createUserProfile();
        } else if (profile) {
            // Обновляем данные профиля
            this.userProfile = profile;
        }
    }

    async createUserProfile() {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        const profileData = {
            id: this.currentUser.id,
            username: user?.username || `user_${this.currentUser.id.slice(0, 8)}`,
            first_name: user?.first_name || 'Пользователь',
            last_name: user?.last_name || '',
            avatar_url: user?.photo_url || '',
            rating: 5.0,
            total_ads: 0,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('profiles')
            .insert([profileData]);

        if (error) {
            console.error('Error creating profile:', error);
            this.showNotification('Ошибка создания профиля', 'error');
        } else {
            this.userProfile = profileData;
        }
    }

    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error getting user profile:', error);
            return null;
        }

        return data;
    }

    async updateUserStats(userId, stats) {
        const { error } = await supabase
            .from('profiles')
            .update(stats)
            .eq('id', userId);

        if (error) {
            console.error('Error updating user stats:', error);
        }
    }

    showLoginForm() {
        // Показываем форму логина для не-Telegram пользователей
        const loginHTML = `
            <div class="login-form">
                <h3>Вход в систему</h3>
                <input type="email" id="loginEmail" placeholder="Email">
                <input type="password" id="loginPassword" placeholder="Пароль">
                <button id="loginBtn">Войти</button>
                <button id="registerBtn">Регистрация</button>
            </div>
        `;
        
        // Здесь можно добавить логику показа формы
    }

    updateUI() {
        if (this.currentUser && this.userProfile) {
            document.getElementById('userName').textContent = this.userProfile.first_name;
            document.getElementById('userStatus').style.display = 'flex';
        }
    }

    async logout() {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.userProfile = null;
        window.location.reload();
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id;
    }

    getUserProfileData() {
        return this.userProfile;
    }
}

// Создаем глобальный экземпляр менеджера авторизации
const authManager = new AuthManager();

// Вспомогательная функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Экспортируем для использования в других файлах
window.authManager = authManager;
