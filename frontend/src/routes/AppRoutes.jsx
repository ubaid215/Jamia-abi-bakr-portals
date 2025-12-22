import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/auth/Login";

// Layout Components
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "../layouts/StudentLayout";

// Dashboard Pages
import RoleBasedDashboard from "../components/RoleBasedDashboard";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import MyClasses from "../pages/teacher/MyClasses";
import StudentDashboard from "../pages/student/StudentDashboard";
import AdminManagement from "../pages/superAdmin/AdminManagement";
import TeacherLists from "../pages/admin/TeacherLists";
import TeacherDetail from "../pages/admin/TeacherDetail";
import StudentLists from "../pages/admin/StudentLists";
import StudentDetail from "../pages/admin/StudentDetail";
import ClassManagement from "../pages/admin/ClassManagement";
import SubjectManagement from "../pages/admin/SubjectManagment";
import TeacherEnrollment from "../pages/admin/TeacherEnrollment";
import AttendanceOverview from "../pages/superAdmin/AttendanceOverview";
import ProgressTracking from "../pages/superAdmin/ProgressTracking";
import StudentEnrollment from "../pages/admin/StudentEnrollment";
import PasswordReset from "../components/PasswordReset";
import MyStudents from "../pages/teacher/MyStudents";
import ClassAttendanceCharts from "../pages/teacher/ClassAttendanceCharts";
import ApplyLeave from "../pages/teacher/ApplyLeave";
import HifzNazraProgress from "../pages/teacher/HifzNazraProgress";
import StudentProfile from "../pages/student/StudentProfile";
import AttendanceHistory from "../pages/student/AttendanceHistory";
import ClassHistory from "../pages/student/ClassHistory";
import StudentProgress from "../pages/student/StudentProgress";
import StudentEnrollmentHistory from "../components/StudentEnrollmentHistory";
import PDFGenerate from "../pages/admin/PDFGenerate";

// Placeholder components for other pages
const UserManagement = () => <div>User Management</div>;
const Reports = () => <div>Reports</div>;

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<RoleBasedDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="teacher-enroll" element={<TeacherEnrollment />} />
        <Route path="student-enroll" element={<StudentEnrollment />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="teachers" element={<TeacherLists />} />
        <Route path="teachers/:id" element={<TeacherDetail />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="students/:id/history" element={<StudentEnrollmentHistory />} />
        <Route path="students" element={<StudentLists/>} />
        <Route path="classes" element={<ClassManagement/>} />
        <Route path="subjects" element={<SubjectManagement/>} />
        <Route path="attendance" element={<AttendanceOverview />} />
        <Route path="progress" element={<ProgressTracking />} />
        <Route path="pdf-reports" element={<PDFGenerate />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reset-password" element={<PasswordReset />} />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="students" element={<MyStudents />} />
        <Route path="attendance" element={<ClassAttendanceCharts/>} />
        <Route path="leave" element={<ApplyLeave />} />
        <Route path="hifz-progress" element={<HifzNazraProgress />} />
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<AttendanceHistory />} />
        <Route path="class-history" element={<ClassHistory />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route index element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 Route */}
      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  );
};

export default AppRoutes;
