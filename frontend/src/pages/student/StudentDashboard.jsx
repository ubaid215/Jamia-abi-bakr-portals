import React, { useEffect, useState } from "react";
import { useStudent } from "../../contexts/StudentContext";
import {
  Calendar, BookOpen, GraduationCap, User, TrendingUp, CheckCircle,
  Clock, Users, Mail, Phone, Bookmark, Award, Target, AlertTriangle
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
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          description: "Current month",
        },
        {
          title: "Present Days",
          value: `${dashboard.attendance?.currentMonth?.present || 0}/${dashboard.attendance?.currentMonth?.total || 0}`,
          icon: Calendar,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          description: "This month",
        },
        {
          title: "Current Class",
          value: dashboard.currentClass?.name || "N/A",
          icon: GraduationCap,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
          description: dashboard.currentClass?.type || "Not enrolled",
        },
        {
          title: "Program",
          value: dashboard.progress?.type || "N/A",
          icon: TrendingUp,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          description: "Progress track",
        },
      ]);
    }
  }, [dashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading dashboard</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={fetchDashboard} className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <User className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No dashboard data available</p>
        </div>
      </div>
    );
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case "PRESENT": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "ABSENT": return "text-red-700 bg-red-50 border-red-200";
      case "LATE": return "text-amber-700 bg-amber-50 border-amber-200";
      case "EXCUSED": return "text-blue-700 bg-blue-50 border-blue-200";
      default: return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getProgressStats = () => {
    if (!dashboard.progress) return [];
    const stats = dashboard.progress.completionStats || {};
    switch (dashboard.progress.type) {
      case "HIFZ":
        return [
          { label: "Lines Memorized", value: stats.totalLinesCompleted || 0, icon: Bookmark, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Paras Completed", value: stats.parasCompleted || 0, icon: Award, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Completion", value: `${Math.round(stats.completionPercentage || 0)}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Daily Avg", value: `${stats.averageDailyLines || 0} lines`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
        ];
      case "NAZRA":
        return [
          { label: "Lines Recited", value: stats.totalLinesRecited || 0, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Completion", value: `${Math.round(stats.completionPercentage || 0)}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Daily Avg", value: `${stats.averageDailyLines || 0} lines`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Status", value: stats.isCompleted ? "Completed" : "Active", icon: CheckCircle, color: stats.isCompleted ? "text-emerald-600" : "text-blue-600", bg: stats.isCompleted ? "bg-emerald-50" : "bg-blue-50" },
        ];
      case "REGULAR":
        return [
          { label: "Average Score", value: `${stats.averagePercentage || 0}%`, icon: Award, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Recent Assessments", value: stats.recentAssessments?.length || 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
        ];
      default: return [];
    }
  };

  const progressSections = getProgressStats();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ── HEADER ── */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-inner">
              <User className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome, {dashboard.student?.name?.split(" ")[0] || "Student"}!
              </h1>
              <p className="text-sm text-gray-500">Your academic overview</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg text-right sm:text-left">
            <p className="text-xs text-amber-700 font-medium tracking-wide uppercase">Admission No</p>
            <p className="text-lg font-bold text-amber-900">{dashboard.student?.admissionNo}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── TOP STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">{stat.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{stat.title}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="col-span-1 lg:col-span-2 space-y-6">

            {/* Academic Progress stats */}
            {progressSections.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Academic Progress</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{dashboard.progress?.type} Track</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {progressSections.map((item, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${item.bg.replace('bg-', 'border-').replace('50', '100')} ${item.bg}`}>
                      <item.icon className={`h-5 w-5 mb-2 ${item.color}`} />
                      <p className="text-xl font-bold text-gray-900">{item.value}</p>
                      <p className="text-xs font-medium text-gray-600 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Class & Subjects */}
            {dashboard.currentClass && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><GraduationCap size={20} /></div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{dashboard.currentClass.name}</h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Grade {dashboard.currentClass.grade} • Sec {dashboard.currentClass.section}
                      </p>
                    </div>
                  </div>
                  {dashboard.currentClass.classTeacher && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Class Teacher</p>
                      <p className="text-sm font-semibold text-gray-900">{dashboard.currentClass.classTeacher}</p>
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  {dashboard.currentClass.classTeacher && (
                    <div className="mb-4 sm:hidden pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-500">Class Teacher</p>
                      <p className="text-sm font-semibold text-gray-900">{dashboard.currentClass.classTeacher}</p>
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Enrolled Subjects</h3>
                  {dashboard.currentClass.subjects?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dashboard.currentClass.subjects.map((sub, i) => (
                        <div key={i} className="flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                          <span className="font-semibold text-sm text-gray-900">{sub.name}</span>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                            <User size={12} />
                            <span>{sub.teacher?.name || 'Unassigned'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No subjects listed for this class.</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="col-span-1 space-y-6">

            {/* Recent Attendance */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" /> Recent Attendance
                </h3>
              </div>
              <div className="space-y-2 mt-4">
                {dashboard.attendance?.recent?.length > 0 ? (
                  dashboard.attendance.recent.map((rec, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rec.subject?.name || 'Daily'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${getStatusStyle(rec.status)}`}>
                        {rec.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No recent records</p>
                )}
              </div>
            </div>

            {/* Parent Contacts */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users size={18} className="text-amber-500" /> Linked Parents
                </h3>
              </div>
              <div className="space-y-3">
                {dashboard.parents?.length > 0 ? (
                  dashboard.parents.map((p, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="font-semibold text-sm text-gray-900 mb-1.5">{p.name}</p>
                      {p.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Mail size={12} className="text-gray-400" /> {p.email}
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={12} className="text-gray-400" /> {p.phone}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No parents linked</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
