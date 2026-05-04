/**
 * Configuration Module
 * Centralized configuration for the frontend
 */

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:3000',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },

    // WebSocket Configuration
    WEBSOCKET: {
        URL: 'http://localhost:3000',
        RECONNECT_ATTEMPTS: 5,
        RECONNECT_DELAY: 3000
    },

    // Storage Keys
    STORAGE: {
        TOKEN: 'authToken',
        USER: 'currentUser',
        THEME: 'theme',
        NOTIFICATIONS: 'notificationSettings'
    },

    // UI Configuration
    UI: {
        TOAST_DURATION: 3000,
        MODAL_ANIMATION_DURATION: 300,
        REFRESH_INTERVAL: 5000,
        TABLE_ROWS_PER_PAGE: 25
    },

    // Feature Flags
    FEATURES: {
        REAL_TIME_UPDATES: true,
        THREAT_SIMULATION: false,
        AUDIT_LOGGING: true,
        NOTIFICATIONS: true
    },

    // Environment
    ENV: 'development',
    DEBUG: true
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}