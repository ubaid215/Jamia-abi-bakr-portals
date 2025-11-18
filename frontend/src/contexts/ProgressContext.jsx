import React, { createContext, useContext, useReducer, useCallback } from 'react';
import progressService from '../services/progressService';

const ProgressContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_HIFZ_PROGRESS: 'SET_HIFZ_PROGRESS',
  SET_NAZRA_PROGRESS: 'SET_NAZRA_PROGRESS',
  SET_STUDENT_PROGRESS: 'SET_STUDENT_PROGRESS',
  SET_CLASS_PROGRESS: 'SET_CLASS_PROGRESS',
  SET_ERROR: 'SET_ERROR',
  ADD_HIFZ_PROGRESS: 'ADD_HIFZ_PROGRESS',
  ADD_NAZRA_PROGRESS: 'ADD_NAZRA_PROGRESS'
};

// Initial state
const initialState = {
  hifzProgress: [],
  nazraProgress: [],
  studentProgress: null,
  classProgress: null,
  loading: false,
  error: null
};

// Reducer
const progressReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_HIFZ_PROGRESS:
      return { ...state, hifzProgress: action.payload };
    
    case ACTION_TYPES.SET_NAZRA_PROGRESS:
      return { ...state, nazraProgress: action.payload };
    
    case ACTION_TYPES.SET_STUDENT_PROGRESS:
      return { ...state, studentProgress: action.payload };
    
    case ACTION_TYPES.SET_CLASS_PROGRESS:
      return { ...state, classProgress: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.ADD_HIFZ_PROGRESS:
      return {
        ...state,
        hifzProgress: [...state.hifzProgress, action.payload]
      };
    
    case ACTION_TYPES.ADD_NAZRA_PROGRESS:
      return {
        ...state,
        nazraProgress: [...state.nazraProgress, action.payload]
      };
    
    default:
      return state;
  }
};

export const ProgressProvider = ({ children }) => {
  const [state, dispatch] = useReducer(progressReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Record Hifz progress
  const recordHifzProgress = useCallback(async (progressData) => {
    setLoading(true);
    try {
      const progress = await progressService.recordHifzProgress(progressData);
      dispatch({ type: ACTION_TYPES.ADD_HIFZ_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record Hifz progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Record Nazra progress
  const recordNazraProgress = useCallback(async (progressData) => {
    setLoading(true);
    try {
      const progress = await progressService.recordNazraProgress(progressData);
      dispatch({ type: ACTION_TYPES.ADD_NAZRA_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record Nazra progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student progress
  const fetchStudentProgress = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const progress = await progressService.getStudentProgress(filters);
      dispatch({ type: ACTION_TYPES.SET_STUDENT_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch student progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get class progress
  const fetchClassProgress = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const progress = await progressService.getClassProgress(filters);
      dispatch({ type: ACTION_TYPES.SET_CLASS_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch class progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Hifz progress
  const fetchHifzProgress = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const progress = await progressService.getStudentProgress({ ...filters, type: 'HIFZ' });
      dispatch({ type: ACTION_TYPES.SET_HIFZ_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch Hifz progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Nazra progress
  const fetchNazraProgress = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const progress = await progressService.getStudentProgress({ ...filters, type: 'NAZRA' });
      dispatch({ type: ACTION_TYPES.SET_NAZRA_PROGRESS, payload: progress });
      return progress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch Nazra progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update progress
  const updateProgress = useCallback(async (progressId, progressData) => {
    setLoading(true);
    try {
      const updatedProgress = await progressService.updateProgress(progressId, progressData);
      // Refresh relevant progress lists
      if (progressData.type === 'HIFZ') {
        await fetchHifzProgress();
      } else if (progressData.type === 'NAZRA') {
        await fetchNazraProgress();
      }
      return updatedProgress;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchHifzProgress, fetchNazraProgress]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Methods
    recordHifzProgress,
    recordNazraProgress,
    fetchStudentProgress,
    fetchClassProgress,
    fetchHifzProgress,
    fetchNazraProgress,
    updateProgress,
    clearError
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

export default ProgressContext;