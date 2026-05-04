/**
 * Dashboard Routes
 * Returns dashboard statistics and overview
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../services/database');

router.get('/', async (req, res, next) => {
    try {
        const allDevices = db.getAllDevices();
        const allIncidents = db.getAllIncidents();
        const allThreats = db.getRecentThreats(1000);

        const stats = {
            totalDevices: allDevices.length,
            onlineDevices: allDevices.filter(d => d.status === 'online').length,
            offlineDevices: allDevices.filter(d => d.status === 'offline').length,
            devicesThreatened: allDevices.filter(d => d.threatLevel === 'critical').length,

            activeIncidents: allIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
            resolvedIncidents: allIncidents.filter(i => i.status === 'resolved').length,
            closedIncidents: allIncidents.filter(i => i.status === 'closed').length,
            totalIncidents: allIncidents.length,

            totalThreats: allThreats.length,
            criticalThreats: allThreats.filter(t => t.severity === 'critical').length,
            highThreats: allThreats.filter(t => t.severity === 'high').length,
            threatsDetected24h: allThreats.filter(t => {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return new Date(t.timestamp) > oneDayAgo;
            }).length,

            averageResponseTime: calculateAverageResponseTime(allIncidents),
            systemHealth: calculateSystemHealth(allDevices, allThreats),
            securityScore: calculateSecurityScore(allDevices, allIncidents, allThreats)
        };

        logger.debug('Dashboard statistics retrieved', {
            devices: stats.totalDevices,
            incidents: stats.totalIncidents,
            threats: stats.totalThreats
        });

        res.json(stats);
    } catch (error) {
        next(error);
    }
});

router.get('/health', async (req, res, next) => {
    try {
        const allDevices = db.getAllDevices();
        const deviceHealth = {
            total: allDevices.length,
            healthy: allDevices.filter(d => d.threatLevel === 'low').length,
            warning: allDevices.filter(d => d.threatLevel === 'medium').length,
            critical: allDevices.filter(d => d.threatLevel === 'critical').length,
            status: getOverallHealthStatus(allDevices)
        };

        res.json(deviceHealth);
    } catch (error) {
        next(error);
    }
});

router.get('/timeline', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const auditLogs = db.getRecentAuditLogs(limit);

        const timeline = auditLogs.map(log => ({
            timestamp: log.timestamp,
            action: log.action,
            user: log.user,
            resourceType: log.resourceType,
            status: log.status
        }));

        res.json(timeline);
    } catch (error) {
        next(error);
    }
});

// Helper functions
function calculateAverageResponseTime(incidents) {
    if (incidents.length === 0) return 0;

    const closedIncidents = incidents.filter(i => i.closedAt);
    if (closedIncidents.length === 0) return 0;

    const totalTime = closedIncidents.reduce((sum, i) => {
        const time = new Date(i.closedAt) - new Date(i.createdAt);
        return sum + time;
    }, 0);

    return Math.round((totalTime / closedIncidents.length) / 60000);
}

function calculateSystemHealth(devices, threats) {
    if (devices.length === 0) return 100;

    const onlinePercentage = (devices.filter(d => d.status === 'online').length / devices.length) * 100;
    const threatDeduction = (threats.filter(t => t.severity === 'critical').length) * 5;

    return Math.max(0, Math.round(onlinePercentage - threatDeduction));
}

function calculateSecurityScore(devices, incidents, threats) {
    let score = 100;

    score -= threats.filter(t => t.severity === 'critical').length * 2;
    score -= incidents.filter(i => i.status === 'open').length;
    score -= devices.filter(d => d.threatLevel === 'critical').length * 3;

    return Math.max(0, score);
}

function getOverallHealthStatus(devices) {
    if (devices.length === 0) return 'unknown';

    const healthyPercentage = (devices.filter(d => d.threatLevel === 'low').length / devices.length) * 100;

    if (healthyPercentage >= 80) return 'healthy';
    if (healthyPercentage >= 60) return 'warning';
    return 'critical';
}

module.exports = router;