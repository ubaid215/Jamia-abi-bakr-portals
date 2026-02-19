import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import PageSkeleton from "../components/ui/PageSkeleton";

// Login stays eager — it's the entry point
import Login from "../pages/auth/Login";

// Layouts stay eager — they are structural shells
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "../layouts/StudentLayout";

// ─── Admin Pages (lazy) ─────────────────────────────────
const RoleBasedDashboard = lazy(() => import("../components/RoleBasedDashboard"));
const AdminManagement = lazy(() => import("../pages/superAdmin/AdminManagement"));
const TeacherLists = lazy(() => import("../pages/admin/TeacherLists"));
const TeacherDetail = lazy(() => import("../pages/admin/TeacherDetail"));
const StudentLists = lazy(() => import("../pages/admin/StudentLists"));
const StudentDetail = lazy(() => import("../pages/admin/StudentDetail"));
const ClassManagement = lazy(() => import("../pages/admin/ClassManagement"));
const SubjectManagement = lazy(() => import("../pages/admin/SubjectManagment"));
const TeacherEnrollment = lazy(() => import("../pages/admin/TeacherEnrollment"));
const StudentEnrollment = lazy(() => import("../pages/admin/StudentEnrollment"));
const AttendanceOverview = lazy(() => import("../pages/superAdmin/AttendanceOverview"));
const ProgressTracking = lazy(() => import("../pages/superAdmin/ProgressTracking"));
const PDFGenerate = lazy(() => import("../pages/admin/PDFGenerate"));
const PasswordReset = lazy(() => import("../components/PasswordReset"));
const StudentEnrollmentHistory = lazy(() => import("../components/StudentEnrollmentHistory"));
const UserManagement = lazy(() => import("../pages/superAdmin/UserManagement"));
const SuperAdminDashboard = lazy(() => import("../pages/superAdmin/Dashboard"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const ReportGenerator = lazy(() => import("../pages/admin/ReportGenerator"));
const DnAnalytics = lazy(() => import("../pages/superAdmin/DnAnalytics"));
const HifzAnalytics = lazy(() => import("../pages/superAdmin/HifzAnalytics"));

// ─── Teacher Pages (lazy) ───────────────────────────────
const TeacherDashboard = lazy(() => import("../pages/teacher/TeacherDashboard"));
const MyClasses = lazy(() => import("../pages/teacher/MyClasses"));
const MyStudents = lazy(() => import("../pages/teacher/MyStudents"));
const ClassAttendanceCharts = lazy(() => import("../pages/teacher/ClassAttendanceCharts"));
const ApplyLeave = lazy(() => import("../pages/teacher/ApplyLeave"));
const HifzNazraProgress = lazy(() => import("../pages/teacher/HifzNazraProgress"));
const HifzReport = lazy(() => import("../pages/teacher/HifzReport"));
const RegularProgressInput = lazy(() => import("../pages/teacher/RegularProgressInput"));
const AttendanceSelectorModal = lazy(() => import("../pages/teacher/AttendanceSelectorModal"));
const ClassActivityView = lazy(() => import("../pages/teacher/ClassActivityView"));
const DailyActivityForm = lazy(() => import("../pages/teacher/DailyActivityForm"));
const DailyActivityList = lazy(() => import("../pages/teacher/DailyActivityList"));

// ─── Student Pages (lazy) ───────────────────────────────
const StudentDashboard = lazy(() => import("../pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("../pages/student/StudentProfile"));
const AttendanceHistory = lazy(() => import("../pages/student/AttendanceHistory"));
const ClassHistory = lazy(() => import("../pages/student/ClassHistory"));
const StudentProgress = lazy(() => import("../pages/student/StudentProgress"));
const Analytics = lazy(() => import("../pages/student/Analytics"));

// ─── Progress Pages (lazy) ──────────────────────────────
const ProgressDashboard = lazy(() => import("../pages/progress/ProgressDashboard"));
const RecordDailyActivity = lazy(() => import("../pages/progress/RecordDailyActivity"));
const DailyActivitiesList = lazy(() => import("../pages/progress/DailyActivitiesList"));
const ClassActivityOverview = lazy(() => import("../pages/progress/ClassActivityOverview"));
const StudentDailyActivityView = lazy(() => import("../pages/progress/StudentDailyActivityView"));
const StudentGoalsTargets = lazy(() => import("../pages/progress/StudentGoalsTargets"));
const WeeklyProgressReports = lazy(() => import("../pages/progress/WeeklyProgressReports"));

// ─── Auth Pages (lazy) ──────────────────────────────────
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

// Parent pages (Communications, WeeklyReports) excluded — missing service/context dependencies

// Suspense wrapper for cleaner route definitions
const Lazy = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<Lazy><ResetPassword /></Lazy>} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Lazy><RoleBasedDashboard /></Lazy>} />
        <Route path="users" element={<Lazy><UserManagement /></Lazy>} />
        <Route path="teacher-enroll" element={<Lazy><TeacherEnrollment /></Lazy>} />
        <Route path="student-enroll" element={<Lazy><StudentEnrollment /></Lazy>} />
        <Route path="admins" element={<Lazy><AdminManagement /></Lazy>} />
        <Route path="teachers" element={<Lazy><TeacherLists /></Lazy>} />
        <Route path="teachers/:id" element={<Lazy><TeacherDetail /></Lazy>} />
        <Route path="students/:id" element={<Lazy><StudentDetail /></Lazy>} />
        <Route path="students/:id/history" element={<Lazy><StudentEnrollmentHistory /></Lazy>} />
        <Route path="students" element={<Lazy><StudentLists /></Lazy>} />
        <Route path="classes" element={<Lazy><ClassManagement /></Lazy>} />
        <Route path="subjects" element={<Lazy><SubjectManagement /></Lazy>} />
        <Route path="attendance" element={<Lazy><AttendanceOverview /></Lazy>} />
        <Route path="progress" element={<Lazy><ProgressTracking /></Lazy>} />
        <Route path="pdf-reports" element={<Lazy><PDFGenerate /></Lazy>} />
        <Route path="reset-password" element={<Lazy><PasswordReset /></Lazy>} />
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
        <Route path="dashboard" element={<Lazy><TeacherDashboard /></Lazy>} />
        <Route path="classes" element={<Lazy><MyClasses /></Lazy>} />
        <Route path="students" element={<Lazy><MyStudents /></Lazy>} />
        <Route path="attendance" element={<Lazy><ClassAttendanceCharts /></Lazy>} />
        <Route path="leave" element={<Lazy><ApplyLeave /></Lazy>} />
        <Route path="hifz-progress" element={<Lazy><HifzNazraProgress /></Lazy>} />
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
        <Route path="dashboard" element={<Lazy><StudentDashboard /></Lazy>} />
        <Route path="attendance" element={<Lazy><AttendanceHistory /></Lazy>} />
        <Route path="class-history" element={<Lazy><ClassHistory /></Lazy>} />
        <Route path="progress" element={<Lazy><StudentProgress /></Lazy>} />
        <Route path="profile" element={<Lazy><StudentProfile /></Lazy>} />
        <Route index element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p className="text-gray-500 text-lg">Page not found</p>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
