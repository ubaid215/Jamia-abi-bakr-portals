const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth'); 
router.use(authenticateToken, requireAdmin); 

// Existing routes
router.post('/', classController.createClass);
router.get('/', classController.getClasses);
router.get('/:id', classController.getClassById);
router.put('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);
router.post('/:id/assign-teacher', classController.assignTeacher);
router.get('/:id/students', classController.getClassStudents);
router.post('/enroll', classController.enrollStudent);

// NEW ROUTES for roll number generation
router.get('/:id/generate-roll-number', classController.generateRollNumber);
router.get('/:id/next-roll-number', classController.getNextRollNumber);
router.post('/generate-multiple-roll-numbers', classController.generateMultipleRollNumbers);

module.exports = router;