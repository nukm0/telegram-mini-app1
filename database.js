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
                .eq('user_id', userId)
                .eq('status', 'active');

            if (countError) throw countError;

            // Обновляем профиль пользователя
            await authManager.updateUserStats(userId, {
                total_ads: count,
                updated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error updating user ad count:', error);
        }
    }

    // Голосование за объявление
    async voteForAd(adId, voteType) {
        try {
            const userId = authManager.getUserId();
            if (!userId) {
                showNotification('Для голосования нужно авторизоваться', 'error');
                return false;
            }

            // Проверяем, голосовал ли уже пользователь
            const { data: existingVote, error: voteError } = await this.supabase
                .from('votes')
                .select('*')
                .eq('ad_id', adId)
                .eq('user_id', userId)
                .single();

            let result;

            if (voteError && voteError.code === 'PGRST116') {
                // Пользователь еще не голосовал
                result = await this.createVote(adId, userId, voteType);
            } else if (existingVote) {
                // Пользователь уже голосовал
                result = await this.updateVote(existingVote, voteType);
            }

            if (result) {
                showNotification('Спасибо за ваш голос!', 'success');
                return true;
            }

            return false;

        } catch (error) {
            console.error('Error voting for ad:', error);
            showNotification('Ошибка при голосовании', 'error');
            return false;
        }
    }

    async createVote(adId, userId, voteType) {
        // Создаем запись о голосовании
        const voteData = {
            ad_id: adId,
            user_id: userId,
            vote_type: voteType,
            created_at: new Date().toISOString()
        };

        const { error: voteError } = await this.supabase
            .from('votes')
            .insert([voteData]);

        if (voteError) throw voteError;

        // Обновляем счетчики в объявлении
        return await this.updateAdCounters(adId, voteType, 'increment');
    }

    async updateVote(existingVote, newVoteType) {
        if (existingVote.vote_type === newVoteType) {
            // Удаляем голос, если повторно нажали на ту же кнопку
            const { error: deleteError } = await this.supabase
                .from('votes')
                .delete()
                .eq('id', existingVote.id);

            if (deleteError) throw deleteError;

            return await this.updateAdCounters(existingVote.ad_id, existingVote.vote_type, 'decrement');
        } else {
            // Изменяем голос
            const { error: updateError } = await this.supabase
                .from('votes')
                .update({ vote_type: newVoteType, updated_at: new Date().toISOString() })
                .eq('id', existingVote.id);

            if (updateError) throw updateError;

            // Обновляем счетчики: уменьшаем старый, увеличиваем новый
            await this.updateAdCounters(existingVote.ad_id, existingVote.vote_type, 'decrement');
            return await this.updateAdCounters(existingVote.ad_id, newVoteType, 'increment');
        }
    }

    async updateAdCounters(adId, voteType, operation) {
        const column = voteType === 'like' ? 'likes' : 'dislikes';
        const value = operation === 'increment' ? 1 : -1;

        const { data: ad, error: fetchError } = await this.supabase
            .from('advertisements')
            .select('likes, dislikes')
            .eq('id', adId)
            .single();

        if (fetchError) throw fetchError;

        const updateData = {
            [column]: Math.max(0, (ad[column] || 0) + value),
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await this.supabase
            .from('advertisements')
            .update(updateData)
            .eq('id', adId);

        if (updateError) throw updateError;

        return true;
    }

    // Получение категорий
    getCategories() {
        return this.categories;
    }

    // Загрузка голосов пользователя
    async loadUserVotes(userId) {
        try {
            const { data, error } = await this.supabase
                .from('votes')
                .select('ad_id, vote_type')
                .eq('user_id', userId);

            if (error) throw error;

            // Преобразуем в объект {adId: voteType}
            const votes = {};
            data.forEach(vote => {
                votes[vote.ad_id] = vote.vote_type;
            });

            return votes;

        } catch (error) {
            console.error('Error loading user votes:', error);
            return {};
        }
    }

    // Увеличение счетчика просмотров
    async incrementViews(adId) {
        try {
            const { data: ad, error: fetchError } = await this.supabase
                .from('advertisements')
                .select('views')
                .eq('id', adId)
                .single();

            if (fetchError) throw fetchError;

            const { error: updateError } = await this.supabase
                .from('advertisements')
                .update({
                    views: (ad.views || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', adId);

            if (updateError) throw updateError;

        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }
}

// Создаем глобальный экземпляр менеджера базы данных
const dbManager = new DatabaseManager();
window.dbManager = dbManager;
