import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);

  // Check for existing authentication on app start
useEffect(() => {
  const initializeAuth = async () => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        // 1. Parse stored user data
        const parsedUser = JSON.parse(storedUser);
        
        // 2. Set user IMMEDIATELY (prevents flash/logout on navigation)
        setUser(parsedUser);
        
        // 3. Verify token in background (non-blocking)
        authService.getProfile()
          .then((userData) => {
            // Update with fresh data if verification succeeds
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          })
          .catch((error) => {
            console.error('Background token verification failed:', error);
            
            // Only logout on auth errors, not network errors
            if (error.response?.status === 401 || error.response?.status === 403) {
              const errorMessage = error.response.data?.error || '';
              const isAuthError = 
                errorMessage.includes('token') || 
                errorMessage.includes('expired') || 
                errorMessage.includes('invalid');
              
              if (isAuthError) {
                console.log('Token invalid, logging out');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                setUser(null);
              }
            }
            // For other errors, keep using cached user data
          });
        
      } catch (parseError) {
        // Corrupted localStorage data
        console.error('Failed to parse stored user:', parseError);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    
    // Set loading to false immediately
    setLoading(false);
  };

  initializeAuth();
}, []);
  // Login function for all users
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      const { user: userData, token } = response;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('authToken', token);
      
      return userData;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setLoading(false);
    }
  }, []);

  // Get user profile
  const getProfile = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to get profile';
      setError(errorMessage);
      
      // If getting profile fails, user might be logged out
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset user password (Admin only)
  const resetUserPassword = useCallback(async (userId) => {
    setLoading(true);
    try {
      const result = await authService.resetUserPassword(userId);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles) => {
    return roles.includes(user?.role);
  }, [user]);

  const value = {
    // State
    user,
    loading,
    error,
    
    // Auth status
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    isParent: user?.role === 'PARENT',
    
    // Methods
    login,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    resetUserPassword,
    clearError,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;