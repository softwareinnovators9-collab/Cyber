const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../utils/logger');

class WebSocketService {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`WebSocket connection established: ${socket.id}`);

            socket.on('authenticate', (token) => {
                this.handleAuthentication(socket, token);
            });

            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            socket.on('subscribe', (channel) => {
                this.handleSubscribe(socket, channel);
            });

            socket.on('unsubscribe', (channel) => {
                this.handleUnsubscribe(socket, channel);
            });

            socket.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });
        });
    }

    handleAuthentication(socket, token) {
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            socket.user = decoded;
            this.connectedUsers.set(socket.id, decoded);

            socket.emit('authenticated', { success: true });
            logger.info(`User ${decoded.email} authenticated via WebSocket`);
        } catch (error) {
            socket.emit('authenticated', { success: false });
            logger.warn('WebSocket authentication failed:', error.message);
        }
    }

    handleDisconnect(socket) {
        this.connectedUsers.delete(socket.id);
        logger.info(`WebSocket disconnected: ${socket.id}`);
    }

    handleSubscribe(socket, channel) {
        socket.join(channel);
        logger.debug(`Socket ${socket.id} subscribed to ${channel}`);
    }

    handleUnsubscribe(socket, channel) {
        socket.leave(channel);
        logger.debug(`Socket ${socket.id} unsubscribed from ${channel}`);
    }

    emitToAll(event, data) {
        this.io.emit(event, data);
    }

    emitToUser(userId, event, data) {
        this.io.to(userId).emit(event, data);
    }

    emitToChannel(channel, event, data) {
        this.io.to(channel).emit(event, data);
    }

    broadcastThreatDetected(threat) {
        this.emitToAll('threat-detected', {
            threat,
            timestamp: new Date().toISOString()
        });
    }

    broadcastIncidentCreated(incident) {
        this.emitToAll('incident-created', {
            incident,
            timestamp: new Date().toISOString()
        });
    }

    broadcastIncidentUpdated(incident) {
        this.emitToAll('incident-updated', {
            incident,
            timestamp: new Date().toISOString()
        });
    }

    broadcastDeviceStatusChanged(device) {
        this.emitToAll('device-status-changed', {
            device,
            timestamp: new Date().toISOString()
        });
    }

    broadcastSystemAlert(alert) {
        this.emitToAll('system-alert', {
            alert,
            timestamp: new Date().toISOString()
        });
    }

    getConnectedUserCount() {
        return this.connectedUsers.size;
    }

    getConnectedUsers() {
        return Array.from(this.connectedUsers.values());
    }
}

module.exports = WebSocketService;