const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        trim: true
    },
    resourceType: {
        type: String,
        enum: ['user', 'device', 'incident', 'threat', 'audit', 'system'],
        trim: true
    },
    resourceId: {
        type: String,
        trim: true
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'security-event'],
        default: 'success'
    },
    details: {
        type: String,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    }
});

// Indexes
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ resourceType: 1 });
auditLogSchema.index({ resourceId: 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ip: 1 });

// Static methods
auditLogSchema.statics.logAction = function (action, user, resourceType, resourceId, changes = {}, ip = '', userAgent = '') {
    const logData = {
        action,
        user: user.email || user,
        userId: user.id || user,
        resourceType,
        resourceId,
        changes,
        ip,
        userAgent,
        status: 'success'
    };

    return new this(logData);
};

auditLogSchema.statics.logFailure = function (action, user, reason, ip = '', userAgent = '') {
    const logData = {
        action,
        user: user.email || user,
        userId: user.id || user,
        ip,
        userAgent,
        status: 'failure',
        details: reason,
        severity: 'warning'
    };

    return new this(logData);
};

auditLogSchema.statics.logSecurityEvent = function (action, user, details, severity = 'warning') {
    const logData = {
        action,
        user: user.email || user,
        userId: user.id || user,
        details,
        severity,
        status: 'security-event'
    };

    return new this(logData);
};

auditLogSchema.statics.findByUser = function (userEmail, limit = 100) {
    return this.find({ user: userEmail.toLowerCase() })
        .sort({ timestamp: -1 })
        .limit(limit);
};

auditLogSchema.statics.findByAction = function (action, limit = 100) {
    return this.find({ action })
        .sort({ timestamp: -1 })
        .limit(limit);
};

auditLogSchema.statics.findByResource = function (resourceType, resourceId, limit = 100) {
    return this.find({ resourceType, resourceId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

auditLogSchema.statics.findRecent = function (hours = 24, limit = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({ timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(limit);
};

auditLogSchema.statics.findFailures = function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        timestamp: { $gte: since },
        status: 'failure'
    }).sort({ timestamp: -1 });
};

auditLogSchema.statics.findSecurityEvents = function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        timestamp: { $gte: since },
        status: 'security-event'
    }).sort({ timestamp: -1 });
};

// Transform for JSON output
auditLogSchema.methods.toJSON = function () {
    return this.toObject();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);