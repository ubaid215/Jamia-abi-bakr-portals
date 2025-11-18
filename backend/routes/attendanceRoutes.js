const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireTeacherOrAdmin } = require('../middlewares/auth');

// Mark attendance (Teachers only)
router.post('/mark', authenticateToken, requireTeacherOrAdmin, attendanceController.markAttendance);

// Get attendance for a class/subject on specific date
router.get('/', authenticateToken, requireTeacherOrAdmin, attendanceController.getAttendance);

// Get attendance for a specific student over date range
router.get('/student/:studentId', authenticateToken, requireTeacherOrAdmin, attendanceController.getStudentAttendance);

// Get attendance summary for a class over date range
router.get('/class/:classRoomId/summary', authenticateToken, requireTeacherOrAdmin, attendanceController.getClassAttendanceSummary);

// Update attendance record (Teacher who marked it or Admin)
router.put('/:id', authenticateToken, requireTeacherOrAdmin, attendanceController.updateAttendance);

module.exports = router;