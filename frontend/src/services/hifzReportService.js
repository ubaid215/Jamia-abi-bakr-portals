// src/services/hifzReportService.js
// All Hifz PDF endpoints live under /hifz/report/...  (matches hifzRoutes.js)

import api from './api';

const hifzReportService = {

  // ─── PDF Generation ──────────────────────────────────────────────────────

  /**
   * generateHifzReport(studentId, params)
   *   params.type: 'hifz-only' → /hifz/report/hifz-only/:id
   *                'full'      → /hifz/report/full/:id
   *                (default)   → /hifz/report/pdf/:id
   *   params.days / startDate / endDate forwarded as query string
   * @returns {Promise<Blob>}
   */
  generateHifzReport: async (studentId, params = {}) => {
    const { type, ...queryParams } = params;

    let url;
    if (type === 'hifz-only') {
      url = `/hifz/report/hifz-only/${studentId}`;
    } else if (type === 'full' || type === 'comprehensive') {
      url = `/hifz/report/full/${studentId}`;
    } else {
      url = `/hifz/report/pdf/${studentId}`;
    }

    const response = await api.get(url, {
      params: queryParams,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Trigger a browser download from a Blob.
   */
  downloadPDF: (blobData, filename = 'hifz-report.pdf') => {
    const blob = new Blob([blobData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  /**
   * One-shot: generate + download.
   * @param {string} studentId
   * @param {string} studentName   – used in filename
   * @param {Object} params        – forwarded to generateHifzReport
   */
  generateAndDownloadReport: async (studentId, studentName = 'student', params = {}) => {
    const blob = await hifzReportService.generateHifzReport(studentId, params);
    const typeLabel = params.type || 'report';
    const date = new Date().toISOString().split('T')[0];
    const filename = `hifz-${typeLabel}-${studentName.replace(/\s+/g, '-')}-${date}.pdf`;
    return hifzReportService.downloadPDF(blob, filename);
  },

  // ─── Analytics ───────────────────────────────────────────────────────────

  /** Delegates to the same endpoint as hifzServices */
  getStudentAnalytics: async (studentId, days = 30) => {
    const response = await api.get(`/hifz/analytics/student/${studentId}`, {
      params: { days },
    });
    return response.data;
  },

  // ─── Para Completion ─────────────────────────────────────────────────────

  updateParaCompletion: async (studentId, completionData) => {
    const response = await api.put(
      `/hifz/status/para-completion/${studentId}`,
      completionData
    );
    return response.data;
  },

  // ─── Bulk ────────────────────────────────────────────────────────────────

  bulkGenerateReports: async (classId, days = 30) => {
    const response = await api.post(
      `/hifz/report/bulk/class/${classId}`,
      { days }
    );
    return response.data;
  },

  // ─── Stubs (no backend endpoint yet — won't crash callers) ───────────────

  getStudentAlerts: async (_studentId) => {
    console.warn('[hifzReportService] getStudentAlerts: no backend endpoint yet');
    return { alerts: [] };
  },

  getReportHistory: async (_studentId) => {
    console.warn('[hifzReportService] getReportHistory: no backend endpoint yet');
    return { history: [] };
  },
};

export default hifzReportService;