const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { generateRollNumber } = require('../utils/passwordGenerator');
const { 
  authenticateToken, 
  requireSuperAdmin, 
  requireAdmin
} = require('../middlewares/auth');

// ============================================
// SUPER ADMIN ONLY ROUTES
// ============================================
router.post('/admins', authenticateToken, requireSuperAdmin, adminController.createAdmin);
router.put('/users/:id/status', authenticateToken, requireSuperAdmin, adminController.updateUserStatus);
router.delete('/users/:id', authenticateToken, requireSuperAdmin, adminController.deleteUser);

// ============================================
// ADMIN AND SUPER ADMIN ROUTES
// ============================================
// System stats and overview
router.get('/stats', authenticateToken, requireAdmin, adminController.getSystemStats);

// Teacher management
router.get('/teachers', authenticateToken, requireAdmin, adminController.getAllTeachers);
router.get('/teachers/:id', authenticateToken, requireAdmin, adminController.getTeacherDetails);

// Student management
router.get('/students', authenticateToken, requireAdmin, adminController.getAllStudents);
router.get('/students/:id', authenticateToken, requireAdmin, adminController.getStudentDetails);

// ✅ FIXED: Student enrollment history - 
router.get('/students/:studentId/enrollment-history', authenticateToken, requireAdmin, adminController.getStudentEnrollmentHistory);

// ✅ NEW: Batch student promotion
router.post('/students/promote', authenticateToken, requireAdmin, adminController.promoteStudents);

// User management
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers);

// Password reset (Admin function)
router.post('/users/:userId/reset-password', authenticateToken, requireAdmin, authController.resetUserPassword);

// Leave management
router.get('/leave-requests', authenticateToken, requireAdmin, adminController.manageLeaveRequests);
router.put('/leave-requests/:id', authenticateToken, requireAdmin, adminController.updateLeaveRequest);

// ============================================
// ATTENDANCE OVERVIEW ROUTES
// ============================================
router.get('/attendance-overview', authenticateToken, requireAdmin, adminController.getAttendanceOverview);
router.get('/attendance-trends', authenticateToken, requireAdmin, adminController.getAttendanceTrends);
router.get('/class-attendance-comparison', authenticateToken, requireAdmin, adminController.getClassAttendanceComparison);

// Legacy attendance route (keep for backward compatibility)
router.get('/attendance', authenticateToken, requireAdmin, adminController.getAttendanceOverview);

module.exports = router;