// Функции работы с базой данных Supabase

class DatabaseManager {
    constructor() {
        this.supabase = supabase;
        this.categories = [
            { id: 'all', name: 'Все', icon: 'fas fa-th' },
            { id: 'pod', name: 'POD системы', icon: 'fas fa-mobile-alt' },
            { id: 'mod', name: 'Моды', icon: 'fas fa-microchip' },
            { id: 'liquid', name: 'Жидкости', icon: 'fas fa-tint' },
            { id: 'atomizer', name: 'Атомайзеры', icon: 'fas fa-fire' },
            { id: 'accessories', name: 'Аксессуары', icon: 'fas fa-tools' }
        ];
    }

    // Загрузка объявлений
    async loadAdvertisements(category = 'all', limit = 20, offset = 0) {
        try {
            let query = this.supabase
                .from('advertisements')
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        first_name,
                        last_name,
                        avatar_url,
                        rating
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Фильтрация по категории
            if (category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Форматируем данные
            const formattedAds = data.map(ad => ({
                id: ad.id,
                title: ad.title,
                description: ad.description,
                price: ad.price,
                category: ad.category,
                photos: ad.photos || [],
                likes: ad.likes || 0,
                dislikes: ad.dislikes || 0,
                views: ad.views || 0,
                created_at: ad.created_at,
                user_id: ad.user_id,
                seller: ad.profiles ? {
                    id: ad.user_id,
                    username: ad.profiles.username,
                    firstName: ad.profiles.first_name,
                    lastName: ad.profiles.last_name,
                    avatar: ad.profiles.avatar_url,
                    rating: ad.profiles.rating
                } : null
            }));

            return formattedAds;

        } catch (error) {
            console.error('Error loading advertisements:', error);
            showNotification('Ошибка загрузки объявлений', 'error');
            return [];
        }
    }

    // Добавление нового объявления
    async addAdvertisement(adData) {
        try {
            const userId = authManager.getUserId();
            if (!userId) {
                showNotification('Для добавления объявления нужно авторизоваться', 'error');
                return null;
            }

            const adToInsert = {
                user_id: userId,
                title: adData.title,
                description: adData.description,
                price: parseFloat(adData.price),
                category: adData.category,
                photos: adData.photos || [],
                likes: 0,
                dislikes: 0,
                views: 0,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('advertisements')
                .insert([adToInsert])
                .select()
                .single();

            if (error) throw error;

            // Обновляем статистику пользователя
            await this.updateUserAdCount(userId);

            showNotification('Объявление успешно добавлено!', 'success');
            return data;

        } catch (error) {
            console.error('Error adding advertisement:', error);
            showNotification('Ошибка при добавлении объявления', 'error');
            return null;
        }
    }

    // Обновление статистики пользователя
    async updateUserAdCount(userId) {
        try {
            // Получаем текущее количество объявлений
            const { count, error: countError } = await this.supabase
                .from('advertisements')
                .select('*', { count: 'exact', head: true })
                .
