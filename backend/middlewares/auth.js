const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const { cacheGet, cacheSet, cacheDel } = require('../db/redisClient');
const logger = require('../utils/logger');

// Import JWT_SECRET from centralized config — NO FALLBACK
const config = require('../config/config');
const JWT_SECRET = config.JWT_SECRET;

// Authentication middleware — optimized with Redis caching
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Try Redis cache with fallback
    const cacheKey = `user:${decoded.userId}`;
    let user = null;
    
    try {
      user = await cacheGet(cacheKey);
    } catch (cacheError) {
      // Log but don't fail - just skip cache
      logger.warn('Redis cache error, falling back to DB:', cacheError.message);
    }

    if (!user) {
      // Fetch from DB with SELECT only needed fields
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          phone: true,
          profileImage: true,
          status: true,
          passwordChangedAt: true,
          forcePasswordReset: true,
          createdAt: true,
        },
      });

      if (!user) {
        logger.warn({ userId: decoded.userId }, 'Auth: user not found');
        return res.status(401).json({ error: 'User not found' });
      }

      // Try to cache, but don't wait for it
      cacheSet(cacheKey, user, 300).catch(err => 
        logger.warn('Failed to cache user:', err.message)
      );
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    logger.error({ err: error }, 'Auth: token verification failed');
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Cache invalidation — call when user role/status/password changes
async function invalidateUserCache(userId) {
  await cacheDel(`user:${userId}`);
}

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, role: req.user.role, required: allowedRoles },
        'Auth: insufficient permissions'
      );
      return res.status(403).json({
        error: 'Insufficient permissions',
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
  invalidateUserCache,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireParent,
  requireTeacherOrAdmin,
  requireTeacherOnly,
  requireStudentTeacherOrAdmin,
  requireParentOrAdmin,
  // JWT_SECRET intentionally NOT exported — use config/config.js directly
};