const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Device name must be at least 2 characters long']
    },
    ip: {
        type: String,
        required: true,
        match: [/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'Please enter a valid IP address']
    },
    macAddress: {
        type: String,
        match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Please enter a valid MAC address']
    },
    osType: {
        type: String,
        required: true,
        enum: ['Windows', 'Linux', 'macOS', 'Android', 'iOS', 'Other']
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance', 'compromised'],
        default: 'online'
    },
    threatLevel: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'low'
    },
    owner: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

// Indexes
deviceSchema.index({ ip: 1 });
deviceSchema.index({ macAddress: 1 });
deviceSchema.index({ owner: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ threatLevel: 1 });
deviceSchema.index({ lastSeen: 1 });

// Pre-save middleware
deviceSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Instance methods
deviceSchema.methods.updateLastSeen = function () {
    this.lastSeen = new Date();
    this.updatedAt = new Date();
};

deviceSchema.methods.updateThreatLevel = function (level) {
    const validLevels = ['critical', 'high', 'medium', 'low'];
    if (validLevels.includes(level)) {
        this.threatLevel = level;
        this.updatedAt = new Date();
    }
};

deviceSchema.methods.updateStatus = function (status) {
    const validStatuses = ['online', 'offline', 'maintenance', 'compromised'];
    if (validStatuses.includes(status)) {
        this.status = status;
        this.updatedAt = new Date();
    }
};

// Static methods
deviceSchema.statics.findByIp = function (ip) {
    return this.findOne({ ip });
};

deviceSchema.statics.findByOwner = function (owner) {
    return this.find({ owner: owner.toLowerCase() });
};

deviceSchema.statics.validate = function (data) {
    const errors = [];

    if (!data.name || data.name.length < 2) {
        errors.push('Device name is required and must be at least 2 characters');
    }

    if (!data.ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(data.ip)) {
        errors.push('Valid IP address is required');
    }

    if (!data.osType || !['Windows', 'Linux', 'macOS', 'Android', 'iOS', 'Other'].includes(data.osType)) {
        errors.push('Valid OS type is required');
    }

    return errors;
};

// Transform for JSON output
deviceSchema.methods.toJSON = function () {
    return this.toObject();
};

module.exports = mongoose.model('Device', deviceSchema);