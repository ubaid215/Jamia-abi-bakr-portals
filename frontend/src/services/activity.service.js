import api from './api';

class ActivityService {
  // Create new activity (IMPLEMENTED in backend)
  async createActivity(activityData) {
    const response = await api.post('/activities', activityData);
    return response.data;
  }

  // Get activities for a student (NOT YET IMPLEMENTED - returns 501)
  async getStudentActivities(studentId, params = {}) {
    try {
      const response = await api.get(`/activities/student/${studentId}`, { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        // Endpoint not implemented yet, return empty data
        console.warn('Student activities endpoint not yet implemented');
        return { success: true, data: [] };
      }
      throw error;
    }
  }

  // Get activities for a classroom (NOT YET IMPLEMENTED - returns 501)
  async getClassActivities(classRoomId, params = {}) {
    try {
      const response = await api.get(`/activities/class/${classRoomId}`, { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        // Endpoint not implemented yet, return empty data
        console.warn('Classroom activities endpoint not yet implemented');
        return { success: true, data: [] };
      }
      throw error;
    }
  }

  // Get single activity by ID (NOT YET IMPLEMENTED - returns 501)
  async getActivityById(id) {
    try {
      const response = await api.get(`/activities/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        console.warn('Get activity by ID endpoint not yet implemented');
        return { success: false, data: null };
      }
      throw error;
    }
  }

  // Update activity (NOT YET IMPLEMENTED - returns 501)
  async updateActivity(id, updateData) {
    try {
      const response = await api.put(`/activities/${id}`, updateData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        throw new Error('Update activity feature is not yet available');
      }
      throw error;
    }
  }

  // Delete activity (NOT YET IMPLEMENTED - returns 501)
  async deleteActivity(id) {
    try {
      const response = await api.delete(`/activities/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        throw new Error('Delete activity feature is not yet available');
      }
      throw error;
    }
  }

  // Helper methods for related data
  // Note: These endpoints are assumed based on your backend structure
  // You'll need to verify these exist in your API

  // Get current academic configuration
  async getAcademicConfig() {
    try {
      const response = await api.get('/academic-config/current');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch academic config:', error);
      return { success: false, data: null };
    }
  }

  // Get student's current enrollment
  async getStudentEnrollment(studentId) {
    try {
      const response = await api.get(`/students/${studentId}/enrollment`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch student enrollment:', error);
      return { success: false, data: null };
    }
  }

  // Get teacher's assigned classes
  async getTeacherClasses(teacherId) {
    try {
      // Use the 'my-classes' endpoint which uses the authenticated user's ID
      // The teacherId parameter is kept for compatibility but ignored
      const response = await api.get('/teachers/my-classes');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch teacher classes:', error);
      return { success: false, data: [] };
    }
  }

  // Get attendance records for date range
  async getAttendanceRecords(studentId, startDate, endDate) {
    try {
      const response = await api.get(`/attendance/student/${studentId}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      return { success: false, data: [] };
    }
  }

  // Get subjects for a classroom
  async getClassroomSubjects(classRoomId) {
    try {
      const response = await api.get(`/classes/${classRoomId}/subjects`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch classroom subjects:', error);
      return { success: false, data: [] };
    }
  }

  // Get student details
  async getStudentDetails(studentId) {
    try {
      const response = await api.get(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch student details:', error);
      return { success: false, data: null };
    }
  }

  // Get students for a classroom
  async getClassroomStudents(classRoomId) {
    try {
      const response = await api.get(`/classes/${classRoomId}/students`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch classroom students:', error);
      return { success: false, data: [] };
    }
  }

  // Validation helpers for activity data
  validateActivityData(data) {
    const errors = [];

    // Required fields
    if (!data.studentId) errors.push('Student ID is required');
    if (!data.classRoomId) errors.push('Classroom ID is required');
    if (!data.date) errors.push('Date is required');
    if (!data.subjectsStudied || !Array.isArray(data.subjectsStudied) || data.subjectsStudied.length === 0) {
      errors.push('At least one subject must be studied');
    }

    // Validate subjects studied
    if (data.subjectsStudied && Array.isArray(data.subjectsStudied)) {
      data.subjectsStudied.forEach((subject, index) => {
        if (!subject.subjectId) {
          errors.push(`Subject ${index + 1}: Subject ID is required`);
        }
        if (!subject.topicsCovered || !Array.isArray(subject.topicsCovered) || subject.topicsCovered.length === 0) {
          errors.push(`Subject ${index + 1}: Topics covered is required`);
        }
        if (subject.understandingLevel && (subject.understandingLevel < 1 || subject.understandingLevel > 5)) {
          errors.push(`Subject ${index + 1}: Understanding level must be between 1 and 5`);
        }
      });
    }

    // Validate rating fields
    if (data.participationLevel && (data.participationLevel < 1 || data.participationLevel > 5)) {
      errors.push('Participation level must be between 1 and 5');
    }
    if (data.behaviorRating && (data.behaviorRating < 1 || data.behaviorRating > 5)) {
      errors.push('Behavior rating must be between 1 and 5');
    }
    if (data.disciplineScore && (data.disciplineScore < 1 || data.disciplineScore > 5)) {
      errors.push('Discipline score must be between 1 and 5');
    }

    // Validate skills snapshot
    if (data.skillsSnapshot) {
      const validSkills = ['reading', 'writing', 'listening', 'speaking', 'criticalThinking'];
      Object.keys(data.skillsSnapshot).forEach(skill => {
        if (!validSkills.includes(skill)) {
          errors.push(`Invalid skill: ${skill}`);
        }
        if (data.skillsSnapshot[skill] < 1 || data.skillsSnapshot[skill] > 5) {
          errors.push(`${skill} must be between 1 and 5`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format activity data for submission
  formatActivityData(data) {
    return {
      studentId: data.studentId,
      classRoomId: data.classRoomId,
      subjectId: data.subjectId || null,
      date: data.date,
      attendanceId: data.attendanceId || null,
      subjectsStudied: data.subjectsStudied,
      homeworkAssigned: data.homeworkAssigned || null,
      homeworkCompleted: data.homeworkCompleted || null,
      classworkCompleted: data.classworkCompleted || null,
      participationLevel: data.participationLevel || 3,
      assessmentsTaken: data.assessmentsTaken || null,
      behaviorRating: data.behaviorRating || 3,
      disciplineScore: data.disciplineScore || 3,
      skillsSnapshot: data.skillsSnapshot || null,
      strengths: data.strengths || null,
      improvements: data.improvements || null,
      concerns: data.concerns || null,
      teacherRemarks: data.teacherRemarks || null,
      parentNotes: data.parentNotes || null
    };
  }
}

export default new ActivityService();