import api from './api';

const attendanceService = {
  // ============================================
  // MARK ATTENDANCE
  // ============================================

  // Mark attendance - supports individual, bulk, and bulk marking
  // Usage examples:
  // 1. Individual: { classRoomId, subjectId, date, attendanceRecords: [{studentId, status, remarks}] }
  // 2. Bulk: { classRoomId, subjectId, date, bulkStatus: 'PRESENT', bulkRemarks: '...' }
  markAttendance: async (attendanceData) => {
    const response = await api.post('/attendance/mark', attendanceData);
    return response.data;
  },

  // Mark attendance with bulk status and exceptions
  // Usage: { classRoomId, subjectId, date, defaultStatus: 'PRESENT', exceptions: [{studentId, status, remarks}] }
  markAttendanceWithExceptions: async (attendanceData) => {
    const response = await api.post('/attendance/mark-with-exceptions', attendanceData);
    return response.data;
  },

  // ============================================
  // UPDATE/CORRECTION
  // ============================================

  // Update single attendance record by ID
  updateAttendance: async (attendanceId, attendanceData) => {
    const response = await api.put(`/attendance/${attendanceId}`, attendanceData);
    return response.data;
  },

  // Update multiple attendance records for same date (bulk correction)
  // Usage: { classRoomId, subjectId, date, attendanceUpdates: [{studentId, status, remarks}] }
  updateBulkAttendance: async (updateData) => {
    const response = await api.post('/attendance/bulk-update', updateData);
    return response.data;
  },

  // Re-mark entire class attendance for same date (complete correction)
  // Usage 1 (Bulk): { classRoomId, subjectId, date, bulkStatus: 'PRESENT', bulkRemarks: '...' }
  // Usage 2 (Individual): { classRoomId, subjectId, date, attendanceRecords: [{studentId, status, remarks}] }
  remarkAttendance: async (attendanceData) => {
    const response = await api.post('/attendance/remark', attendanceData);
    return response.data;
  },

  // ============================================
  // GET/RETRIEVE
  // ============================================

  // Get attendance for a class/subject on specific date
  // Filters: { classRoomId, subjectId?, date }
  getAttendance: async (filters = {}) => {
    const response = await api.get('/attendance', { params: filters });
    return response.data;
  },

  // Get attendance for a specific student over date range
  // Filters: { startDate, endDate, classRoomId? }
  getStudentAttendance: async (studentId, filters = {}) => {
    const response = await api.get(`/attendance/student/${studentId}`, { params: filters });
    return response.data;
  },

  // Get attendance summary for a class over date range
  // Filters: { startDate, endDate, subjectId? }
  getClassAttendanceSummary: async (classRoomId, filters = {}) => {
    const response = await api.get(`/attendance/class/${classRoomId}/summary`, { params: filters });
    return response.data;
  }
};

export default attendanceService;