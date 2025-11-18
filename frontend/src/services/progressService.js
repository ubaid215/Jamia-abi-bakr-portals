import api from './api';

const progressService = {
  // Record Hifz progress
  recordHifzProgress: async (progressData) => {
    const response = await api.post('/progress/hifz', progressData);
    return response.data;
  },

  // Record Nazra progress
  recordNazraProgress: async (progressData) => {
    const response = await api.post('/progress/nazra', progressData);
    return response.data;
  },

  // Get student progress
  getStudentProgress: async (filters = {}) => {
    const response = await api.get('/progress/student', { params: filters });
    return response.data;
  },

  // Get class progress
  getClassProgress: async (filters = {}) => {
    const response = await api.get('/progress/class', { params: filters });
    return response.data;
  },

  // Update progress
  updateProgress: async (progressId, progressData) => {
    const response = await api.put(`/progress/${progressId}`, progressData);
    return response.data;
  }
};

export default progressService;