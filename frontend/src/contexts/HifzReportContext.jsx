import React, { createContext, useContext, useReducer, useCallback } from 'react';
import hifzReportService from '../services/hifzReportService';

const HifzReportContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_REPORT: 'SET_REPORT',
  SET_ANALYTICS: 'SET_ANALYTICS',
  SET_ALERTS: 'SET_ALERTS',
  SET_BULK_RESULTS: 'SET_BULK_RESULTS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  CLEAR_DATA: 'CLEAR_DATA'
};

// Initial state
const initialState = {
  report: null,
  analytics: null,
  alerts: null,
  bulkResults: null,
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
    
    case ACTION_TYPES.SET_ANALYTICS:
      return { ...state, analytics: action.payload };
    
    case ACTION_TYPES.SET_ALERTS:
      return { ...state, alerts: action.payload };
    
    case ACTION_TYPES.SET_BULK_RESULTS:
      return { ...state, bulkResults: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ACTION_TYPES.CLEAR_DATA:
      return { 
        ...state, 
        report: null, 
        analytics: null, 
        alerts: null, 
        bulkResults: null,
        error: null 
      };
    
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
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate Hifz report';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate and download report in one step
  const generateAndDownloadReport = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      await hifzReportService.generateAndDownloadReport(filters);
      // No need to store the blob in state for download
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate and download report';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student analytics
  const getStudentAnalytics = useCallback(async (studentId, days = 30) => {
    setLoading(true);
    try {
      const analytics = await hifzReportService.getStudentAnalytics(studentId, days);
      dispatch({ type: ACTION_TYPES.SET_ANALYTICS, payload: analytics });
      return analytics;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch analytics';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update para completion
  const updateParaCompletion = useCallback(async (studentId, completionData) => {
    setLoading(true);
    try {
      const result = await hifzReportService.updateParaCompletion(studentId, completionData);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update para completion';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student alerts
  const getStudentAlerts = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const alerts = await hifzReportService.getStudentAlerts(studentId);
      dispatch({ type: ACTION_TYPES.SET_ALERTS, payload: alerts });
      return alerts;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch alerts';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Bulk generate reports
  const bulkGenerateReports = useCallback(async (classId = null) => {
    setLoading(true);
    try {
      const results = await hifzReportService.bulkGenerateReports(classId);
      dispatch({ type: ACTION_TYPES.SET_BULK_RESULTS, payload: results });
      return results;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to bulk generate reports';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get report history
  const getReportHistory = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const history = await hifzReportService.getReportHistory(studentId);
      return history;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch report history';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_DATA });
  }, []);

  const value = {
    ...state,
    // Methods
    generateHifzReport,
    generateAndDownloadReport,
    getStudentAnalytics,
    updateParaCompletion,
    getStudentAlerts,
    bulkGenerateReports,
    getReportHistory,
    clearError,
    clearData
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