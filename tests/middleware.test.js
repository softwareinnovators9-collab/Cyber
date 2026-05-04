/**
 * Authentication Middleware Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/server');
const User = require('../src/models/User');
const JWTHelper = require('../src/utils/jwt');
const db = require('../src/services/database');

let mongoServer;
let testUser;
let accessToken;

beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    // Connect to test database
    await db.connect();
});

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

    // Create test user
    testUser = new User({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'user'
    });
    await testUser.save();

    // Generate access token
    accessToken = JWTHelper.generateToken(testUser);
});

describe('Authentication Middleware', () => {
    test('should allow access with valid JWT in header', async () => {
        const response = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body).toHaveProperty('stats');
    });

    test('should allow access with valid JWT in cookie', async () => {
        const response = await request(app)
            .get('/api/dashboard/stats')
            .set('Cookie', `accessToken=${accessToken}`)
            .expect(200);

        expect(response.body).toHaveProperty('stats');
    });

    test('should reject request without authentication', async () => {
        const response = await request(app)
            .get('/api/dashboard/stats')
            .expect(401);

        expect(response.body.error).toBe('Authentication required');
    });

    test('should reject expired token', async () => {
        // Create expired token (set expiry to past)
        const expiredToken = JWTHelper.generateToken(testUser, '-1h');

        const response = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect(401);

        expect(response.body.error).toBe('Token expired');
    });

    test('should reject invalid token', async () => {
        const response = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401);

        expect(response.body.error).toBe('Invalid token');
    });
});

describe('Role-based Authorization', () => {
    test('should allow admin access to admin routes', async () => {
        // Create admin user
        const adminUser = new User({
            email: 'admin@example.com',
            name: 'Admin User',
            password: 'password123',
            role: 'admin'
        });
        await adminUser.save();
        const adminToken = JWTHelper.generateToken(adminUser);

        const response = await request(app)
            .post('/api/devices')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Test Device',
                ip: '192.168.1.100',
                osType: 'Linux'
            })
            .expect(201);

        expect(response.body).toHaveProperty('id');
    });

    test('should deny user access to admin routes', async () => {
        const response = await request(app)
            .post('/api/devices')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Test Device',
                ip: '192.168.1.100',
                osType: 'Linux'
            })
            .expect(403);

        expect(response.body.error).toBe('Insufficient permissions');
    });

    test('should allow user access to user routes', async () => {
        const response = await request(app)
            .get('/api/devices')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });
});

describe('Ownership-based Authorization', () => {
    let deviceId;

    beforeEach(async () => {
        // Create a device owned by test user
        const Device = require('../src/models/Device');
        const device = new Device({
            name: 'Test Device',
            ip: '192.168.1.100',
            osType: 'Linux',
            owner: testUser.email
        });
        const savedDevice = await device.save();
        deviceId = savedDevice._id;
    });

    test('should allow owner to update device', async () => {
        const response = await request(app)
            .put(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Device'
            })
            .expect(200);

        expect(response.body.name).toBe('Updated Device');
    });

    test('should deny non-owner to update device', async () => {
        // Create another user
        const otherUser = new User({
            email: 'other@example.com',
            name: 'Other User',
            password: 'password123',
            role: 'user'
        });
        await otherUser.save();
        const otherToken = JWTHelper.generateToken(otherUser);

        const response = await request(app)
            .put(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({
                name: 'Updated Device'
            })
            .expect(403);

        expect(response.body.error).toBe('Access denied');
    });
});