const express = require('express');
const router = express.Router();
const controller = require('./progressSnapshot.controller');
const {
    authenticateToken,
    requireAdmin,
    requireSuperAdmin,
} = require('../../middlewares/auth');

/**
 * Progress Dashboard / Snapshot Routes
 * Base path: /api/dashboard
 */

// Get at-risk students (before /:studentId to avoid param collision)
router.get(
    '/at-risk',
    authenticateToken,
    requireAdmin,
    controller.getAtRisk
);

// Bulk recalculate snapshots for a class
router.post(
    '/bulk-recalculate',
    authenticateToken,
    requireSuperAdmin,
    controller.bulkRecalculate
);

// Get snapshot for a student
router.get(
    '/student/:studentId',
    authenticateToken,
    controller.getSnapshot
);

// Recalculate snapshot for a student
router.post(
    '/recalculate/:studentId',
    authenticateToken,
    requireAdmin,
    controller.recalculate
);

module.exports = router;
