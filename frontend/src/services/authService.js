import api from './api';

const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      // Even if logout fails on backend, we should clear frontend
      console.error('Logout error:', error);
      return { message: 'Logged out locally' };
    }
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data.user; // Extract user from { user: {...} }
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data.user; // Extract user from { message, user: {...} }
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  resetUserPassword: async (userId) => {
    const response = await api.post(`/auth/reset-password/${userId}`);
    return response.data;
  }
};

export default authService;