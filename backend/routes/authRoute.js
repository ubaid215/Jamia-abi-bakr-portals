const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const {
    authenticateToken,
    requireSuperAdmin,
    requireAdmin
} = require('../middlewares/auth');
const { validate } = require('../middlewares/validateRequest');
const {
    loginSchema,
    registerSchema,
    changePasswordSchema,
    resetPasswordSchema,
    forgotPasswordSchema,
} = require('../schemas/auth.schema');

// Public routes — with Zod validation
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

// Protected routes - Authentication
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, validate(changePasswordSchema), authController.changePassword);
router.get('/check-session', authenticateToken, authController.checkSession);

// Password reset and account management (admin functions)
router.post('/reset-password/:userId', authenticateToken, requireAdmin, validate(resetPasswordSchema), authController.resetUserPassword);
router.post('/terminate/:userId', authenticateToken, requireAdmin, authController.terminateUserAccount);
router.post('/reactivate/:userId', authenticateToken, requireAdmin, authController.reactivateUserAccount);

// User management routes (admin only)
router.get('/users', authenticateToken, requireAdmin, userController.getUsers);
router.get('/users/:id', authenticateToken, requireAdmin, userController.getUserById);
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticateToken, requireSuperAdmin, userController.deleteUser);

module.exports = router;