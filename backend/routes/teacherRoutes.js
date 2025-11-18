const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateToken, requireTeacher } = require('../middlewares/auth');

// Teacher dashboard
router.get('/dashboard', authenticateToken, requireTeacher, teacherController.getTeacherDashboard);

// Class and subject management
router.get('/my-classes', authenticateToken, requireTeacher, teacherController.getMyClasses);
router.get('/my-subjects', authenticateToken, requireTeacher, teacherController.getMySubjects);
router.get('/my-students', authenticateToken, requireTeacher, teacherController.getMyStudents);

// Attendance
router.get('/attendance/today', authenticateToken, requireTeacher, teacherController.getTodaysAttendance);

// Leave management
router.post('/leave', authenticateToken, requireTeacher, teacherController.applyForLeave);
router.get('/leave', authenticateToken, requireTeacher, teacherController.getMyLeaveHistory);

// Activities and profile
router.get('/activities', authenticateToken, requireTeacher, teacherController.getMyActivities);
router.put('/profile', authenticateToken, requireTeacher, teacherController.updateMyProfile);

module.exports = router;