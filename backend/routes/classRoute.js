const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireAdmin, requireRole } = require('../middlewares/auth');

const requireTeacher = requireRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

router.use(authenticateToken);

// ============================================================
// SHARED ROUTES (Teacher, Admin, Super Admin)
// ============================================================

// List & detail
router.get('/',      requireTeacher, classController.getClasses);
router.get('/:id',   requireTeacher, classController.getClassById);

// Students & subjects in a class
router.get('/:id/students', requireTeacher, classController.getClassStudents);
router.get('/:id/subjects', requireTeacher, classController.getClassSubjects);

// ✅ NEW: all teachers assigned to a class (readable by teachers too)
router.get('/:id/teachers', requireTeacher, classController.getClassTeachers);

// Roll number helpers
router.get('/:id/generate-roll-number', requireTeacher, classController.generateRollNumber);
router.get('/:id/next-roll-number',     requireTeacher, classController.getNextRollNumber);

// ============================================================
// ADMIN ONLY ROUTES
// ============================================================

// Class CRUD
router.post('/',        requireAdmin, classController.createClass);
router.put('/:id',      requireAdmin, classController.updateClass);
router.delete('/:id',   requireAdmin, classController.deleteClass);

// ─── Teacher assignment ───────────────────────────────────────

// Legacy single-teacher assign (still works, now also syncs classTeachers table)
router.post('/:id/assign-teacher', requireAdmin, classController.assignTeacher);

// ✅ NEW: assign one or more teachers at once
// Body: { teachers: [{ teacherId, role? }] }
router.post('/:id/teachers', requireAdmin, classController.assignTeachers);

// ✅ NEW: update a single teacher's role in this class
// Body: { role }
router.patch('/:id/teachers/:teacherId', requireAdmin, classController.updateClassTeacherRole);

// ✅ NEW: remove a single teacher from this class
router.delete('/:id/teachers/:teacherId', requireAdmin, classController.removeClassTeacher);

// ─── Enrollment ───────────────────────────────────────────────

// NOTE: /enroll must be defined BEFORE /:id routes to avoid Express matching
// "enroll" as an :id parameter.
router.post('/enroll',                       requireAdmin, classController.enrollStudent);
router.post('/generate-multiple-roll-numbers', requireAdmin, classController.generateMultipleRollNumbers);

module.exports = router;