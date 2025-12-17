require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require("path");

// Import routes
const authRoutes = require('./routes/authRoute');
const enrollmentRoutes = require('./routes/enrollmentRoute');
const adminRoutes = require('./routes/adminRoute');
const classRoutes = require('./routes/classRoute');
const subjectRoutes = require('./routes/subjectRoute');
const attendanceRoutes = require('./routes/attendanceRoutes');
const progressRoute = require('./routes/progressRoute');
const regularProgressRoutes = require('./routes/regularProgressRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoute = require('./routes/studentRoute');
const hifzReportRoutes = require('./routes/hifzReportRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const hifzRoutes = require('./routes/hifzRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

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
      console.warn(`Blocked by CORS: ${origin}`);
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
// Middleware
// ============================================

// Security headers with production CSP
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
  }
}));

// Trust proxy (important for Nginx reverse proxy)
app.set('trust proxy', true);

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// Static File Serving
// ============================================

// Serve uploaded files
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/progress', progressRoute);
app.use('/api/regular-progress', regularProgressRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoute);
app.use('/api/hifz-reports', hifzReportRoutes);
app.use('/api/reports/pdf', pdfRoutes);
app.use('/api/hifz', hifzRoutes);

// ============================================
// Health & Info Routes
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      auth: 'active',
      enrollment: 'active',
      admin: 'active',
      classes: 'active',
      subjects: 'active',
      attendance: 'active',
      progress: 'active'
    }
  });
});

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    message: 'Khanqah Saifia Management System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      enrollment: '/api/enrollment',
      admin: '/api/admin',
      classes: '/api/classes',
      subjects: '/api/subjects',
      attendance: '/api/attendance',
      progress: '/api/progress',
      regularProgress: '/api/regular-progress',
      teachers: '/api/teachers',
      students: '/api/students',
      hifzReports: '/api/hifz-reports'
    },
    publicEndpoints: {
      profileImages: '/uploads/profile-images/',
      documents: '/uploads/documents/'
    },
    staticFiles: '/uploads',
    documentation: 'https://jamia.khanqahsaifia.com/docs'
  });
});

// ============================================
// Error Handling Middleware
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message || error);
  
  // CORS error handling
  if (error.message.includes('CORS')) {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      message: 'Origin not allowed',
      allowedOrigins: allowedOrigins
    });
  }
  
  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'Maximum file size is 50MB'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Too many files',
      message: error.message
    });
  }
  
  // Prisma errors
  if (error.code && error.code.startsWith('P')) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed',
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { details: error.meta })
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Generic error
  const status = error.status || 500;
  const response = {
    error: error.message || 'Internal server error'
  };
  
  // Add stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }
  
  res.status(status).json(response);
});

// ============================================
// Start Server
// ============================================
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('\n🚀 ============================================');
  console.log(`   Khanqah Saifia Management System API`);
  console.log('============================================ 🚀\n');
  console.log(`🌐 Server: http://127.0.0.1:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://127.0.0.1:${PORT}/health`);
  console.log(`📚 API Info: http://127.0.0.1:${PORT}/api`);
  console.log(`📁 Static Files: http://127.0.0.1:${PORT}/uploads`);
  console.log('\n📋 Available API Endpoints:');
  console.log(`   🔐 Auth:       /api/auth`);
  console.log(`   🎓 Enrollment: /api/enrollment`);
  console.log(`   👑 Admin:      /api/admin`);
  console.log(`   🏫 Classes:    /api/classes`);
  console.log(`   📖 Subjects:   /api/subjects`);
  console.log(`   ✅ Attendance: /api/attendance`);
  console.log(`   📊 Progress:   /api/progress`);
  console.log(`   👨‍🏫 Teachers:   /api/teachers`);
  console.log(`   👨‍🎓 Students:   /api/students`);
  console.log(`   📈 Reports:    /api/hifz-reports`);
  console.log('\n🔓 Public Endpoints:');
  console.log(`   🖼️  Profile Images: /uploads/profile-images/`);
  console.log(`   📄 Documents: /uploads/documents/`);
  console.log('\n✅ Server ready to accept connections\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;