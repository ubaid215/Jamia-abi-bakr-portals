const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { 
  teacherUploadFields, 
  studentUploadFields, 
  requireProfileImage, 
  processUploadedFiles 
} = require('../middlewares/upload');
const multer = require('multer');

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Too many files uploaded.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Registration routes (Admin only) with file upload
router.post(
  '/teachers', 
  authenticateToken, 
  requireAdmin, 
  teacherUploadFields,
  handleMulterError,
  requireProfileImage,
  processUploadedFiles,
  enrollmentController.registerTeacher
);

router.post(
  '/students', 
  authenticateToken, 
  requireAdmin, 
  studentUploadFields,
  handleMulterError,
  requireProfileImage,
  processUploadedFiles,
  enrollmentController.registerStudent
);

router.post(
  '/parents', 
  authenticateToken, 
  requireAdmin, 
  enrollmentController.registerParent
);

// Update profile image routes
router.put(
  '/teachers/:teacherId/profile-image',
  authenticateToken,
  requireAdmin,
  teacherUploadFields,
  handleMulterError,
  requireProfileImage,
  processUploadedFiles,
  enrollmentController.updateTeacherProfileImage
);

router.put(
  '/students/:studentId/profile-image',
  authenticateToken,
  requireAdmin,
  studentUploadFields,
  handleMulterError,
  requireProfileImage,
  processUploadedFiles,
  enrollmentController.updateStudentProfileImage
);

// Class enrollment management (Admin only)
router.post(
  '/class-enrollment', 
  authenticateToken, 
  requireAdmin, 
  enrollmentController.enrollStudentInClass
);

router.post(
  '/transfer-student', 
  authenticateToken, 
  requireAdmin, 
  enrollmentController.transferStudent
);

router.get(
  '/student-history/:studentId', 
  authenticateToken, 
  enrollmentController.getStudentEnrollmentHistory
);

module.exports = router;