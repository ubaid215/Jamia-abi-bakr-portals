import api from './api';

const snapshotService = {
    // Get snapshot for a student
    getSnapshot: async (studentId) => {
        const response = await api.get(`/dashboard/student/${studentId}`);
        return response.data;
    },

    // Recalculate snapshot (Admin only)
    recalculate: async (studentId) => {
        const response = await api.post(`/dashboard/recalculate/${studentId}`);
        return response.data;
    },

    // Bulk recalculate for a class (SuperAdmin only)
    bulkRecalculate: async (classRoomId) => {
        const response = await api.post('/dashboard/bulk-recalculate', { classRoomId });
        return response.data;
    },

    // Get at-risk students
    getAtRisk: async (filters = {}) => {
        const response = await api.get('/dashboard/at-risk', { params: filters });
        return response.data;
    },
};

export default snapshotService;
