/**
 * shared/middleware/auth.middleware.js
 * Re-exports JWT authentication middleware from the existing middlewares/auth.js
 * Provides a consistent import path for the new src/shared/middleware structure
 *
 * Usage in modules:
 *   const { authenticateToken, requireAdmin } = require('../../shared/middleware/auth.middleware');
 */

const {
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
} = require('../../middlewares/auth');

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
};