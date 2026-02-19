const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const {
    authenticateToken,
    requireAdmin,
} = require('../../middlewares/auth');

/**
 * Notification Routes
 * Base path: /api/notifications
 */

// Get unread count (above parameterized routes)
router.get(
    '/unread-count',
    authenticateToken,
    controller.getUnreadCount
);

// Mark all as read
router.put(
    '/mark-all-read',
    authenticateToken,
    controller.markAllRead
);

// Get my notifications (paginated)
router.get(
    '/',
    authenticateToken,
    controller.getMyNotifications
);

// Create notification (Admin only)
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    controller.create
);

// Bulk create (Admin only)
router.post(
    '/bulk',
    authenticateToken,
    requireAdmin,
    controller.bulkCreate
);

// Mark single notification as read
router.put(
    '/:id/read',
    authenticateToken,
    controller.markAsRead
);

module.exports = router;
