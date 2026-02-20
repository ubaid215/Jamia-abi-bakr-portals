require('dotenv').config();

// Validate environment BEFORE any other imports
const config = require('./config/config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require("path");

const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const { redisHealthCheck } = require('./db/redisClient');
const prisma = require('./db/prismaClient');

// Import routes
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
const dailyReportRoutes = require("./routes/dailyReportRoutes");


// Import new modular routes
const apiRoutes = require('./routes/index');

const app = express();

// ============================================
// CORS Configuration for Production
// ============================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://jamia.khanqahsaifia.com',
  'https://www.jamia.khanqahsaifia.com',
  'https://api.jamia.khanqahsaifia.com',
  'https://www.api.jamia.khanqahsaifia.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS: blocked request from unauthorized origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token', 'DNT', 'If-Modified-Since', 'Cache-Control', 'Range'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Range', 'Authorization'],
  maxAge: 86400 // 24 hours
};

// ============================================
// Middleware Stack
// ============================================

// 1. Security headers with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.jamia.khanqahsaifia.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Additional hardening
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xFrameOptions: { action: 'deny' },
}));

// 2. Trust proxy (important for Nginx reverse proxy + rate limiting)
app.set('trust proxy', 1); // Trust first proxy only

// 3. CORS
app.use(cors(corsOptions));

// 4. Response compression (gzip)
app.use(compression());

// 5. Request logging
if (config.isProd) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// 6. Body parsing — REDUCED from 50MB to 5MB
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 7. Request timing middleware
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

// ============================================
// Rate Limiting
// ============================================

// Auth endpoints — 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window (login, register, forgot-password etc.)
  message: {
    error: 'Too many requests',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Rate limit by IP
});

// Login endpoint — stricter limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts',
    message: 'Account temporarily locked. Please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Static File Serving
// ============================================
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// ============================================
// API Routes
// ============================================

// Apply rate limiters to auth routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter);

// Apply general rate limiter to all API routes
app.use('/api', apiLimiter);

// Legacy routes
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
// ── Daily Reports (Hifz progress) ──
app.use("/api/reports", dailyReportRoutes);


// New modular routes
app.use('/api', apiRoutes);

// ============================================
// Health & Info Routes
// ============================================

// Enhanced health check with DB and Redis connectivity
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
    version: '1.0.0',
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

// API documentation route
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'Khanqah Saifia Management System API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      auth: '/api/auth',
      enrollment: '/api/enrollment',
      admin: '/api/admin',
      classes: '/api/classes',
      subjects: '/api/subjects',
      attendance: '/api/attendance',
      regularProgress: '/api/regular-progress',
      teachers: '/api/teachers',
      students: '/api/students',
      hifzReports: '/api/hifz',
      activities: '/api/activities',
      pdf: '/api/pdf',
    },
    documentation: 'https://jamia.khanqahsaifia.com/docs',
  });
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api-docs',
  });
});

// Centralized error handler (from middlewares/errorHandler.js)
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
const server = app.listen(config.PORT, '127.0.0.1', () => {
  logger.info(`🚀 Server running at http://127.0.0.1:${config.PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 Health: http://127.0.0.1:${config.PORT}/health`);
  logger.info(`📚 API Docs: http://127.0.0.1:${config.PORT}/api-docs`);
  logger.info(`🔒 Rate limiting: login=5/15min, auth=15/15min, api=100/min`);
  logger.info(`📦 Body limit: 5MB | Compression: enabled`);
  if (config.redisEnabled) {
    logger.info(`🗄️  Redis: ${config.REDIS_URL}`);
  } else {
    logger.info('⚠️  Redis: disabled (set REDIS_URL to enable caching)');
  }
  logger.info('✅ Server ready to accept connections');

  // Start background jobs
  try {
    const { startWeeklyProgressJob } = require('./jobs/weeklyProgressJob');
    const { startNotificationJobs } = require('./jobs/notificationCleanupJob');
    startWeeklyProgressJob();
    startNotificationJobs();
  } catch (err) {
    logger.error({ err }, 'Failed to start background jobs');
  }
});

// Handle graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received: shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;