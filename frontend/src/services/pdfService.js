// services/pdfService.js

import api from './api'; 


class pdfService {
  
 
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

  
  async generateStudentProgressReport(studentId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.append('startDate', options.startDate);
      }
      if (options.endDate) {
        params.append('endDate', options.endDate);
      }

      const queryString = params.toString();
      const url = `/pdf/student/${studentId}/progress-report${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      const filename = `student-progress-report-${studentId}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Report downloaded successfully' };
    } catch (error) {
      console.error('Error generating student progress report:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate progress report');
    }
  }


  async generateExamMarkSheet(classRoomId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.examName) params.append('examName', options.examName);
      if (options.examDate) params.append('examDate', options.examDate);
      if (options.subjectName) params.append('subjectName', options.subjectName);
      if (options.totalMarks) params.append('totalMarks', options.totalMarks);

      const queryString = params.toString();
      const url = `/pdf/class/${classRoomId}/exam-marksheet${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      const filename = `exam-marksheet-${options.examName?.replace(/\s+/g, '-') || 'exam'}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Mark sheet downloaded successfully' };
    } catch (error) {
      console.error('Error generating exam mark sheet:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate mark sheet');
    }
  }

  async generateAttendanceSheet(classRoomId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.date) params.append('date', options.date);
      if (options.month) params.append('month', options.month);

      const queryString = params.toString();
      const url = `/pdf/class/${classRoomId}/attendance-sheet${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      const dateStr = options.date || new Date().toISOString().split('T')[0];
      const filename = `attendance-sheet-${dateStr}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Attendance sheet downloaded successfully' };
    } catch (error) {
      console.error('Error generating attendance sheet:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate attendance sheet');
    }
  }


  async generateCustomPDF(pdfData) {
    try {
      if (!pdfData.title) {
        throw new Error('Title is required for custom PDF');
      }

      const response = await api.post('/pdf/custom', pdfData, {
        responseType: 'blob'
      });

      const filename = `${pdfData.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename);

      return { success: true, message: 'Custom PDF downloaded successfully' };
    } catch (error) {
      console.error('Error generating custom PDF:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate custom PDF');
    }
  }

 
  async getStudentProgressReportBlob(studentId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const queryString = params.toString();
      const url = `/pdf/student/${studentId}/progress-report${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting student progress report blob:', error);
      throw new Error(error.response?.data?.error || 'Failed to get progress report');
    }
  }

  previewPDF(blob) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: URL will be cleaned up when the new tab is closed
  }
}

// Export singleton instance
export default new pdfService();