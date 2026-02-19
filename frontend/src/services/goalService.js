import api from './api';

const goalService = {
    // Create a goal (Teacher/Admin)
    create: async (data) => {
        const response = await api.post('/goals', data);
        return response.data;
    },

    // Get goals for a student
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get(`/goals/student/${studentId}`, { params: filters });
        return response.data;
    },

    // Get goals by teacher
    getByTeacher: async (teacherId, filters = {}) => {
        const response = await api.get(`/goals/teacher/${teacherId}`, { params: filters });
        return response.data;
    },

    // Update goal details
    update: async (goalId, data) => {
        const response = await api.put(`/goals/${goalId}`, data);
        return response.data;
    },

    // Update goal progress
    updateProgress: async (goalId, currentValue) => {
        const response = await api.put(`/goals/${goalId}/progress`, { currentValue });
        return response.data;
    },

    // Mark goal as achieved
    achieve: async (goalId) => {
        const response = await api.put(`/goals/${goalId}/achieve`);
        return response.data;
    },

    // Get overdue goals (Admin only)
    getOverdue: async (filters = {}) => {
        const response = await api.get('/goals/overdue', { params: filters });
        return response.data;
    },

    // Get goal stats
    getStats: async (filters = {}) => {
        const response = await api.get('/goals/stats', { params: filters });
        return response.data;
    },
};

export default goalService;
