const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const {
  authenticateToken,
  requireSuperAdmin,
  requireAdmin
} = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { validate } = require('../middlewares/validateRequest');
const {
  createAdminSchema,
  updateUserStatusSchema,
  updateTeacherSchema,
  updateStudentSchema,
  paginationSchema,
  studentListSchema
} = require('../schemas/admin.schema');
const {
  assignTeacherToClassSchema,
  assignStudentToClassSchema,
  bulkAssignStudentsSchema,
  promoteStudentsSchema
} = require('../schemas/enrollment.schema');

// ============================================
// PUBLIC ROUTES - MUST BE FIRST!
// ============================================

// Public profile image endpoint - NO AUTH REQUIRED
router.get('/public/profile-image/:userId', adminController.serveProfileImage);

// ============================================
// SUPER ADMIN ONLY ROUTES
// ============================================
router.post('/admins', authenticateToken, requireSuperAdmin, validate(createAdminSchema), adminController.createAdmin);
router.put('/users/:id/status', authenticateToken, requireSuperAdmin, validate(updateUserStatusSchema), adminController.updateUserStatus);
router.delete('/users/:id', authenticateToken, requireSuperAdmin, adminController.deleteUser);

// ============================================
// ADMIN AND SUPER ADMIN ROUTES
// ============================================

// System stats and overview
router.get('/stats', authenticateToken, requireAdmin, adminController.getSystemStats);

// Teacher management
router.get('/teachers', authenticateToken, requireAdmin, validate(paginationSchema), adminController.getAllTeachers);
router.get('/teachers/:id', authenticateToken, requireAdmin, adminController.getTeacherDetails);
router.get('/teachers/:id/documents', authenticateToken, requireAdmin, adminController.getTeacherWithDocuments);
router.put('/teachers/:id', authenticateToken, requireAdmin, validate(updateTeacherSchema), adminController.updateTeacher);
router.put('/teachers/:id/status', authenticateToken, requireAdmin, validate(updateUserStatusSchema), adminController.updateTeacherStatus);
router.delete('/teachers/:id', authenticateToken, requireAdmin, adminController.deleteTeacher);

// Student management
router.get('/students', authenticateToken, requireAdmin, validate(studentListSchema), adminController.getAllStudents);
router.get(
  '/students/:id',
  authenticateToken,
  requireAdmin,
  adminController.getStudentDetails.bind(adminController)
);
router.get('/students/:id/documents', authenticateToken, requireAdmin, adminController.getStudentWithDocuments);
router.put('/students/:id', authenticateToken, requireAdmin, validate(updateStudentSchema), adminController.updateStudent);
router.put('/students/:id/status', authenticateToken, requireAdmin, validate(updateUserStatusSchema), adminController.updateStudentStatus);
router.put('/students/:id/academic', authenticateToken, requireAdmin, adminController.updateStudentAcademicInfo);
router.delete('/students/:id', authenticateToken, requireAdmin, adminController.deleteStudent);

// Student profile image upload
router.put('/students/:id/profile-image',
  authenticateToken,
  requireAdmin,
  upload.single('profileImage'), // Now this will work
  adminController.updateStudentProfileImage
);

// Student enrollment history
router.get('/students/:studentId/enrollment-history', authenticateToken, requireAdmin, adminController.getStudentEnrollmentHistory);

// Batch student promotion
router.post('/students/promote', authenticateToken, requireAdmin, validate(promoteStudentsSchema), adminController.promoteStudents);

// User management
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers);

// Password reset (Admin function)
router.post('/users/:userId/reset-password', authenticateToken, requireAdmin, authController.resetUserPassword);

// Leave management
router.get('/leave-requests', authenticateToken, requireAdmin, adminController.manageLeaveRequests);
router.put('/leave-requests/:id', authenticateToken, requireAdmin, adminController.updateLeaveRequest);

// ============================================
// CLASS ASSIGNMENT ROUTES
// ============================================

// Assign teacher to class
router.post('/assign-teacher-to-class', authenticateToken, requireAdmin, validate(assignTeacherToClassSchema), adminController.assignTeacherToClass);

// Assign student to class (single)
router.post('/assign-student-to-class', authenticateToken, requireAdmin, validate(assignStudentToClassSchema), adminController.assignStudentToClass);

// Bulk assign students to class
router.post('/bulk-assign-students-to-class', authenticateToken, requireAdmin, validate(bulkAssignStudentsSchema), adminController.bulkAssignStudentsToClass);

// Remove teacher from class
router.delete('/classes/:classRoomId/remove-teacher', authenticateToken, requireAdmin, adminController.removeTeacherFromClass);

// Remove student from class (end enrollment)
router.delete('/enrollments/:enrollmentId/remove-student', authenticateToken, requireAdmin, adminController.removeStudentFromClass);

// ============================================
// FILE SERVING ROUTES - Profile Images & Documents
// ============================================

// Protected profile image endpoint (for admin dashboard use)
router.get('/files/profile-image/:userId', authenticateToken, requireAdmin, adminController.serveProfileImage);

// Serve teacher documents
router.get('/teachers/:teacherId/documents/:type', authenticateToken, requireAdmin, adminController.serveTeacherDocument);

// Serve student documents
router.get('/students/:studentId/documents/:type', authenticateToken, requireAdmin, adminController.serveStudentDocument);

// Export user documents info
router.get('/users/:userId/documents-info/:userType', authenticateToken, requireAdmin, adminController.exportUserDocumentsInfo);

// ============================================
// DOCUMENT UPLOAD ROUTES
// ============================================
router.post('/students/:id/documents',
  authenticateToken,
  requireAdmin,
  upload.single('document'),
  adminController.uploadStudentDocument
);

router.post('/teachers/:id/documents',
  authenticateToken,
  requireAdmin,
  upload.single('document'),
  adminController.uploadTeacherDocument
);

router.delete('/students/:studentId/documents/:type',
  authenticateToken,
  requireAdmin,
  adminController.deleteStudentDocument
);

router.delete('/teachers/:teacherId/documents/:type',
  authenticateToken,
  requireAdmin,
  adminController.deleteTeacherDocument
);

// ============================================
// ATTENDANCE OVERVIEW ROUTES
// ============================================
router.get('/attendance-overview', authenticateToken, requireAdmin, adminController.getAttendanceOverview);
router.get('/attendance-trends', authenticateToken, requireAdmin, adminController.getAttendanceTrends);
router.get('/class-attendance-comparison', authenticateToken, requireAdmin, adminController.getClassAttendanceComparison);
router.get('/students-at-risk', authenticateToken, requireAdmin, adminController.getStudentsAtRisk);

// Legacy attendance route
router.get('/attendance', authenticateToken, requireAdmin, adminController.getAttendanceOverview);

module.exports = router;