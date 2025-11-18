const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Subject management routes (Admin only)
router.post('/', authenticateToken, requireAdmin, subjectController.createSubject);
router.get('/', authenticateToken, subjectController.getSubjects);
router.get('/class/:id', authenticateToken, subjectController.getClassSubjects);
router.put('/:id', authenticateToken, requireAdmin, subjectController.updateSubject);
router.delete('/:id', authenticateToken, requireAdmin, subjectController.deleteSubject);

// Subject assignment routes
router.post('/:id/assign-teacher', authenticateToken, requireAdmin, subjectController.assignTeacherToSubject);

module.exports = router;