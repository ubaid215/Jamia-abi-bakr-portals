// services/hifzService.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─────────────────────────────────────────────────────────────
// Axios instance — token read fresh on every request so
// login/logout is reflected immediately without page refresh
// ─────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  // Try every common key your project might use
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";

    if (status === 401) {
      return Promise.reject(new Error("Unauthorized. Please log in again."));
    }
    if (status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action.")
      );
    }

    return Promise.reject(new Error(message));
  }
);

// ─────────────────────────────────────────────────────────────
// Daily Report CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Save a new daily report.
 * Backend allows: TEACHER, ADMIN, SUPER_ADMIN only.
 * @param {string} studentId
 * @param {{ date, sabaq, sabaqMistakes, sabqi, sabqiMistakes, manzil, manzilMistakes, attendance }} data
 */
export const saveReport = async (studentId, data) => {
  const res = await api.post(`/reports/students/${studentId}`, data);
  return res.data;
};

/**
 * Fetch all reports for a student.
 * @param {string} studentId
 */
export const getReports = async (studentId) => {
  const res = await api.get(`/reports/students/${studentId}`);
  return res.data;
};

/**
 * Fetch reports filtered by date range.
 * @param {string} studentId
 * @param {string} startDate  e.g. "2024-01-01"
 * @param {string} endDate    e.g. "2024-01-31"
 */
export const getFilteredReports = async (studentId, startDate, endDate) => {
  const res = await api.get(`/reports/students/${studentId}/filter`, {
    params: { startDate, endDate },
  });
  return res.data;
};

/**
 * Fetch reports for a specific month.
 * @param {string} studentId
 * @param {number} month  1–12
 * @param {number} year
 */
export const getMonthlyReports = async (studentId, month, year) => {
  const res = await api.get(`/reports/students/${studentId}/monthly`, {
    params: { month, year },
  });
  return res.data;
};

/**
 * Fetch paginated performance data with optional date range.
 * @param {string} studentId
 * @param {{ limit?, page?, startDate?, endDate? }} params
 */
export const getPerformanceData = async (studentId, params = {}) => {
  const res = await api.get(`/reports/students/${studentId}/performance`, { params });
  return res.data;
};

/**
 * Fetch Quran para-completion projection.
 * @param {string} studentId
 */
export const getParaCompletionData = async (studentId) => {
  const res = await api.get(`/reports/students/${studentId}/para-completion`);
  return res.data;
};

/**
 * Update an existing report.
 * Backend allows: TEACHER, ADMIN, SUPER_ADMIN only.
 * @param {string} studentId
 * @param {string} reportId
 * @param {object} data
 */
export const updateReport = async (studentId, reportId, data) => {
  const res = await api.put(`/reports/students/${studentId}/${reportId}`, data);
  return res.data;
};

/**
 * Download a PDF report
 * @param {string} studentId
 * @param {string} studentName
 * @param {object} params { days, type }
 */
export const downloadReport = async (studentId, studentName, params = {}) => {
  let endpoint = `/hifz/report/pdf/${studentId}`; // default legacy

  if (params.type === 'hifz-only') {
    endpoint = `/hifz/report/hifz-only/${studentId}`;
  } else if (params.type === 'full') {
    endpoint = `/hifz/report/full/${studentId}`;
  }

  const res = await api.get(endpoint, {
    params: { days: params.days },
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;

  const safeName = studentName ? studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'student';
  const typeLabel = params.type ? `-${params.type}` : '';
  const dateStr = new Date().toISOString().split('T')[0];

  link.setAttribute('download', `${safeName}-report${typeLabel}-${dateStr}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
};

// ─────────────────────────────────────────────────────────────
// Dashboards  (TEACHER / ADMIN only)
// ─────────────────────────────────────────────────────────────

/** Students flagged for poor weekly performance. */
export const getPoorPerformers = async () => {
  const res = await api.get("/reports/poor-performers");
  return res.data;
};

/** All Hifz student progress reports (aggregated). */
export const getHifzPerformance = async () => {
  const res = await api.get("/reports/hifz/performance");
  return res.data;
};

/**
 * Performance grouped by Hifz class.
 * @param {{ filter?: 'weekly'|'monthly'|'custom', startDate?: string, endDate?: string }} params
 */
export const getAllHifzClassesPerformance = async (params = {}) => {
  const res = await api.get("/reports/hifz/classes/performance", { params });
  return res.data;
};