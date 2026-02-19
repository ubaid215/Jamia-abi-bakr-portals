import api from './api';

const notificationService = {
    // Get my notifications (paginated)
    getAll: async (filters = {}) => {
        const response = await api.get('/notifications', { params: filters });
        return response.data;
    },

    // Get unread count
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    // Mark single notification as read
    markAsRead: async (id) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    // Mark all notifications as read
    markAllRead: async () => {
        const response = await api.put('/notifications/mark-all-read');
        return response.data;
    },

    // Create notification (Admin only)
    create: async (data) => {
        const response = await api.post('/notifications', data);
        return response.data;
    },

    // Bulk create notifications (Admin only)
    bulkCreate: async (notifications) => {
        const response = await api.post('/notifications/bulk', { notifications });
        return response.data;
    },
};

export default notificationService;
