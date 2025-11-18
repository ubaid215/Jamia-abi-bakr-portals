const express = require('express');
const router = express.Router();
const hifzReportController = require('../controllers/hifzReportController');
const { authenticateToken, requireTeacherOrAdmin } = require('../middlewares/auth');

// Generate Hifz report
router.get('/generate', authenticateToken, requireTeacherOrAdmin, hifzReportController.generateHifzReport);

module.exports = router;