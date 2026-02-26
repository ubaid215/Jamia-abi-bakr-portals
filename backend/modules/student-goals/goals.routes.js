/**
 * modules/student-goals/goals.routes.js
 * Mounted at /api/goals
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireTeacherOrAdmin, requireStudentTeacherOrAdmin } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validateRequest');
const { auditLog } = require('../../shared/middleware/auditLog.middleware');
const { ensureStudentIsRegular } = require('../../shared/middleware/studentType.middleware');
const controller = require('./goals.controller');
const { createGoalSchema, updateGoalSchema, listGoalsSchema } = require('./goals.validator');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../../shared/audit/auditLog.constants');

router.post('/', authenticateToken, requireTeacherOrAdmin, validate(createGoalSchema), ensureStudentIsRegular, auditLog(AUDIT_ACTIONS.CREATE, AUDIT_ENTITIES.STUDENT_GOAL), controller.createGoal);
router.get('/', authenticateToken, requireStudentTeacherOrAdmin, validate(listGoalsSchema), controller.listGoals);
router.get('/:id', authenticateToken, requireStudentTeacherOrAdmin, controller.getGoal);
router.patch('/:id', authenticateToken, requireTeacherOrAdmin, validate(updateGoalSchema), auditLog(AUDIT_ACTIONS.UPDATE, AUDIT_ENTITIES.STUDENT_GOAL), controller.updateGoal);
router.delete('/:id', authenticateToken, requireAdmin, auditLog(AUDIT_ACTIONS.DELETE, AUDIT_ENTITIES.STUDENT_GOAL), controller.deleteGoal);

module.exports = router;