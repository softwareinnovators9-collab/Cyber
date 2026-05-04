/**
 * Device Routes
 * Handles device management operations
 */

const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const db = require('../services/database');
const { requireRole, requireOwnership } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
    try {
        const devices = await db.getAllDevices();
        res.json(devices.map(d => d.toJSON()));
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const device = await db.getDevice(req.params.id);

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json(device.toJSON());
    } catch (error) {
        next(error);
    }
});

router.post('/', requireRole('admin', 'analyst'), async (req, res, next) => {
    try {
        const { name, ip, macAddress, osType, location } = req.body;

        const errors = Device.validate({ name, ip, osType });
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const device = new Device({
            name,
            ip,
            macAddress,
            osType,
            location,
            owner: req.user.email
        });

        const savedDevice = await db.saveDevice(device);

        const auditLog = AuditLog.logAction(
            'DEVICE_CREATED',
            req.user,
            'device',
            device.id,
            { name, ip },
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        logger.info('Device created', { deviceId: device.id, name, ip });

        res.status(201).json(savedDevice.toJSON());
    } catch (error) {
        next(error);
    }
});

router.put('/:id', requireRole('admin', 'analyst'), requireOwnership('owner'), async (req, res, next) => {
    try {
        const device = await db.getDevice(req.params.id);

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const { name, status, threatLevel, location } = req.body;
        const changes = {};

        if (name && name !== device.name) {
            device.name = name;
            changes.name = name;
        }

        if (status) {
            device.updateStatus(status);
            changes.status = status;
        }

        if (threatLevel) {
            device.updateThreatLevel(threatLevel);
            changes.threatLevel = threatLevel;
        }

        if (location !== undefined) {
            device.location = location;
            changes.location = location;
        }

        const savedDevice = await db.saveDevice(device);

        const auditLog = AuditLog.logAction(
            'DEVICE_UPDATED',
            req.user,
            'device',
            device.id,
            changes,
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        logger.info('Device updated', { deviceId: device.id, changes });

        res.json(savedDevice.toJSON());
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requireRole('admin'), requireOwnership('owner'), async (req, res, next) => {
    try {
        const device = await db.getDevice(req.params.id);

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await db.deleteDevice(req.params.id);

        const auditLog = AuditLog.logAction(
            'DEVICE_DELETED',
            req.user,
            'device',
            req.params.id,
            { name: device.name, ip: device.ip },
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        logger.info('Device deleted', { deviceId: req.params.id });

        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;