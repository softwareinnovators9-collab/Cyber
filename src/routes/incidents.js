/**
 * Incident Routes
 * Handles incident management operations
 */

const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const db = require('../services/database');

router.get('/', async (req, res, next) => {
    try {
        const status = req.query.status;

        let incidents;
        if (status) {
            incidents = db.getIncidentsByStatus(status);
        } else {
            incidents = db.getAllIncidents();
        }

        res.json(incidents.map(i => i.toJSON()));
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const incident = db.getIncident(req.params.id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        res.json(incident.toJSON());
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { title, description, severity, priority, deviceId, tags } = req.body;

        const errors = Incident.validate({ title, description, severity });
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const incident = new Incident({
            title,
            description,
            severity,
            priority: priority || 'medium',
            deviceId,
            tags: tags || [],
            createdBy: req.user.email,
            assignedTo: req.user.email
        });

        db.saveIncident(incident);

        const auditLog = AuditLog.logAction(
            'INCIDENT_CREATED',
            req.user,
            'incident',
            incident.id,
            { title, severity },
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('Incident created', {
            incidentId: incident.id,
            title,
            severity
        });

        res.status(201).json(incident.toJSON());
    } catch (error) {
        next(error);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const incident = db.getIncident(req.params.id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const { status, severity, priority, assignedTo, resolution } = req.body;
        const changes = {};

        if (status && status !== incident.status) {
            incident.updateStatus(status, req.user.email);
            changes.status = status;
        }

        if (severity) {
            incident.updateSeverity(severity);
            changes.severity = severity;
        }

        if (priority && priority !== incident.priority) {
            incident.priority = priority;
            changes.priority = priority;
        }

        if (assignedTo && assignedTo !== incident.assignedTo) {
            incident.assignTo(assignedTo);
            changes.assignedTo = assignedTo;
        }

        if (resolution && resolution !== incident.resolution) {
            incident.resolution = resolution;
            changes.resolution = resolution;
        }

        incident.updatedAt = new Date();
        db.saveIncident(incident);

        if (Object.keys(changes).length > 0) {
            const auditLog = AuditLog.logAction(
                'INCIDENT_UPDATED',
                req.user,
                'incident',
                incident.id,
                changes,
                req.ip,
                req.headers['user-agent']
            );
            db.saveAuditLog(auditLog);
        }

        logger.info('Incident updated', {
            incidentId: incident.id,
            changes
        });

        res.json(incident.toJSON());
    } catch (error) {
        next(error);
    }
});

router.post('/:id/comments', async (req, res, next) => {
    try {
        const { comment } = req.body;

        if (!comment || comment.trim().length < 3) {
            return res.status(400).json({ error: 'Comment must be at least 3 characters' });
        }

        const incident = db.getIncident(req.params.id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        incident.addComment(req.user.id, comment);
        db.saveIncident(incident);

        logger.info('Comment added to incident', {
            incidentId: incident.id,
            user: req.user.email
        });

        res.json(incident.toJSON());
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const incident = db.getIncident(req.params.id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        db.incidents.delete(req.params.id);

        const auditLog = AuditLog.logAction(
            'INCIDENT_DELETED',
            req.user,
            'incident',
            incident.id,
            { title: incident.title },
            req.ip,
            req.headers['user-agent']
        );
        db.saveAuditLog(auditLog);

        logger.info('Incident deleted', { incidentId: incident.id });

        res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;