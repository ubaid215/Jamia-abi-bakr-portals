// pdfRoutes.js
const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticateToken } = require('../middlewares/auth');

// ============================================
// AUTHENTICATION MIDDLEWARE
// All routes require authentication
// ============================================
router.use(authenticateToken);

// ============================================
// PDF GENERATION ROUTES
// ============================================

// Student Progress Report
router.get('/student/:studentId/progress-report', pdfController.generateStudentProgressReport);

// Exam Mark Sheet
router.get('/class/:classRoomId/exam-marksheet', pdfController.generateExamMarkSheet);

// Class Attendance Sheet
router.get('/class/:classRoomId/attendance-sheet', pdfController.generateClassAttendanceSheet);

// Custom PDF Generator
router.post('/custom', pdfController.generateCustomPDF);

// ============================================
// DATA FETCHING FOR PDF GENERATION UI
// ============================================

// Get students for dropdown
router.get('/students', pdfController.getAllStudentsForPDF);

// Get classrooms for dropdown
router.get('/classrooms', pdfController.getAllClassroomsForPDF);

// Get PDF statistics
router.get('/stats', pdfController.getPDFStats);

module.exports = router;