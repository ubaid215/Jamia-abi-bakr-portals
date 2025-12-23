const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/PDFController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// PDF Generation Routes
router.get('/student/:studentId/progress-report', pdfController.generateStudentProgressReport);
router.get('/class/:classRoomId/exam-marksheet', pdfController.generateExamMarkSheet);
router.get('/class/:classRoomId/attendance-sheet', pdfController.generateClassAttendanceSheet);
router.post('/custom', pdfController.generateCustomPDF);

// Data Fetching for UI
router.get('/students', pdfController.getAllStudentsForPDF);
router.get('/classrooms', pdfController.getAllClassroomsForPDF);
router.get('/stats', pdfController.getPDFStats);

module.exports = router;