const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const {
    authenticateToken,
    requireSuperAdmin,
    requireAdmin
} = require('../middlewares/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes - Authentication
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

// Password reset (admin function)
router.post('/reset-password/:userId', authenticateToken, requireAdmin, authController.resetUserPassword);

// User management routes (admin only)
router.get('/users', authenticateToken, requireAdmin, userController.getUsers);
router.get('/users/:id', authenticateToken, requireAdmin, userController.getUserById);
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticateToken, requireSuperAdmin, userController.deleteUser);

module.exports = router;