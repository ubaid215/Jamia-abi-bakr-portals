import React, { createContext, useContext, useReducer, useCallback } from 'react';
import studentService from '../services/studentService';

const StudentContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_DASHBOARD: 'SET_DASHBOARD',
  SET_ATTENDANCE: 'SET_ATTENDANCE',
  SET_PROGRESS: 'SET_PROGRESS',
  SET_CLASS_HISTORY: 'SET_CLASS_HISTORY',
  SET_CURRENT_CLASS: 'SET_CURRENT_CLASS',
  SET_PROFILE: 'SET_PROFILE',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  dashboard: null,
  attendance: [],
  progress: null,
  classHistory: [],
  currentClass: null,
  profile: null,
  loading: false,
  error: null
};

// Reducer
const studentReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_DASHBOARD:
      return { ...state, dashboard: action.payload };
    
    case ACTION_TYPES.SET_ATTENDANCE:
      return { ...state, attendance: action.payload };
    
    case ACTION_TYPES.SET_PROGRESS:
      return { ...state, progress: action.payload };
    
    case ACTION_TYPES.SET_CLASS_HISTORY:
      return { ...state, classHistory: action.payload };
    
    case ACTION_TYPES.SET_CURRENT_CLASS:
      return { ...state, currentClass: action.payload };
    
    case ACTION_TYPES.SET_PROFILE:
      return { ...state, profile: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    default:
      return state;
  }
};

export const StudentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(studentReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Dashboard
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const dashboard = await studentService.getDashboard();
      dispatch({ type: ACTION_TYPES.SET_DASHBOARD, payload: dashboard });
      return dashboard;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch dashboard');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Attendance
  const fetchMyAttendance = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const attendance = await studentService.getMyAttendance(filters);
      dispatch({ type: ACTION_TYPES.SET_ATTENDANCE, payload: attendance });
      return attendance;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Progress and performance
  const fetchMyProgress = useCallback(async () => {
    setLoading(true);
    try {
      const progress = await studentService.getMyProgress();
      dispatch({ type: ACTION_TYPES.SET_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Class information
  const fetchMyClassHistory = useCallback(async () => {
    setLoading(true);
    try {
      const classHistory = await studentService.getMyClassHistory();
      dispatch({ type: ACTION_TYPES.SET_CLASS_HISTORY, payload: classHistory });
      return classHistory;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch class history');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyCurrentClass = useCallback(async () => {
    setLoading(true);
    try {
      const currentClass = await studentService.getMyCurrentClass();
      dispatch({ type: ACTION_TYPES.SET_CURRENT_CLASS, payload: currentClass });
      return currentClass;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch current class');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Profile management
  const fetchMyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await studentService.getMyProfile();
      dispatch({ type: ACTION_TYPES.SET_PROFILE, payload: profile });
      return profile;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMyProfile = useCallback(async (profileData) => {
    setLoading(true);
    try {
      const updatedProfile = await studentService.updateMyProfile(profileData);
      dispatch({ type: ACTION_TYPES.SET_PROFILE, payload: updatedProfile });
      return updatedProfile;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Methods
    fetchDashboard,
    fetchMyAttendance,
    fetchMyProgress,
    fetchMyClassHistory,
    fetchMyCurrentClass,
    fetchMyProfile,
    updateMyProfile,
    clearError
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

export default StudentContext;