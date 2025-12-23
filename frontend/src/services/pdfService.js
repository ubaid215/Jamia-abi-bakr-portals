import api from './api';

class PDFService {
  // Download blob helper
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

  // Preview PDF in new tab
  previewPDF(blob) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  // Build query string from options
  buildQueryString(options) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
      if (options[key]) params.append(key, options[key]);
    });
    return params.toString();
  }

  // Generate student progress report
  async generateStudentProgressReport(studentId, options = {}) {
    try {
      const queryString = this.buildQueryString(options);
      const url = `/pdf/student/${studentId}/progress-report${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      const filename = `student-progress-report-${studentId}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      this.downloadBlob(response.data, filename);
      return { success: true, message: 'Report downloaded successfully' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate progress report';
      throw new Error(errorMessage);
    }
  }

  // Generate exam mark sheet
  async generateExamMarkSheet(classRoomId, options = {}) {
    try {
      const queryString = this.buildQueryString(options);
      const url = `/pdf/class/${classRoomId}/exam-marksheet${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      const filename = `exam-marksheet-${options.examName?.replace(/\s+/g, '-') || 'exam'}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      this.downloadBlob(response.data, filename);
      return { success: true, message: 'Mark sheet downloaded successfully' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate mark sheet';
      throw new Error(errorMessage);
    }
  }

  // Generate attendance sheet
  async generateAttendanceSheet(classRoomId, options = {}) {
    try {
      const queryString = this.buildQueryString(options);
      const url = `/pdf/class/${classRoomId}/attendance-sheet${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      const dateStr = options.date || new Date().toISOString().split('T')[0];
      const filename = `attendance-sheet-${dateStr}.pdf`;
      
      this.downloadBlob(response.data, filename);
      return { success: true, message: 'Attendance sheet downloaded successfully' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate attendance sheet';
      throw new Error(errorMessage);
    }
  }

  // Generate custom PDF
  async generateCustomPDF(pdfData) {
    try {
      if (!pdfData.title) {
        throw new Error('Title is required for custom PDF');
      }

      const response = await api.post('/pdf/custom', pdfData, { responseType: 'blob' });
      const filename = `${pdfData.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      this.downloadBlob(response.data, filename);
      return { success: true, message: 'Custom PDF downloaded successfully' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate custom PDF';
      throw new Error(errorMessage);
    }
  }

  // Get blob for preview
  async getStudentProgressReportBlob(studentId, options = {}) {
    try {
      const queryString = this.buildQueryString(options);
      const url = `/pdf/student/${studentId}/progress-report${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to get progress report';
      throw new Error(errorMessage);
    }
  }
}

// Export singleton instance
export default new PDFService();