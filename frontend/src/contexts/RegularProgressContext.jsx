import React, { createContext, useContext, useReducer, useCallback } from 'react';
import regularProgressService from '../services/regularProgressService';

const RegularProgressContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ASSESSMENTS: 'SET_ASSESSMENTS',
  SET_MONTHLY_PROGRESS: 'SET_MONTHLY_PROGRESS',
  SET_STUDY_PLANS: 'SET_STUDY_PLANS',
  SET_STUDENT_OVERVIEW: 'SET_STUDENT_OVERVIEW',
  SET_CLASS_SUMMARY: 'SET_CLASS_SUMMARY',
  SET_ERROR: 'SET_ERROR',
  ADD_ASSESSMENT: 'ADD_ASSESSMENT',
  ADD_MONTHLY_PROGRESS: 'ADD_MONTHLY_PROGRESS',
  ADD_STUDY_PLAN: 'ADD_STUDY_PLAN',
  UPDATE_STUDY_PLAN: 'UPDATE_STUDY_PLAN'
};

// Initial state
const initialState = {
  assessments: [],
  monthlyProgress: [],
  studyPlans: [],
  studentOverview: null,
  classSummary: null,
  loading: false,
  error: null
};

// Reducer
const regularProgressReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_ASSESSMENTS:
      return { ...state, assessments: action.payload };
    
    case ACTION_TYPES.SET_MONTHLY_PROGRESS:
      return { ...state, monthlyProgress: action.payload };
    
    case ACTION_TYPES.SET_STUDY_PLANS:
      return { ...state, studyPlans: action.payload };
    
    case ACTION_TYPES.SET_STUDENT_OVERVIEW:
      return { ...state, studentOverview: action.payload };
    
    case ACTION_TYPES.SET_CLASS_SUMMARY:
      return { ...state, classSummary: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.ADD_ASSESSMENT:
      return {
        ...state,
        assessments: [...state.assessments, action.payload]
      };
    
    case ACTION_TYPES.ADD_MONTHLY_PROGRESS:
      return {
        ...state,
        monthlyProgress: [...state.monthlyProgress, action.payload]
      };
    
    case ACTION_TYPES.ADD_STUDY_PLAN:
      return {
        ...state,
        studyPlans: [...state.studyPlans, action.payload]
      };
    
    case ACTION_TYPES.UPDATE_STUDY_PLAN:
      return {
        ...state,
        studyPlans: state.studyPlans.map(plan =>
          plan.id === action.payload.id ? action.payload : plan
        )
      };
    
    default:
      return state;
  }
};

export const RegularProgressProvider = ({ children }) => {
  const [state, dispatch] = useReducer(regularProgressReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Record subject assessment
  const recordSubjectAssessment = useCallback(async (assessmentData) => {
    setLoading(true);
    try {
      const assessment = await regularProgressService.recordSubjectAssessment(assessmentData);
      dispatch({ type: ACTION_TYPES.ADD_ASSESSMENT, payload: assessment });
      return assessment;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record assessment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create monthly progress
  const createMonthlyProgress = useCallback(async (progressData) => {
    setLoading(true);
    try {
      const progress = await regularProgressService.createMonthlyProgress(progressData);
      dispatch({ type: ACTION_TYPES.ADD_MONTHLY_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create monthly progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create study plan
  const createStudyPlan = useCallback(async (studyPlanData) => {
    setLoading(true);
    try {
      const studyPlan = await regularProgressService.createStudyPlan(studyPlanData);
      dispatch({ type: ACTION_TYPES.ADD_STUDY_PLAN, payload: studyPlan });
      return studyPlan;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create study plan');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update study plan progress
  const updateStudyPlanProgress = useCallback(async (studyPlanId, progressData) => {
    setLoading(true);
    try {
      const updatedPlan = await regularProgressService.updateStudyPlanProgress(studyPlanId, progressData);
      dispatch({ type: ACTION_TYPES.UPDATE_STUDY_PLAN, payload: updatedPlan });
      return updatedPlan;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update study plan');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student progress overview
  const fetchStudentProgressOverview = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const overview = await regularProgressService.getStudentProgressOverview(studentId);
      dispatch({ type: ACTION_TYPES.SET_STUDENT_OVERVIEW, payload: overview });
      return overview;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch student progress overview');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get class progress summary
  const fetchClassProgressSummary = useCallback(async (classRoomId) => {
    setLoading(true);
    try {
      const summary = await regularProgressService.getClassProgressSummary(classRoomId);
      dispatch({ type: ACTION_TYPES.SET_CLASS_SUMMARY, payload: summary });
      return summary;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch class progress summary');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      // This would need to be implemented in the service
      // For now, we'll use the existing data
      return state.assessments;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch assessments');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.assessments]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Methods
    recordSubjectAssessment,
    createMonthlyProgress,
    createStudyPlan,
    updateStudyPlanProgress,
    fetchStudentProgressOverview,
    fetchClassProgressSummary,
    fetchAssessments,
    clearError
  };

  return (
    <RegularProgressContext.Provider value={value}>
      {children}
    </RegularProgressContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRegularProgress = () => {
  const context = useContext(RegularProgressContext);
  if (!context) {
    throw new Error('useRegularProgress must be used within a RegularProgressProvider');
  }
  return context;
};

export default RegularProgressContext;