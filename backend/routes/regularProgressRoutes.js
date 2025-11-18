const express = require('express');
const router = express.Router();
const regularProgressController = require('../controllers/regularProgressController');
const { authenticateToken, requireTeacherOrAdmin } = require('../middlewares/auth');

// Subject assessments
router.post('/assessments', authenticateToken, requireTeacherOrAdmin, regularProgressController.recordSubjectAssessment);

// Monthly progress reports
router.post('/monthly', authenticateToken, requireTeacherOrAdmin, regularProgressController.createMonthlyProgress);

// Study plans
router.post('/study-plans', authenticateToken, requireTeacherOrAdmin, regularProgressController.createStudyPlan);
router.put('/study-plans/:id', authenticateToken, requireTeacherOrAdmin, regularProgressController.updateStudyPlanProgress);

// Progress overview and reports
router.get('/students/:studentId/overview', authenticateToken, regularProgressController.getStudentProgressOverview);
router.get('/classes/:classRoomId/summary', authenticateToken, regularProgressController.getClassProgressSummary);

module.exports = router;