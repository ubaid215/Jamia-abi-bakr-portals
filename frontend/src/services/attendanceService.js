import api from './api';

const attendanceService = {
  // Mark attendance (Teachers only)
  markAttendance: async (attendanceData) => {
    const response = await api.post('/attendance/mark', attendanceData);
    return response.data;
  },

  // Get attendance for a class/subject on specific date
  getAttendance: async (filters = {}) => {
    const response = await api.get('/attendance', { params: filters });
    return response.data;
  },

  // Get attendance for a specific student over date range
  getStudentAttendance: async (studentId, filters = {}) => {
    const response = await api.get(`/attendance/student/${studentId}`, { params: filters });
    return response.data;
  },

  // Get attendance summary for a class over date range
  getClassAttendanceSummary: async (classRoomId, filters = {}) => {
    const response = await api.get(`/attendance/class/${classRoomId}/summary`, { params: filters });
    return response.data;
  },

  // Update attendance record
  updateAttendance: async (attendanceId, attendanceData) => {
    const response = await api.put(`/attendance/${attendanceId}`, attendanceData);
    return response.data;
  }
};

export default attendanceService;