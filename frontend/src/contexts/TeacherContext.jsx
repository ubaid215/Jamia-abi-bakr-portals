import React, { createContext, useContext, useReducer, useCallback } from 'react';
import teacherService from '../services/teacherService';

const TeacherContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_DASHBOARD: 'SET_DASHBOARD',
  SET_CLASSES: 'SET_CLASSES',
  SET_SUBJECTS: 'SET_SUBJECTS',
  SET_STUDENTS: 'SET_STUDENTS',
  SET_ATTENDANCE: 'SET_ATTENDANCE',
  SET_LEAVE_REQUESTS: 'SET_LEAVE_REQUESTS',
  SET_ACTIVITIES: 'SET_ACTIVITIES',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  dashboard: null,
  classes: [],
  subjects: [],
  students: [],
  attendance: [],
  leaveRequests: [],
  activities: [],
  loading: false,
  error: null
};

// Reducer
const teacherReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_DASHBOARD:
      return { ...state, dashboard: action.payload };
    
    case ACTION_TYPES.SET_CLASSES:
      return { ...state, classes: action.payload };
    
    case ACTION_TYPES.SET_SUBJECTS:
      return { ...state, subjects: action.payload };
    
    case ACTION_TYPES.SET_STUDENTS:
      return { ...state, students: action.payload };
    
    case ACTION_TYPES.SET_ATTENDANCE:
      return { ...state, attendance: action.payload };
    
    case ACTION_TYPES.SET_LEAVE_REQUESTS:
      return { ...state, leaveRequests: action.payload };
    
    case ACTION_TYPES.SET_ACTIVITIES:
      return { ...state, activities: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    default:
      return state;
  }
};

export const TeacherProvider = ({ children }) => {
  const [state, dispatch] = useReducer(teacherReducer, initialState);

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
      const dashboard = await teacherService.getDashboard();
      dispatch({ type: ACTION_TYPES.SET_DASHBOARD, payload: dashboard });
      return dashboard;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch dashboard');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Classes
  const fetchMyClasses = useCallback(async () => {
    setLoading(true);
    try {
      const classes = await teacherService.getMyClasses();
      dispatch({ type: ACTION_TYPES.SET_CLASSES, payload: classes });
      return classes;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch classes');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Subjects
  const fetchMySubjects = useCallback(async () => {
    setLoading(true);
    try {
      const subjects = await teacherService.getMySubjects();
      dispatch({ type: ACTION_TYPES.SET_SUBJECTS, payload: subjects });
      return subjects;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch subjects');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Students
  const fetchMyStudents = useCallback(async () => {
    setLoading(true);
    try {
      const students = await teacherService.getMyStudents();
      dispatch({ type: ACTION_TYPES.SET_STUDENTS, payload: students });
      return students;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch students');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Attendance
  const fetchTodaysAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const attendance = await teacherService.getTodaysAttendance();
      dispatch({ type: ACTION_TYPES.SET_ATTENDANCE, payload: attendance });
      return attendance;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Leave management
  const applyForLeave = useCallback(async (leaveData) => {
    setLoading(true);
    try {
      const leaveRequest = await teacherService.applyForLeave(leaveData);
      // Refresh leave history
      await fetchMyLeaveHistory();
      return leaveRequest;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to apply for leave');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyLeaveHistory = useCallback(async () => {
    setLoading(true);
    try {
      const leaveRequests = await teacherService.getMyLeaveHistory();
      dispatch({ type: ACTION_TYPES.SET_LEAVE_REQUESTS, payload: leaveRequests });
      return leaveRequests;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch leave history');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Activities
  const fetchMyActivities = useCallback(async () => {
    setLoading(true);
    try {
      const activities = await teacherService.getMyActivities();
      dispatch({ type: ACTION_TYPES.SET_ACTIVITIES, payload: activities });
      return activities;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch activities');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Profile
  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    try {
      const updatedProfile = await teacherService.updateMyProfile(profileData);
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
    fetchMyClasses,
    fetchMySubjects,
    fetchMyStudents,
    fetchTodaysAttendance,
    applyForLeave,
    fetchMyLeaveHistory,
    fetchMyActivities,
    updateProfile,
    clearError
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTeacher = () => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
};

export default TeacherContext;