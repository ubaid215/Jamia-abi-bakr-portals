/**
 * modules/daily-activity/dailyActivity.routes.js
 * Routes for DailyActivity — mounted at /api/activities
 *
 * Role access:
 *   POST   /             → Teacher, Admin, Super Admin
 *   GET    /             → Teacher, Admin, Super Admin, Student (own), Parent (children)
 *   GET    /:id          → Teacher, Admin, Super Admin, Student (own), Parent (children)
 *   GET    /student/:studentId/date/:date → Teacher, Admin, Super Admin, Student (own), Parent
 *   PATCH  /:id          → Teacher (own records), Admin, Super Admin
 *   DELETE /:id          → Admin, Super Admin only
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin, requireTeacherOrAdmin, requireStudentTeacherOrAdmin } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validateRequest');
const { auditLog } = require('../../shared/middleware/auditLog.middleware');
const { ensureStudentIsRegular } = require('../../shared/middleware/studentType.middleware');
const controller = require('./dailyActivity.controller');
const {
  createActivitySchema,
  updateActivitySchema,
  listActivitiesSchema,
  activityParamsSchema,
  studentDateParamsSchema,
} = require('./dailyActivity.validator');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');

// ── POST /api/activities ──────────────────────────────────────────────────────
// Teacher records a daily activity for a REGULAR student
router.post(
  '/',
  authenticateToken,
  requireTeacherOrAdmin,
  validate(createActivitySchema),
  ensureStudentIsRegular,
  auditLog(AUDIT_ACTIONS.CREATE, AUDIT_ENTITIES.DAILY_ACTIVITY),
  controller.createActivity
);

// ── GET /api/activities ───────────────────────────────────────────────────────
// List activities — role-scoped in service layer
router.get(
  '/',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  validate(listActivitiesSchema),
  controller.listActivities
);

// ── GET /api/activities/student/:studentId/date/:date ─────────────────────────
// Get one specific day's activity for a student
router.get(
  '/student/:studentId/date/:date',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  validate(studentDateParamsSchema),
  controller.getActivityByStudentAndDate
);

// ── GET /api/activities/:id ───────────────────────────────────────────────────
router.get(
  '/:id',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  validate(activityParamsSchema),
  controller.getActivity
);

// ── PATCH /api/activities/:id ─────────────────────────────────────────────────
router.patch(
  '/:id',
  authenticateToken,
  requireTeacherOrAdmin,
  validate(updateActivitySchema),
  auditLog(AUDIT_ACTIONS.UPDATE, AUDIT_ENTITIES.DAILY_ACTIVITY),
  controller.updateActivity
);

// ── DELETE /api/activities/:id ────────────────────────────────────────────────
// Only admins can delete
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(activityParamsSchema),
  auditLog(AUDIT_ACTIONS.DELETE, AUDIT_ENTITIES.DAILY_ACTIVITY),
  controller.deleteActivity
);

module.exports = router;