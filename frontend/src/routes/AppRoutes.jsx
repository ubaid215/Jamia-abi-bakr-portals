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
import ParentLayout from "../layouts/ParentLayout";

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
const StudentMyGoals = lazy(() => import("../pages/student/StudentMyGoals"));
const StudentMonthlyReport = lazy(() => import("../pages/student/StudentMonthlyReport"));
const Analytics = lazy(() => import("../pages/student/Analytics"));

// ─── Progress Pages (lazy) ──────────────────────────────
const ProgressDashboard = lazy(() => import("../pages/progress/ProgressDashboard"));
const RecordDailyActivity = lazy(() => import("../pages/progress/RecordDailyActivity"));
const DailyActivitiesList = lazy(() => import("../pages/progress/DailyActivitiesList"));
const ClassActivityOverview = lazy(() => import("../pages/progress/ClassActivityOverview"));
const StudentDailyActivityView = lazy(() => import("../pages/progress/StudentDailyActivityView"));
const StudentGoalsTargets = lazy(() => import("../pages/progress/StudentGoalsTargets"));
const WeeklyProgressReports = lazy(() => import("../pages/progress/WeeklyProgressReports"));
const CreateGoal = lazy(() => import("../pages/progress/CreateGoal"));

// ─── Auth Pages (lazy) ──────────────────────────────────
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("../pages/auth/ChangePassword"));

// ─── Parent Pages (lazy) ────────────────────────────────
const ParentDashboard = lazy(() => import("../pages/parent/ParentDashboard"));
const Communications = lazy(() => import("../pages/parent/Communications"));
const ParentWeeklyReports = lazy(() => import("../pages/parent/WeeklyReports"));

// ─── Shared Progress Pages (used by both admin + teacher) ─
// Already imported above: ProgressDashboard, RecordDailyActivity,
// DailyActivitiesList, ClassActivityOverview, StudentGoalsTargets,
// WeeklyProgressReports, StudentDailyActivityView

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
      <Route path="/change-password" element={<Lazy><ChangePassword /></Lazy>} />

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

        {/* ── Progress Module (admin view) ────────────────── */}
        <Route path="progress-module/activities" element={<Lazy><DailyActivitiesList /></Lazy>} />
        <Route path="progress-module/activities/:id" element={<Lazy><StudentDailyActivityView /></Lazy>} />
        <Route path="progress-module/class-overview" element={<Lazy><ClassActivityOverview /></Lazy>} />
        <Route path="progress-module/weekly" element={<Lazy><WeeklyProgressReports /></Lazy>} />
        <Route path="progress-module/goals" element={<Lazy><StudentGoalsTargets /></Lazy>} />
        <Route path="progress-module/goals/create" element={<Lazy><CreateGoal /></Lazy>} />
        <Route path="progress-module/snapshots" element={<Lazy><ProgressDashboard /></Lazy>} />
        <Route path="progress-module/parent-comms" element={<Lazy><Communications /></Lazy>} />

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

        {/* ── Progress Module (teacher view) ─────────────── */}
        <Route path="progress/record-activity" element={<Lazy><RecordDailyActivity /></Lazy>} />
        <Route path="progress/activities" element={<Lazy><DailyActivitiesList /></Lazy>} />
        <Route path="progress/activities/:id" element={<Lazy><StudentDailyActivityView /></Lazy>} />
        <Route path="progress/class-overview" element={<Lazy><ClassActivityOverview /></Lazy>} />
        <Route path="progress/weekly" element={<Lazy><WeeklyProgressReports /></Lazy>} />
        <Route path="progress/goals" element={<Lazy><StudentGoalsTargets /></Lazy>} />
        <Route path="progress/goals/create" element={<Lazy><CreateGoal /></Lazy>} />
        <Route path="progress/dashboard" element={<Lazy><ProgressDashboard /></Lazy>} />
        <Route path="progress/parent-comms" element={<Lazy><Communications /></Lazy>} />

        {/* Legacy teacher activity routes (kept for backward compat) */}
        <Route path="activities" element={<Lazy><DailyActivityList /></Lazy>} />
        <Route path="activity/new" element={<Lazy><DailyActivityForm /></Lazy>} />
        <Route path="activity/:id" element={<Lazy><DailyActivityForm isEditing={true} /></Lazy>} />
        <Route path="class-activities/:classId" element={<Lazy><ClassActivityView /></Lazy>} />
        <Route path="regular-progress" element={<Lazy><RegularProgressInput /></Lazy>} />
        <Route path="hifz-report" element={<Lazy><HifzReport /></Lazy>} />
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
        <Route path="goals" element={<Lazy><StudentMyGoals /></Lazy>} />
        <Route path="monthly-report" element={<Lazy><StudentMonthlyReport /></Lazy>} />
        <Route path="profile" element={<Lazy><StudentProfile /></Lazy>} />
        <Route index element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* Parent Routes */}
      <Route
        path="/parent/*"
        element={
          <ProtectedRoute allowedRoles={["PARENT"]}>
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Lazy><ParentDashboard /></Lazy>} />
        <Route path="communications" element={<Lazy><Communications /></Lazy>} />
        <Route path="weekly-reports" element={<Lazy><ParentWeeklyReports /></Lazy>} />
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
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
