const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Registration routes (Admin only)
router.post('/teachers', authenticateToken, requireAdmin, enrollmentController.registerTeacher);
router.post('/students', authenticateToken, requireAdmin, enrollmentController.registerStudent);
router.post('/parents', authenticateToken, requireAdmin, enrollmentController.registerParent);

// Class enrollment management (Admin only)
router.post('/class-enrollment', authenticateToken, requireAdmin, enrollmentController.enrollStudentInClass);
router.post('/transfer-student', authenticateToken, requireAdmin, enrollmentController.transferStudent);
router.get('/student-history/:studentId', authenticateToken, enrollmentController.getStudentEnrollmentHistory);

module.exports = router;