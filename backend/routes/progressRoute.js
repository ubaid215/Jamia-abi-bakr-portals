const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authenticateToken, requireTeacherOrAdmin } = require('../middlewares/auth');

// Record progress (Teachers only)
router.post('/hifz', authenticateToken, requireTeacherOrAdmin, progressController.recordHifzProgress);
router.post('/nazra', authenticateToken, requireTeacherOrAdmin, progressController.recordNazraProgress);

// Get progress data
router.get('/student', authenticateToken, progressController.getStudentProgress);
router.get('/class', authenticateToken, progressController.getClassProgress);

// Update progress (Teacher who recorded it or Admin)
router.put('/:id', authenticateToken, requireTeacherOrAdmin, progressController.updateProgress);

module.exports = router;