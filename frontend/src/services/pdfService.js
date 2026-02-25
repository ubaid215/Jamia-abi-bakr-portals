/* eslint-disable no-unused-vars */
import api from './api';

class PDFService {

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * FIX: When axios uses responseType:'blob', any error response body
   * is also a Blob — JSON.parse on it always fails, so we always got
   * the generic fallback message. This helper reads the Blob as text
   * and attempts to extract the real server error message.
   */
  async _parseBlobError(error) {
    try {
      const blob = error.response?.data;
      if (blob instanceof Blob) {
        const text = await blob.text();
        const json = JSON.parse(text);
        return json.error || json.message || 'Unknown server error';
      }
    } catch (_) {
      // Blob wasn't JSON — fall through
    }
    // Non-blob errors (network, 401, etc.)
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed'
    );
  }

  /** Trigger a browser file download from a Blob */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /** Open a Blob in a new browser tab */
  previewPDF(blob) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: we intentionally don't revoke here so the tab can load it
  }

  /** Convert an options object to a URLSearchParams query string */
  buildQueryString(options = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      // Skip null / undefined / empty string
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    const str = params.toString();
    return str ? `?${str}` : '';
  }

  // ============================================================
  // PDF GENERATION — all routes match pdfController route names
  // ============================================================

  /**
   * Download student progress report.
   * Route: GET /pdf/student/:studentId/progress-report
   */
  async generateStudentProgressReport(studentId, options = {}) {
    try {
      const url = `/pdf/student/${studentId}/progress-report${this.buildQueryString(options)}`;
      const response = await api.get(url, { responseType: 'blob' });

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `student-progress-report-${studentId}-${dateStr}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Report downloaded successfully' };
    } catch (error) {
      throw new Error(await this._parseBlobError(error));
    }
  }

  /**
   * Download exam mark sheet.
   * Route: GET /pdf/class/:classRoomId/exam-marksheet
   */
  async generateExamMarkSheet(classRoomId, options = {}) {
    try {
      const url = `/pdf/class/${classRoomId}/exam-marksheet${this.buildQueryString(options)}`;
      const response = await api.get(url, { responseType: 'blob' });

      const examLabel = options.examName?.replace(/\s+/g, '-') || 'exam';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `exam-marksheet-${examLabel}-${dateStr}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Mark sheet downloaded successfully' };
    } catch (error) {
      throw new Error(await this._parseBlobError(error));
    }
  }

  /**
   * Download attendance sheet.
   * Route: GET /pdf/class/:classRoomId/attendance-sheet
   */
  async generateAttendanceSheet(classRoomId, options = {}) {
    try {
      const url = `/pdf/class/${classRoomId}/attendance-sheet${this.buildQueryString(options)}`;
      const response = await api.get(url, { responseType: 'blob' });

      const dateStr = options.date || new Date().toISOString().split('T')[0];
      const filename = `attendance-sheet-${dateStr}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Attendance sheet downloaded successfully' };
    } catch (error) {
      throw new Error(await this._parseBlobError(error));
    }
  }

  /**
   * Download custom PDF.
   * Route: POST /pdf/custom
   * Body: { title, subtitle, content[], tables[], theme, orientation, ... }
   */
  async generateCustomPDF(pdfData) {
    try {
      if (!pdfData?.title) {
        throw new Error('Title is required for custom PDF');
      }

      const response = await api.post('/pdf/custom', pdfData, { responseType: 'blob' });

      const titleSlug = pdfData.title.replace(/\s+/g, '-').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${titleSlug}-${dateStr}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Custom PDF downloaded successfully' };
    } catch (error) {
      // If it's the validation error we threw above, rethrow directly
      if (error.message === 'Title is required for custom PDF') throw error;
      throw new Error(await this._parseBlobError(error));
    }
  }

  /**
   * Return the raw Blob for in-browser preview (opens in new tab).
   * Route: GET /pdf/student/:studentId/progress-report
   */
  async getStudentProgressReportBlob(studentId, options = {}) {
    try {
      const url = `/pdf/student/${studentId}/progress-report${this.buildQueryString(options)}`;
      const response = await api.get(url, { responseType: 'blob' });
      return response.data; // Blob — caller passes to previewPDF()
    } catch (error) {
      throw new Error(await this._parseBlobError(error));
    }
  }
}

// Singleton
export default new PDFService();