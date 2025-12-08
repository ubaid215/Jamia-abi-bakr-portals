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

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS Configuration
// ============================================
const allowedOrigins = [
  'http://localhost:5173',          
  'http://localhost:3000',
  'https://your-production-domain.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'], // For file downloads
  maxAge: 86400 // 24 hours
};

// ============================================
// Middleware
// ============================================

// Security with relaxed CSP for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for development
}));

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Static File Serving
// ============================================

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      profileImages: '/api/admin/public/profile-image/:userId'
    },
    staticFiles: '/uploads',
    documentation: 'https://docs.khanqahsaifia.com'
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
      message: 'Maximum file size is 5MB'
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
  res.status(error.status || 500).json({ 
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log(`   Khanqah Saifia Management System API`);
  console.log('============================================ 🚀\n');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Info: http://localhost:${PORT}/api`);
  console.log(`📁 Static Files: http://localhost:${PORT}/uploads`);
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
  console.log(`   🖼️  Profile Images: /api/admin/public/profile-image/:userId`);
  console.log('\n✅ Server ready to accept connections\n');
});

module.exports = app;