/**
 * modules/notifications/notifications.routes.js
 * Mounted at /api/notifications
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middlewares/auth');
const controller = require('./notifications.controller');

// All authenticated users can access their notifications
router.get('/', authenticateToken, controller.getNotifications);
router.get('/unread-count', authenticateToken, controller.getUnreadCount);
router.patch('/:id/read', authenticateToken, controller.markAsRead);
router.patch('/read-all', authenticateToken, controller.markAllAsRead);

module.exports = router;