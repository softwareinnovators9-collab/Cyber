require('dotenv').config();

const config = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cybershield',
    DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE) || 10,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || './logs/app.log',
    THREAT_SIMULATION_ENABLED: process.env.THREAT_SIMULATION_ENABLED === 'true',
    THREAT_SIMULATION_INTERVAL: parseInt(process.env.THREAT_SIMULATION_INTERVAL) || 5000,
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || 'noreply@cybershield.com',
    // New security configs
    SESSION_SECRET: process.env.SESSION_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    MFA_ISSUER: process.env.MFA_ISSUER || 'CyberShield',
    ACCOUNT_LOCKOUT_ATTEMPTS: parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5,
    ACCOUNT_LOCKOUT_DURATION: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 30 * 60 * 1000, // 30 minutes
    PASSWORD_RESET_EXPIRE: parseInt(process.env.PASSWORD_RESET_EXPIRE) || 60 * 60 * 1000, // 1 hour
    EMAIL_VERIFICATION_EXPIRE: parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) || 24 * 60 * 60 * 1000, // 24 hours
    FEATURES: {
        THREAT_DETECTION: process.env.FEATURE_THREAT_DETECTION !== 'false',
        INCIDENT_MANAGEMENT: process.env.FEATURE_INCIDENT_MANAGEMENT !== 'false',
        DEVICE_MANAGEMENT: process.env.FEATURE_DEVICE_MANAGEMENT !== 'false',
        AUDIT_LOGGING: process.env.FEATURE_AUDIT_LOGGING !== 'false',
        PASSWORD_RESET: process.env.FEATURE_PASSWORD_RESET !== 'false',
        EMAIL_VERIFICATION: process.env.FEATURE_EMAIL_VERIFICATION !== 'false',
        MFA: process.env.FEATURE_MFA !== 'false',
        ACCOUNT_LOCKOUT: process.env.FEATURE_ACCOUNT_LOCKOUT !== 'false'
    }
};

// Security validations
if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (!config.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }
    if (!config.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is required in production');
    }
    if (!config.COOKIE_SECRET) {
        throw new Error('COOKIE_SECRET environment variable is required in production');
    }
    if (config.SMTP_HOST && (!config.SMTP_USER || !config.SMTP_PASS)) {
        throw new Error('SMTP_USER and SMTP_PASS are required when SMTP_HOST is configured');
    }
}

// Development fallbacks (NEVER use in production)
if (config.NODE_ENV === 'development') {
    config.JWT_SECRET = config.JWT_SECRET || 'dev-jwt-secret-key-2024-secure-random';
    config.JWT_REFRESH_SECRET = config.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-2024-secure-random';
    config.SESSION_SECRET = config.SESSION_SECRET || 'dev-session-secret-key-2024-secure-random';
    config.COOKIE_SECRET = config.COOKIE_SECRET || 'dev-cookie-secret-key-2024-secure-random';
}

module.exports = config;