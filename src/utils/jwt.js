const jwt = require('jsonwebtoken');
const config = require('../config/environment');

class JWTHelper {
    static generateToken(user) {
        const payload = {
            id: user._id || user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        return jwt.sign(payload, config.JWT_SECRET, {
            expiresIn: config.JWT_EXPIRES_IN,
            issuer: 'CyberShield',
            subject: user._id || user.id
        });
    }

    static generateRefreshToken(user) {
        const payload = {
            id: user._id || user.id,
            email: user.email,
            type: 'refresh'
        };

        return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
            expiresIn: config.JWT_REFRESH_EXPIRES_IN,
            issuer: 'CyberShield',
            subject: user._id || user.id
        });
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, config.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, config.JWT_REFRESH_SECRET);
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    static decodeToken(token) {
        return jwt.decode(token);
    }

    static isTokenExpired(token) {
        try {
            this.verifyToken(token);
            return false;
        } catch (error) {
            return error.name === 'TokenExpiredError';
        }
    }

    static isRefreshTokenExpired(token) {
        try {
            this.verifyRefreshToken(token);
            return false;
        } catch (error) {
            return error.name === 'TokenExpiredError';
        }
    }
}

module.exports = JWTHelper;