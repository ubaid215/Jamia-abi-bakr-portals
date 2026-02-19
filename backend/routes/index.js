const express = require('express');
const router = express.Router();

// ==================== IMPORT MODULE ROUTES ====================

// Daily Activity Module
const dailyActivityRoutes = require('../modules/dailyActivity/activity.routes');

// Weekly Progress Module (Future)
// const weeklyProgressRoutes = require('../modules/weeklyProgress/weeklyProgress.routes');

// Real-Time Progress Dashboard Module (Future)
// const progressDashboardRoutes = require('../modules/progressDashboard/dashboard.routes');

// Notifications Module (Future)
// const notificationRoutes = require('../modules/notifications/notification.routes');

// Goals & Targets Module (Future)
// const goalsRoutes = require('../modules/goals/goals.routes');

// Parent Communication Module (Future)
// const parentCommunicationRoutes = require('../modules/parentCommunication/communication.routes');

// ==================== REGISTER ROUTES ====================

/**
 * Health Check / API Info
 * @route GET /api
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'School Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      activities: '/api/activities',
      weeklyProgress: '/api/weekly-progress (Coming Soon)',
      dashboard: '/api/dashboard (Coming Soon)',
      notifications: '/api/notifications (Coming Soon)',
      goals: '/api/goals (Coming Soon)',
      parentCommunication: '/api/parent-communication (Coming Soon)'
    }
  });
});

/**
 * Daily Activity Routes
 * @route /api/activities
 * @description CRUD operations for daily student activities
 * @access Teacher, Admin, Super Admin
 */
router.use('/activities', dailyActivityRoutes);

/**
 * Weekly Progress Routes (Future)
 * @route /api/weekly-progress
 * @description Weekly summaries and analytics
 * @access Teacher, Admin, Super Admin, Student (own), Parent (own children)
 */
// router.use('/weekly-progress', weeklyProgressRoutes);

/**
 * Progress Dashboard Routes (Future)
 * @route /api/dashboard
 * @description Real-time progress snapshots and metrics
 * @access Teacher, Admin, Super Admin, Student (own), Parent (own children)
 */
// router.use('/dashboard', progressDashboardRoutes);

/**
 * Notification Routes (Future)
 * @route /api/notifications
 * @description System notifications and alerts
 * @access All authenticated users (role-based filtering)
 */
// router.use('/notifications', notificationRoutes);

/**
 * Goals & Targets Routes (Future)
 * @route /api/goals
 * @description Student goals and targets management
 * @access Teacher, Admin, Super Admin, Student (own)
 */
// router.use('/goals', goalsRoutes);

/**
 * Parent Communication Routes (Future)
 * @route /api/parent-communication
 * @description Communication between teachers and parents
 * @access Teacher, Admin, Super Admin, Parent
 */
// router.use('/parent-communication', parentCommunicationRoutes);

// ==================== ERROR HANDLING ====================

/**
 * 404 Handler - Route not found
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;