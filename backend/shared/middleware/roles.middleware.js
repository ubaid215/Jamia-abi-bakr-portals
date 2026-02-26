/**
 * shared/middleware/roles.middleware.js
 * Role-based access control middleware factory
 * Extends auth.js with additional role combinations needed by new modules
 */

const { requireRole } = require('../../middlewares/auth');

// ── Core roles ────────────────────────────────────────────────────────────────
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
const requireTeacherOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);
const requireStudentTeacherOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT']);
const requireParentOrAdmin = requireRole(['SUPER_ADMIN', 'ADMIN', 'PARENT']);
const requireAllRoles = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);

// ── Module-specific combinations ──────────────────────────────────────────────

/** Daily activity — teacher records, admin views, student/parent read-only */
const requireActivityAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);

/** Weekly progress — teacher generates, admin views, student/parent read-only */
const requireProgressAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);

/** Goals — teacher creates/updates, student sees own, parent sees children */
const requireGoalReadAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);
const requireGoalWriteAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

/** Notifications — every authenticated user manages their own */
const requireNotificationAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);

/** Parent communication — teacher writes, parent reads/acknowledges */
const requireParentCommWriteAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);
const requireParentCommReadAccess = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']);

module.exports = {
  requireSuperAdmin,
  requireAdmin,
  requireTeacherOrAdmin,
  requireStudentTeacherOrAdmin,
  requireParentOrAdmin,
  requireAllRoles,
  requireActivityAccess,
  requireProgressAccess,
  requireGoalReadAccess,
  requireGoalWriteAccess,
  requireNotificationAccess,
  requireParentCommWriteAccess,
  requireParentCommReadAccess,
};