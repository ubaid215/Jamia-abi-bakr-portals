// src/services/hifzServices.js
import api from './api';



const hifzServices = {
  // ============= Progress Management =============

  /**
   * Save daily Hifz progress for a student
   * @param {string} studentId - Student ID
   * @param {Object} progressData - Progress data
   * @returns {Promise} Progress report with weekly performance
   */
  saveProgress: async (studentId, progressData) => {
  try {
    console.log(`📤 Saving progress for student ${studentId}:`, progressData);
    
    const response = await api.post(`/students/${studentId}/hifz/progress`, progressData);
    
    console.log('✅ Progress save response:', response.data);
    
    // Ensure response has success property
    if (response.data && response.data.success !== undefined) {
      return response.data;
    } else {
      // If backend doesn't return success property, assume it's successful
      return { 
        success: true, 
        progress: response.data,
        message: 'Progress saved successfully'
      };
    }
  } catch (error) {
    console.error('❌ Progress save error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // If backend returns an error response with data
    if (error.response?.data) {
      // Check if it's an error object
      if (typeof error.response.data === 'object' && error.response.data !== null) {
        return {
          success: false,
          error: error.response.data.error || error.response.data.message || 'Failed to save progress',
          ...error.response.data
        };
      }
      // Check if it's a string error
      if (typeof error.response.data === 'string') {
        // Check if it's HTML
        if (error.response.data.includes('<!DOCTYPE') || 
            error.response.data.includes('<html>') ||
            error.response.data.includes('Error')) {
          console.error('⚠️ Server returned HTML error page');
          return {
            success: false,
            error: 'Server error: Please check backend server logs.'
          };
        }
        // It's a plain text error
        return {
          success: false,
          error: error.response.data
        };
      }
    }
    
    // Return generic error
    return {
      success: false,
      error: error.message || 'Failed to save progress'
    };
  }
},

  /**
   * Update existing progress report
   * @param {string} studentId - Student ID
   * @param {string} progressId - Progress report ID
   * @param {Object} updateData - Updated progress data
   * @returns {Promise} Updated progress report
   */
  updateProgress: async (studentId, progressId, updateData) => {
    try {
      const response = await api.put(
        `/hifz/progress/${studentId}/${progressId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('Update progress error:', error);
      throw error;
    }
  },

  /**
   * Get progress records for a student
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters (startDate, endDate, limit, page)
   * @returns {Promise} Progress records with pagination
   */
  getStudentProgress: async (studentId, params = {}) => {
    try {
      const response = await api.get(`/hifz/progress/${studentId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get student progress error:', error);
      throw error;
    }
  },

  /**
   * Initialize Hifz status for a new student
   * @param {string} studentId - Student ID
   * @param {Object} statusData - Initial status (alreadyMemorizedParas, startingPara, joiningDate)
   * @returns {Promise} Created Hifz status
   */
  initializeHifzStatus: async (studentId, statusData) => {
    try {
      const response = await api.post(
        `/hifz/status/initialize/${studentId}`,
        statusData
      );
      return response.data;
    } catch (error) {
      console.error('Initialize Hifz status error:', error);
      throw error;
    }
  },

  /**
   * Update para completion status
   * @param {string} studentId - Student ID
   * @param {Object} completionData - Completion data (completedPara, currentPara, currentParaProgress)
   * @returns {Promise} Updated Hifz status
   */
  updateParaCompletion: async (studentId, completionData) => {
    try {
      const response = await api.put(
        `/hifz/status/para-completion/${studentId}`,
        completionData
      );
      return response.data;
    } catch (error) {
      console.error('Update para completion error:', error);
      throw error;
    }
  },

  /**
   * Get list of poor performing students
   * @returns {Promise} List of poor performers with performance metrics
   */
  getPoorPerformers: async () => {
    try {
      const response = await api.get('/hifz/poor-performers');
      return response.data;
    } catch (error) {
      console.error('Get poor performers error:', error);
      throw error;
    }
  },

  // ============= Analytics =============

  /**
   * Get comprehensive analytics for a student
   * @param {string} studentId - Student ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} Analytics data
   */
  getStudentAnalytics: async (studentId, days = 30) => {
    try {
      const response = await api.get(`/hifz/analytics/student/${studentId}`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Get student analytics error:', error);
      throw error;
    }
  },

  /**
   * Compare student performance with class average
   * @param {string} studentId - Student ID
   * @returns {Promise} Comparison data
   */
  compareWithClassAverage: async (studentId) => {
    try {
      const response = await api.get(`/hifz/analytics/compare/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Compare analytics error:', error);
      throw error;
    }
  },

  /**
   * Get analytics for entire class
   * @param {string} classId - Class ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} Class analytics
   */
  getClassAnalytics: async (classId, days = 30) => {
    try {
      const response = await api.get(`/hifz/analytics/class/${classId}`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Get class analytics error:', error);
      throw error;
    }
  },

  // ============= PDF Reports =============

  /**
   * Generate and download PDF report
   * @param {string} studentId - Student ID
   * @param {Object} params - Report parameters (startDate, endDate, days)
   * @returns {Promise} PDF blob
   */
  generatePDFReport: async (studentId, params = {}) => {
    try {
      const response = await api.get(`/hifz/report/pdf/${studentId}`, {
        params,
        responseType: 'blob' // Important for PDF download
      });
      return response.data;
    } catch (error) {
      console.error('Generate PDF report error:', error);
      throw error;
    }
  },

  /**
   * Save PDF report to server
   * @param {string} studentId - Student ID
   * @param {number} days - Number of days to include (default: 30)
   * @returns {Promise} Save result with file path
   */
  savePDFReport: async (studentId, days = 30) => {
    try {
      const response = await api.post(`/hifz/report/save/${studentId}`, { days });
      return response.data;
    } catch (error) {
      console.error('Save PDF report error:', error);
      throw error;
    }
  },

  /**
   * Download PDF report (helper function)
   * @param {string} studentId - Student ID
   * @param {string} studentName - Student name for filename
   * @param {Object} params - Report parameters
   */
  downloadPDFReport: async (studentId, studentName, params = {}) => {
    try {
      const blob = await hifzServices.generatePDFReport(studentId, params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hifz-report-${studentName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Download PDF error:', error);
      throw error;
    }
  },

  // ============= Notifications =============

  /**
   * Send weekly summaries to all Hifz students
   * @returns {Promise} Send result
   */
  sendWeeklySummaries: async () => {
    try {
      const response = await api.post('/hifz/notifications/weekly-summaries');
      return response.data;
    } catch (error) {
      console.error('Send weekly summaries error:', error);
      throw error;
    }
  },

  /**
   * Notify poor performers
   * @returns {Promise} Notification result
   */
  notifyPoorPerformers: async () => {
    try {
      const response = await api.post('/hifz/notifications/poor-performers');
      return response.data;
    } catch (error) {
      console.error('Notify poor performers error:', error);
      throw error;
    }
  },

  // ============= Bulk Operations =============

  /**
   * Generate reports for all students in a class
   * @param {string} classId - Class ID
   * @param {number} days - Number of days to include
   * @returns {Promise} Bulk generation results
   */
  bulkGenerateReports: async (classId, days = 30) => {
    try {
      const response = await api.post(`/hifz/report/bulk/class/${classId}`, { days });
      return response.data;
    } catch (error) {
      console.error('Bulk generate reports error:', error);
      throw error;
    }
  },

  // ============= Helper Functions =============

  /**
   * Calculate condition based on mistakes (client-side validation)
   * @param {number} sabaqMistakes - Sabaq mistakes
   * @param {number} sabqiMistakes - Sabqi mistakes
   * @param {number} manzilMistakes - Manzil mistakes
   * @returns {string} Condition (Excellent, Good, Medium, Below Average)
   */
  calculateCondition: (sabaqMistakes, sabqiMistakes, manzilMistakes) => {
    if (sabaqMistakes > 2 || sabqiMistakes > 2 || manzilMistakes > 3) {
      return 'Below Average';
    } else if (sabaqMistakes > 0 || sabqiMistakes > 1 || manzilMistakes > 1) {
      return 'Medium';
    } else if (sabaqMistakes === 0 && sabqiMistakes === 0 && manzilMistakes === 0) {
      return 'Excellent';
    } else {
      return 'Good';
    }
  },

  /**
   * Get condition color for UI
   * @param {string} condition - Condition string
   * @returns {string} Color code
   */
  getConditionColor: (condition) => {
    const colors = {
      'Excellent': '#27ae60',
      'Good': '#3498db',
      'Medium': '#f39c12',
      'Below Average': '#e74c3c',
      'Need Focus': '#e74c3c'
    };
    return colors[condition] || '#95a5a6';
  },

  /**
   * Format date for API
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDateForAPI: (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  },

  /**
   * Validate para number
   * @param {number} paraNumber - Para number to validate
   * @returns {boolean} Is valid
   */
  isValidPara: (paraNumber) => {
    return Number.isInteger(paraNumber) && paraNumber >= 1 && paraNumber <= 30;
  }
};

export default hifzServices;