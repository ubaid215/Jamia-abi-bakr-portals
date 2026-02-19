const notificationService = require('./notification.service');
const logger = require('../../utils/logger');

class NotificationController {

    // GET /api/notifications
    async getMyNotifications(req, res) {
        try {
            const { page, limit, isRead, priority, category } = req.query;
            const result = await notificationService.getByRecipient(req.user.id, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                isRead,
                priority,
                category,
            });
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get notifications error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/notifications/unread-count
    async getUnreadCount(req, res) {
        try {
            const count = await notificationService.getUnreadCount(req.user.id);
            res.json({ success: true, data: { count } });
        } catch (error) {
            logger.error({ err: error }, 'Get unread count error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/notifications/:id/read
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const notification = await notificationService.markAsRead(id);
            res.json({ success: true, data: notification });
        } catch (error) {
            logger.error({ err: error }, 'Mark as read error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/notifications/mark-all-read
    async markAllRead(req, res) {
        try {
            const result = await notificationService.markAllRead(req.user.id);
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ err: error }, 'Mark all read error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST /api/notifications (Admin/SuperAdmin)
    async create(req, res) {
        try {
            const notification = await notificationService.create(req.body);
            res.status(201).json({ success: true, data: notification });
        } catch (error) {
            logger.error({ err: error }, 'Create notification error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST /api/notifications/bulk (Admin/SuperAdmin)
    async bulkCreate(req, res) {
        try {
            const { notifications } = req.body;
            if (!Array.isArray(notifications) || notifications.length === 0) {
                return res.status(400).json({ success: false, error: 'notifications array is required' });
            }
            const result = await notificationService.bulkCreate(notifications);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            logger.error({ err: error }, 'Bulk create notification error');
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new NotificationController();
