// src/contexts/HifzReportContext.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import hifzReportService from '../services/hifzReportService';

const HifzReportContext = createContext();

const ACTION_TYPES = {
  SET_LOADING:      'SET_LOADING',
  SET_ANALYTICS:    'SET_ANALYTICS',
  SET_ALERTS:       'SET_ALERTS',
  SET_BULK_RESULTS: 'SET_BULK_RESULTS',
  SET_ERROR:        'SET_ERROR',
  CLEAR_ERROR:      'CLEAR_ERROR',
  CLEAR_DATA:       'CLEAR_DATA',
};

const initialState = {
  analytics:   null,
  alerts:      null,
  bulkResults: null,
  loading:     false,
  error:       null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:      return { ...state, loading: action.payload };
    case ACTION_TYPES.SET_ANALYTICS:    return { ...state, analytics: action.payload };
    case ACTION_TYPES.SET_ALERTS:       return { ...state, alerts: action.payload };
    case ACTION_TYPES.SET_BULK_RESULTS: return { ...state, bulkResults: action.payload };
    case ACTION_TYPES.SET_ERROR:        return { ...state, error: action.payload, loading: false };
    case ACTION_TYPES.CLEAR_ERROR:      return { ...state, error: null };
    case ACTION_TYPES.CLEAR_DATA:       return { ...state, analytics: null, alerts: null, bulkResults: null, error: null };
    default: return state;
  }
};

export const HifzReportProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setLoading = (v) => dispatch({ type: ACTION_TYPES.SET_LOADING, payload: v });
  const setError   = (v) => dispatch({ type: ACTION_TYPES.SET_ERROR,   payload: v });

  const extractErrorMsg = (err) =>
    err?.response?.data?.message ||
    err?.response?.data?.error  ||
    err?.message ||
    'An error occurred';

  // ── Generate + download (one-shot) ────────────────────────────────────────
  /**
   * generateAndDownloadReport(studentId, studentName, params)
   *   params.type: 'hifz-only' | 'full' | 'comprehensive'
   *   params.days / startDate / endDate
   */
  const generateAndDownloadReport = useCallback(async (studentId, studentName, params = {}) => {
    setLoading(true);
    try {
      await hifzReportService.generateAndDownloadReport(studentId, studentName, params);
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Generate blob only (for custom handling) ──────────────────────────────
  /**
   * generateHifzReport(studentId, params) → Blob
   */
  const generateHifzReport = useCallback(async (studentId, params = {}) => {
    setLoading(true);
    try {
      return await hifzReportService.generateHifzReport(studentId, params);
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const getStudentAnalytics = useCallback(async (studentId, days = 30) => {
    setLoading(true);
    try {
      const data = await hifzReportService.getStudentAnalytics(studentId, days);
      dispatch({ type: ACTION_TYPES.SET_ANALYTICS, payload: data });
      return data;
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Para Completion ───────────────────────────────────────────────────────
  const updateParaCompletion = useCallback(async (studentId, completionData) => {
    setLoading(true);
    try {
      return await hifzReportService.updateParaCompletion(studentId, completionData);
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const getStudentAlerts = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const data = await hifzReportService.getStudentAlerts(studentId);
      dispatch({ type: ACTION_TYPES.SET_ALERTS, payload: data });
      return data;
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const bulkGenerateReports = useCallback(async (classId, days = 30) => {
    setLoading(true);
    try {
      const data = await hifzReportService.bulkGenerateReports(classId, days);
      dispatch({ type: ACTION_TYPES.SET_BULK_RESULTS, payload: data });
      return data;
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Report History ────────────────────────────────────────────────────────
  const getReportHistory = useCallback(async (studentId) => {
    setLoading(true);
    try {
      return await hifzReportService.getReportHistory(studentId);
    } catch (err) {
      setError(extractErrorMsg(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    ...state,
    generateHifzReport,
    generateAndDownloadReport,
    getStudentAnalytics,
    updateParaCompletion,
    getStudentAlerts,
    bulkGenerateReports,
    getReportHistory,
    clearError: () => dispatch({ type: ACTION_TYPES.CLEAR_ERROR }),
    clearData:  () => dispatch({ type: ACTION_TYPES.CLEAR_DATA }),
  };

  return (
    <HifzReportContext.Provider value={value}>
      {children}
    </HifzReportContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useHifzReport = () => {
  const ctx = useContext(HifzReportContext);
  if (!ctx) throw new Error('useHifzReport must be used within a HifzReportProvider');
  return ctx;
};

export default HifzReportContext;