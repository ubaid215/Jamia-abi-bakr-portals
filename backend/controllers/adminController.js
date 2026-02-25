// controllers/adminController.js
const userController = require('./admin/userController');
const teacherController = require('./admin/teacherController');
const studentController = require('./admin/studentController');
const enrollmentController = require('./admin/enrollmentController');
const statsController = require('./admin/statsController');
const documentController = require('./admin/documentController');

module.exports = {
    // User Management
    createAdmin: userController.createAdmin,
    updateUserStatus: userController.updateUserStatus,
    getUsers: userController.getUsers,
    deleteUser: userController.deleteUser,

    // Teacher Management
    getAllTeachers: teacherController.getAllTeachers,
    getTeacherDetails: teacherController.getTeacherDetails,
    updateTeacher: teacherController.updateTeacher,
    deleteTeacher: teacherController.deleteTeacher,

    // Student Management
    getAllStudents: studentController.getAllStudents,
    updateStudent: studentController.updateStudent,
    updateStudentAcademicInfo: studentController.updateStudentAcademicInfo,
    getStudentDetails: studentController.getStudentDetails,
    deleteStudent: studentController.deleteStudent,

    // Enrollment & Class Management
    assignTeacherToClass: enrollmentController.assignTeacherToClass,
    assignStudentToClass: enrollmentController.assignStudentToClass,
    removeTeacherFromClass: enrollmentController.removeTeacherFromClass,
    removeStudentFromClass: enrollmentController.removeStudentFromClass,
    bulkAssignStudentsToClass: enrollmentController.bulkAssignStudentsToClass,
    promoteStudents: enrollmentController.promoteStudents,
    getStudentEnrollmentHistory: enrollmentController.getStudentEnrollmentHistory,

    // Stats & Attendance
    getSystemStats: statsController.getSystemStats,
    getAttendanceOverview: statsController.getAttendanceOverview,
    getAttendanceTrends: statsController.getAttendanceTrends,
    getStudentsAtRisk: statsController.getStudentsAtRisk,
    getClassAttendanceComparison: statsController.getClassAttendanceComparison,
    manageLeaveRequests: statsController.manageLeaveRequests,
    updateLeaveRequest: statsController.updateLeaveRequest,

    // Documents & Files
    serveProfileImage: documentController.serveProfileImage,
    serveTeacherDocument: documentController.serveTeacherDocument,
    serveStudentDocument: documentController.serveStudentDocument,
    updateStudentProfileImage: documentController.updateStudentProfileImage,
    uploadStudentDocument: documentController.uploadStudentDocument,
    deleteStudentDocument: documentController.deleteStudentDocument,
    uploadTeacherDocument: documentController.uploadTeacherDocument,
    deleteTeacherDocument: documentController.deleteTeacherDocument,
    getTeacherWithDocuments: documentController.getTeacherWithDocuments,
    getStudentWithDocuments: documentController.getStudentWithDocuments,
    exportUserDocumentsInfo: documentController.exportUserDocumentsInfo,
};
