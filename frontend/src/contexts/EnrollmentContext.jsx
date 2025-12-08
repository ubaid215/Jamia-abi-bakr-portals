import React, { createContext, useContext, useReducer, useCallback } from 'react';
import enrollmentService from '../services/enrollmentService';

// Action types
const ENROLLMENT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUCCESS: 'SET_SUCCESS',
  RESET_STATE: 'RESET_STATE',
  SET_ENROLLMENT_HISTORY: 'SET_ENROLLMENT_HISTORY',
  SET_UPLOAD_PROGRESS: 'SET_UPLOAD_PROGRESS'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  success: null,
  enrollmentHistory: null,
  currentEnrollment: null,
  uploadProgress: 0,
  isUploading: false
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
        success: null,
        isUploading: false,
        uploadProgress: 0
      };
    
    case ENROLLMENT_ACTIONS.SET_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        success: action.payload,
        isUploading: false,
        uploadProgress: 0
      };
    
    case ENROLLMENT_ACTIONS.SET_ENROLLMENT_HISTORY:
      return {
        ...state,
        enrollmentHistory: action.payload,
        loading: false,
        error: null
      };
    
    case ENROLLMENT_ACTIONS.SET_UPLOAD_PROGRESS:
      return {
        ...state,
        uploadProgress: action.payload.progress,
        isUploading: action.payload.isUploading
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

  // Set upload progress
  const setUploadProgress = useCallback((progress, isUploading = true) => {
    dispatch({ 
      type: ENROLLMENT_ACTIONS.SET_UPLOAD_PROGRESS, 
      payload: { progress, isUploading } 
    });
  }, []);

  // Register teacher with file upload support
  const registerTeacher = useCallback(async (teacherData) => {
    try {
      setLoading(true);
      setUploadProgress(0, true);
      
      // teacherData should already be FormData from the component
      const result = await enrollmentService.registerTeacher(teacherData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress, true);
        }
      });
      
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
  }, [setLoading, setUploadProgress]);

  // Register student with file upload support
  const registerStudent = useCallback(async (studentData) => {
    try {
      setLoading(true);
      setUploadProgress(0, true);
      
      // studentData should already be FormData from the component
      const result = await enrollmentService.registerStudent(studentData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress, true);
        }
      });
      
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
  }, [setLoading, setUploadProgress]);

  // Register parent (no file uploads needed)
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

  // Update teacher profile image
  const updateTeacherProfileImage = useCallback(async (teacherId, imageFile) => {
    try {
      setLoading(true);
      setUploadProgress(0, true);
      
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      
      const result = await enrollmentService.updateTeacherProfileImage(teacherId, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress, true);
        }
      });
      
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Profile image updated successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile image';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading, setUploadProgress]);

  // Update student profile image
  const updateStudentProfileImage = useCallback(async (studentId, imageFile) => {
    try {
      setLoading(true);
      setUploadProgress(0, true);
      
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      
      const result = await enrollmentService.updateStudentProfileImage(studentId, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress, true);
        }
      });
      
      dispatch({ 
        type: ENROLLMENT_ACTIONS.SET_SUCCESS, 
        payload: 'Profile image updated successfully' 
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile image';
      dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [setLoading, setUploadProgress]);

  // Clear success message
  const clearSuccess = useCallback(() => {
    dispatch({ type: ENROLLMENT_ACTIONS.SET_SUCCESS, payload: null });
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    dispatch({ type: ENROLLMENT_ACTIONS.SET_ERROR, payload: null });
  }, []);

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
    updateTeacherProfileImage,
    updateStudentProfileImage,
    resetState,
    setLoading,
    clearSuccess,
    clearError,
    setUploadProgress
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