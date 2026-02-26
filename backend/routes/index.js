/**
 * routes/index.js
 * Central router — mounts all new modular routes under /api
 * Imported in server.js as: app.use('/api', apiRoutes)
 *
 * Full route map:
 *   /api/activities            → Daily Activity module
 *   /api/weekly-progress       → Weekly Progress module
 *   /api/dashboard             → Progress Snapshot module
 *   /api/notifications         → Notifications module
 *   /api/goals                 → Student Goals module
 *   /api/parent-communication  → Parent Communication module
 */

const express = require('express');
const router = express.Router();

// ── Module routes ─────────────────────────────────────────────────────────────

const dailyActivityRoutes       = require('../modules/daily-activity/dailyActivity.routes');
const weeklyProgressRoutes      = require('../modules/weekly-progress/weeklyProgress.routes');
const progressSnapshotRoutes    = require('../modules/progress-snapshot/snapshot.routes');
const notificationRoutes        = require('../modules/notifications/notifications.routes');
const goalsRoutes               = require('../modules/student-goals/goals.routes');
const parentCommRoutes          = require('../modules/parent-communication/parentComm.routes');

// ── API info ──────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Khanqah Saifia Management System — Modular API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    modules: {
      activities:           { base: '/api/activities',           status: 'active' },
      weeklyProgress:       { base: '/api/weekly-progress',      status: 'active' },
      dashboard:            { base: '/api/dashboard',            status: 'active' },
      notifications:        { base: '/api/notifications',        status: 'active' },
      goals:                { base: '/api/goals',                status: 'active' },
      parentCommunication:  { base: '/api/parent-communication', status: 'active' },
    },
  });
});

// ── Route registrations ───────────────────────────────────────────────────────

/**
 * Daily Activity Routes
 * @base    /api/activities
 * @access  Teacher (CRUD), Admin (CRUD), Student (Read own), Parent (Read children)
 *
 * POST   /api/activities                              → Record daily activity
 * GET    /api/activities                              → List (role-scoped)
 * GET    /api/activities/:id                          → Get single
 * GET    /api/activities/student/:studentId/date/:date → Get by student + date
 * PATCH  /api/activities/:id                         → Update
 * DELETE /api/activities/:id                         → Delete (Admin only)
 */
router.use('/activities', dailyActivityRoutes);

/**
 * Weekly Progress Routes
 * @base    /api/weekly-progress
 * @access  Teacher (generate, comment), Admin (all), Student (read own), Parent (read children)
 *
 * POST   /api/weekly-progress/generate                              → Generate for student
 * GET    /api/weekly-progress                                       → List (role-scoped)
 * GET    /api/weekly-progress/student/:studentId/current            → Current week
 * GET    /api/weekly-progress/student/:studentId/week/:wk/year/:yr → Specific week
 * PATCH  /api/weekly-progress/:id                                  → Add teacher comments
 */
router.use('/weekly-progress', weeklyProgressRoutes);

/**
 * Progress Snapshot / Dashboard Routes
 * @base    /api/dashboard
 * @access  Teacher + Admin (refresh, at-risk), Student (read own), Parent (read children)
 *
 * GET    /api/dashboard/student/:studentId          → Get student snapshot
 * POST   /api/dashboard/student/:studentId/refresh  → Manually refresh snapshot
 * POST   /api/dashboard/classroom/:classRoomId/refresh → Bulk refresh classroom
 * GET    /api/dashboard/at-risk                     → At-risk students list
 */
router.use('/dashboard', progressSnapshotRoutes);

/**
 * Notification Routes
 * @base    /api/notifications
 * @access  All authenticated users (own notifications only)
 *
 * GET    /api/notifications              → List own notifications
 * GET    /api/notifications/unread-count → Unread count
 * PATCH  /api/notifications/:id/read    → Mark single as read
 * PATCH  /api/notifications/read-all   → Mark all as read
 */
router.use('/notifications', notificationRoutes);

/**
 * Student Goals Routes
 * @base    /api/goals
 * @access  Teacher (CRUD), Admin (CRUD), Student (read own), Parent (read children)
 *
 * POST   /api/goals          → Create goal for student
 * GET    /api/goals          → List (role-scoped)
 * GET    /api/goals/:id      → Get single
 * PATCH  /api/goals/:id      → Update goal / current value
 * DELETE /api/goals/:id      → Delete (Admin only)
 */
router.use('/goals', goalsRoutes);

/**
 * Parent Communication Routes
 * @base    /api/parent-communication
 * @access  Teacher (write), Parent (read + acknowledge), Admin (all)
 *
 * POST   /api/parent-communication                → Send communication
 * GET    /api/parent-communication                → List (role-scoped)
 * PATCH  /api/parent-communication/:id            → Update (meeting schedule etc.)
 * PATCH  /api/parent-communication/:id/acknowledge → Parent acknowledges
 */
router.use('/parent-communication', parentCommRoutes);

// ── 404 catch-all for /api/* unmatched routes ─────────────────────────────────

router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    hint: 'See /api for available endpoints',
  });
});

module.exports = router;