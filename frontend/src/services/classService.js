import api from './api';

const classService = {
  // ============================================================
  // CLASS CRUD
  // ============================================================

  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  getClasses: async (params = {}) => {
    const response = await api.get('/classes', { params });
    return response.data;
  },

  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  updateClass: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  // ============================================================
  // TEACHER ASSIGNMENT — SINGLE (legacy, kept for backward compat)
  // ============================================================

  /**
   * Assign the single primary/class teacher.
   * Also syncs into the classTeachers join table as CLASS_TEACHER.
   * @deprecated for multi-teacher use — prefer assignTeachers()
   */
  assignTeacher: async (classId, teacherId) => {
    const response = await api.post(`/classes/${classId}/assign-teacher`, { teacherId });
    return response.data;
  },

  // ============================================================
  // ✅ TEACHER ASSIGNMENT — MULTI-TEACHER
  // ============================================================

  /**
   * Get all teachers assigned to a class (from classTeachers join table).
   * Includes role (CLASS_TEACHER | SUBJECT_TEACHER | CO_TEACHER) and full teacher info.
   */
  getClassTeachers: async (classId) => {
    const response = await api.get(`/classes/${classId}/teachers`);
    return response.data;
  },

  /**
   * Assign one or more teachers to a class.
   * Upserts — safe to call multiple times.
   * @param {string} classId
   * @param {Array<{ teacherId: string, role?: string }>} teachers
   *   role defaults to 'SUBJECT_TEACHER' if omitted.
   *   Valid roles: 'CLASS_TEACHER' | 'SUBJECT_TEACHER' | 'CO_TEACHER'
   */
  assignTeachers: async (classId, teachers) => {
    const response = await api.post(`/classes/${classId}/teachers`, { teachers });
    return response.data;
  },

  /**
   * Update the role of a specific teacher in a class.
   * @param {string} classId
   * @param {string} teacherId
   * @param {string} role - 'CLASS_TEACHER' | 'SUBJECT_TEACHER' | 'CO_TEACHER'
   */
  updateClassTeacherRole: async (classId, teacherId, role) => {
    const response = await api.patch(`/classes/${classId}/teachers/${teacherId}`, { role });
    return response.data;
  },

  /**
   * Remove a specific teacher from a class.
   * If this teacher is the primary class teacher, ClassRoom.teacherId is also cleared.
   */
  removeClassTeacher: async (classId, teacherId) => {
    const response = await api.delete(`/classes/${classId}/teachers/${teacherId}`);
    return response.data;
  },

  // ============================================================
  // STUDENTS & SUBJECTS
  // ============================================================

  getClassStudents: async (classId) => {
    const response = await api.get(`/classes/${classId}/students`);
    return response.data;
  },

  getClassSubjects: async (classId) => {
    const response = await api.get(`/subjects/class/${classId}`);
    return response.data;
  },

  // ============================================================
  // ROLL NUMBERS
  // ============================================================

  generateRollNumber: async (classId) => {
    const response = await api.get(`/classes/${classId}/generate-roll-number`);
    return response.data;
  },

  getNextRollNumber: async (classId) => {
    const response = await api.get(`/classes/${classId}/next-roll-number`);
    return response.data;
  },

  generateMultipleRollNumbers: async (classId, count = 1) => {
    const response = await api.post('/classes/generate-multiple-roll-numbers', { classId, count });
    return response.data;
  },

  // ============================================================
  // ENROLLMENT
  // ============================================================

  /**
   * Enroll a student into a class.
   * Roll number is auto-generated on the backend if not provided.
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

  enrollStudentWithAutoRollNumber: async (studentId, classId, enrollmentData = {}) => {
    try {
      const rollNumberResponse = await classService.generateRollNumber(classId);
      const payload = {
        studentId,
        classId,
        rollNumber: rollNumberResponse.rollNumber,
        startDate:  new Date().toISOString(),
        isCurrent:  true,
        ...enrollmentData
      };
      const response = await api.post('/classes/enroll', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error enrolling student with auto roll number:', error);
      throw error;
    }
  },

  bulkEnrollStudents: async (studentIds, classId, enrollmentData = {}) => {
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error('studentIds must be a non-empty array');
      }

      const rollNumbersResponse = await classService.generateMultipleRollNumbers(classId, studentIds.length);

      if (!rollNumbersResponse.rollNumbers || rollNumbersResponse.rollNumbers.length !== studentIds.length) {
        throw new Error('Failed to generate sufficient roll numbers');
      }

      const results = await Promise.all(
        studentIds.map((studentId, index) => {
          const payload = {
            studentId,
            classId,
            rollNumber: rollNumbersResponse.rollNumbers[index],
            startDate:  new Date().toISOString(),
            isCurrent:  true,
            ...enrollmentData
          };
          return api.post('/classes/enroll', payload)
            .then(res => ({ success: true, studentId, data: res.data }))
            .catch(err => ({ success: false, studentId, error: err.response?.data?.error || err.message }));
        })
      );

      const successful = results.filter(r => r.success);
      const failed     = results.filter(r => !r.success);

      return {
        success: true,
        message: `Enrolled ${successful.length} out of ${studentIds.length} students`,
        summary: { total: studentIds.length, successful: successful.length, failed: failed.length },
        results: {
          successful: successful.map(r => ({ studentId: r.studentId, enrollment: r.data })),
          failed:     failed.map(r => ({ studentId: r.studentId, error: r.error }))
        }
      };
    } catch (error) {
      console.error('❌ Error in bulk enrollment:', error);
      throw error;
    }
  },

  transferStudent: async (studentId, fromClassId, toClassId, enrollmentData = {}) => {
    try {
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

  // ============================================================
  // LEGACY ALIASES (deprecated — kept for backward compatibility)
  // ============================================================

  /** @deprecated Use enrollStudent() or enrollStudentWithAutoRollNumber() */
  assignClassToStudent: async (studentId, classId, enrollmentData = {}) => {
    console.warn('⚠️ assignClassToStudent is deprecated. Use enrollStudent() instead.');
    return classService.enrollStudentWithAutoRollNumber(studentId, classId, enrollmentData);
  },

  /** @deprecated Use bulkEnrollStudents() */
  bulkAssignClassToStudents: async (studentIds, classId, enrollmentData = {}) => {
    console.warn('⚠️ bulkAssignClassToStudents is deprecated. Use bulkEnrollStudents() instead.');
    return classService.bulkEnrollStudents(studentIds, classId, enrollmentData);
  }
};

export default classService;