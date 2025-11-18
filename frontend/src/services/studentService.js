import api from './api';

const studentService = {
  // Student dashboard
  getDashboard: async () => {
    const response = await api.get('/students/dashboard');
    return response.data;
  },

  // Attendance
  getMyAttendance: async (filters = {}) => {
    const response = await api.get('/students/attendance', { params: filters });
    return response.data;
  },

  // Progress and performance
  getMyProgress: async () => {
    const response = await api.get('/students/progress');
    return response.data;
  },

  // Class information
  getMyClassHistory: async () => {
    const response = await api.get('/students/class-history');
    return response.data;
  },

  getMyCurrentClass: async () => {
    const response = await api.get('/students/current-class');
    return response.data;
  },

  // Profile management
  getMyProfile: async () => {
    const response = await api.get('/students/profile');
    return response.data;
  },

  updateMyProfile: async (profileData) => {
    const response = await api.put('/students/profile', profileData);
    return response.data;
  }
};

export default studentService;