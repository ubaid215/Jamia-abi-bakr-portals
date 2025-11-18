// contexts/PasswordResetContext.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import passwordResetService from '../services/passwordResetService';
import { toast } from 'react-hot-toast';

// Action types
const PASSWORD_RESET_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUCCESS: 'SET_SUCCESS',
  SET_USERS: 'SET_USERS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_CREDENTIALS: 'SET_CREDENTIALS',
  RESET_STATE: 'RESET_STATE'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  success: null,
  users: [],
  searchResults: [],
  credentials: null
};

// Reducer
const passwordResetReducer = (state, action) => {
  switch (action.type) {
    case PASSWORD_RESET_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case PASSWORD_RESET_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
        success: null
      };
    
    case PASSWORD_RESET_ACTIONS.SET_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        success: action.payload
      };
    
    case PASSWORD_RESET_ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload,
        loading: false,
        error: null
      };
    
    case PASSWORD_RESET_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        loading: false,
        error: null
      };
    
    case PASSWORD_RESET_ACTIONS.SET_CREDENTIALS:
      return {
        ...state,
        credentials: action.payload,
        loading: false,
        error: null,
        success: 'Password reset successfully'
      };
    
    case PASSWORD_RESET_ACTIONS.RESET_STATE:
      return initialState;
    
    default:
      return state;
  }
};

// Create context
const PasswordResetContext = createContext();

// Provider component
export const PasswordResetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(passwordResetReducer, initialState);

  // Reset state
  const resetState = useCallback(() => {
    dispatch({ type: PASSWORD_RESET_ACTIONS.RESET_STATE });
  }, []);

  // Set loading
  const setLoading = useCallback((loading) => {
    dispatch({ type: PASSWORD_RESET_ACTIONS.SET_LOADING, payload: loading });
  }, []);

  // Get all users
  const getUsers = useCallback(async (role = '', search = '') => {
    try {
      setLoading(true);
      const users = await passwordResetService.getUsers(role, search);
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_USERS, payload: users });
      return users;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch users';
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [setLoading]);

  // Search users
  const searchUsers = useCallback(async (query) => {
    try {
      setLoading(true);
      const results = await passwordResetService.searchUsers(query);
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_SEARCH_RESULTS, payload: results });
      return results;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to search users';
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Reset user password
  const resetUserPassword = useCallback(async (userId) => {
    try {
      setLoading(true);
      const result = await passwordResetService.resetUserPassword(userId);
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_CREDENTIALS, payload: result });
      toast.success('Password reset successfully');
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to reset password';
      dispatch({ type: PASSWORD_RESET_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [setLoading]);

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    getUsers,
    searchUsers,
    resetUserPassword,
    resetState,
    setLoading
  };

  return (
    <PasswordResetContext.Provider value={value}>
      {children}
    </PasswordResetContext.Provider>
  );
};

// Custom hook to use password reset context
// eslint-disable-next-line react-refresh/only-export-components
export const usePasswordReset = () => {
  const context = useContext(PasswordResetContext);
  if (!context) {
    throw new Error('usePasswordReset must be used within a PasswordResetProvider');
  }
  return context;
};

export default PasswordResetContext;