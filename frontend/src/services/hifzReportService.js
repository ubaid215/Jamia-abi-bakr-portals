/* eslint-disable no-useless-catch */
import api from './api';

const hifzReportService = {
  // Generate Hifz report (PDF download)
  generateHifzReport: async (filters = {}) => {
    try {
      const response = await api.get('/hifz-reports/generate', { 
        params: filters,
        responseType: 'blob' // Important for file downloads
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to generate report');
    }
  },

  // Get student analytics (JSON data)
  getStudentAnalytics: async (studentId, days = 30) => {
    try {
      const response = await api.get(`/hifz-reports/analytics/${studentId}`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch analytics');
    }
  },

  // Update para completion (Teacher/Admin only)
  updateParaCompletion: async (studentId, completionData) => {
    try {
      const response = await api.put(`/hifz-reports/para-completion/${studentId}`, completionData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update para completion');
    }
  },

  // Get student alerts and recommendations
  getStudentAlerts: async (studentId) => {
    try {
      const response = await api.get(`/hifz-reports/alerts/${studentId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch alerts');
    }
  },

  // Bulk generate reports (Admin only)
  bulkGenerateReports: async (classId = null) => {
    try {
      const params = classId ? { classId } : {};
      const response = await api.get('/hifz-reports/bulk-generate', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to bulk generate reports');
    }
  },

  // Download generated report file
  downloadReport: async (fileUrl) => {
    try {
      const response = await api.get(fileUrl, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download report file');
    }
  },

  // Utility method to handle PDF blob download
  downloadPDF: (blobData, filename = 'hifz-report.pdf') => {
    try {
      // Create blob URL
      const blob = new Blob([blobData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw new Error('Failed to download PDF file');
    }
  },

  // Get report history for a student
  getReportHistory: async (studentId) => {
    try {
      // This would call an endpoint that lists previously generated reports
      const response = await api.get(`/hifz-reports/history/${studentId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch report history');
    }
  },

  // Generate and download report in one step
  generateAndDownloadReport: async (filters = {}) => {
    try {
      const pdfBlob = await hifzReportService.generateHifzReport(filters);
      
      // Generate filename
      const studentId = filters.studentId || 'report';
      const date = new Date().toISOString().split('T')[0];
      const filename = `hifz-report-${studentId}-${date}.pdf`;
      
      // Trigger download
      return hifzReportService.downloadPDF(pdfBlob, filename);
    } catch (error) {
      throw error; // Re-throw the original error
    }
  }
};

export default hifzReportService;