import React, { createContext, useContext, useReducer, useCallback } from 'react';
import enrollmentService from '../services/enrollmentService';

// Action types
const ENROLLMENT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUCCESS: 'SET_SUCCESS',
  RESET_STATE: 'RESET_STATE',
  SET_ENROLLMENT_HISTORY: 'SET_ENROLLMENT_HISTORY'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  success: null,
  enrollmentHistory: null,
  currentEnrollment: null
};

// Reducer
const enrollmentReducer = (state, action) => {
  switch (action.type) {
    case ENROLLMENT_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? state.error : null,
        success: action.payload ? null : state.success
      };
    
    case ENROLLMENT_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
        success: null
      };
    
    case ENROLLMENT_ACTIONS.SET_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        success: action.payload
      };
    
    case ENROLLMENT_ACTIONS.SET_ENROLLMENT_HISTORY:
      return {
        ...state,
        enrollmentHistory: action.payload,
        loading: false,
        error: null
      };
    
    case ENROLLMENT_ACTIONS.RESET_STATE:
      return initialState;
    
    default:
      return state;
  }
};

// Create context
const EnrollmentContext = createContext();

// Provider component
export const EnrollmentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(enrollmentReducer, initialState);

  // Reset state
  const resetState = useCallback(() => {
    dispatch({ type: ENROLLMENT_ACTIONS.RESET_STATE });
  }, []);

  // Set loading
  const setLoading = useCallback((loading) => {
    dispatch({ type: ENROLLMENT_ACTIONS.SET_LOADING, payload: loading });
  }, []);

  // Register teacher
  const registerTeacher = useCallback(async (teacherData) => {
    try {
      setLoading(true);
      const result = await enrollmentService.registerTeacher(teacherData);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Teacher registered successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to register teacher';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Register student
  const registerStudent = useCallback(async (studentData) => {
    try {
      setLoading(true);
      const result = await enrollmentService.registerStudent(studentData);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Student registered successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to register student';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Register parent
  const registerParent = useCallback(async (parentData) => {
    try {
      setLoading(true);
      const result = await enrollmentService.registerParent(parentData);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Parent registered successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to register parent';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Enroll student in class
  const enrollStudentInClass = useCallback(async (enrollmentData) => {
    try {
      setLoading(true);
      const result = await enrollmentService.enrollStudentInClass(enrollmentData);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Student enrolled successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to enroll student';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Transfer student
  const transferStudent = useCallback(async (transferData) => {
    try {
      setLoading(true);
      const result = await enrollmentService.transferStudent(transferData);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Student transferred successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to transfer student';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Get student enrollment history
  const getStudentEnrollmentHistory = useCallback(async (studentId, page = 1, limit = 10) => {
    try {
      setLoading(true);
      const result = await enrollmentService.getStudentEnrollmentHistory(studentId, page, limit);
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_ENROLLMENT_HISTORY, 
        payload: result 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch enrollment history';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading]);

  // Get class enrollments
  const getClassEnrollments = useCallback(async (classRoomId) => {
    try {
      setLoading(true);
      const result = await enrollmentService.getClassEnrollments(classRoomId);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch class enrollments';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    registerTeacher,
    registerStudent,
    registerParent,
    enrollStudentInClass,
    transferStudent,
    getStudentEnrollmentHistory,
    getClassEnrollments,
    resetState,
    setLoading
  };

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  );
};

// Custom hook to use enrollment context
// eslint-disable-next-line react-refresh/only-export-components
export const useEnrollment = () => {
  const context = useContext(EnrollmentContext);
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
};

export default EnrollmentContext;