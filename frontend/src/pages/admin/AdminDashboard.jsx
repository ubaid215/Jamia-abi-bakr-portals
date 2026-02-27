import React, { useEffect, useState } from "react";
import {
  Users,
  School,
  BookOpen,
  Calendar,
  BarChart3,
  UserCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity as ActivityIcon,
} from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";
import dailyActivityService from "../../services/dailyActivityService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AdminDashboard = () => {
  const {
    fetchSystemStats,
    fetchAttendanceOverview,
    fetchLeaveRequests,
    stats,
    attendanceOverview,
    leaveRequests,
    loading,
  } = useAdmin();

  const [timeRange, setTimeRange] = useState("30days");
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    todayAttendance: 0,
  });

  const [weeklyActivities, setWeeklyActivities] = useState([]);
  const [todayActivityCount, setTodayActivityCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startDate7Days = weekAgo.toISOString().split("T")[0];

      await Promise.all([
        fetchSystemStats(),
        fetchAttendanceOverview({
          startDate: getStartDate(timeRange),
          endDate: today,
        }),
        fetchLeaveRequests({ status: "PENDING", limit: 5 }),
      ]);

      // Fetch daily activities for the last 7 days
      const activitiesRes = await dailyActivityService.getAll({
        startDate: startDate7Days,
        endDate: today,
        limit: 1000 // Ensure we get all records for the week
      });

      const activities = activitiesRes?.data || activitiesRes?.items || [];

      // Calculate today's activities
      const todayAct = activities.filter(a => a.date?.startsWith(today)).length;
      setTodayActivityCount(todayAct);

      // Group activities by date for the chart
      const grouped = activities.reduce((acc, curr) => {
        const d = curr.date?.split("T")[0];
        if (d) {
          acc[d] = (acc[d] || 0) + 1;
        }
        return acc;
      }, {});

      // Build 7-day array
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        chartData.push({
          date: dateStr,
          day: dayName,
          activities: grouped[dateStr] || 0,
        });
      }
      setWeeklyActivities(chartData);

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  const getStartDate = (range) => {
    const date = new Date();
    switch (range) {
      case "7days":
        date.setDate(date.getDate() - 7);
        break;
      case "30days":
        date.setDate(date.getDate() - 30);
        break;
      case "90days":
        date.setDate(date.getDate() - 90);
        break;
      default:
        date.setDate(date.getDate() - 30);
    }
    return date.toISOString().split("T")[0];
  };

  // Update stats when context data changes
  useEffect(() => {
    if (stats) {
      setDashboardStats({
        totalStudents: stats?.stats?.totalStudents || 0,
        totalTeachers: stats?.stats?.totalTeachers || 0,
        totalClasses: stats?.stats?.academic?.totalClasses || 0, // Fallback if missing
        todayAttendance: attendanceOverview?.summary?.overallAttendancePercentage || 0,
      });
    }
  }, [stats, attendanceOverview]);

  const statsCards = [
    {
      title: "Total Students",
      value: dashboardStats.totalStudents.toLocaleString(),
      change: "+8%",
      trend: "up",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Teachers",
      value: dashboardStats.totalTeachers.toLocaleString(),
      change: "+3",
      trend: "up",
      icon: UserCheck,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Classes",
      value: dashboardStats.totalClasses.toLocaleString(),
      change: "+2",
      trend: "up",
      icon: School,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Attendance Today",
      value: attendanceOverview?.summary?.overallAttendancePercentage
        ? `${attendanceOverview.summary.overallAttendancePercentage}%`
        : "0%",
      change: "+2%",
      trend: "up",
      icon: Calendar,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const quickStats = [
    {
      label: "Today's Activities",
      value: todayActivityCount.toString(),
      color: "bg-purple-100 text-purple-800",
    },
    {
      label: "Active Students",
      value: (stats?.stats?.activeStudents || dashboardStats.totalStudents).toString(),
      color: "bg-blue-100 text-blue-800",
    },
    {
      label: "Leave Requests",
      value: (leaveRequests?.leaveRequests?.length || 0).toString(),
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      label: "System Health",
      value: "Good",
      color: "bg-green-100 text-green-800",
    },
  ];

  const pendingTasks = (leaveRequests?.leaveRequests || [])
    .filter(req => req.status === "PENDING")
    .map(req => ({
      title: `Leave Request: ${req.teacher?.user?.name || "Teacher"}`,
      priority: "Medium",
      due: req.startDate ? new Date(req.startDate).toLocaleDateString() : "Pending",
      type: "approval",
      status: "pending",
      original: req
    }));

  const recentTasks = pendingTasks.slice(0, 4);

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#92400E] truncate">
              Admin Dashboard
            </h1>
            <p className="text-[#B45309] mt-1 sm:mt-2 text-sm sm:text-base truncate">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-[#FDE68A] text-[#92400E] font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <div className="flex items-center justify-center sm:justify-start bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-[#FDE68A] text-sm sm:text-base">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#D97706] mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="font-semibold text-[#92400E] truncate">
                Administrator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <div
                    className={`flex items-center mt-2 ${stat.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{stat.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-linear-to-r ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Overview
          </h2>
          <div className="space-y-3">
            {quickStats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="text-sm font-medium text-gray-700">
                  {stat.label}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${stat.color}`}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Recent Tasks & Alerts
            </h2>
            <span className="text-sm text-gray-500">
              {recentTasks.filter((task) => task.status === "pending").length}{" "}
              pending
            </span>
          </div>
          <div className="space-y-4">
            {recentTasks.length > 0 ? recentTasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-lg ${task.type === "approval"
                      ? "bg-blue-100 text-blue-600"
                      : task.type === "report"
                        ? "bg-green-100 text-green-600"
                        : task.type === "schedule"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                  >
                    {task.type === "approval" && (
                      <UserCheck className="h-5 w-5" />
                    )}
                    {task.type === "report" && (
                      <BarChart3 className="h-5 w-5" />
                    )}
                    {task.type === "schedule" && <Clock className="h-5 w-5" />}
                    {task.type === "transfer" && <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-600">Start Date: {task.due}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${task.priority === "High"
                      ? "bg-red-100 text-red-800"
                      : task.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                      }`}
                  >
                    {task.priority}
                  </span>
                  <div
                    className={`p-1 rounded-full ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {getStatusIcon(task.status)}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p>No pending tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Performance Metrics
          </h2>
          <span className="text-sm text-gray-500">
            Last {timeRange.replace("days", "")} days
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
            <div className="text-2xl font-bold text-[#D97706]">
              {attendanceOverview?.summary?.overallAttendancePercentage || 0}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Student Attendance</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
            <div className="text-2xl font-bold text-[#D97706]">
              {dashboardStats.totalTeachers > 0
                ? Math.floor((stats?.stats?.activeTeachers || 0) / dashboardStats.totalTeachers * 100)
                : 0}
              %
            </div>
            <p className="text-sm text-gray-600 mt-1">Active Teacher Ratio</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
            <div className="text-2xl font-bold text-[#D97706]">
              {stats?.stats?.weeklyAttendanceRate || 0}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Weekly Avg Attendance</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
            <div className="text-2xl font-bold text-[#D97706]">
              {leaveRequests?.leaveRequests?.length || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Pending Leaves</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Attendance Summary
          </h2>
          {attendanceOverview ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Overall Attendance
                </span>
                <span className="text-lg font-bold text-green-600">
                  {attendanceOverview?.summary?.overallAttendancePercentage || 0}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {attendanceOverview?.summary?.presentCount || 0}
                  </div>
                  <div className="text-sm text-green-800">Present</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">
                    {attendanceOverview?.summary?.absentCount || 0}
                  </div>
                  <div className="text-sm text-red-800">Absent</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No attendance data available
            </div>
          )}
        </div>

        {/* Activity Weekly Overview Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-indigo-600" />
              Weekly Activity Overview
            </h2>
          </div>
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivities} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="activities" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            System Alerts
          </h2>
          <div className="space-y-3">
            {leaveRequests?.leaveRequests?.slice(0, 3).map((request, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Leave Request from {request.teacher?.user?.name}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {request.startDate} to {request.endDate}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                  Pending
                </span>
              </div>
            ))}
            {(!leaveRequests || leaveRequests.leaveRequests?.length === 0) && (
              <div className="text-center text-gray-500 py-4">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p>No pending alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
