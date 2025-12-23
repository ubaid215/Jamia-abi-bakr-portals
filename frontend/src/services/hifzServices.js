// src/services/hifzServices.js
import api from './api';



const hifzServices = {
  // ============= Progress Management =============



  saveProgress: async (studentId, progressData) => {
    try {
      // Clean studentId
      const cleanStudentId = studentId.replace(/^"+|"+$/g, '');
      
      // ✅ CRITICAL: Validate progressData is an object
      if (!progressData || typeof progressData !== 'object') {
        console.error('❌ Invalid progressData:', progressData);
        throw new Error('Progress data must be an object');
      }
      
      // ✅ Ensure we're not accidentally sending just the studentId
      if (typeof progressData === 'string') {
        console.error('❌ progressData is a string, not an object:', progressData);
        throw new Error('Progress data cannot be a string');
      }
      
      console.log(`📤 Saving progress for student ${cleanStudentId}`);
      console.log('📋 Progress data:', JSON.stringify(progressData, null, 2));
      
      // ✅ Validate required fields - UPDATED: removed sabqiLines and manzilLines
      const requiredFields = [
        'date', 
        'sabaq', 
        'sabaqLines', 
        'sabaqMistakes',
        'sabqi',           // Now just a string, not required to have lines
        'sabqiMistakes',   // But mistakes are still tracked
        'manzil',          // Now just a string, not required to have lines
        'manzilMistakes',  // But mistakes are still tracked
        'attendance'       // Added attendance as required
      ];
      
      const missingFields = requiredFields.filter(field => 
        progressData[field] === undefined || progressData[field] === null
      );
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // ✅ Ensure sabqiLines and manzilLines are always 0 (if provided)
      // But they're not required anymore, so only set if they exist
      const finalData = {
        ...progressData,
        sabqiLines: progressData.sabqiLines || 0,  // Default to 0 if not provided
        manzilLines: progressData.manzilLines || 0 // Default to 0 if not provided
      };
      
      // ✅ Remove any undefined fields
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) {
          delete finalData[key];
        }
      });
      
      console.log('📤 Final data to send:', JSON.stringify(finalData, null, 2));
      
      // Make the API call
      const response = await api.post(`/hifz/progress/${cleanStudentId}`, finalData);
      
      console.log('✅ Progress saved successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Progress save error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        studentId: studentId,
        progressData: progressData,
        errorMessage: error.message
      });
      
      // Enhanced error handling
      if (error.response?.data) {
        let errorMessage = 'Failed to save progress';
        
        if (typeof error.response.data === 'string') {
          // Check if it's an HTML error page
          if (error.response.data.includes('<!DOCTYPE') || 
              error.response.data.includes('<html>')) {
            errorMessage = 'Server error: Please check backend logs';
          } else {
            // Try to extract JSON error
            try {
              const jsonMatch = error.response.data.match(/\{.*\}/s);
              if (jsonMatch) {
                const parsedError = JSON.parse(jsonMatch[0]);
                errorMessage = parsedError.message || parsedError.error;
              } else {
                errorMessage = error.response.data.substring(0, 200);
              }
            } catch (parseError) {
              errorMessage = error.response.data.substring(0, 200);
            }
          }
        } else if (typeof error.response.data === 'object') {
          errorMessage = error.response.data.message || 
                        error.response.data.error || 
                        'Unknown server error';
        }
        
        throw new Error(errorMessage);
      }
      
      throw error;
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
      // Ensure sabqiLines and manzilLines are 0 if updating
      const finalUpdateData = {
        ...updateData,
        sabqiLines: updateData.sabqiLines || 0,
        manzilLines: updateData.manzilLines || 0
      };
      
      const response = await api.put(
        `/hifz/progress/${studentId}/${progressId}`,
        finalUpdateData
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