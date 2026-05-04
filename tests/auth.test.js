/**
 * Authentication Routes Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/server');
const User = require('../src/models/User');
const db = require('../src/services/database');

let mongoServer;

beforeAll(async () => {
    // Start in-memory MongoDB with longer timeout
    mongoServer = await MongoMemoryServer.create({
        instance: {
            port: 27019, // Use a different port to avoid conflicts
        },
        binary: {
            version: '7.0.0', // Use a specific version
        },
    });
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    // Connect to test database
    await db.connect();
}, 60000); // Increase timeout to 60 seconds

afterAll(async () => {
    await db.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Seed test admin user
    const adminUser = new User({
        email: 'admin@cybershield.com',
        name: 'Test Admin',
        password: 'password123',
        role: 'admin',
        emailVerified: true
    });
    await adminUser.save();
});

describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@cybershield.com',
                password: 'password123'
            })
            .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe('admin@cybershield.com');
        expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@cybershield.com',
                password: 'wrongpassword'
            })
            .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
    });

    test('should lock account after multiple failed attempts', async () => {
        // Make multiple failed login attempts
        for (let i = 0; i < 5; i++) {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@cybershield.com',
                    password: 'wrongpassword'
                });
        }

        // Next attempt should be locked
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@cybershield.com',
                password: 'password123'
            })
            .expect(423);

        expect(response.body.error).toContain('locked');
    });
});

describe('POST /api/auth/register', () => {
    test('should register new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            })
            .expect(201);

        expect(response.body.message).toContain('registered successfully');
        expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject invalid email', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User'
            })
            .expect(400);

        expect(response.body.errors).toBeDefined();
    });

    test('should reject weak password', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: '123',
                name: 'Test User'
            })
            .expect(400);

        expect(response.body.errors).toBeDefined();
    });
});

describe('POST /api/auth/forgot-password', () => {
    test('should send reset email for existing user', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({
                email: 'admin@cybershield.com'
            })
            .expect(200);

        expect(response.body.message).toContain('reset link');
    });

    test('should not reveal if user exists', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({
                email: 'nonexistent@example.com'
            })
            .expect(200);

        expect(response.body.message).toContain('reset link');
    });
});

describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
        // Generate reset token for admin user
        const user = await User.findOne({ email: 'admin@cybershield.com' });
        resetToken = user.generatePasswordResetToken();
        await user.save();
    });

    test('should reset password with valid token', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: resetToken,
                password: 'newpassword123'
            })
            .expect(200);

        expect(response.body.message).toContain('reset successfully');
    });

    test('should reject invalid token', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: 'invalid-token',
                password: 'newpassword123'
            })
            .expect(400);

        expect(response.body.error).toContain('expired');
    });
});

describe('POST /api/auth/verify-email', () => {
    let verificationToken;

    beforeEach(async () => {
        // Create unverified user
        const user = new User({
            email: 'unverified@example.com',
            name: 'Unverified User',
            password: 'password123',
            emailVerified: false
        });
        verificationToken = user.generateEmailVerificationToken();
        await user.save();
    });

    test('should verify email with valid token', async () => {
        const response = await request(app)
            .post('/api/auth/verify-email')
            .send({
                token: verificationToken
            })
            .expect(200);

        expect(response.body.message).toContain('verified successfully');
    });

    test('should reject invalid token', async () => {
        const response = await request(app)
            .post('/api/auth/verify-email')
            .send({
                token: 'invalid-token'
            })
            .expect(400);

        expect(response.body.error).toContain('expired');
    });
});

describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
        const response = await request(app)
            .post('/api/auth/logout')
            .expect(200);

        expect(response.body.message).toContain('logged out');
    });
});