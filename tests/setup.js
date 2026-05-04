/**
 * Jest Setup File
 * Global test configuration and setup
 */

const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cybershield-test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global setup for all tests
beforeAll(async () => {
    // Ensure mongoose is disconnected before tests
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});

// Global teardown for all tests
afterAll(async () => {
    // Clean up mongoose connection
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});