// src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - CRITICAL FIX
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle actual authentication errors
    if (error.response) {
      const status = error.response.status;

      // Only logout on authentication/authorization errors
      if (status === 401 || status === 403) {
        const errorMessage = error.response.data?.error || '';

        // Check if it's actually an auth error, not just a permission error
        const isAuthError =
          errorMessage.includes('token') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('invalid') ||
          errorMessage === 'Access token required';

        // Check for password reset requirement
        const isPasswordResetRequired =
          errorMessage.includes('Password reset required') ||
          errorMessage.includes('password change');

        if (isPasswordResetRequired) {
          console.log('Password reset required, redirecting');
          if (!window.location.pathname.includes('/change-password')) {
            window.location.href = '/change-password';
          }
          // Don't log out, let them change password with current token
          return Promise.reject(error);
        }

        if (isAuthError) {
          console.log('Auth token invalid, clearing session');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');

          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        // For permission errors (403 with valid token), don't logout
      }
    } else if (error.request) {
      // Network error - keep session
      console.log('Network error - keeping user session');
    } else {
      // Request setup error
      console.log('Request configuration error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;