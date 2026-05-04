#!/usr/bin/env node

/**
 * Docker Health Check Script
 * Checks if the application is healthy and responding
 */

const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0); // Healthy
    } else {
        console.error(`Health check failed: HTTP ${res.statusCode}`);
        process.exit(1); // Unhealthy
    }
});

req.on('error', (err) => {
    console.error('Health check error:', err.message);
    process.exit(1); // Unhealthy
});

req.on('timeout', () => {
    console.error('Health check timeout');
    req.destroy();
    process.exit(1); // Unhealthy
});

req.end();