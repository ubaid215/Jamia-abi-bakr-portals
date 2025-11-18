const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Class management routes (Admin only)
router.post('/', authenticateToken, requireAdmin, classController.createClass);
router.get('/', authenticateToken, classController.getClasses);
router.get('/:id', authenticateToken, classController.getClassById);
router.put('/:id', authenticateToken, requireAdmin, classController.updateClass);
router.delete('/:id', authenticateToken, requireAdmin, classController.deleteClass);

// Class assignment routes
router.post('/:id/assign-teacher', authenticateToken, requireAdmin, classController.assignTeacher);
router.get('/:id/students', authenticateToken, classController.getClassStudents);

module.exports = router;