import api from './api';

const teacherService = {
  // Teacher dashboard
  getDashboard: async () => {
    const response = await api.get('/teachers/dashboard');
    return response.data;
  },

  // Get teacher's classes
  getMyClasses: async () => {
    const response = await api.get('/teachers/my-classes');
    return response.data;
  },

  // Get teacher's subjects
  getMySubjects: async () => {
    const response = await api.get('/teachers/my-subjects');
    return response.data;
  },

  // Get teacher's students
  getMyStudents: async () => {
    const response = await api.get('/teachers/my-students');
    return response.data;
  },

  // Get today's attendance
  getTodaysAttendance: async () => {
    const response = await api.get('/teachers/attendance/today');
    return response.data;
  },

  // Leave management
  applyForLeave: async (leaveData) => {
    const response = await api.post('/teachers/leave', leaveData);
    return response.data;
  },

  getMyLeaveHistory: async () => {
    const response = await api.get('/teachers/leave');
    return response.data;
  },

  // Activities
  getMyActivities: async () => {
    const response = await api.get('/teachers/activities');
    return response.data;
  },

  // Profile
  updateMyProfile: async (profileData) => {
    const response = await api.put('/teachers/profile', profileData);
    return response.data;
  }
};

export default teacherService;