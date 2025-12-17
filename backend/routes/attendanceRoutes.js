const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireTeacherOrAdmin } = require('../middlewares/auth');

// ============================================
// MARK ATTENDANCE ROUTES
// ============================================

// Mark attendance - supports individual, bulk, and bulk with exceptions
router.post('/mark', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.markAttendance
);

// Mark attendance with bulk status and exceptions
router.post('/mark-with-exceptions', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.markAttendanceWithExceptions
);

// ============================================
// UPDATE/CORRECTION ROUTES
// ============================================

// Update single attendance record by ID (Teacher who marked it or Admin)
router.put('/:id', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.updateAttendance
);

// Update multiple attendance records for same date (bulk correction)
router.post('/bulk-update', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.updateBulkAttendance
);

// Re-mark entire class attendance for same date (complete correction)
router.post('/remark', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.remarkAttendance
);

// ============================================
// GET/RETRIEVE ROUTES
// ============================================

// Get attendance for a class/subject on specific date
router.get('/', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.getAttendance
);

// Get attendance for a specific student over date range
router.get('/student/:studentId', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.getStudentAttendance
);

// Get attendance summary for a class over date range
router.get('/class/:classRoomId/summary', 
  authenticateToken, 
  requireTeacherOrAdmin, 
  attendanceController.getClassAttendanceSummary
);

module.exports = router;