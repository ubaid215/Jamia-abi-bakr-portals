// routes/hifzReport.routes.js
const express = require('express');
const router = express.Router();
const hifzReportController = require('../controllers/hifzReportController');
const { 
  authenticateToken, 
  requireStudentTeacherOrAdmin,
  requireTeacherOrAdmin,
  requireAdmin 
} = require('../middlewares/auth');

// Generate PDF report for a student
// GET /api/hifz-reports/generate?studentId=xxx&startDate=2024-01-01&endDate=2024-01-31
router.get(
  '/generate',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  hifzReportController.generateHifzReport.bind(hifzReportController)
);

// Get student analytics (JSON format)
// GET /api/hifz-reports/analytics/:studentId?days=30
router.get(
  '/analytics/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  hifzReportController.getStudentAnalytics.bind(hifzReportController)
);

// Update para completion (Teacher only)
// PUT /api/hifz-reports/para-completion/:studentId
// Body: { completedParas: [1,2,3], currentPara: 4, paraProgress: 45.5 }
router.put(
  '/para-completion/:studentId',
  authenticateToken,
  requireTeacherOrAdmin,
  hifzReportController.updateParaCompletion.bind(hifzReportController)
);

// Get student alerts and recommendations
// GET /api/hifz-reports/alerts/:studentId
router.get(
  '/alerts/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  hifzReportController.getStudentAlerts.bind(hifzReportController)
);

// Bulk generate reports (Admin only)
// GET /api/hifz-reports/bulk-generate?classId=xxx
router.get(
  '/bulk-generate',
  authenticateToken,
  requireAdmin,
  hifzReportController.bulkGenerateReports.bind(hifzReportController)
);

module.exports = router;