const express = require('express');
const router = express.Router();
const HifzProgressController = require('../controllers/hifzProgressController');
const HifzPDFController = require('../controllers/HifzPDFController');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');

// Import middleware
const {
  authenticateToken,
  requireTeacherOrAdmin,
  requireAdmin,
  requireTeacher,
  requireStudentTeacherOrAdmin
} = require('../middlewares/auth');

// ============= Progress Management Routes =============

// Save daily progress
router.post(
  '/progress/:studentId',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.saveProgress.bind(HifzProgressController)
);

// Update progress report
router.put(
  '/progress/:studentId/:progressId',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.updateProgress.bind(HifzProgressController)
);

// Get student progress records
router.get(
  '/progress/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  HifzProgressController.getStudentProgress.bind(HifzProgressController)
);

// Initialize Hifz status (for new students)
router.post(
  '/status/initialize/:studentId',
  authenticateToken,
  requireAdmin,
  HifzProgressController.initializeHifzStatus.bind(HifzProgressController)
);

// Update para completion
router.put(
  '/status/para-completion/:studentId',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.updateParaCompletion.bind(HifzProgressController)
);

// Get poor performers
router.get(
  '/poor-performers',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.getPoorPerformers.bind(HifzProgressController)
);

// ============= Performance Routes =============

// General Hifz performance
router.get(
  '/performance/hifz',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.hifzPerformance.bind(HifzProgressController)
);

// Class-wise Hifz performance
router.get(
  '/performance/all-hifz-classes',
  authenticateToken,
  requireTeacherOrAdmin,
  HifzProgressController.allHifzClassesPerformance.bind(HifzProgressController)
);

// ============= Analytics Routes =============

// Get student analytics
router.get(
  '/analytics/student/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  HifzProgressController.getStudentAnalytics.bind(HifzProgressController)
);

// Compare with class average
router.get(
  '/analytics/compare/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const cleanStudentId = studentId.replace(/^"+|"+$/g, '');
      const comparison = await HifzAnalyticsService.compareWithClassAverage(cleanStudentId);
      res.json({ success: true, comparison });
    } catch (error) {
      console.error('Compare analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

// Get class analytics
router.get(
  '/analytics/class/:classId',
  authenticateToken,
  requireTeacherOrAdmin,
  async (req, res) => {
    try {
      const { classId } = req.params;
      const cleanClassId = classId.replace(/^"+|"+$/g, '');
      const { days = 30 } = req.query;
      const analytics = await HifzAnalyticsService.getClassAnalytics(
        cleanClassId,
        parseInt(days)
      );
      res.json({ success: true, analytics });
    } catch (error) {
      console.error('Class analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

// ============= PDF Report Routes =============

// Generate and download PDF report (Standard/Legacy)
router.get(
  '/report/pdf/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  async (req, res) => {
    try {
      await HifzPDFController.generateReport(req, res);
    } catch (error) {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate PDF',
          error: error.message
        });
      }
    }
  }
);

// ✅ NEW ADDITION: Generate separate Hifz-only report
router.get(
  '/report/hifz-only/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  async (req, res) => {
    try {
      await HifzPDFController.generateHifzOnlyReport(req, res);
    } catch (error) {
      console.error('Hifz-only PDF generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Hifz-only PDF',
        error: error.message
      });
    }
  }
);

// ✅ NEW ADDITION: Generate separate Full report
router.get(
  '/report/full/:studentId',
  authenticateToken,
  requireStudentTeacherOrAdmin,
  async (req, res) => {
    try {
      await HifzPDFController.generateFullReport(req, res);
    } catch (error) {
      console.error('Full PDF generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Full PDF',
        error: error.message
      });
    }
  }
);

// Save PDF report to server
router.post(
  '/report/save/:studentId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { days = 30 } = req.body;
      const result = await HifzPDFController.savePDF(studentId, days);
      res.json(result);
    } catch (error) {
      console.error('Save PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save PDF',
        error: error.message
      });
    }
  }
);

// ============= Notification Routes =============

// Send weekly summary to all students (cron job endpoint)
router.post(
  '/notifications/weekly-summaries',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const HifzNotificationService = require('../services/HifzNotificationService');
      const prisma = require('../db/prismaClient');

      const students = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoom: {
              type: 'HIFZ'
            }
          }
        }
      });

      for (const student of students) {
        await HifzNotificationService.sendWeeklySummary(student.id);
      }

      res.json({
        success: true,
        message: `Sent weekly summaries to ${students.length} students`
      });
    } catch (error) {
      console.error('Send weekly summaries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send summaries',
        error: error.message
      });
    }
  }
);

// Notify all poor performers (cron job endpoint)
router.post(
  '/notifications/poor-performers',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const HifzNotificationService = require('../services/HifzNotificationService');
      await HifzNotificationService.notifyAllPoorPerformers();
      res.json({
        success: true,
        message: 'Poor performer notifications sent'
      });
    } catch (error) {
      console.error('Notify poor performers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: error.message
      });
    }
  }
);

// ============= Bulk Operations Routes =============

// Bulk generate reports for class
router.post(
  '/report/bulk/class/:classId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { classId } = req.params;
      const { days = 30 } = req.body;
      const prisma = require('../db/prismaClient');

      const students = await prisma.student.findMany({
        where: {
          currentEnrollment: {
            classRoomId: classId
          }
        },
        include: {
          user: { select: { name: true } }
        }
      });

      const results = [];

      for (const student of students) {
        try {
          const result = await HifzPDFController.savePDF(student.id, days);
          results.push({
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            ...result
          });
        } catch (error) {
          results.push({
            studentId: student.id,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        totalStudents: students.length,
        successCount,
        failCount: students.length - successCount,
        results
      });

    } catch (error) {
      console.error('Bulk generate reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate bulk reports',
        error: error.message
      });
    }
  }
);

module.exports = router;