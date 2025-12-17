const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// All PDF routes require admin or super admin access
router.use(verifyToken, requireAdmin);

// Generate student list PDF
router.get('/students', pdfController.generateStudentListPDF);

// Generate attendance report PDF
router.get('/attendance', pdfController.generateAttendanceReportPDF);

// Generate teacher report PDF
router.get('/teachers', pdfController.generateTeacherReportPDF);

// Generate financial report PDF
router.get('/financial', pdfController.generateFinancialReportPDF);

// Generate custom report PDF
router.post('/custom', pdfController.generateCustomReportPDF);

module.exports = router;