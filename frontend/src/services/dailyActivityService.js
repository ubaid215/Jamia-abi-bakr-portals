import api from './api';

const dailyActivityService = {
    // Create a daily activity record
    create: async (data) => {
        const response = await api.post('/activities', data);
        return response.data;
    },

    // Get activities for a student
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get(`/activities/student/${studentId}`, { params: filters });
        return response.data;
    },

    // Get activities for a class
    getByClass: async (classRoomId, filters = {}) => {
        const response = await api.get(`/activities/class/${classRoomId}`, { params: filters });
        return response.data;
    },

    // Get single activity by ID
    getById: async (id) => {
        const response = await api.get(`/activities/${id}`);
        return response.data;
    },

    // Update an activity
    update: async (id, data) => {
        const response = await api.put(`/activities/${id}`, data);
        return response.data;
    },

    // Delete an activity
    delete: async (id) => {
        const response = await api.delete(`/activities/${id}`);
        return response.data;
    },
};

export default dailyActivityService;
