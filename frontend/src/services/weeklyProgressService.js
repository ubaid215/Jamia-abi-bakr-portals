import api from './api';

const weeklyProgressService = {
    // Generate weekly report for a student
    generate: async (studentId, weekNumber, year) => {
        const response = await api.post('/weekly-progress/generate', { studentId, weekNumber, year });
        return response.data;
    },

    // Bulk generate for an entire class
    bulkGenerate: async (classRoomId, weekNumber, year) => {
        const response = await api.post('/weekly-progress/bulk-generate', { classRoomId, weekNumber, year });
        return response.data;
    },

    // Get weekly reports for a student
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get(`/weekly-progress/student/${studentId}`, { params: filters });
        return response.data;
    },

    // Get weekly reports for a class
    getByClass: async (classRoomId, weekNumber, year) => {
        const response = await api.get(`/weekly-progress/class/${classRoomId}`, { params: { weekNumber, year } });
        return response.data;
    },

    // Update teacher comments on a weekly report
    updateComments: async (id, data) => {
        const response = await api.put(`/weekly-progress/${id}/comments`, data);
        return response.data;
    },

    // Get at-risk students
    getAtRisk: async (filters = {}) => {
        const response = await api.get('/weekly-progress/at-risk', { params: filters });
        return response.data;
    },
};

export default weeklyProgressService;
