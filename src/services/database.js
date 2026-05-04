/**
 * Database Service
 * Manages MongoDB operations using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Import models
const User = require('../models/User');
const Device = require('../models/Device');
const Incident = require('../models/Incident');
const Threat = require('../models/Threat');
const AuditLog = require('../models/AuditLog');

class DatabaseService {
    constructor() {
        if (DatabaseService.instance) {
            return DatabaseService.instance;
        }

        this.isConnected = false;
        this.initialized = false;

        DatabaseService.instance = this;
    }

    async connect() {
        try {
            if (this.isConnected) return;

            await mongoose.connect(config.MONGODB_URI, {
                maxPoolSize: config.DATABASE_POOL_SIZE,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            logger.info('MongoDB connected successfully');
        } catch (error) {
            logger.error('MongoDB connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.isConnected) {
                await mongoose.disconnect();
                this.isConnected = false;
                logger.info('MongoDB disconnected');
            }
        } catch (error) {
            logger.error('MongoDB disconnect error:', error);
        }
    }

    async initialize() {
        try {
            await this.connect();
            this.initialized = true;
            logger.info('Database service initialized');
        } catch (error) {
            logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    // User operations
    async getUserByEmail(email) {
        return await User.findByEmail(email);
    }

    async saveUser(user) {
        return await user.save();
    }

    async getAllUsers() {
        return await User.find({}).sort({ createdAt: -1 });
    }

    async deleteUser(email) {
        return await User.findOneAndDelete({ email: email.toLowerCase() });
    }

    // Device operations
    async getDevice(id) {
        return await Device.findById(id);
    }

    async saveDevice(device) {
        return await device.save();
    }

    async getAllDevices() {
        return await Device.find({}).sort({ createdAt: -1 });
    }

    async deleteDevice(id) {
        return await Device.findByIdAndDelete(id);
    }

    async getDevicesByOwner(owner) {
        return await Device.findByOwner(owner);
    }

    async getDeviceByIp(ip) {
        return await Device.findByIp(ip);
    }

    // Incident operations
    async getIncident(id) {
        return await Incident.findById(id).populate('deviceId');
    }

    async saveIncident(incident) {
        return await incident.save();
    }

    async getAllIncidents() {
        return await Incident.find({}).populate('deviceId').sort({ createdAt: -1 });
    }

    async getIncidentsByStatus(status) {
        return await Incident.findByStatus(status).populate('deviceId');
    }

    async getIncidentsByAssignee(assignee) {
        return await Incident.findByAssignee(assignee).populate('deviceId');
    }

    async deleteIncident(id) {
        return await Incident.findByIdAndDelete(id);
    }

    // Threat operations
    async getThreat(id) {
        return await Threat.findById(id);
    }

    async saveThreat(threat) {
        return await threat.save();
    }

    async getAllThreats() {
        return await Threat.find({}).sort({ timestamp: -1 });
    }

    async getThreatsByType(type) {
        return await Threat.findByType(type);
    }

    async getThreatsBySeverity(severity) {
        return await Threat.findBySeverity(severity);
    }

    async getRecentThreats(hours = 24) {
        return await Threat.findRecent(hours);
    }

    async deleteThreat(id) {
        return await Threat.findByIdAndDelete(id);
    }

    // Audit log operations
    async saveAuditLog(auditLog) {
        return await auditLog.save();
    }

    async getRecentAuditLogs(limit = 100) {
        return await AuditLog.find({})
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    async getAuditLogsByUser(userEmail, limit = 100) {
        return await AuditLog.findByUser(userEmail, limit);
    }

    async getAuditLogsByAction(action, limit = 100) {
        return await AuditLog.findByAction(action, limit);
    }

    async getAllAuditLogs() {
        return await AuditLog.find({}).sort({ timestamp: -1 });
    }

    async getAuditLogsByResource(resourceType, resourceId, limit = 100) {
        return await AuditLog.findByResource(resourceType, resourceId, limit);
    }

    async getRecentFailures(hours = 24) {
        return await AuditLog.findFailures(hours);
    }

    async getRecentSecurityEvents(hours = 24) {
        return await AuditLog.findSecurityEvents(hours);
    }

    // Utility methods
    async getStats() {
        try {
            const [
                userCount,
                deviceCount,
                incidentCount,
                threatCount,
                auditCount
            ] = await Promise.all([
                User.countDocuments(),
                Device.countDocuments(),
                Incident.countDocuments(),
                Threat.countDocuments(),
                AuditLog.countDocuments()
            ]);

            return {
                users: userCount,
                devices: deviceCount,
                incidents: incidentCount,
                threats: threatCount,
                auditLogs: auditCount
            };
        } catch (error) {
            logger.error('Error getting stats:', error);
            return null;
        }
    }

    async cleanup() {
        try {
            // Remove expired tokens and old data as needed
            const expiredTokensRemoved = await User.updateMany(
                {},
                { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } }
            );

            logger.info(`Cleaned up ${expiredTokensRemoved.modifiedCount} expired refresh tokens`);
        } catch (error) {
            logger.error('Cleanup error:', error);
        }
    }
}

module.exports = new DatabaseService();