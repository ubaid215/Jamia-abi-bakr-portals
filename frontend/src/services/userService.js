import api from './api';

const userService = {
  // Get all users (Admin only)
  getUsers: async (filters = {}) => {
    const response = await api.get('/users', { params: filters });
    return response.data;
  },

  // Get user by ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user (Super Admin only)
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Update user status (Super Admin only)
  updateUserStatus: async (id, status) => {
    const response = await api.put(`/users/${id}/status`, { status });
    return response.data;
  }
};

export default userService;