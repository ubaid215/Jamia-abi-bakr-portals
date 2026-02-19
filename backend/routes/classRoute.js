const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireAdmin, requireRole } = require('../middlewares/auth');

// Define requireTeacher middleware (Super Admin, Admin, Teacher)
const requireTeacher = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

// Apply authentication to all routes
router.use(authenticateToken);

// ==========================================
// SHARED ROUTES (Teacher, Admin, Super Admin)
// ==========================================

// Get all classes (with filtering)
router.get('/', requireTeacher, classController.getClasses);

// Get class by ID
router.get('/:id', requireTeacher, classController.getClassById);

// Get students in a class
router.get('/:id/students', requireTeacher, classController.getClassStudents);

// Get subjects in a class
router.get('/:id/subjects', requireTeacher, classController.getClassSubjects);

// Generate roll numbers (Teachers might need this for new students)
router.get('/:id/generate-roll-number', requireTeacher, classController.generateRollNumber);
router.get('/:id/next-roll-number', requireTeacher, classController.getNextRollNumber);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// Create new class
router.post('/', requireAdmin, classController.createClass);

// Update class
router.put('/:id', requireAdmin, classController.updateClass);

// Delete class
router.delete('/:id', requireAdmin, classController.deleteClass);

// Assign teacher
router.post('/:id/assign-teacher', requireAdmin, classController.assignTeacher);

// Enroll student (Admin functionality usually)
router.post('/enroll', requireAdmin, classController.enrollStudent);

// Bulk generate roll numbers
router.post('/generate-multiple-roll-numbers', requireAdmin, classController.generateMultipleRollNumbers);

module.exports = router;