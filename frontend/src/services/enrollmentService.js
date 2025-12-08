import api from './api';

const enrollmentService = {
  // Register teacher with file upload
  registerTeacher: async (formData, config = {}) => {
    const response = await api.post('/enrollment/teachers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    });
    return response.data;
  },

  // Register student with file upload
  registerStudent: async (formData, config = {}) => {
    const response = await api.post('/enrollment/students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    });
    return response.data;
  },

  // Register parent (no file upload)
  registerParent: async (parentData) => {
    const response = await api.post('/enrollment/parents', parentData);
    return response.data;
  },

  // Enroll student in class
  enrollStudentInClass: async (enrollmentData) => {
    const response = await api.post('/enrollment/class-enrollment', enrollmentData);
    return response.data;
  },

  // Transfer student to different class
  transferStudent: async (transferData) => {
    const response = await api.post('/enrollment/transfer-student', transferData);
    return response.data;
  },

  // Get student enrollment history
  getStudentEnrollmentHistory: async (studentId, page = 1, limit = 10) => {
    const response = await api.get(`/enrollment/student-history/${studentId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Get class enrollment
  getClassEnrollments: async (classRoomId) => {
    const response = await api.get(`/classes/${classRoomId}/students`);
    return response.data;
  },

  // Update teacher profile image
  updateTeacherProfileImage: async (teacherId, formData, config = {}) => {
    const response = await api.put(
      `/enrollments/teachers/${teacherId}/profile-image`, 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...config
      }
    );
    return response.data;
  },

  // Update student profile image
  updateStudentProfileImage: async (studentId, formData, config = {}) => {
    const response = await api.put(
      `/enrollments/students/${studentId}/profile-image`, 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...config
      }
    );
    return response.data;
  }
};

export default enrollmentService;