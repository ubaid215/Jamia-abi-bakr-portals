const express = require('express');
const router = express.Router();
const HifzProgressController = require('../controllers/hifzProgressController');
const HifzPDFController = require('../controllers/HifzPDFController');
const HifzAnalyticsService = require('../services/HifzAnalyticsService');

// Middleware imports (adjust based on your auth setup)
// const { authenticate } = require('../middleware/auth');
// const { checkRole } = require('../middleware/roleCheck');

// ============= Progress Management Routes =============

// Save daily progress
router.post(
  '/progress/:studentId',
  // authenticate,
  // checkRole(['TEACHER', 'ADMIN']),
  HifzProgressController.saveProgress.bind(HifzProgressController)
);

// Update progress report
router.put(
  '/progress/:studentId/:progressId',
  // authenticate,
  // checkRole(['TEACHER', 'ADMIN']),
  HifzProgressController.updateProgress.bind(HifzProgressController)
);

// Get student progress records
router.get(
  '/progress/:studentId',
  // authenticate,
  HifzProgressController.getStudentProgress.bind(HifzProgressController)
);

// Initialize Hifz status (for new students)
router.post(
  '/status/initialize/:studentId',
  // authenticate,
  // checkRole(['ADMIN']),
  HifzProgressController.initializeHifzStatus.bind(HifzProgressController)
);

// Update para completion
router.put(
  '/status/para-completion/:studentId',
  // authenticate,
  // checkRole(['TEACHER', 'ADMIN']),
  HifzProgressController.updateParaCompletion.bind(HifzProgressController)
);

// Get poor performers
router.get(
  '/poor-performers',
  // authenticate,
  // checkRole(['TEACHER', 'ADMIN']),
  HifzProgressController.getPoorPerformers.bind(HifzProgressController)
);

// ============= Analytics Routes =============

// Get student analytics
router.get(
  '/analytics/student/:studentId',
  // authenticate,
  HifzProgressController.getStudentAnalytics.bind(HifzProgressController)
);

// Compare with class average
router.get(
  '/analytics/compare/:studentId',
  // authenticate,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const comparison = await HifzAnalyticsService.compareWithClassAverage(studentId);
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
  // authenticate,
  // checkRole(['TEACHER', 'ADMIN']),
  async (req, res) => {
    try {
      const { classId } = req.params;
      const { days = 30 } = req.query;
      const analytics = await HifzAnalyticsService.getClassAnalytics(
        classId, 
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

// Generate and download PDF report
router.get(
  '/report/pdf/:studentId',
  // authenticate,
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

// Save PDF report to server
router.post(
  '/report/save/:studentId',
  // authenticate,
  // checkRole(['ADMIN']),
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
  // authenticate,
  // checkRole(['ADMIN']),
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
  // authenticate,
  // checkRole(['ADMIN']),
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
  // authenticate,
  // checkRole(['ADMIN']),
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