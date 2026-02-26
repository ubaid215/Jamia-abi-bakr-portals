// FILE: src/services/notificationService.js
// PATTERN FROM: src/services/dailyActivityService.js (existing pattern)
// BACKEND CONTRACT:
//   backend/modules/notifications/notifications.routes.js
//   backend/modules/notifications/notifications.repository.js (response: notifSelect)
//   backend/modules/notifications/notifications.gateway.js (socket events)
//
// FIXED:
//   - markAsRead:  was PUT /:id/read → correct: PATCH /:id/read
//   - markAllRead: was PUT /mark-all-read (non-existent) → correct: PATCH /read-all
// REMOVED (endpoints don't exist in backend):
//   - create (POST /notifications)
//   - bulkCreate (POST /notifications/bulk)
//
// RESPONSE SHAPE (from notifSelect):
//   { id, studentId, recipientType, recipientId, notificationType, category, priority,
//     title, message, data, requiresAction, actionType, actionDeadline, isRead, readAt,
//     actionUrl, batchId, deliveryMethod, emailSent, smsSent, createdAt, expiresAt }

import api from './api';

const notificationService = {
    // GET /api/notifications
    // Returns paginated list of own notifications (role-scoped server-side)
    // Query: { page?, limit? }
    getAll: async (filters = {}) => {
        const response = await api.get('/notifications', { params: filters });
        return response.data;
    },

    // GET /api/notifications/unread-count
    // Returns { data: { unreadCount: number } }
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    // PATCH /api/notifications/:id/read  (NOT PUT — backend uses router.patch)
    markAsRead: async (id) => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    // PATCH /api/notifications/read-all  (NOT PUT, NOT /mark-all-read)
    markAllAsRead: async () => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    },
};

export default notificationService;
