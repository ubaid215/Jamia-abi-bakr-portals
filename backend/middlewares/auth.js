const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        profileImage: true,
        status: true, // Added status field
        createdAt: true,
        teacherProfile: {
          select: {
            id: true,
            bio: true,
            specialization: true
          }
        },
        studentProfile: {
          select: {
            id: true,
            admissionNo: true
          }
        },
        parentProfile: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: `Account is ${user.status.toLowerCase()}. Please contact administrator.` 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Specific role middlewares for convenience
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
const requireTeacher = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);
const requireStudent = requireRole(['STUDENT']);
const requireParent = requireRole(['PARENT']);

// Teacher or Admin middleware (for attendance, reports, etc.)
const requireTeacherOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

// Teacher only middleware (strict teacher access)
const requireTeacherOnly = requireRole(['TEACHER']);

// Student or Teacher or Admin middleware (for viewing own data)
const requireStudentTeacherOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT']);

// Parent or Admin middleware
const requireParentOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'PARENT']);

module.exports = {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireParent,
  requireTeacherOrAdmin,     // Added
  requireTeacherOnly,        // Added
  requireStudentTeacherOrAdmin, // Added
  requireParentOrAdmin,      // Added
  JWT_SECRET
};