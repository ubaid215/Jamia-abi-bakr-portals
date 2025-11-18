import api from './api';

const enrollmentService = {
  // Register teacher
  registerTeacher: async (teacherData) => {
    const response = await api.post('/enrollment/teachers', teacherData);
    return response.data;
  },

  // Register student
  registerStudent: async (studentData) => {
    const response = await api.post('/enrollment/students', studentData);
    return response.data;
  },

  // Register parent
  registerParent: async (parentData) => {
    const response = await api.post('/enrollment/register-parent', parentData);
    return response.data;
  },

  // Enroll student in class
  enrollStudentInClass: async (enrollmentData) => {
    const response = await api.post('/enrollment/enroll-student', enrollmentData);
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

  // Get class enrollments
  getClassEnrollments: async (classRoomId) => {
    const response = await api.get(`/classes/${classRoomId}/students`);
    return response.data;
  }
};

export default enrollmentService;