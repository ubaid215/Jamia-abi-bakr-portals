/**
 * modules/progress-snapshot/snapshot.routes.js
 * Mounted at /api/dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireTeacherOrAdmin, requireStudentTeacherOrAdmin } = require('../../middlewares/auth');
const controller = require('./snapshot.controller');

router.get('/student/:studentId', authenticateToken, requireStudentTeacherOrAdmin, controller.getSnapshot);
router.post('/student/:studentId/refresh', authenticateToken, requireTeacherOrAdmin, controller.refreshSnapshot);
router.post('/classroom/:classRoomId/refresh', authenticateToken, requireTeacherOrAdmin, controller.refreshClassRoom);
router.get('/at-risk', authenticateToken, requireTeacherOrAdmin, controller.getAtRiskStudents);

module.exports = router;