const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
    try {
        // Check for JWT in Authorization header first
        let token = req.headers.authorization?.split(' ')[1];

        // If not found, check for JWT in httpOnly cookie
        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Authentication failed:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }

        res.status(401).json({ error: 'Invalid token' });
    }
};

const optionalAuth = (req, res, next) => {
    try {
        let token = req.headers.authorization?.split(' ')[1];

        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (token) {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = decoded;
        }

        next();
    } catch (error) {
        next();
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`User ${req.user.email} attempted unauthorized action`);
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

const requireOwnership = (resourceField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        const resourceId = req.params.id || req.body[resourceField];
        if (req.user.id !== resourceId && req.user.email !== resourceId) {
            logger.warn(`User ${req.user.email} attempted to access unowned resource`);
            return res.status(403).json({ error: 'Access denied' });
        }

        next();
    };
};

const requireMFA = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Skip MFA check for certain routes or if MFA is disabled
    if (!config.FEATURES.MFA || req.user.role === 'admin') {
        return next();
    }

    // Check if user has MFA enabled and verified
    if (req.user.mfaEnabled && !req.session?.mfaVerified) {
        return res.status(403).json({
            error: 'MFA verification required',
            requiresMFA: true
        });
    }

    next();
};

module.exports = {
    authMiddleware,
    optionalAuth,
    requireRole,
    requireOwnership,
    requireMFA
};