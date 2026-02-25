/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useTeacher } from "../../contexts/TeacherContext";
import {
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowRight,
  User,
  Mail,
  Briefcase,
  Award,
  FileText,
  BarChart3,
  Activity,
  Home,
  BookMarked,
  UserCheck,
} from "lucide-react";

const TeacherDashboard = () => {
  const {
    dashboard,
    loading,
    error,
    fetchDashboard,
    fetchMyClasses,
    fetchMySubjects,
    fetchMyStudents,
  } = useTeacher();

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboard();
    fetchMyClasses();
    fetchMySubjects();
  }, [fetchDashboard, fetchMyClasses, fetchMySubjects]);

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Error loading dashboard
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const {
    teacher,
    summary,
    classes,
    subjects,
    recentLeaveRequests,
    pendingTasks,
  } = dashboard;

  // Stats Cards Component
  const StatCard = ({ icon: Icon, label, value, color = "gold" }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </div>
  );

  // Class Card Component
  const ClassCard = ({ classData }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {classData.name}
          </h3>
          <p className="text-sm text-gray-600">
            Grade {classData.grade} • {classData.section}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold bg-opacity-10 text-gold">
          {classData.type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <Users className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-sm font-medium text-gray-900">
            {classData.studentCount || 0}
          </p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="text-center">
          <BookOpen className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-sm font-medium text-gray-900">
            {classData.subjectCount || 0}
          </p>
          <p className="text-xs text-gray-500">Subjects</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Recent Students
        </p>
        <div className="space-y-2">
          {classData.recentStudents && classData.recentStudents.length > 0 ? (
            classData.recentStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{student.name}</span>
                <span className="text-gray-400">#{student.rollNumber}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No students enrolled</p>
          )}
        </div>
      </div>
    </div>
  );

  // Subject Card Component
  const SubjectCard = ({ subject }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{subject.name}</h4>
          <p className="text-sm text-gray-500">{subject.code}</p>
        </div>
        <BookOpen className="h-5 w-5 text-gold" />
      </div>
      <p className="text-sm text-gray-600">
        {subject.class} • Grade {subject.grade}
      </p>
    </div>
  );

  // Leave Request Card Component
  const LeaveRequestCard = ({ request }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case "APPROVED":
          return "text-green-600 bg-green-50";
        case "PENDING":
          return "text-yellow-600 bg-yellow-50";
        case "REJECTED":
          return "text-red-600 bg-red-50";
        default:
          return "text-gray-600 bg-gray-50";
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case "APPROVED":
          return <CheckCircle className="h-4 w-4" />;
        case "PENDING":
          return <Clock className="h-4 w-4" />;
        case "REJECTED":
          return <XCircle className="h-4 w-4" />;
        default:
          return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              request.status
            )}`}
          >
            {getStatusIcon(request.status)}
            <span className="ml-1">{request.status}</span>
          </span>
          <span className="text-sm text-gray-500">
            {new Date(request.fromDate).toLocaleDateString()} -{" "}
            {new Date(request.toDate).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-900 line-clamp-2">{request.reason}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Teacher Dashboard
              </h1>
              <p className="text-sm text-gray-600 truncate">
                Welcome back, {teacher.name}!
              </p>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-end bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">
                  {teacher.name}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] lg:max-w-none">
                  {teacher.specialization}
                </p>
              </div>
              <div className="h-10 w-10 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                {teacher.profileImage ? (
                  <img
                    src={teacher.profileImage.startsWith('http') || teacher.profileImage.startsWith('data:') ? teacher.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/public/profile-image/${teacher.userId || teacher.id}`}
                    alt={teacher.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <nav className="flex overflow-x-auto py-2 sm:py-0 space-x-4 sm:space-x-8 hide-scrollbar">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: Home,
                mobileLabel: "Overview",
              },
              {
                id: "classes",
                label: "Classes",
                icon: Users,
                mobileLabel: "Classes",
              },
              {
                id: "subjects",
                label: "Subjects",
                icon: BookOpen,
                mobileLabel: "Subjects",
              },
              {
                id: "attendance",
                label: "Attendance",
                icon: UserCheck,
                mobileLabel: "Attend",
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="inline sm:hidden">{tab.mobileLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Add this to your global CSS for hiding scrollbar but keeping functionality */}
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <StatCard
                icon={Users}
                label="Classes"
                value={summary.totalClasses}
                className="text-xs sm:text-sm"
              />
              <StatCard
                icon={BookOpen}
                label="Subjects"
                value={summary.totalSubjects}
                className="text-xs sm:text-sm"
              />
              <StatCard
                icon={GraduationCap}
                label="Students"
                value={summary.totalStudents}
                className="text-xs sm:text-sm"
              />
              <StatCard
                icon={UserCheck}
                label="Today"
                value={summary.todayAttendance}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Pending Tasks */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mr-2 flex-shrink-0" />
                      Pending Tasks
                    </h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            Attendance to Mark
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {pendingTasks.attendanceToMark} classes need attention
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 flex-shrink-0">
                          {pendingTasks.attendanceToMark}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            Pending Leave
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">Awaiting approval</p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                          {summary.pendingLeaveRequests}
                        </span>
                      </div>
                    </div>

                    {pendingTasks.classesNeedingAttention.length > 0 && (
                      <div className="mt-4 sm:mt-6">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                          Classes Needing Attention
                        </p>
                        <div className="space-y-1 sm:space-y-2">
                          {pendingTasks.classesNeedingAttention.map((cls) => (
                            <div key={cls.id} className="flex items-center justify-between text-xs sm:text-sm p-1.5 sm:p-2 hover:bg-gray-50 rounded">
                              <span className="text-gray-600 truncate pr-2">{cls.name}</span>
                              <span className="text-gray-400 flex-shrink-0">
                                {cls.studentCount} students
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Classes & Subjects */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Recent Classes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      My Classes
                    </h2>
                    <button className="text-xs sm:text-sm text-gold hover:text-yellow-600 font-medium flex items-center whitespace-nowrap">
                      View All
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 flex-shrink-0" />
                    </button>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {classes.slice(0, 4).map((classData) => (
                        <ClassCard key={classData.id} classData={classData} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Subjects */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      My Subjects
                    </h2>
                    <button className="text-xs sm:text-sm text-gold hover:text-yellow-600 font-medium flex items-center whitespace-nowrap">
                      View All
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 flex-shrink-0" />
                    </button>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {subjects.slice(0, 6).map((subject) => (
                        <SubjectCard key={subject.id} subject={subject} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Leave Requests */}
            {recentLeaveRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Recent Leave Requests
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {recentLeaveRequests.map((request) => (
                      <LeaveRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Classes</h2>
              <button className="bg-gold text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base w-full sm:w-auto">
                Manage Classes
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {classes.map((classData) => (
                <ClassCard key={classData.id} classData={classData} />
              ))}
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Subjects</h2>
              <button className="bg-gold text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base w-full sm:w-auto">
                Manage Subjects
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {subjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance Management</h2>
              <button className="bg-gold text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base w-full sm:w-auto">
                Mark Attendance
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8 lg:py-12">
                <UserCheck className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">Attendance Features</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                  Mark and manage student attendance for your classes.
                </p>
                <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-gold mx-auto mb-1 sm:mb-2" />
                    <p className="font-medium text-sm sm:text-base">Class Attendance</p>
                    <p className="text-xs sm:text-sm text-gray-500">Mark by class</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-gold mx-auto mb-1 sm:mb-2" />
                    <p className="font-medium text-sm sm:text-base">Subject-wise</p>
                    <p className="text-xs sm:text-sm text-gray-500">Per subject</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-gold mx-auto mb-1 sm:mb-2" />
                    <p className="font-medium text-sm sm:text-base">Reports</p>
                    <p className="text-xs sm:text-sm text-gray-500">View reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Tab */}
        {activeTab === 'leave' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Leave Management</h2>
              <button className="bg-gold text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base w-full sm:w-auto">
                Apply for Leave
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Leave History */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Leave History</h3>
                </div>
                <div className="p-4 sm:p-6">
                  {recentLeaveRequests.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {recentLeaveRequests.map((request) => (
                        <LeaveRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Calendar className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                      <p className="mt-2 text-sm sm:text-base text-gray-500">No leave requests found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Leave Summary</h3>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center p-2.5 sm:p-3 bg-green-50 rounded-lg">
                      <span className="text-green-800 font-medium text-sm sm:text-base">Approved</span>
                      <span className="text-green-800 font-bold text-sm sm:text-base">
                        {recentLeaveRequests.filter(r => r.status === 'APPROVED').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 sm:p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-800 font-medium text-sm sm:text-base">Pending</span>
                      <span className="text-yellow-800 font-bold text-sm sm:text-base">
                        {recentLeaveRequests.filter(r => r.status === 'PENDING').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 sm:p-3 bg-red-50 rounded-lg">
                      <span className="text-red-800 font-medium text-sm sm:text-base">Rejected</span>
                      <span className="text-red-800 font-bold text-sm sm:text-base">
                        {recentLeaveRequests.filter(r => r.status === 'REJECTED').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
