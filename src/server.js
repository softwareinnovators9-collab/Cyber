/**
 * CyberShield - Main Server Entry Point
 * Initializes and manages the Express server with WebSocket support
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config/environment');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const requestValidator = require('./middleware/requestValidator');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const deviceRoutes = require('./routes/devices');
const incidentRoutes = require('./routes/incidents');
const threatRoutes = require('./routes/threats');
const auditRoutes = require('./routes/audits');
const userRoutes = require('./routes/users');

// Service imports
const WebSocketService = require('./services/websocket');
const db = require('./services/database');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = socketIO(server, {
    cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000
});

// Trust proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Logging Middleware
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie Parser
app.use(cookieParser(config.COOKIE_SECRET));

// Request Validation Middleware
app.use(requestValidator);

// Static Files
app.use(express.static('public'));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = await db.getStats();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: config.NODE_ENV,
            version: '2.0.0',
            database: {
                connected: true,
                stats: dbStatus
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/devices', authMiddleware, deviceRoutes);
app.use('/api/incidents', authMiddleware, incidentRoutes);
app.use('/api/threats', authMiddleware, threatRoutes);
app.use('/api/audit-logs', authMiddleware, auditRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler Middleware
app.use(errorHandler);

// Initialize WebSocket Service
const wsService = new WebSocketService(io);

// Server startup function
const startServer = async () => {
    try {
        // Initialize database
        await db.initialize();
        logger.info('Database initialized successfully');

        // Start server
        server.listen(config.PORT, () => {
            logger.info(`✓ CyberShield server running on port ${config.PORT}`);
            logger.info(`✓ Environment: ${config.NODE_ENV}`);
            logger.info(`✓ Health check: http://localhost:${config.PORT}/health`);
            logger.info(`✓ Dashboard: http://localhost:${config.PORT}/dashboard.html`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await db.disconnect();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await db.disconnect();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start server
if (require.main === module) {
    startServer();
}

module.exports = { app, server, io };