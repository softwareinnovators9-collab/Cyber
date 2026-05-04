/**
 * Audit Log Routes
 * Handles audit log retrieval
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../services/database');

router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const action = req.query.action;
        const user = req.query.user;

        let logs = db.getRecentAuditLogs(limit);

        if (action) {
            logs = logs.filter(l => l.action === action);
        }

        if (user) {
            logs = logs.filter(l => l.user === user);
        }

        res.json(logs.map(l => l.toJSON()));
    } catch (error) {
        next(error);
    }
});

router.get('/user/:userId', async (req, res, next) => {
    try {
        const logs = db.getAuditLogsByUser(req.params.userId);
        res.json(logs.map(l => l.toJSON()));
    } catch (error) {
        next(error);
    }
});

router.get('/export/csv', async (req, res, next) => {
    try {
        const logs = await db.getAllAuditLogs();

        // Function to escape CSV fields to prevent injection
        const escapeCSV = (field) => {
            if (!field) return '';
            const stringField = String(field);
            // If field contains comma, quote, or newline, wrap in quotes and escape quotes
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return '"' + stringField.replace(/"/g, '""') + '"';
            }
            return stringField;
        };

        const csv = [
            'Timestamp,Action,User,Resource Type,Resource ID,Status,Details',
            ...logs.map(log =>
                `${escapeCSV(log.timestamp)},${escapeCSV(log.action)},${escapeCSV(log.user)},${escapeCSV(log.resourceType)},${escapeCSV(log.resourceId)},${escapeCSV(log.status)},${escapeCSV(log.details || '')}`
            )
        ].join('\n');

        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        res.send(csv);
    } catch (error) {
        next(error);
    }
});

module.exports = router;