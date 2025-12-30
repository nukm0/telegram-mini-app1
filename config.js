const CONFIG = {
    // =================== SUPABASE ===================
    SUPABASE_URL: 'https://etvzgxcsfsirkwbdbyr.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_Zt3YoNECFFaE8Bj1AmuPQ_UTizVNzk',
    
    // =================== TELEGRAM ===================
    TELEGRAM_BOT_TOKEN: '8532550864:AAFrwxWfJF836SVnDGVa73xT5BlrfgapWVw',
    TELEGRAM_WEBAPP_URL: 'https://telegram-market-vape.vercel.app',
    ADMIN_IDS: ['998579758'],
    
    // =================== ВЛАДЕЛЕЦ ===================
    OWNER: {
        TELEGRAM_ID: '998579758',
        USERNAME: '@nukm0',
        FIRST_NAME: '𓆩nukm0𓆪'
    },
    
    // =================== ПРИЛОЖЕНИЕ ===================
    APP_NAME: 'Vape Market',
    VERSION: '1.0.0',
    API_URL: 'https://telegram-market-vape.vercel.app/api',
    
    // =================== ОГРАНИЧЕНИЯ ===================
    MAX_IMAGES_PER_AD: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    AD_LIFETIME_DAYS: 14,
    
    // =================== КАТЕГОРИИ ===================
    CATEGORIES: {
        'liquids': 'Жидкости',
        'devices': 'Устройства',
        'accessories': 'Аксессуары',
        'pods': 'Поды',
        'coils': 'Испарители'
    },
    
    // =================== ТИПЫ СДЕЛОК ===================
    DEAL_TYPES: {
        'sale': 'Продажа',
        'buy': 'Покупка'
    },
    
    // =================== ЦВЕТА (твоя палитра) ===================
    COLORS: {
        PRIMARY_BG: '#18193c',
        CARD_BG: '#23244d',
        INPUT_BG: '#2a2b5a',
        PRIMARY: '#7f41ef',
        PRIMARY_DARK: '#5a1fc9',
        PRIMARY_LIGHT: '#c48cfc',
        TEXT_GRADIENT: 'linear-gradient(90deg, #ffffff 0%, #c48cfc 100%)'
    },
    
    // =================== НАСТРОЙКИ РЕЙТИНГА ===================
    RATING: {
        MIN: 1,
        MAX: 5,
        DEFAULT: 4.5,
        LIKE_WEIGHT: 0.1,
        DISLIKE_WEIGHT: -0.2
    },
    
    // =================== ТИПЫ ЖАЛОБ ===================
    REPORT_TYPES: {
        'spam': 'Спам/Реклама',
        'fake': 'Недостоверная информация',
        'prohibited': 'Запрещённый товар',
        'scam': 'Мошенничество',
        'offensive': 'Оскорбительный контент'
    },
    
    // =================== УРОВНИ АДМИНОВ ===================
    ADMIN_LEVELS: {
        1: 'Модератор',
        2: 'Администратор',
        3: 'Владелец'
    }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
