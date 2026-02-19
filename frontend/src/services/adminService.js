import api from './api';

const adminService = {
  // User Management
  getUsers: async (filters = {}) => {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  updateUserStatus: async (id, status) => {
    const response = await api.put(`/admin/users/${id}/status`, { status });
    return response.data;
  },

  // Admin Management (Super Admin only)
  createAdmin: async (adminData) => {
    const response = await api.post('/admin/admins', adminData);
    return response.data;
  },

  // Teacher Management
  getAllTeachers: async (filters = {}) => {
    const response = await api.get('/admin/teachers', { params: filters });
    return response.data;
  },

  getTeacherDetails: async (id) => {
    const response = await api.get(`/admin/teachers/${id}`);
    return response.data;
  },

  // DELETE TEACHER (NEW)
  deleteTeacher: async (id) => {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
  },

  registerTeacher: async (teacherData) => {
    const response = await api.post('/enrollment/teachers', teacherData);
    return response.data;
  },

   // NEW: Update teacher
  updateTeacher: async (id, teacherData) => {
    const response = await api.put(`/admin/teachers/${id}`, teacherData);
    return response.data;
  },

  
  // Student Management
  getAllStudents: async (filters = {}) => {
    const response = await api.get('/admin/students', { params: filters });
    return response.data;
  },

  getStudentDetails: async (id) => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },

  // DELETE STUDENT (NEW)
  deleteStudent: async (id) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },

  // NEW: Update student
  updateStudent: async (id, studentData) => {
    const response = await api.put(`/admin/students/${id}`, studentData);
    return response.data;
  },

  // Get student enrollment history (Admin-specific with enhanced data)
  getStudentEnrollmentHistory: async (studentId, filters = {}) => {
    const response = await api.get(`/admin/students/${studentId}/enrollment-history`, { params: filters });
    return response.data;
  },

  // Batch promote students
  promoteStudents: async (promotionData) => {
    const response = await api.post('/admin/students/promote', promotionData);
    return response.data;
  },

  registerStudent: async (studentData) => {
    const response = await api.post('/enrollment/students', studentData);
    return response.data;
  },

  // Class Management
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  getClasses: async () => {
    const response = await api.get('/classes');
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

  assignTeacherToClass: async (classId, teacherId) => {
    const response = await api.post(`/classes/${classId}/assign-teacher`, { teacherId });
    return response.data;
  },

  // Subject Management
  createSubject: async (subjectData) => {
    const response = await api.post('/subjects', subjectData);
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get('/subjects');
    return response.data;
  },

  assignTeacherToSubject: async (subjectId, teacherId) => {
    const response = await api.post(`/subjects/${subjectId}/assign-teacher`, { teacherId });
    return response.data;
  },

  // Enrollment Management
  enrollStudentInClass: async (enrollmentData) => {
    const response = await api.post('/enrollment/class-enrollment', enrollmentData);
    return response.data;
  },

  generateCustomReport: async (filters = {}) => {
  const response = await api.get('/admin/custom-report', { params: filters });
  return response.data;
},


  transferStudent: async (transferData) => {
    const response = await api.post('/enrollment/transfer-student', transferData);
    return response.data;
  },

  // Leave Management
  manageLeaveRequests: async (filters = {}) => {
    const response = await api.get('/admin/leave-requests', { params: filters });
    return response.data;
  },

  updateLeaveRequest: async (id, leaveData) => {
    const response = await api.put(`/admin/leave-requests/${id}`, leaveData);
    return response.data;
  },

  // ============================================
  // ATTENDANCE OVERVIEW SERVICES (NEW)
  // ============================================
  getAttendanceOverview: async (filters = {}) => {
    const response = await api.get('/admin/attendance-overview', { params: filters });
    return response.data;
  },

  getAttendanceTrends: async (filters = {}) => {
    const response = await api.get('/admin/attendance-trends', { params: filters });
    return response.data;
  },

  getClassAttendanceComparison: async (filters = {}) => {
    const response = await api.get('/admin/class-attendance-comparison', { params: filters });
    return response.data;
  },

  // Legacy attendance overview (for backward compatibility)
  getLegacyAttendanceOverview: async (filters = {}) => {
    const response = await api.get('/admin/attendance', { params: filters });
    return response.data;
  },

  // System Statistics
  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Password Reset
  resetUserPassword: async (userId) => {
    const response = await api.post(`/auth/reset-password/${userId}`);
    return response.data;
  }
};

export default adminService;