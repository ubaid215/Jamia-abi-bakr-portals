/**
 * modules/weekly-progress/weeklyProgress.routes.js
 * Mounted at /api/weekly-progress
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin, requireTeacherOrAdmin, requireStudentTeacherOrAdmin } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validateRequest');
const { auditLog } = require('../../shared/middleware/auditLog.middleware');
const { ensureStudentIsRegular } = require('../../shared/middleware/studentType.middleware');
const controller = require('./weeklyProgress.controller');
const { generateSchema, updateSchema, listSchema, weekParamsSchema } = require('./weeklyProgress.validator');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');

// POST /api/weekly-progress/generate — Teacher/Admin triggers generation
router.post(
  '/generate',
  authenticateToken,
  requireTeacherOrAdmin,
  validate(generateSchema),
  ensureStudentIsRegular,
  auditLog(AUDIT_ACTIONS.CREATE, AUDIT_ENTITIES.WEEKLY_PROGRESS),
  controller.generateWeeklyProgress
);

// GET /api/weekly-progress — list (role-scoped)
router.get(
  '/',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  validate(listSchema),
  controller.listWeeklyProgress
);

// GET /api/weekly-progress/student/:studentId/current
router.get(
  '/student/:studentId/current',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  controller.getCurrentWeek
);

// GET /api/weekly-progress/student/:studentId/week/:weekNumber/year/:year
router.get(
  '/student/:studentId/week/:weekNumber/year/:year',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  validate(weekParamsSchema),
  controller.getWeeklyProgress
);

// PATCH /api/weekly-progress/:id — teacher adds comments
router.patch(
  '/:id',
  authenticateToken,
  requireTeacherOrAdmin,
  validate(updateSchema),
  auditLog(AUDIT_ACTIONS.UPDATE, AUDIT_ENTITIES.WEEKLY_PROGRESS),
  controller.updateWeeklyProgress
);

module.exports = router;