const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/environment');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    password: {
        type: String,
        required: true,
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'analyst'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    department: {
        type: String,
        trim: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastIp: {
        type: String
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date
    },
    // New auth features
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String
    },
    emailVerificationExpires: {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String
    },
    refreshTokens: [{
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date
    }]
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        this.password = await bcrypt.hash(this.password, config.BCRYPT_ROUNDS);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance methods
userSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.isLocked = function () {
    if (!this.lockedUntil) return false;
    return this.lockedUntil > new Date();
};

userSchema.methods.recordLoginAttempt = function () {
    this.loginAttempts = (this.loginAttempts || 0) + 1;

    if (this.loginAttempts >= 5) {
        this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    this.updatedAt = new Date();
};

userSchema.methods.resetLoginAttempts = function () {
    this.loginAttempts = 0;
    this.lockedUntil = undefined;
    this.updatedAt = new Date();
};

userSchema.methods.generateEmailVerificationToken = function () {
    const token = require('crypto').randomBytes(32).toString('hex');
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
};

userSchema.methods.generatePasswordResetToken = function () {
    const token = require('crypto').randomBytes(32).toString('hex');
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
};

userSchema.methods.addRefreshToken = function (token, expiresIn = '7d') {
    const expiresAt = new Date(Date.now() + require('ms')(expiresIn));
    this.refreshTokens.push({ token, expiresAt });
};

userSchema.methods.removeRefreshToken = function (token) {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
};

userSchema.methods.clearExpiredRefreshTokens = function () {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
};

// Static methods
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.validate = function (data) {
    const errors = [];

    if (!data.email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!data.name || data.name.length < 2) {
        errors.push('Name must be at least 2 characters long');
    }

    return errors;
};

// Transform for JSON output
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.mfaSecret;
    delete userObject.refreshTokens;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);