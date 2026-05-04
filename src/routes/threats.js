/**
 * Threat Routes
 * Handles threat management operations
 */

const express = require('express');
const router = express.Router();
const Threat = require('../models/Threat');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const db = require('../services/database');

router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const severity = req.query.severity;

        let threats = db.getRecentThreats(limit);

        if (severity) {
            threats = threats.filter(t => t.severity === severity);
        }

        res.json(threats.map(t => t.toJSON()));
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const threat = db.getThreat(req.params.id);

        if (!threat) {
            return res.status(404).json({ error: 'Threat not found' });
        }

        res.json(threat.toJSON());
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { type, severity, source, target, protocol, port, description } = req.body;

        const errors = Threat.validate({ type, source, target });
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const threat = new Threat({
            type,
            severity: severity || 'medium',
            source,
            target,
            protocol,
            port,
            description
        });

        db.saveThreat(threat);

        const auditLog = AuditLog.logAction(
            'THREAT_CREATED',
            req.user,
            'threat',
            threat.id,
            { type, severity, source, target },
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('Threat created', {
            threatId: threat.id,
            type,
            severity
        });

        res.status(201).json(threat.toJSON());
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;

        const threat = db.getThreat(req.params.id);

        if (!threat) {
            return res.status(404).json({ error: 'Threat not found' });
        }

        threat.updateStatus(status);
        db.saveThreat(threat);

        const auditLog = AuditLog.logAction(
            'THREAT_STATUS_UPDATED',
            req.user,
            'threat',
            threat.id,
            { status },
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('Threat status updated', {
            threatId: threat.id,
            status
        });

        res.json(threat.toJSON());
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/containment', async (req, res, next) => {
    try {
        const { containmentStatus } = req.body;

        const threat = db.getThreat(req.params.id);

        if (!threat) {
            return res.status(404).json({ error: 'Threat not found' });
        }

        threat.updateContainmentStatus(containmentStatus);
        db.saveThreat(threat);

        const auditLog = AuditLog.logAction(
            'THREAT_CONTAINMENT_UPDATED',
            req.user,
            'threat',
            threat.id,
            { containmentStatus },
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('Threat containment updated', {
            threatId: threat.id,
            containmentStatus
        });

        res.json(threat.toJSON());
    } catch (error) {
        next(error);
    }
});

module.exports = router;