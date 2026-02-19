const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');
const { 
  authenticateToken, 
  requireTeacherOrAdmin 
} = require('../../middlewares/auth');

/**
 * Daily Activity Routes
 * Base path: /api/activities
 */

router.post(
  '/',
  authenticateToken,
  requireTeacherOrAdmin,
  activityController.createActivity
);


router.get(
  '/student/:studentId',
  authenticateToken,
  activityController.getStudentActivities
);


router.get(
  '/class/:classRoomId',
  authenticateToken,
  requireTeacherOrAdmin,
  activityController.getClassActivities
);


router.get(
  '/:id',
  authenticateToken,
  activityController.getActivityById
);


router.put(
  '/:id',
  authenticateToken,
  requireTeacherOrAdmin,
  activityController.updateActivity
);

router.delete(
  '/:id',
  authenticateToken,
  requireTeacherOrAdmin,
  activityController.deleteActivity
);

module.exports = router;