import React, { useEffect, useState } from "react";
import { useStudent } from "../../contexts/StudentContext";
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
  Target,
} from "lucide-react";

const StudentDashboard = () => {
  const { dashboard, loading, error, fetchDashboard } = useStudent();

  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (dashboard) {
      setStats([
        {
          title: "Attendance Rate",
          value: `${dashboard.attendance?.currentMonth?.percentage || 0}%`,
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          description: "Current month",
        },
        {
          title: "Present Days",
          value: `${dashboard.attendance?.currentMonth?.present || 0}/${
            dashboard.attendance?.currentMonth?.total || 0
          }`,
          icon: Calendar,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          description: "This month",
        },
        {
          title: "Current Class",
          value: dashboard.currentClass?.name || "N/A",
          icon: GraduationCap,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          description: dashboard.currentClass?.type || "Not enrolled",
        },
        {
          title: "Progress",
          value: dashboard.progress?.type || "N/A",
          icon: TrendingUp,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          description: "Program type",
        },
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
          <h3 className="text-lg font-semibold text-black mb-2">
            Error loading dashboard
          </h3>
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
          <h3 className="text-lg font-semibold text-black mb-2">
            No data available
          </h3>
          <p className="text-gray-600">Unable to load dashboard information</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "PRESENT":
        return "text-green-600 bg-green-50 border-green-200";
      case "ABSENT":
        return "text-red-600 bg-red-50 border-red-200";
      case "LATE":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "EXCUSED":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getProgressStats = () => {
    if (!dashboard.progress) return [];

    switch (dashboard.progress.type) {
      case "HIFZ":
        return [
          {
            label: "Lines Completed",
            value: dashboard.progress.completionStats?.totalLinesCompleted || 0,
            icon: Bookmark,
          },
          {
            label: "Paras Completed",
            value: dashboard.progress.completionStats?.parasCompleted || 0,
            icon: Award,
          },
          {
            label: "Completion",
            value: `${Math.round(
              dashboard.progress.completionStats?.completionPercentage || 0
            )}%`,
            icon: Target,
          },
          {
            label: "Daily Average",
            value: `${
              dashboard.progress.completionStats?.averageDailyLines || 0
            } lines`,
            icon: TrendingUp,
          },
        ];
      case "NAZRA":
        return [
          {
            label: "Lines Recited",
            value: dashboard.progress.completionStats?.totalLinesRecited || 0,
            icon: BookOpen,
          },
          {
            label: "Completion",
            value: `${Math.round(
              dashboard.progress.completionStats?.completionPercentage || 0
            )}%`,
            icon: Target,
          },
          {
            label: "Daily Average",
            value: `${
              dashboard.progress.completionStats?.averageDailyLines || 0
            } lines`,
            icon: TrendingUp,
          },
          {
            label: "Status",
            value: dashboard.progress.completionStats?.isCompleted
              ? "Completed"
              : "In Progress",
            icon: CheckCircle,
          },
        ];
      case "REGULAR":
        return [
          {
            label: "Average Score",
            value: `${dashboard.progress.averagePercentage || 0}%`,
            icon: Award,
          },
          {
            label: "Recent Assessments",
            value: dashboard.progress.recentAssessments?.length || 0,
            icon: BookOpen,
          },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4 xs:gap-0">
            {/* Left side with greeting */}
            <div className="flex items-center space-x-3 xs:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                  Welcome back,{" "}
                  {dashboard.student.name?.split(" ")[0] || "Student"}!
                </h1>
                <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">
                  Academic overview for today
                </p>
              </div>
            </div>

            {/* Right side with admission info */}
            <div className="flex items-center justify-end space-x-3 sm:space-x-4">
              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">
                  Admission Number
                </p>
                <p className="text-xs sm:text-sm text-gray-600 xs:hidden">
                  Adm No
                </p>
                <p className="font-semibold text-black text-sm sm:text-base lg:text-lg bg-amber-50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-amber-200">
                  {dashboard.student.admissionNo}
                </p>
              </div>

              {/* Optional: Date display for mobile */}
              <div className="xs:hidden text-right">
                <p className="text-xs text-gray-600">Today</p>
                <p className="text-xs font-medium text-gray-800">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-md transition-shadow hover:border-gray-300"
            >
              <div className="flex flex-col h-full">
                {/* Icon and title row */}
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div
                    className={`p-2 sm:p-2.5 rounded-lg ${stat.bgColor} flex-shrink-0`}
                  >
                    <stat.icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded">
                    {index + 1}
                  </span>
                </div>

                {/* Value */}
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-1 sm:mb-2 truncate">
                  {stat.value}
                </p>

                {/* Title */}
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 truncate">
                  {stat.title}
                </p>

                {/* Description */}
                <p className="text-xs text-gray-500 mt-auto line-clamp-2">
                  {stat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Class Info & Progress */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Current Class Information */}
            {dashboard.currentClass && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-black">
                    Current Class
                  </h2>
                  <GraduationCap className="h-5 w-5 text-amber-600" />
                </div>

                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
                  {/* Class Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-black text-lg sm:text-xl">
                        {dashboard.currentClass.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          Grade {dashboard.currentClass.grade}
                        </span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          Sec {dashboard.currentClass.section}
                        </span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded capitalize">
                          {dashboard.currentClass.type.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {dashboard.currentClass.classTeacher && (
                      <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <User className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-800">
                            Class Teacher
                          </p>
                          <p className="text-sm font-medium text-black truncate">
                            {dashboard.currentClass.classTeacher}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subjects */}
                  {dashboard.currentClass.subjects &&
                    dashboard.currentClass.subjects.length > 0 && (
                      <div>
                        <h4 className="font-medium text-black mb-2 text-sm sm:text-base">
                          Subjects ({dashboard.currentClass.subjects.length})
                        </h4>
                        <div className="space-y-1.5">
                          {dashboard.currentClass.subjects
                            .slice(0, 3)
                            .map((subject, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded"
                              >
                                <span className="text-sm text-gray-800 truncate flex-1 pr-2">
                                  {subject.name}
                                </span>
                                {subject.teacher && (
                                  <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                    {subject.teacher.name?.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            ))}
                          {dashboard.currentClass.subjects.length > 3 && (
                            <div className="text-center pt-1">
                              <p className="text-xs text-gray-500">
                                View all{" "}
                                {dashboard.currentClass.subjects.length}{" "}
                                subjects →
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Progress Overview - Improved mobile layout */}
            {dashboard.progress && progressStats.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-black">
                      Progress Overview
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Last 30 days performance
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  {progressStats.map((stat, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        index === 0
                          ? "bg-green-50 border-green-100"
                          : index === 1
                          ? "bg-blue-50 border-blue-100"
                          : index === 2
                          ? "bg-purple-50 border-purple-100"
                          : "bg-amber-50 border-amber-100"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg sm:text-xl font-bold text-black">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {stat.label}
                          </p>
                        </div>
                        <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-current opacity-80" />
                      </div>
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
                <h2 className="text-lg font-semibold text-black">
                  Recent Attendance
                </h2>
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>

              <div className="space-y-3">
                {dashboard.attendance?.recent
                  ?.slice(0, 5)
                  .map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-black">
                          {record.subject?.name || "General"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  ))}

                {(!dashboard.attendance?.recent ||
                  dashboard.attendance.recent.length === 0) && (
                  <p className="text-center text-gray-500 py-4">
                    No recent attendance records
                  </p>
                )}
              </div>
            </div>

            {/* Parent Contacts */}
            {dashboard.parents && dashboard.parents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-black">
                    Parent Contacts
                  </h2>
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
      </div>
    </div>
  );
};

export default StudentDashboard;
