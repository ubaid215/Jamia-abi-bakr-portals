// context/HifzContext.jsx
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  saveReport,
  getReports,
  getFilteredReports,
  getMonthlyReports,
  getPerformanceData,
  getParaCompletionData,
  updateReport,
  getPoorPerformers,
  getHifzPerformance,
  getAllHifzClassesPerformance,
  downloadReport as downloadReportApi,
} from "../services/hifzServices";
import { useAuth } from "./AuthContext";

// ─────────────────────────────────────────────────────────────
// Roles that are allowed to create / update reports.
// Must match what the backend allows (TEACHER, ADMIN, SUPER_ADMIN).
// ─────────────────────────────────────────────────────────────
const WRITE_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN"];

// ─────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────
const initialState = {
  reportsByStudent: {},   // { [studentId]: HifzProgress[] }
  performanceByStudent: {},   // { [studentId]: { reports, averageLinesPerDay } }
  paraCompletionByStudent: {},   // { [studentId]: { totalLinesCompleted, ... } }

  poorPerformers: [],
  hifzPerformance: [],
  classesByName: {},

  loading: false,
  actionLoading: false,
  error: null,
  successMessage: null,
};

// ─────────────────────────────────────────────────────────────
// Action types
// ─────────────────────────────────────────────────────────────
const A = {
  SET_LOADING: "SET_LOADING",
  SET_ACTION_LOADING: "SET_ACTION_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_SUCCESS: "SET_SUCCESS",
  CLEAR_SUCCESS: "CLEAR_SUCCESS",

  SET_REPORTS: "SET_REPORTS",
  ADD_REPORT: "ADD_REPORT",
  UPDATE_REPORT: "UPDATE_REPORT",
  SET_PERFORMANCE: "SET_PERFORMANCE",
  SET_PARA_COMPLETION: "SET_PARA_COMPLETION",

  SET_POOR_PERFORMERS: "SET_POOR_PERFORMERS",
  SET_HIFZ_PERFORMANCE: "SET_HIFZ_PERFORMANCE",
  SET_CLASSES_PERFORMANCE: "SET_CLASSES_PERFORMANCE",
};

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────
const reducer = (state, action) => {
  switch (action.type) {
    case A.SET_LOADING:
      return { ...state, loading: action.payload };

    case A.SET_ACTION_LOADING:
      return { ...state, actionLoading: action.payload };

    case A.SET_ERROR:
      return { ...state, error: action.payload, loading: false, actionLoading: false };

    case A.CLEAR_ERROR:
      return { ...state, error: null };

    case A.SET_SUCCESS:
      return { ...state, successMessage: action.payload };

    case A.CLEAR_SUCCESS:
      return { ...state, successMessage: null };

    case A.SET_REPORTS:
      return {
        ...state,
        loading: false,
        reportsByStudent: {
          ...state.reportsByStudent,
          [action.payload.studentId]: action.payload.reports,
        },
      };

    case A.ADD_REPORT: {
      const { studentId, report } = action.payload;
      const prev = state.reportsByStudent[studentId] || [];
      return {
        ...state,
        actionLoading: false,
        reportsByStudent: {
          ...state.reportsByStudent,
          [studentId]: [report, ...prev],
        },
      };
    }

    case A.UPDATE_REPORT: {
      const { studentId, reportId, report } = action.payload;
      const prev = state.reportsByStudent[studentId] || [];
      return {
        ...state,
        actionLoading: false,
        reportsByStudent: {
          ...state.reportsByStudent,
          [studentId]: prev.map((r) => (r.id === reportId ? report : r)),
        },
      };
    }

    case A.SET_PERFORMANCE:
      return {
        ...state,
        loading: false,
        performanceByStudent: {
          ...state.performanceByStudent,
          [action.payload.studentId]: action.payload.data,
        },
      };

    case A.SET_PARA_COMPLETION:
      return {
        ...state,
        loading: false,
        paraCompletionByStudent: {
          ...state.paraCompletionByStudent,
          [action.payload.studentId]: action.payload.data,
        },
      };

    case A.SET_POOR_PERFORMERS:
      return { ...state, loading: false, poorPerformers: action.payload };

    case A.SET_HIFZ_PERFORMANCE:
      return { ...state, loading: false, hifzPerformance: action.payload };

    case A.SET_CLASSES_PERFORMANCE:
      return { ...state, loading: false, classesByName: action.payload };

    default:
      return state;
  }
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
const HifzContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export const HifzProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user: currentUser } = useAuth(); // Retrieve current user natively from context

  // Derived: can this user write reports?
  const canWrite = WRITE_ROLES.includes(currentUser?.role);

  // Auto-clear success toast after 3 s
  const successTimer = useRef(null);
  useEffect(() => {
    if (state.successMessage) {
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(
        () => dispatch({ type: A.CLEAR_SUCCESS }),
        3000
      );
    }
    return () => clearTimeout(successTimer.current);
  }, [state.successMessage]);

  // ── helpers ─────────────────────────────────────────────
  const setError = (err) =>
    dispatch({ type: A.SET_ERROR, payload: err?.message || String(err) });

  const setSuccess = (msg) =>
    dispatch({ type: A.SET_SUCCESS, payload: msg });

  // ─────────────────────────────────────────────────────────
  // Read actions (all roles)
  // ─────────────────────────────────────────────────────────
  const fetchReports = useCallback(async (studentId) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getReports(studentId);
      dispatch({ type: A.SET_REPORTS, payload: { studentId, reports: data.reports } });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchFilteredReports = useCallback(async (studentId, startDate, endDate) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getFilteredReports(studentId, startDate, endDate);
      dispatch({ type: A.SET_REPORTS, payload: { studentId, reports: data.reports } });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchMonthlyReports = useCallback(async (studentId, month, year) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getMonthlyReports(studentId, month, year);
      dispatch({ type: A.SET_REPORTS, payload: { studentId, reports: data.reports } });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchPerformanceData = useCallback(async (studentId, params = {}) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getPerformanceData(studentId, params);
      dispatch({ type: A.SET_PERFORMANCE, payload: { studentId, data } });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchParaCompletionData = useCallback(async (studentId) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getParaCompletionData(studentId);
      dispatch({ type: A.SET_PARA_COMPLETION, payload: { studentId, data } });
    } catch (err) {
      setError(err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Write actions (TEACHER / ADMIN / SUPER_ADMIN only)
  // Guard on the frontend so the UI can disable buttons before
  // even making a network call, and shows a clear message if
  // somehow called by a non-write role.
  // ─────────────────────────────────────────────────────────
  const createReport = useCallback(
    async (studentId, reportData) => {
      if (!canWrite) {
        const msg = "You do not have permission to create reports.";
        setError({ message: msg });
        return { success: false, error: msg };
      }

      dispatch({ type: A.SET_ACTION_LOADING, payload: true });
      try {
        const data = await saveReport(studentId, reportData);
        dispatch({ type: A.ADD_REPORT, payload: { studentId, report: data.report } });
        setSuccess("Report saved successfully");
        return { success: true, report: data.report };
      } catch (err) {
        setError(err);
        return { success: false, error: err.message };
      }
    },
    [canWrite]
  );

  const editReport = useCallback(
    async (studentId, reportId, reportData) => {
      if (!canWrite) {
        const msg = "You do not have permission to update reports.";
        setError({ message: msg });
        return { success: false, error: msg };
      }

      dispatch({ type: A.SET_ACTION_LOADING, payload: true });
      try {
        const data = await updateReport(studentId, reportId, reportData);
        dispatch({
          type: A.UPDATE_REPORT,
          payload: { studentId, reportId, report: data.report },
        });
        setSuccess("Report updated successfully");
        return { success: true, report: data.report };
      } catch (err) {
        setError(err);
        return { success: false, error: err.message };
      }
    },
    [canWrite]
  );

  const downloadReport = useCallback(
    async (studentId, studentName, params) => {
      dispatch({ type: A.SET_ACTION_LOADING, payload: true });
      try {
        await downloadReportApi(studentId, studentName, params);
        dispatch({ type: A.SET_ACTION_LOADING, payload: false });
        return true;
      } catch (err) {
        dispatch({ type: A.SET_ACTION_LOADING, payload: false });
        setError(err);
        throw err;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────
  // Dashboard actions (TEACHER / ADMIN only)
  // ─────────────────────────────────────────────────────────
  const fetchPoorPerformers = useCallback(async () => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getPoorPerformers();
      dispatch({ type: A.SET_POOR_PERFORMERS, payload: data.students });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchHifzPerformance = useCallback(async () => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getHifzPerformance();
      dispatch({ type: A.SET_HIFZ_PERFORMANCE, payload: data.reports });
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchClassesPerformance = useCallback(async (params = {}) => {
    dispatch({ type: A.SET_LOADING, payload: true });
    try {
      const data = await getAllHifzClassesPerformance(params);
      dispatch({ type: A.SET_CLASSES_PERFORMANCE, payload: data.reportsByClass });
    } catch (err) {
      setError(err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Selectors
  // ─────────────────────────────────────────────────────────
  const getStudentReports = useCallback(
    (studentId) => state.reportsByStudent[studentId] || [],
    [state.reportsByStudent]
  );

  const getStudentPerformance = useCallback(
    (studentId) => state.performanceByStudent[studentId] || null,
    [state.performanceByStudent]
  );

  const getStudentParaCompletion = useCallback(
    (studentId) => state.paraCompletionByStudent[studentId] || null,
    [state.paraCompletionByStudent]
  );

  // ─────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────
  const clearError = useCallback(() => dispatch({ type: A.CLEAR_ERROR }), []);
  const clearSuccess = useCallback(() => dispatch({ type: A.CLEAR_SUCCESS }), []);

  // ─────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────
  const value = {
    // State
    loading: state.loading,
    actionLoading: state.actionLoading,
    error: state.error,
    successMessage: state.successMessage,
    poorPerformers: state.poorPerformers,
    hifzPerformance: state.hifzPerformance,
    classesByName: state.classesByName,

    // Permission flag — use in JSX to show/hide buttons
    canWrite,

    // Selectors
    getStudentReports,
    getStudentPerformance,
    getStudentParaCompletion,

    // Read actions
    fetchReports,
    fetchFilteredReports,
    fetchMonthlyReports,
    fetchPerformanceData,
    fetchParaCompletionData,

    // Write actions (guarded)
    createReport,
    editReport,
    downloadReport,

    // Dashboard actions
    fetchPoorPerformers,
    fetchHifzPerformance,
    fetchClassesPerformance,

    // UI helpers
    clearError,
    clearSuccess,
  };

  return <HifzContext.Provider value={value}>{children}</HifzContext.Provider>;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const useHifz = () => {
  const ctx = useContext(HifzContext);
  if (!ctx) throw new Error("useHifz must be used inside <HifzProvider>");
  return ctx;
};

export default HifzContext;