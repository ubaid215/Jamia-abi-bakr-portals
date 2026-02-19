const express = require('express');
const router = express.Router();
const controller = require('./goals.controller');
const {
    authenticateToken,
    requireTeacherOrAdmin,
    requireAdmin,
} = require('../../middlewares/auth');

/**
 * Student Goals Routes
 * Base path: /api/goals
 */

// Get overdue goals (Admin/SuperAdmin) — before /:id
router.get(
    '/overdue',
    authenticateToken,
    requireAdmin,
    controller.getOverdue
);

// Get goal stats
router.get(
    '/stats',
    authenticateToken,
    controller.getStats
);

// Get goals for a student
router.get(
    '/student/:studentId',
    authenticateToken,
    controller.getByStudent
);

// Get goals created by a teacher
router.get(
    '/teacher/:teacherId',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.getByTeacher
);

// Create a goal (Teacher/Admin)
router.post(
    '/',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.create
);

// Update goal details (Teacher/Admin)
router.put(
    '/:id',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.update
);

// Update goal progress
router.put(
    '/:id/progress',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.updateProgress
);

// Mark goal as achieved
router.put(
    '/:id/achieve',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.achieve
);

module.exports = router;
