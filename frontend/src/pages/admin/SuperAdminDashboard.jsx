import React from 'react';
import { 
  Users, 
  School, 
  BookOpen, 
  BarChart3, 
  Shield,
  Settings,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const stats = [
    {
      title: 'Total Users',
      value: '1,247',
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Classes',
      value: '42',
      change: '+5%',
      trend: 'up',
      icon: School,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Subjects',
      value: '28',
      change: '+2',
      trend: 'up',
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'System Health',
      value: '98%',
      change: 'Stable',
      trend: 'stable',
      icon: Shield,
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  const quickActions = [
    {
      title: 'Manage Admins',
      description: 'Add or modify administrator accounts',
      icon: Users,
      path: '/admin/admins',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600'
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-gradient-to-r from-gray-600 to-gray-700'
    },
    {
      title: 'View Reports',
      description: 'Access comprehensive system reports',
      icon: BarChart3,
      path: '/admin/reports',
      color: 'bg-gradient-to-r from-green-500 to-green-600'
    },
    {
      title: 'System Monitor',
      description: 'Monitor system performance',
      icon: TrendingUp,
      path: '/admin/monitor',
      color: 'bg-gradient-to-r from-purple-500 to-purple-600'
    }
  ];

  const recentActivities = [
    { action: 'New admin created', time: '2 minutes ago', type: 'user' },
    { action: 'System backup completed', time: '1 hour ago', type: 'system' },
    { action: 'Database optimized', time: '3 hours ago', type: 'system' },
    { action: 'New teacher registered', time: '5 hours ago', type: 'user' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#92400E]">Super Admin Dashboard</h1>
            <p className="text-[#B45309] mt-2">Full system control and monitoring</p>
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-[#FDE68A]">
            <Shield className="h-6 w-6 text-[#D97706]" />
            <span className="font-semibold text-[#92400E]">Super Administrator</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={index}
                  className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-[#FDE68A] hover:bg-[#FFFBEB] transition-all duration-200 cursor-pointer group"
                >
                  <div className={`p-3 rounded-lg ${action.color} text-white mr-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#92400E]">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center p-3 border border-gray-100 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.type === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {activity.type === 'user' ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">System Status</h2>
          <div className="flex items-center space-x-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Performance</p>
                <p className="text-xs text-green-700">Optimal</p>
              </div>
            </div>
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Security</p>
                <p className="text-xs text-blue-700">Protected</p>
              </div>
            </div>
          </div>
          <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Database</p>
                <p className="text-xs text-purple-700">Healthy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;