const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, requireStudent } = require('../middlewares/auth');

// Student dashboard
router.get('/dashboard', authenticateToken, requireStudent, studentController.getStudentDashboard);

// Attendance
router.get('/attendance', authenticateToken, requireStudent, studentController.getMyAttendance);

// Progress and performance
router.get('/progress', authenticateToken, requireStudent, studentController.getMyProgress);

// Class information
router.get('/class-history', authenticateToken, requireStudent, studentController.getMyClassHistory);
router.get('/current-class', authenticateToken, requireStudent, studentController.getMyCurrentClass);

// Profile management
router.get('/profile', authenticateToken, requireStudent, studentController.getMyProfile);
router.put('/profile', authenticateToken, requireStudent, studentController.updateMyProfile);

module.exports = router;