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
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 1. Try Redis cache first (TTL: 5 minutes)
    const cacheKey = `user:${decoded.userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      // 2. Cache miss — fetch ONLY essential fields (no profile includes)
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

      // 3. Cache the user data (5 min TTL)
      await cacheSet(cacheKey, user, 300);
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      logger.warn({ userId: user.id, status: user.status }, 'Auth: inactive user attempt');
      return res.status(403).json({
        error: `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
      });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const pwdChangedAt = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);

      if (!decoded.pwdChangedAt || decoded.pwdChangedAt !== pwdChangedAt) {
        logger.warn({ userId: user.id }, 'Auth: token invalidated by password change');
        return res.status(401).json({
          error: 'Session expired. Please login again.',
        });
      }
    }

    // Check if user needs to reset password
    const allowedPaths = [
      '/api/auth/change-password',
      '/auth/change-password',
      '/api/auth/logout',
      '/auth/logout',
      '/api/auth/profile', // Allow fetching profile (needed for frontend context)
    ];

    // Normalize path to handle router nesting and query parameters
    // req.originalUrl contains the full path (e.g., /api/auth/change-password)
    const currentPath = req.originalUrl.split('?')[0];

    // Loose matching to avoid trailing slash or prefix issues
    const isAllowed = allowedPaths.some(path => currentPath.includes(path)) ||
      currentPath.includes('/change-password') ||
      currentPath.includes('/profile') ||
      currentPath.includes('/logout');

    // Force Password Reset Logic - DISABLED BY USER REQUEST
    // if (user.forcePasswordReset && !isAllowed) {
    //   logger.warn({ userId: user.id, path: currentPath }, 'Auth: blocked by forcePasswordReset');
    //   return res.status(403).json({
    //     error: 'Password reset required. Please change your password.',
    //   });
    // }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn({ error: error.message }, 'Auth: invalid token');
      return res.status(403).json({ error: 'Invalid token' });
    }
    logger.error({ err: error }, 'Auth: token verification failed');
    return res.status(500).json({ error: 'Token verification failed' });
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