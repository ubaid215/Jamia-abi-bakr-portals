import api from './api';

const classService = {
  // Create a new class
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  // Get all classes
  getClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  // Get class by ID
  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  // Update class
  updateClass: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  // Delete class
  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  // Assign teacher to class 
  assignTeacher: async (classId, teacherId) => {
    const response = await api.post(`/classes/${classId}/assign-teacher`, { teacherId });
    return response.data;
  },

  // Get class students
  getClassStudents: async (classId) => {
    const response = await api.get(`/classes/${classId}/students`);
    return response.data;
  },

  // Get class subjects
  getClassSubjects: async (classId) => {
    const response = await api.get(`/subjects/class/${classId}`);
    return response.data;
  },

  // Generate roll number for a class
  generateRollNumber: async (classId) => {
    const response = await api.get(`/classes/${classId}/generate-roll-number`);
    return response.data;
  },

  // Get next available roll number for a class (without generating)
  getNextRollNumber: async (classId) => {
    const response = await api.get(`/classes/${classId}/next-roll-number`);
    return response.data;
  },

  // Generate multiple roll numbers for bulk operations
  generateMultipleRollNumbers: async (classId, count = 1) => {
    const response = await api.post('/classes/generate-multiple-roll-numbers', {
      classId,
      count
    });
    return response.data;
  },

  // ============================================
  // ENROLLMENT METHODS (UPDATED) ✅
  // ============================================

  /**
   * Enroll a single student to a class
   * @param {string} studentId - The student ID (can be student.id or user.id)
   * @param {string} classId - The class ID to enroll into
   * @param {object} enrollmentData - Additional enrollment data
   * @returns {Promise} Enrollment response
   */
  enrollStudent: async (studentId, classId, enrollmentData = {}) => {
    try {
      const payload = {
        studentId,
        classId,
        startDate: new Date().toISOString(),
        isCurrent: true,
        ...enrollmentData
      };
      
      console.log('📤 Enrolling student:', payload);
      
      const response = await api.post('/classes/enroll', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error enrolling student:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Enroll student with auto-generated roll number
   * @param {string} studentId - The student ID
   * @param {string} classId - The class ID
   * @param {object} enrollmentData - Additional enrollment data
   * @returns {Promise} Enrollment response
   */
  enrollStudentWithAutoRollNumber: async (studentId, classId, enrollmentData = {}) => {
    try {
      // Generate roll number first
      const rollNumberResponse = await classService.generateRollNumber(classId);
      
      console.log('🔢 Generated roll number:', rollNumberResponse.rollNumber);
      
      // Enroll with the generated roll number
      const payload = {
        studentId,
        classId,
        rollNumber: rollNumberResponse.rollNumber,
        startDate: new Date().toISOString(),
        isCurrent: true,
        ...enrollmentData
      };
      
      const response = await api.post('/classes/enroll', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error enrolling student with auto roll number:', error);
      throw error;
    }
  },

  /**
   * Bulk enroll multiple students to a class
   * @param {Array<string>} studentIds - Array of student IDs
   * @param {string} classId - The class ID
   * @param {object} enrollmentData - Additional enrollment data
   * @returns {Promise} Bulk enrollment response
   */
  bulkEnrollStudents: async (studentIds, classId, enrollmentData = {}) => {
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error('studentIds must be a non-empty array');
      }

      console.log(`📦 Bulk enrolling ${studentIds.length} students to class ${classId}`);
      
      // Generate multiple roll numbers at once
      const rollNumbersResponse = await classService.generateMultipleRollNumbers(
        classId, 
        studentIds.length
      );
      
      if (!rollNumbersResponse.rollNumbers || 
          rollNumbersResponse.rollNumbers.length !== studentIds.length) {
        throw new Error('Failed to generate sufficient roll numbers');
      }
      
      console.log('🔢 Generated roll numbers:', rollNumbersResponse.rollNumbers);
      
      // Create enrollment requests for each student
      const enrollmentPromises = studentIds.map((studentId, index) => {
        const payload = {
          studentId,
          classId,
          rollNumber: rollNumbersResponse.rollNumbers[index],
          startDate: new Date().toISOString(),
          isCurrent: true,
          ...enrollmentData
        };
        
        return api.post('/classes/enroll', payload)
          .then(response => ({
            success: true,
            studentId,
            data: response.data
          }))
          .catch(error => ({
            success: false,
            studentId,
            error: error.response?.data?.error || error.message
          }));
      });
      
      const results = await Promise.all(enrollmentPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ Successfully enrolled: ${successful.length}`);
      console.log(`❌ Failed: ${failed.length}`);
      
      return {
        success: true,
        message: `Enrolled ${successful.length} out of ${studentIds.length} students`,
        summary: {
          total: studentIds.length,
          successful: successful.length,
          failed: failed.length
        },
        results: {
          successful: successful.map(r => ({
            studentId: r.studentId,
            enrollment: r.data
          })),
          failed: failed.map(r => ({
            studentId: r.studentId,
            error: r.error
          }))
        }
      };
    } catch (error) {
      console.error('❌ Error in bulk enrollment:', error);
      throw error;
    }
  },

  /**
   * Transfer student from one class to another
   * @param {string} studentId - The student ID
   * @param {string} fromClassId - Current class ID
   * @param {string} toClassId - Target class ID
   * @param {object} enrollmentData - Additional enrollment data
   * @returns {Promise} Transfer response
   */
  transferStudent: async (studentId, fromClassId, toClassId, enrollmentData = {}) => {
    try {
      console.log(`🔄 Transferring student ${studentId} from ${fromClassId} to ${toClassId}`);
      
      // Generate new roll number for target class
      const rollNumberResponse = await classService.generateRollNumber(toClassId);
      
      const payload = {
        studentId,
        classId: toClassId,
        rollNumber: rollNumberResponse.rollNumber,
        transferFromClassId: fromClassId,
        startDate: new Date().toISOString(),
        isCurrent: true,
        ...enrollmentData
      };
      
      const response = await api.post('/classes/enroll', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error transferring student:', error);
      throw error;
    }
  },

  // ============================================
  // LEGACY METHODS (DEPRECATED - Keep for backward compatibility)
  // ============================================

  /**
   * @deprecated Use enrollStudent() or enrollStudentWithAutoRollNumber() instead
   */
  assignClassToStudent: async (studentId, classId, enrollmentData = {}) => {
    console.warn('⚠️ assignClassToStudent is deprecated. Use enrollStudent() instead.');
    return classService.enrollStudentWithAutoRollNumber(studentId, classId, enrollmentData);
  },

  /**
   * @deprecated Use bulkEnrollStudents() instead
   */
  bulkAssignClassToStudents: async (studentIds, classId, enrollmentData = {}) => {
    console.warn('⚠️ bulkAssignClassToStudents is deprecated. Use bulkEnrollStudents() instead.');
    return classService.bulkEnrollStudents(studentIds, classId, enrollmentData);
  }
};

export default classService;