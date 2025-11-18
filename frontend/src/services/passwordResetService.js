// services/passwordResetService.js
import api from './api';

const passwordResetService = {
  // Get all users (teachers and students) - FIXED ENDPOINT
  getUsers: async (role = '', search = '') => {
    const params = {};
    if (role) params.role = role;
    if (search) params.search = search;
    
    // Changed from '/users' to '/admin/users'
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Reset user password - FIXED ENDPOINT
  resetUserPassword: async (userId) => {
    // Changed from '/auth/reset-password' to '/admin/users/reset-password'
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  // Search users by name, email, or admission number
  searchUsers: async (query) => {
    const response = await api.get(`/admin/users/search?q=${query}`);
    return response.data;
  }
};

export default passwordResetService;