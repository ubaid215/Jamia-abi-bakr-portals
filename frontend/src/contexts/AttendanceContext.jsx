import React, { createContext, useContext, useReducer, useCallback } from 'react';
import attendanceService from '../services/attendanceService';

const AttendanceContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ATTENDANCE: 'SET_ATTENDANCE',
  SET_STUDENT_ATTENDANCE: 'SET_STUDENT_ATTENDANCE',
  SET_CLASS_SUMMARY: 'SET_CLASS_SUMMARY',
  SET_ERROR: 'SET_ERROR',
  ADD_ATTENDANCE: 'ADD_ATTENDANCE',
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',
  UPDATE_BULK_ATTENDANCE: 'UPDATE_BULK_ATTENDANCE'
};

// Initial state
const initialState = {
  attendance: [],
  studentAttendance: [],
  classSummary: null,
  loading: false,
  error: null
};

// Reducer
const attendanceReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_ATTENDANCE:
      return { ...state, attendance: action.payload || [] };
    
    case ACTION_TYPES.SET_STUDENT_ATTENDANCE:
      return { ...state, studentAttendance: action.payload || [] };
    
    case ACTION_TYPES.SET_CLASS_SUMMARY:
      return { ...state, classSummary: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.ADD_ATTENDANCE:
      { const newAttendance = Array.isArray(action.payload) ? action.payload : [action.payload];
      const currentAttendance = Array.isArray(state.attendance) ? state.attendance : [];
      return {
        ...state,
        attendance: [...currentAttendance, ...newAttendance]
      }; }
    
    case ACTION_TYPES.UPDATE_ATTENDANCE:
      { const currentAtt = Array.isArray(state.attendance) ? state.attendance : [];
      return {
        ...state,
        attendance: currentAtt.map(record =>
          record.id === action.payload.id ? action.payload : record
        )
      }; }
    
    case ACTION_TYPES.UPDATE_BULK_ATTENDANCE:
      { const updatedRecords = Array.isArray(action.payload) ? action.payload : [action.payload];
      const currentAtt = Array.isArray(state.attendance) ? state.attendance : [];
      const updatedMap = new Map(updatedRecords.map(record => [record.id, record]));
      return {
        ...state,
        attendance: currentAtt.map(record =>
          updatedMap.has(record.id) ? updatedMap.get(record.id) : record
        )
      }; }
    
    default:
      return state;
  }
};

export const AttendanceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // ============================================
  // MARK ATTENDANCE
  // ============================================

  // Mark attendance (supports individual, bulk, or bulk marking)
  const markAttendance = useCallback(async (attendanceData) => {
    setLoading(true);
    try {
      const result = await attendanceService.markAttendance(attendanceData);
      // The backend returns the created attendance records in result.attendance
      if (result.attendance && Array.isArray(result.attendance)) {
        dispatch({ type: ACTION_TYPES.ADD_ATTENDANCE, payload: result.attendance });
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to mark attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark attendance with bulk status and exceptions
  const markAttendanceWithExceptions = useCallback(async (attendanceData) => {
    setLoading(true);
    try {
      const result = await attendanceService.markAttendanceWithExceptions(attendanceData);
      if (result.attendance && Array.isArray(result.attendance)) {
        dispatch({ type: ACTION_TYPES.ADD_ATTENDANCE, payload: result.attendance });
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to mark attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // UPDATE/CORRECTION
  // ============================================

  // Update single attendance record
  const updateAttendance = useCallback(async (attendanceId, attendanceData) => {
    setLoading(true);
    try {
      const result = await attendanceService.updateAttendance(attendanceId, attendanceData);
      // Backend returns { message, attendance }
      if (result.attendance) {
        dispatch({ type: ACTION_TYPES.UPDATE_ATTENDANCE, payload: result.attendance });
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to update attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update multiple attendance records for same date (bulk correction)
  const updateBulkAttendance = useCallback(async (updateData) => {
    setLoading(true);
    try {
      const result = await attendanceService.updateBulkAttendance(updateData);
      // Backend returns { message, attendance: [...] }
      if (result.attendance && Array.isArray(result.attendance)) {
        dispatch({ type: ACTION_TYPES.UPDATE_BULK_ATTENDANCE, payload: result.attendance });
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to update attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-mark entire class attendance for same date (complete correction)
  const remarkAttendance = useCallback(async (attendanceData) => {
    setLoading(true);
    try {
      const result = await attendanceService.remarkAttendance(attendanceData);
      // Backend returns { message, attendance: [...] }
      if (result.attendance && Array.isArray(result.attendance)) {
        dispatch({ type: ACTION_TYPES.UPDATE_BULK_ATTENDANCE, payload: result.attendance });
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to re-mark attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // GET/RETRIEVE
  // ============================================

  // Get attendance for class/subject
  const fetchAttendance = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const attendance = await attendanceService.getAttendance(filters);
      dispatch({ type: ACTION_TYPES.SET_ATTENDANCE, payload: attendance });
      return attendance;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student attendance
  const fetchStudentAttendance = useCallback(async (studentId, filters = {}) => {
    setLoading(true);
    try {
      const attendance = await attendanceService.getStudentAttendance(studentId, filters);
      dispatch({ type: ACTION_TYPES.SET_STUDENT_ATTENDANCE, payload: attendance });
      return attendance;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch student attendance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get class attendance summary
  const fetchClassAttendanceSummary = useCallback(async (classRoomId, filters = {}) => {
    setLoading(true);
    try {
      const summary = await attendanceService.getClassAttendanceSummary(classRoomId, filters);
      dispatch({ type: ACTION_TYPES.SET_CLASS_SUMMARY, payload: summary });
      return summary;
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch class attendance summary');
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
    // Mark methods
    markAttendance,
    markAttendanceWithExceptions,
    // Update/Correction methods
    updateAttendance,
    updateBulkAttendance,
    remarkAttendance,
    // Fetch methods
    fetchAttendance,
    fetchStudentAttendance,
    fetchClassAttendanceSummary,
    // Utility methods
    clearError
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export default AttendanceContext;