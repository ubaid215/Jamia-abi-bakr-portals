
require('dotenv').config();
const config = require('./config/config');

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const { redisHealthCheck } = require('./db/redisClient');
const prisma = require('./db/prismaClient');
const { ipKeyGenerator } = require('express-rate-limit');

// ── Legacy routes ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoute');
const enrollmentRoutes = require('./routes/enrollmentRoute');
const adminRoutes = require('./routes/adminRoute');
const classRoutes = require('./routes/classRoute');
const subjectRoutes = require('./routes/subjectRoute');
const attendanceRoutes = require('./routes/attendanceRoutes');
const regularProgressRoutes = require('./routes/regularProgressRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const pdfRoute = require('./routes/pdfRoute');
const studentRoute = require('./routes/studentRoute');
const hifzRoutes = require('./routes/hifzRoutes');
const dailyReportRoutes = require('./routes/dailyReportRoutes');

// ── New modular routes (src/modules/*) ───────────────────────────────────────
const apiRoutes = require('./routes/index');

const app = express();

// ============================================================
// CORS
// ============================================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://jamia.khanqahsaifia.com',
  'https://www.jamia.khanqahsaifia.com',
  'https://api.jamia.khanqahsaifia.com',
  'https://www.api.jamia.khanqahsaifia.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS: blocked request from unauthorized origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With',
    'Accept', 'X-CSRF-Token', 'DNT', 'If-Modified-Since',
    'Cache-Control', 'Range',
  ],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Range', 'Authorization'],
  maxAge: 86400,
};

// ============================================================
// Middleware stack
// ============================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.jamia.khanqahsaifia.com', 'wss://api.jamia.khanqahsaifia.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xFrameOptions: { action: 'deny' },
}));

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(compression());

if (config.isProd) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      }, 'Slow request detected');
    }
  });
  next();
});

// ============================================================
// Rate limiting
// ============================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many requests', message: 'Too many authentication attempts. Try again in 15 minutes.', retryAfter: '15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts', message: 'Account temporarily locked. Try again in 15 minutes.', retryAfter: '15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded', message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// Static files
// ============================================================

const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  },
}));

// ============================================================
// API Routes
// ============================================================

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Legacy routes (unchanged)
app.use('/api/auth', authRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/regular-progress', regularProgressRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoute);
app.use('/api/pdf', pdfRoute);
app.use('/api/hifz', hifzRoutes);
app.use('/api/reports', dailyReportRoutes);

// New modular routes
app.use('/api', apiRoutes);

// ============================================================
// Health & Info
// ============================================================

app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  let dbLatency = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = `${Date.now() - dbStart}ms`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
    logger.error({ err }, 'Health check: DB connection failed');
  }

  const redisStatus = await redisHealthCheck();
  const healthy = dbStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '2.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
    services: {
      database: { status: dbStatus, latency: dbLatency },
      redis: redisStatus,
    },
  });
});

app.get('/api-docs', (req, res) => {
  res.json({
    message: 'Khanqah Saifia Management System API',
    version: '2.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      // Legacy
      auth: '/api/auth',
      enrollment: '/api/enrollment',
      admin: '/api/admin',
      classes: '/api/classes',
      subjects: '/api/subjects',
      attendance: '/api/attendance',
      regularProgress: '/api/regular-progress',
      teachers: '/api/teachers',
      students: '/api/students',
      hifz: '/api/hifz',
      pdf: '/api/pdf',
      // New modular
      activities: '/api/activities',
      weeklyProgress: '/api/weekly-progress',
      dashboard: '/api/dashboard',
      notifications: '/api/notifications',
      goals: '/api/goals',
      parentCommunication: '/api/parent-communication',
    },
    websocket: 'wss://api.jamia.khanqahsaifia.com',
    documentation: 'https://jamia.khanqahsaifia.com/docs',
  });
});

// ============================================================
// Error handling
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api-docs',
  });
});

app.use(errorHandler);

// ============================================================
// HTTP Server + Socket.io initialization
// ============================================================

const server = http.createServer(app);

// Initialize Socket.io — MUST happen before server.listen
let io = null;
try {
  const { createSocketServer } = require('./shared/websocket/socket.init');
  io = createSocketServer(server);

  // Register notification gateway handlers on every new socket connection
  const { registerNotificationHandlers } = require('./modules/notifications/notifications.gateway');
  io.on('connection', (socket) => {
    registerNotificationHandlers(socket);
  });

  logger.info('✅ Socket.io initialized');
} catch (err) {
  logger.error({ err }, '❌ Socket.io initialization failed — continuing without WebSocket');
}

// ============================================================
// Start server
// ============================================================

server.listen(config.PORT, '127.0.0.1', () => {
  logger.info(`🚀 Server running at http://127.0.0.1:${config.PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 Health: http://127.0.0.1:${config.PORT}/health`);
  logger.info(`📚 API Docs: http://127.0.0.1:${config.PORT}/api-docs`);
  logger.info(`🔒 Rate limiting: login=5/15min, auth=15/15min, api=100/min`);
  logger.info(`📦 Body limit: 5MB | Compression: enabled`);
  logger.info(`🔌 WebSocket: ${io ? 'enabled' : 'disabled'}`);

  if (config.redisEnabled) {
    logger.info(`🗄️  Redis: ${config.REDIS_URL}`);
  } else {
    logger.info('⚠️  Redis: disabled (set REDIS_URL to enable caching)');
  }

  // Start new unified cron scheduler
  try {
    const { registerAllJobs } = require('./shared/scheduler/scheduler.registry');
    registerAllJobs();
    logger.info('⏰ Cron scheduler: started');
  } catch (err) {
    logger.error({ err }, '❌ Failed to start cron scheduler');
  }

  logger.info('✅ Server ready to accept connections');
});

// ============================================================
// Graceful shutdown
// ============================================================

const shutdown = (signal) => {
  logger.info(`${signal} received: shutting down gracefully`);

  // 1. Stop accepting new cron job runs
  try {
    const { stopAll } = require('./shared/scheduler/scheduler.registry');
    stopAll();
    logger.info('⏰ Cron jobs stopped');
  } catch (_) {}

  // 2. Close HTTP server (stops accepting new connections)
  server.close(async () => {
    logger.info('🔌 HTTP server closed');

    // 3. Disconnect Socket.io
    if (io) {
      await new Promise(resolve => io.close(resolve));
      logger.info('🔌 Socket.io closed');
    }

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 15s
  setTimeout(() => {
    logger.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions — log and exit
process.on('uncaughtException', (err) => {
  logger.error({ err }, '❌ Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '❌ Unhandled promise rejection');
});

module.exports = { app, server, io };