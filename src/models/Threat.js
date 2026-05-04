const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Malware', 'DDoS', 'Brute Force', 'Phishing', 'SQL Injection', 'XSS', 'Zero-Day']
    },
    severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    source: {
        type: String,
        required: true,
        match: [/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'Please enter a valid source IP']
    },
    target: {
        type: String,
        required: true,
        match: [/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'Please enter a valid target IP']
    },
    protocol: {
        type: String,
        enum: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'SMTP']
    },
    port: {
        type: Number,
        min: 1,
        max: 65535
    },
    status: {
        type: String,
        enum: ['detected', 'confirmed', 'mitigated', 'resolved'],
        default: 'detected'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    },
    indicators: [{
        type: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    relatedIncident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
    },
    containmentStatus: {
        type: String,
        enum: ['uncontained', 'contained', 'quarantined', 'eliminated'],
        default: 'uncontained'
    },
    resolvedAt: {
        type: Date
    },
    resolution: {
        type: String,
        trim: true
    }
});

// Indexes
threatSchema.index({ type: 1 });
threatSchema.index({ severity: 1 });
threatSchema.index({ status: 1 });
threatSchema.index({ source: 1 });
threatSchema.index({ target: 1 });
threatSchema.index({ timestamp: -1 });
threatSchema.index({ relatedIncident: 1 });

// Pre-save middleware
threatSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
        this.resolvedAt = new Date();
    }
    next();
});

// Instance methods
threatSchema.methods.updateStatus = function (status) {
    const validStatuses = ['detected', 'confirmed', 'mitigated', 'resolved'];
    if (validStatuses.includes(status)) {
        this.status = status;
        if (status === 'resolved') {
            this.resolvedAt = new Date();
        }
    }
};

threatSchema.methods.updateContainmentStatus = function (status) {
    const validStatuses = ['uncontained', 'contained', 'quarantined', 'eliminated'];
    if (validStatuses.includes(status)) {
        this.containmentStatus = status;
    }
};

threatSchema.methods.linkToIncident = function (incidentId) {
    this.relatedIncident = incidentId;
};

threatSchema.methods.addIndicator = function (indicator) {
    this.indicators.push({
        ...indicator,
        timestamp: new Date()
    });
};

threatSchema.methods.getThreatScore = function () {
    const severityScores = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25
    };

    const statusModifier = {
        detected: 1.0,
        confirmed: 1.2,
        mitigated: 0.5,
        resolved: 0.1
    };

    return Math.round(
        (severityScores[this.severity] || 0) * (statusModifier[this.status] || 1)
    );
};

// Static methods
threatSchema.statics.findByType = function (type) {
    return this.find({ type });
};

threatSchema.statics.findBySeverity = function (severity) {
    return this.find({ severity });
};

threatSchema.statics.findByStatus = function (status) {
    return this.find({ status });
};

threatSchema.statics.findRecent = function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({ timestamp: { $gte: since } }).sort({ timestamp: -1 });
};

threatSchema.statics.validate = function (data) {
    const errors = [];

    const validTypes = ['Malware', 'DDoS', 'Brute Force', 'Phishing', 'SQL Injection', 'XSS', 'Zero-Day'];
    if (!validTypes.includes(data.type)) {
        errors.push('Invalid threat type');
    }

    if (!data.source || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(data.source)) {
        errors.push('Valid source IP is required');
    }

    if (!data.target || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(data.target)) {
        errors.push('Valid target IP is required');
    }

    return errors;
};

// Transform for JSON output
threatSchema.methods.toJSON = function () {
    const threatObject = this.toObject();
    threatObject.threatScore = this.getThreatScore();
    return threatObject;
};

module.exports = mongoose.model('Threat', threatSchema);