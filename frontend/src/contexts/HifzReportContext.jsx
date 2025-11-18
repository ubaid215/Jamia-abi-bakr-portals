import React, { createContext, useContext, useReducer, useCallback } from 'react';
import hifzReportService from '../services/hifzReportService';

const HifzReportContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_REPORT: 'SET_REPORT',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  report: null,
  loading: false,
  error: null
};

// Reducer
const hifzReportReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_REPORT:
      return { ...state, report: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    default:
      return state;
  }
};

export const HifzReportProvider = ({ children }) => {
  const [state, dispatch] = useReducer(hifzReportReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Generate Hifz report
  const generateHifzReport = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const report = await hifzReportService.generateHifzReport(filters);
      dispatch({ type: ACTION_TYPES.SET_REPORT, payload: report });
      return report;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate Hifz report');
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
    generateHifzReport,
    clearError
  };

  return (
    <HifzReportContext.Provider value={value}>
      {children}
    </HifzReportContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useHifzReport = () => {
  const context = useContext(HifzReportContext);
  if (!context) {
    throw new Error('useHifzReport must be used within a HifzReportProvider');
  }
  return context;
};

export default HifzReportContext;