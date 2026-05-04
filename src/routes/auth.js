/**
 * Authentication Routes
 * Handles user authentication and registration with enhanced security
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const JWTHelper = require('../utils/jwt');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');
const db = require('../services/database');
const config = require('../config/environment');
const { requireRole } = require('../middleware/auth');

// Utility function to send emails
const sendEmail = async (to, subject, html) => {
    // Email sending implementation should be configured with actual SMTP service
    logger.info(`Email sent to ${to}: ${subject}`);
    console.log('Email HTML:', html);
};

// Input validation middleware
const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }),
    body('rememberMe').optional().isBoolean()
];

const validateRegister = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').isLength({ min: 2 }).trim().escape(),
    body('department').optional().trim().escape()
];

const validatePasswordReset = [
    body('email').isEmail().normalizeEmail()
];

const validatePasswordChange = [
    body('token').isLength({ min: 32, max: 32 }),
    body('password').isLength({ min: 8 })
];

const validateMFA = [
    body('token').isLength({ min: 6, max: 6 }).isNumeric()
];

router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, rememberMe } = req.body;

        const user = await db.getUserByEmail(email);

        if (!user) {
            logger.warn('Login attempt with non-existent user', { email, ip: req.ip });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.isLocked()) {
            logger.warn('Login attempt on locked account', { email, ip: req.ip });
            return res.status(423).json({
                error: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            user.recordLoginAttempt();
            await db.saveUser(user);

            // Log audit
            const auditLog = AuditLog.logFailure(
                'LOGIN_FAILED',
                user,
                'Invalid password',
                req.ip,
                req.headers['user-agent']
            );
            await db.saveAuditLog(auditLog);

            logger.warn('Failed login attempt', { email, ip: req.ip });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset login attempts
        user.resetLoginAttempts();
        user.lastLogin = new Date();
        user.lastIp = req.ip;
        await db.saveUser(user);

        // Generate tokens
        const accessToken = JWTHelper.generateToken(user);
        const refreshToken = JWTHelper.generateRefreshToken(user);

        // Store refresh token
        user.addRefreshToken(refreshToken, rememberMe ? '30d' : '7d');
        await db.saveUser(user);

        // Set httpOnly cookie for access token
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
        });

        // Log audit
        const auditLog = AuditLog.logAction(
            'LOGIN_SUCCESS',
            user,
            'user',
            user.id,
            { ip: req.ip, rememberMe },
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        logger.info('User logged in', { email, ip: req.ip });

        res.json({
            user: user.toJSON(),
            requiresMFA: user.mfaEnabled
        });
    } catch (error) {
        next(error);
    }
});

router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, department } = req.body;

        // Check if user exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const user = new User({
            email,
            password, // Will be hashed by pre-save middleware
            name,
            department,
            emailVerified: false
        });

        // Generate email verification token
        const verificationToken = user.generateEmailVerificationToken();

        await db.saveUser(user);

        // Send verification email
        if (config.FEATURES.EMAIL_VERIFICATION) {
            const verificationUrl = `${config.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
            await sendEmail(
                user.email,
                'Verify Your CyberShield Account',
                `<h1>Welcome to CyberShield!</h1>
                <p>Please verify your email by clicking the link below:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>`
            );
        }

        // Log audit
        const auditLog = AuditLog.logAction(
            'USER_REGISTERED',
            user,
            'user',
            user.id,
            { email, department },
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        logger.info('User registered', { email, ip: req.ip });

        res.status(201).json({
            message: 'User registered successfully. Please check your email for verification.',
            user: user.toJSON()
        });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if refresh token is valid
        const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken && rt.expiresAt > new Date());
        if (!tokenExists) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Generate new access token
        const accessToken = JWTHelper.generateToken(user);

        // Set new access token cookie
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        res.json({ message: 'Token refreshed' });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            // Remove refresh token from user
            const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id);

            if (user) {
                user.removeRefreshToken(refreshToken);
                await db.saveUser(user);
            }
        }

        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/forgot-password', validatePasswordReset, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const user = await db.getUserByEmail(email);

        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await db.saveUser(user);

        // Send reset email
        const resetUrl = `${config.CORS_ORIGIN}/reset-password?token=${resetToken}`;
        await sendEmail(
            user.email,
            'Reset Your CyberShield Password',
            `<h1>Password Reset Request</h1>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>`
        );

        // Log audit
        const auditLog = AuditLog.logSecurityEvent(
            'PASSWORD_RESET_REQUESTED',
            user,
            'Password reset requested',
            'warning'
        );
        await db.saveAuditLog(auditLog);

        res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', validatePasswordChange, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, password } = req.body;

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await db.saveUser(user);

        // Log audit
        const auditLog = AuditLog.logSecurityEvent(
            'PASSWORD_RESET',
            user,
            'Password reset completed',
            'info'
        );
        await db.saveAuditLog(auditLog);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token required' });
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await db.saveUser(user);

        // Log audit
        const auditLog = AuditLog.logAction(
            'EMAIL_VERIFIED',
            user,
            'user',
            user.id,
            {},
            req.ip,
            req.headers['user-agent']
        );
        await db.saveAuditLog(auditLog);

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/setup', requireRole('user', 'admin', 'analyst'), async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (user.mfaEnabled) {
            return res.status(400).json({ error: 'MFA already enabled' });
        }

        // Generate MFA secret
        const secret = speakeasy.generateSecret({
            name: `CyberShield (${user.email})`,
            issuer: config.MFA_ISSUER
        });

        user.mfaSecret = secret.base32;
        await db.saveUser(user);

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl,
            message: 'Scan the QR code with your authenticator app'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/enable', requireRole('user', 'admin', 'analyst'), validateMFA, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.mfaSecret) {
            return res.status(400).json({ error: 'MFA setup required first' });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid MFA token' });
        }

        user.mfaEnabled = true;
        await db.saveUser(user);

        // Log audit
        const auditLog = AuditLog.logSecurityEvent(
            'MFA_ENABLED',
            user,
            'MFA enabled for account',
            'info'
        );
        await db.saveAuditLog(auditLog);

        res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/verify', validateMFA, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.mfaEnabled) {
            return res.status(400).json({ error: 'MFA not enabled' });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid MFA token' });
        }

        // Set MFA verified in session (you might want to use a proper session store)
        if (!req.session) req.session = {};
        req.session.mfaVerified = true;

        res.json({ message: 'MFA verified successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/disable', requireRole('user', 'admin', 'analyst'), async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        user.mfaEnabled = false;
        user.mfaSecret = undefined;
        await db.saveUser(user);

        // Log audit
        const auditLog = AuditLog.logSecurityEvent(
            'MFA_DISABLED',
            user,
            'MFA disabled for account',
            'warning'
        );
        await db.saveAuditLog(auditLog);

        res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;