const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: [5, 'Title must be at least 5 characters long']
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long']
    },
    severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'investigating', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    },
    assignedTo: {
        type: String,
        lowercase: true,
        trim: true
    },
    createdBy: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: {
        type: Date
    },
    closedBy: {
        type: String,
        lowercase: true,
        trim: true
    },
    resolution: {
        type: String,
        trim: true
    },
    timeline: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        action: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            lowercase: true,
            trim: true
        },
        details: {
            type: String,
            trim: true
        }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: String
    }]
});

// Indexes
incidentSchema.index({ status: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ priority: 1 });
incidentSchema.index({ assignedTo: 1 });
incidentSchema.index({ createdBy: 1 });
incidentSchema.index({ deviceId: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ tags: 1 });

// Pre-save middleware
incidentSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Instance methods
incidentSchema.methods.updateStatus = function (status, closedBy = null) {
    const validStatuses = ['open', 'investigating', 'resolved', 'closed'];
    if (validStatuses.includes(status)) {
        this.status = status;
        this.updatedAt = new Date();

        if ((status === 'closed' || status === 'resolved') && !this.closedAt) {
            this.closedAt = new Date();
            if (closedBy) this.closedBy = closedBy;
        }
    }
};

incidentSchema.methods.addTimelineEntry = function (entry) {
    this.timeline.push({
        timestamp: new Date(),
        ...entry
    });
    this.updatedAt = new Date();
};

incidentSchema.methods.assignTo = function (userId) {
    this.assignedTo = userId;
    this.updatedAt = new Date();
    this.addTimelineEntry({
        action: 'assigned',
        userId,
        details: `Assigned to ${userId}`
    });
};

incidentSchema.methods.addComment = function (userId, comment) {
    this.addTimelineEntry({
        action: 'comment',
        userId,
        details: comment
    });
};

incidentSchema.methods.updateSeverity = function (severity) {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (validSeverities.includes(severity)) {
        this.severity = severity;
        this.updatedAt = new Date();
    }
};

incidentSchema.methods.addTag = function (tag) {
    if (!this.tags.includes(tag.toLowerCase())) {
        this.tags.push(tag.toLowerCase());
        this.updatedAt = new Date();
    }
};

incidentSchema.methods.removeTag = function (tag) {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
    this.updatedAt = new Date();
};

// Static methods
incidentSchema.statics.findByStatus = function (status) {
    return this.find({ status });
};

incidentSchema.statics.findByAssignee = function (assignee) {
    return this.find({ assignedTo: assignee.toLowerCase() });
};

incidentSchema.statics.findByDevice = function (deviceId) {
    return this.find({ deviceId });
};

incidentSchema.statics.findOpen = function () {
    return this.find({ status: { $in: ['open', 'investigating'] } });
};

incidentSchema.statics.findRecent = function (days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 });
};

incidentSchema.statics.validate = function (data) {
    const errors = [];

    if (!data.title || data.title.length < 5) {
        errors.push('Title must be at least 5 characters');
    }

    if (!data.description || data.description.length < 10) {
        errors.push('Description must be at least 10 characters');
    }

    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (!validSeverities.includes(data.severity)) {
        errors.push('Invalid severity level');
    }

    return errors;
};

// Transform for JSON output
incidentSchema.methods.toJSON = function () {
    const incidentObject = this.toObject();
    incidentObject.daysOpen = this.closedAt
        ? Math.ceil((this.closedAt - this.createdAt) / (1000 * 60 * 60 * 24))
        : Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
    return incidentObject;
};

module.exports = mongoose.model('Incident', incidentSchema);