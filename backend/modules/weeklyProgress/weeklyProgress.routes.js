const express = require('express');
const router = express.Router();
const controller = require('./weeklyProgress.controller');
const {
    authenticateToken,
    requireTeacherOrAdmin,
    requireAdmin,
} = require('../../middlewares/auth');

/**
 * Weekly Progress Routes
 * Base path: /api/weekly-progress
 */

// Generate weekly report for a single student
router.post(
    '/generate',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.generate
);

// Bulk generate for entire class
router.post(
    '/bulk-generate',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.bulkGenerate
);

// Get at-risk students (must be before /:id routes)
router.get(
    '/at-risk',
    authenticateToken,
    requireAdmin,
    controller.getAtRisk
);

// Get weekly reports for a student
router.get(
    '/student/:studentId',
    authenticateToken,
    controller.getByStudent
);

// Get weekly reports for a class
router.get(
    '/class/:classRoomId',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.getByClass
);

// Update teacher comments
router.put(
    '/:id/comments',
    authenticateToken,
    requireTeacherOrAdmin,
    controller.updateComments
);

module.exports = router;
