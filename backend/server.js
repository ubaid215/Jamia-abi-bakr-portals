require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

// ✅ CORS configuration
const allowedOrigins = [
  'http://localhost:5173',          
  'http://localhost:3000',
  'https://your-production-domain.com' // your live frontend domain
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies & authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions)); // ✅ use configured CORS
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
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
      subjects: 'active'
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
      subjects: '/api/subjects'
    },
    documentation: 'https://docs.khanqahsaifia.com'
  });
});





// Error handling middleware
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
  
  // Prisma errors
  if (error.code && error.code.startsWith('P')) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed',
      code: error.code
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: ${process.env.DOMAIN}:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log('\n📋 Available API Endpoints:');
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`🎓 Enrollment: http://localhost:${PORT}/api/enrollment`);
  console.log(`👑 Admin: http://localhost:${PORT}/api/admin`);
  console.log(`🏫 Classes: http://localhost:${PORT}/api/classes`);
  console.log(`📖 Subjects: http://localhost:${PORT}/api/subjects`);
  console.log(`📖 Attendance: http://localhost:${PORT}/api/attendance`);
  console.log(`📖 Progress: http://localhost:${PORT}/api/progress`);
  console.log(`📖 Teacher: http://localhost:${PORT}/api/teacher`);
  console.log(`📖 Student: http://localhost:${PORT}/api/student`);
  console.log(`📖 Regular-Progress: http://localhost:${PORT}/api/regular-progress`);
});

module.exports = app;