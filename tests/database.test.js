/**
 * Database Service Tests
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const db = require('../src/services/database');
const User = require('../src/models/User');
const Device = require('../src/models/Device');
const Threat = require('../src/models/Threat');
const Incident = require('../src/models/Incident');
const AuditLog = require('../src/models/AuditLog');

let mongoServer;

beforeAll(async () => {
    // Start in-memory MongoDB with longer timeout
    mongoServer = await MongoMemoryServer.create({
        instance: {
            port: 27020, // Use a different port to avoid conflicts
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
});

describe('User Operations', () => {
    test('should save and retrieve user by email', async () => {
        const user = new User({
            email: 'test@example.com',
            name: 'Test User',
            password: 'password123'
        });

        await db.saveUser(user);
        const retrieved = await db.getUserByEmail('test@example.com');

        expect(retrieved.email).toBe('test@example.com');
        expect(retrieved.name).toBe('Test User');
    });

    test('should get all users', async () => {
        const user1 = new User({ email: 'user1@example.com', name: 'User 1', password: 'pass' });
        const user2 = new User({ email: 'user2@example.com', name: 'User 2', password: 'pass' });

        await db.saveUser(user1);
        await db.saveUser(user2);

        const users = await db.getAllUsers();
        expect(users.length).toBe(2);
    });
});

describe('Device Operations', () => {
    test('should save and retrieve device', async () => {
        const device = new Device({
            name: 'Test Device',
            ip: '192.168.1.100',
            osType: 'Linux',
            owner: 'test@example.com'
        });

        const saved = await db.saveDevice(device);
        const retrieved = await db.getDevice(saved._id);

        expect(retrieved.name).toBe('Test Device');
        expect(retrieved.ip).toBe('192.168.1.100');
    });

    test('should get devices by owner', async () => {
        const device1 = new Device({
            name: 'Device 1',
            ip: '192.168.1.100',
            osType: 'Linux',
            owner: 'owner1@example.com'
        });
        const device2 = new Device({
            name: 'Device 2',
            ip: '192.168.1.101',
            osType: 'Windows',
            owner: 'owner1@example.com'
        });
        const device3 = new Device({
            name: 'Device 3',
            ip: '192.168.1.102',
            osType: 'Linux',
            owner: 'owner2@example.com'
        });

        await db.saveDevice(device1);
        await db.saveDevice(device2);
        await db.saveDevice(device3);

        const ownerDevices = await db.getDevicesByOwner('owner1@example.com');
        expect(ownerDevices.length).toBe(2);
    });
});

describe('Threat Operations', () => {
    test('should save and retrieve threat', async () => {
        const threat = new Threat({
            type: 'Malware',
            severity: 'high',
            source: '192.168.1.100',
            target: '192.168.1.200',
            description: 'Test threat'
        });

        const saved = await db.saveThreat(threat);
        const retrieved = await db.getThreat(saved._id);

        expect(retrieved.type).toBe('Malware');
        expect(retrieved.severity).toBe('high');
        expect(retrieved.getThreatScore()).toBe(75);
    });

    test('should get threats by type', async () => {
        const threat1 = new Threat({
            type: 'Malware',
            severity: 'high',
            source: '192.168.1.100',
            target: '192.168.1.200'
        });
        const threat2 = new Threat({
            type: 'DDoS',
            severity: 'critical',
            source: '192.168.1.101',
            target: '192.168.1.201'
        });

        await db.saveThreat(threat1);
        await db.saveThreat(threat2);

        const malwareThreats = await db.getThreatsByType('Malware');
        expect(malwareThreats.length).toBe(1);
        expect(malwareThreats[0].type).toBe('Malware');
    });
});

describe('Incident Operations', () => {
    test('should save and retrieve incident', async () => {
        const incident = new Incident({
            title: 'Test Incident',
            description: 'Test incident description',
            severity: 'high',
            createdBy: 'test@example.com'
        });

        const saved = await db.saveIncident(incident);
        const retrieved = await db.getIncident(saved._id);

        expect(retrieved.title).toBe('Test Incident');
        expect(retrieved.severity).toBe('high');
    });

    test('should get incidents by status', async () => {
        const incident1 = new Incident({
            title: 'Open Incident',
            description: 'Open incident',
            status: 'open',
            createdBy: 'test@example.com'
        });
        const incident2 = new Incident({
            title: 'Resolved Incident',
            description: 'Resolved incident',
            status: 'resolved',
            createdBy: 'test@example.com'
        });

        await db.saveIncident(incident1);
        await db.saveIncident(incident2);

        const openIncidents = await db.getIncidentsByStatus('open');
        expect(openIncidents.length).toBe(1);
        expect(openIncidents[0].status).toBe('open');
    });
});

describe('Audit Log Operations', () => {
    test('should save and retrieve audit logs', async () => {
        const auditLog = AuditLog.logAction(
            'LOGIN_SUCCESS',
            { email: 'test@example.com', id: 'user123' },
            'user',
            'user123',
            { ip: '192.168.1.100' },
            '192.168.1.100',
            'Mozilla/5.0'
        );

        await db.saveAuditLog(auditLog);

        const logs = await db.getRecentAuditLogs(10);
        expect(logs.length).toBe(1);
        expect(logs[0].action).toBe('LOGIN_SUCCESS');
        expect(logs[0].user).toBe('test@example.com');
    });

    test('should get audit logs by user', async () => {
        const log1 = AuditLog.logAction(
            'LOGIN_SUCCESS',
            { email: 'user1@example.com', id: 'user1' },
            'user',
            'user1',
            {},
            '192.168.1.100',
            'Mozilla/5.0'
        );
        const log2 = AuditLog.logAction(
            'DEVICE_CREATED',
            { email: 'user1@example.com', id: 'user1' },
            'device',
            'device1',
            {},
            '192.168.1.100',
            'Mozilla/5.0'
        );
        const log3 = AuditLog.logAction(
            'LOGIN_SUCCESS',
            { email: 'user2@example.com', id: 'user2' },
            'user',
            'user2',
            {},
            '192.168.1.101',
            'Mozilla/5.0'
        );

        await db.saveAuditLog(log1);
        await db.saveAuditLog(log2);
        await db.saveAuditLog(log3);

        const user1Logs = await db.getAuditLogsByUser('user1@example.com');
        expect(user1Logs.length).toBe(2);
    });
});

describe('Database Stats', () => {
    test('should get database statistics', async () => {
        // Create some test data
        const user = new User({ email: 'stats@example.com', name: 'Stats User', password: 'pass' });
        const device = new Device({ name: 'Stats Device', ip: '192.168.1.100', osType: 'Linux', owner: 'stats@example.com' });
        const threat = new Threat({ type: 'Malware', severity: 'high', source: '192.168.1.1', target: '192.168.1.100' });

        await db.saveUser(user);
        await db.saveDevice(device);
        await db.saveThreat(threat);

        const stats = await db.getStats();

        expect(stats.users).toBe(1);
        expect(stats.devices).toBe(1);
        expect(stats.threats).toBe(1);
        expect(stats.incidents).toBe(0);
        expect(stats.auditLogs).toBe(0);
    });
});