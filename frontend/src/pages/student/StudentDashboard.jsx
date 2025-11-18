import React, { useEffect, useState } from 'react';
import { useStudent } from '../../contexts/StudentContext';
import {
  Calendar,
  BookOpen,
  GraduationCap,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Mail,
  Phone,
  MapPin,
  Cake,
  Droplets,
  Globe,
  AlertTriangle,
  Bookmark,
  Award,
  Target
} from 'lucide-react';

const StudentDashboard = () => {
  const {
    dashboard,
    loading,
    error,
    fetchDashboard
  } = useStudent();

  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (dashboard) {
      setStats([
        {
          title: 'Attendance Rate',
          value: `${dashboard.attendance?.currentMonth?.percentage || 0}%`,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Current month'
        },
        {
          title: 'Present Days',
          value: `${dashboard.attendance?.currentMonth?.present || 0}/${dashboard.attendance?.currentMonth?.total || 0}`,
          icon: Calendar,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: 'This month'
        },
        {
          title: 'Current Class',
          value: dashboard.currentClass?.name || 'N/A',
          icon: GraduationCap,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          description: dashboard.currentClass?.type || 'Not enrolled'
        },
        {
          title: 'Progress',
          value: dashboard.progress?.type || 'N/A',
          icon: TrendingUp,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          description: 'Program type'
        }
      ]);
    }
  }, [dashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">Error loading dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboard}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">No data available</h3>
          <p className="text-gray-600">Unable to load dashboard information</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ABSENT':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'LATE':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'EXCUSED':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressStats = () => {
    if (!dashboard.progress) return [];

    switch (dashboard.progress.type) {
      case 'HIFZ':
        return [
          { label: 'Lines Completed', value: dashboard.progress.completionStats?.totalLinesCompleted || 0, icon: Bookmark },
          { label: 'Paras Completed', value: dashboard.progress.completionStats?.parasCompleted || 0, icon: Award },
          { label: 'Completion', value: `${Math.round(dashboard.progress.completionStats?.completionPercentage || 0)}%`, icon: Target },
          { label: 'Daily Average', value: `${dashboard.progress.completionStats?.averageDailyLines || 0} lines`, icon: TrendingUp }
        ];
      case 'NAZRA':
        return [
          { label: 'Lines Recited', value: dashboard.progress.completionStats?.totalLinesRecited || 0, icon: BookOpen },
          { label: 'Completion', value: `${Math.round(dashboard.progress.completionStats?.completionPercentage || 0)}%`, icon: Target },
          { label: 'Daily Average', value: `${dashboard.progress.completionStats?.averageDailyLines || 0} lines`, icon: TrendingUp },
          { label: 'Status', value: dashboard.progress.completionStats?.isCompleted ? 'Completed' : 'In Progress', icon: CheckCircle }
        ];
      case 'REGULAR':
        return [
          { label: 'Average Score', value: `${dashboard.progress.averagePercentage || 0}%`, icon: Award },
          { label: 'Recent Assessments', value: dashboard.progress.recentAssessments?.length || 0, icon: BookOpen }
        ];
      default:
        return [];
    }
  };

  const progressStats = getProgressStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">
                Welcome back, {dashboard.student.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's your academic overview for today
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Admission No</p>
                <p className="font-semibold text-black">{dashboard.student.admissionNo}</p>
              </div>
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-black mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Class Info & Progress */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Class Information */}
            {dashboard.currentClass && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-black">Current Class Details</h2>
                  <GraduationCap className="h-5 w-5 text-amber-600" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-black text-lg">{dashboard.currentClass.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>Grade {dashboard.currentClass.grade}</span>
                        <span>•</span>
                        <span>Section {dashboard.currentClass.section}</span>
                      </div>
                      <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium capitalize">
                        {dashboard.currentClass.type.toLowerCase()} Program
                      </span>
                    </div>
                    
                    {dashboard.currentClass.classTeacher && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-black">Class Teacher</p>
                          <p className="text-sm text-gray-600">{dashboard.currentClass.classTeacher}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {dashboard.currentClass.subjects && dashboard.currentClass.subjects.length > 0 && (
                    <div>
                      <h4 className="font-medium text-black mb-3">Subjects</h4>
                      <div className="space-y-2">
                        {dashboard.currentClass.subjects.slice(0, 4).map((subject, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <span className="text-sm text-gray-800">{subject.name}</span>
                            {subject.teacher && (
                              <span className="text-xs text-gray-500">{subject.teacher.name}</span>
                            )}
                          </div>
                        ))}
                        {dashboard.currentClass.subjects.length > 4 && (
                          <p className="text-xs text-gray-500 text-center mt-2">
                            +{dashboard.currentClass.subjects.length - 4} more subjects
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Overview */}
            {dashboard.progress && progressStats.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-black">Progress Overview</h2>
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {progressStats.map((stat, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <stat.icon className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-black">{stat.value}</p>
                      <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Recent Activity & Parents */}
          <div className="space-y-8">
            {/* Recent Attendance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-black">Recent Attendance</h2>
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              
              <div className="space-y-3">
                {dashboard.attendance?.recent?.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-black">
                        {record.subject?.name || 'General'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                ))}
                
                {(!dashboard.attendance?.recent || dashboard.attendance.recent.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No recent attendance records</p>
                )}
              </div>
            </div>

            {/* Parent Contacts */}
            {dashboard.parents && dashboard.parents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-black">Parent Contacts</h2>
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                
                <div className="space-y-3">
                  {dashboard.parents.map((parent, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-black">{parent.name}</p>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span>{parent.email}</span>
                      </div>
                      {parent.phone && (
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{parent.phone}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-black mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center hover:bg-amber-100 transition-colors group">
              <Calendar className="h-6 w-6 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-amber-800">View Attendance</span>
            </button>
            <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center hover:bg-blue-100 transition-colors group">
              <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-blue-800">My Progress</span>
            </button>
            <button className="p-4 bg-green-50 border border-green-200 rounded-lg text-center hover:bg-green-100 transition-colors group">
              <Award className="h-6 w-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-green-800">Results</span>
            </button>
            <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center hover:bg-purple-100 transition-colors group">
              <User className="h-6 w-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-purple-800">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;