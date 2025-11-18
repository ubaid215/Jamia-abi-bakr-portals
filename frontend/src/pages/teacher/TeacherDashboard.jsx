/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
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
  UserCheck
} from 'lucide-react';

const TeacherDashboard = () => {
  const {
    dashboard,
    loading,
    error,
    fetchDashboard,
    fetchMyClasses,
    fetchMySubjects,
    fetchMyStudents
  } = useTeacher();

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
    fetchMyClasses();
    fetchMySubjects();
  }, []);

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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
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

  const { teacher, summary, classes, subjects, recentLeaveRequests, pendingTasks } = dashboard;

  // Stats Cards Component
  const StatCard = ({ icon: Icon, label, value, color = 'gold' }) => (
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
          <h3 className="text-lg font-semibold text-gray-900">{classData.name}</h3>
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
          <p className="text-sm font-medium text-gray-900">{classData.studentCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="text-center">
          <BookOpen className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-sm font-medium text-gray-900">{classData.subjectCount}</p>
          <p className="text-xs text-gray-500">Subjects</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Recent Students</p>
        <div className="space-y-2">
          {classData.recentStudents.map((student) => (
            <div key={student.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{student.name}</span>
              <span className="text-gray-400">#{student.rollNumber}</span>
            </div>
          ))}
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
        case 'APPROVED':
          return 'text-green-600 bg-green-50';
        case 'PENDING':
          return 'text-yellow-600 bg-yellow-50';
        case 'REJECTED':
          return 'text-red-600 bg-red-50';
        default:
          return 'text-gray-600 bg-gray-50';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'APPROVED':
          return <CheckCircle className="h-4 w-4" />;
        case 'PENDING':
          return <Clock className="h-4 w-4" />;
        case 'REJECTED':
          return <XCircle className="h-4 w-4" />;
        default:
          return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
            {getStatusIcon(request.status)}
            <span className="ml-1">{request.status}</span>
          </span>
          <span className="text-sm text-gray-500">
            {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
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
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {teacher.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                <p className="text-sm text-gray-500">{teacher.specialization}</p>
              </div>
              <div className="h-10 w-10 bg-gold rounded-full flex items-center justify-center">
                {teacher.profileImage ? (
                  <img
                    src={teacher.profileImage}
                    alt={teacher.name}
                    className="h-10 w-10 rounded-full"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'classes', label: 'Classes', icon: Users },
              { id: 'subjects', label: 'Subjects', icon: BookOpen },
              { id: 'attendance', label: 'Attendance', icon: UserCheck },
              { id: 'leave', label: 'Leave', icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-gold text-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                label="Total Classes"
                value={summary.totalClasses}
              />
              <StatCard
                icon={BookOpen}
                label="Total Subjects"
                value={summary.totalSubjects}
              />
              <StatCard
                icon={GraduationCap}
                label="Total Students"
                value={summary.totalStudents}
              />
              <StatCard
                icon={UserCheck}
                label="Today's Attendance"
                value={summary.todayAttendance}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pending Tasks */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                      Pending Tasks
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Attendance to Mark</p>
                          <p className="text-sm text-gray-500">
                            {pendingTasks.attendanceToMark} classes need attention
                          </p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          {pendingTasks.attendanceToMark}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Pending Leave Requests</p>
                          <p className="text-sm text-gray-500">Awaiting approval</p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {summary.pendingLeaveRequests}
                        </span>
                      </div>
                    </div>

                    {pendingTasks.classesNeedingAttention.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">Classes Needing Attention</p>
                        <div className="space-y-2">
                          {pendingTasks.classesNeedingAttention.map((cls) => (
                            <div key={cls.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded">
                              <span className="text-gray-600">{cls.name}</span>
                              <span className="text-gray-400">{cls.studentCount} students</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Classes & Subjects */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Classes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
                    <button className="text-sm text-gold hover:text-yellow-600 font-medium flex items-center">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classes.slice(0, 4).map((classData) => (
                        <ClassCard key={classData.id} classData={classData} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Subjects */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">My Subjects</h2>
                    <button className="text-sm text-gold hover:text-yellow-600 font-medium flex items-center">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Leave Requests</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
              <button className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors">
                Manage Classes
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classData) => (
                <ClassCard key={classData.id} classData={classData} />
              ))}
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Subjects</h2>
              <button className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors">
                Manage Subjects
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {subjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
              <button className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors">
                Mark Attendance
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Attendance Features</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Mark and manage student attendance for your classes.
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <Users className="h-8 w-8 text-gold mx-auto mb-2" />
                    <p className="font-medium">Class Attendance</p>
                    <p className="text-sm text-gray-500">Mark attendance by class</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <BookOpen className="h-8 w-8 text-gold mx-auto mb-2" />
                    <p className="font-medium">Subject-wise</p>
                    <p className="text-sm text-gray-500">Attendance per subject</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-gold mx-auto mb-2" />
                    <p className="font-medium">Reports</p>
                    <p className="text-sm text-gray-500">View attendance reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Tab */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
              <button className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors">
                Apply for Leave
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leave History */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Leave History</h3>
                </div>
                <div className="p-6">
                  {recentLeaveRequests.length > 0 ? (
                    <div className="space-y-4">
                      {recentLeaveRequests.map((request) => (
                        <LeaveRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No leave requests found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Leave Summary</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-800 font-medium">Approved</span>
                      <span className="text-green-800 font-bold">
                        {recentLeaveRequests.filter(r => r.status === 'APPROVED').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-800 font-medium">Pending</span>
                      <span className="text-yellow-800 font-bold">
                        {recentLeaveRequests.filter(r => r.status === 'PENDING').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-800 font-medium">Rejected</span>
                      <span className="text-red-800 font-bold">
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