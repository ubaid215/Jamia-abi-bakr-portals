import React, { useEffect, useState } from 'react';
import { 
  Users, 
  School, 
  BookOpen, 
  BarChart3, 
  Shield,
  Settings,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Database,
  Cpu,
  Activity
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const { 
    fetchSystemStats, 
    fetchUsers,
    fetchAdmins,
    fetchAttendanceOverview,
    stats,
    admins,
    attendanceOverview,
    loading 
  } = useAdmin();
  
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30days');
  const [systemMetrics, setSystemMetrics] = useState({
    totalUsers: 0,
    activeClasses: 0,
    totalSubjects: 0,
    systemHealth: 98
  });

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchSystemStats(),
        fetchAdmins(),
        fetchUsers({ role: 'ALL' }),
        fetchAttendanceOverview({ 
          startDate: getStartDate(timeRange),
          endDate: new Date().toISOString().split('T')[0]
        })
      ]);
    } catch (error) {
      console.error('Failed to load super admin dashboard data:', error);
    }
  };

  const getStartDate = (range) => {
    const date = new Date();
    switch (range) {
      case '7days':
        date.setDate(date.getDate() - 7);
        break;
      case '30days':
        date.setDate(date.getDate() - 30);
        break;
      case '90days':
        date.setDate(date.getDate() - 90);
        break;
      default:
        date.setDate(date.getDate() - 30);
    }
    return date.toISOString().split('T')[0];
  };

  // Update metrics when context data changes
  useEffect(() => {
    if (stats) {
      setSystemMetrics({
        totalUsers: stats.stats.totalUsers || 0,
        activeClasses: stats.stats.academic.totalClasses || 0,
        totalSubjects: stats.stats.academic.totalSubjects || 0,
        systemHealth: calculateSystemHealth()
      });
    }
  }, [stats]);

  const calculateSystemHealth = () => {
    if (!stats) return 98;
    
    const activeUsersPercentage = (stats.stats.byStatus.active / Math.max(stats.stats.totalUsers, 1)) * 100;
    const attendanceRate = attendanceOverview?.summary?.overallAttendancePercentage || 0;
    
    return Math.round((activeUsersPercentage + attendanceRate) / 2);
  };

  const statsCards = [
    {
      title: 'Total Users',
      value: systemMetrics.totalUsers.toLocaleString(),
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      description: 'All system users'
    },
    {
      title: 'Active Classes',
      value: systemMetrics.activeClasses.toLocaleString(),
      change: '+5%',
      trend: 'up',
      icon: School,
      color: 'from-green-500 to-green-600',
      description: 'Currently running classes'
    },
    {
      title: 'Subjects',
      value: systemMetrics.totalSubjects.toLocaleString(),
      change: '+2',
      trend: 'up',
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      description: 'Available subjects'
    },
    {
      title: 'System Health',
      value: `${systemMetrics.systemHealth}%`,
      change: 'Stable',
      trend: 'stable',
      icon: Shield,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Overall system status'
    }
  ];

  const quickActions = [
    {
      title: 'Manage Admins',
      description: 'Add or modify administrator accounts',
      icon: Users,
      path: '/super-admin/admins',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      count: admins?.length || 0
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      path: '/super-admin/settings',
      color: 'bg-gradient-to-r from-gray-600 to-gray-700',
      count: null
    },
    {
      title: 'View Reports',
      description: 'Access comprehensive system reports',
      icon: BarChart3,
      path: '/super-admin/reports',
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      count: stats?.recentActivities?.length || 0
    },
    {
      title: 'System Monitor',
      description: 'Monitor system performance',
      icon: TrendingUp,
      path: '/super-admin/monitor',
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      count: null
    }
  ];

  const recentActivities = [
    { action: 'New admin created', time: '2 minutes ago', type: 'user', severity: 'info' },
    { action: 'System backup completed', time: '1 hour ago', type: 'system', severity: 'success' },
    { action: 'Database optimized', time: '3 hours ago', type: 'system', severity: 'success' },
    { action: 'New teacher registered', time: '5 hours ago', type: 'user', severity: 'info' },
    { action: 'High memory usage detected', time: '6 hours ago', type: 'alert', severity: 'warning' }
  ];

  const systemStatus = [
    {
      component: 'API Server',
      status: 'operational',
      responseTime: '142ms',
      uptime: '99.98%'
    },
    {
      component: 'Database',
      status: 'operational',
      responseTime: '89ms',
      uptime: '99.99%'
    },
    {
      component: 'File Storage',
      status: 'operational',
      responseTime: '234ms',
      uptime: '99.95%'
    },
    {
      component: 'Authentication',
      status: 'operational',
      responseTime: '67ms',
      uptime: '100%'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'outage':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <UserCheck className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  const handleQuickAction = (path) => {
    navigate(path);
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
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#92400E]">Super Admin Dashboard</h1>
            <p className="text-[#B45309] mt-2">
              Full system control and monitoring • 
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white px-4 py-2 rounded-lg border border-[#FDE68A] text-[#92400E] font-medium"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-[#FDE68A]">
              <Shield className="h-6 w-6 text-[#D97706]" />
              <span className="font-semibold text-[#92400E]">Super Administrator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  <div className={`flex items-center mt-2 ${
                    stat.trend === 'up' ? 'text-green-600' : 
                    stat.trend === 'down' ? 'text-red-600' : 'text-blue-600'
                  }`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <span className="text-sm text-gray-500">System Management</span>
          </div>
          <div className="space-y-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={index}
                  onClick={() => handleQuickAction(action.path)}
                  className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-[#FDE68A] hover:bg-[#FFFBEB] transition-all duration-200 cursor-pointer group"
                >
                  <div className={`p-3 rounded-lg ${action.color} text-white mr-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#92400E]">
                        {action.title}
                      </h3>
                      {action.count !== null && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {action.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
            <span className="text-sm text-gray-500">
              {recentActivities.length} activities
            </span>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                  {getSeverityIcon(activity.severity)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activity.type === 'user' ? 'bg-blue-100 text-blue-800' :
                  activity.type === 'system' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {activity.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">System Status</h2>
          <div className="flex items-center space-x-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">All Systems Operational</span>
          </div>
        </div>
        
        {/* System Components Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {systemStatus.map((component, index) => (
            <div key={index} className={`p-4 border rounded-lg ${getStatusColor(component.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Cpu className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{component.component}</p>
                    <p className="text-sm opacity-75">Response: {component.responseTime}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white">
                    {component.uptime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Performance</p>
                <p className="text-xs text-green-700">
                  {systemMetrics.systemHealth > 90 ? 'Optimal' : 
                   systemMetrics.systemHealth > 75 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Database</p>
                <p className="text-xs text-blue-700">
                  {stats ? `${stats.stats.totalUsers} users` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Attendance</p>
                <p className="text-xs text-purple-700">
                  {attendanceOverview?.summary?.overallAttendancePercentage || 0}% Today
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Distribution */}
      {stats && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-xl font-bold text-blue-600">{stats.stats.byRole.students}</div>
              <p className="text-sm text-blue-800">Students</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-xl font-bold text-green-600">{stats.stats.byRole.teachers}</div>
              <p className="text-sm text-green-800">Teachers</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-xl font-bold text-purple-600">{stats.stats.byRole.parents}</div>
              <p className="text-sm text-purple-800">Parents</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-xl font-bold text-orange-600">{stats.stats.byRole.admins + stats.stats.byRole.superAdmins}</div>
              <p className="text-sm text-orange-800">Administrators</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;