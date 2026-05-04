/**
 * User Routes
 * Handles user management operations
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const db = require('../services/database');
const { requireRole } = require('../middleware/auth');

router.get('/me', (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/', requireRole(['admin']), (req, res, next) => {
    try {
        const users = db.getAllUsers().map(u => u.toJSON());
        res.json(users);
    } catch (error) {
        next(error);
    }
});

router.put('/me', async (req, res, next) => {
    try {
        const { name, department } = req.body;

        const user = db.getUserByEmail(req.user.email);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const changes = {};

        if (name && name !== user.name) {
            user.name = name;
            changes.name = name;
        }

        if (department && department !== user.department) {
            user.department = department;
            changes.department = department;
        }

        user.updatedAt = new Date();
        db.saveUser(user);

        const auditLog = AuditLog.logAction(
            'USER_PROFILE_UPDATED',
            user,
            'user',
            user.id,
            changes,
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('User profile updated', { email: user.email });

        res.json(user.toJSON());
    } catch (error) {
        next(error);
    }
});

module.exports = router;