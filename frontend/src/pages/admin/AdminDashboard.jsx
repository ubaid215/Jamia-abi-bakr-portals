import React from 'react';
import { 
  Users, 
  School, 
  BookOpen, 
  Calendar,
  BarChart3,
  UserCheck,
  Clock,
  TrendingUp
} from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    {
      title: 'Total Students',
      value: '856',
      change: '+8%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Teachers',
      value: '42',
      change: '+3',
      trend: 'up',
      icon: UserCheck,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Classes',
      value: '28',
      change: '+2',
      trend: 'up',
      icon: School,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Attendance Today',
      value: '94%',
      change: '+2%',
      trend: 'up',
      icon: Calendar,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const recentTasks = [
    {
      title: 'Review pending teacher applications',
      priority: 'High',
      due: 'Today',
      type: 'approval'
    },
    {
      title: 'Generate monthly attendance report',
      priority: 'Medium',
      due: 'Tomorrow',
      type: 'report'
    },
    {
      title: 'Update class schedules',
      priority: 'Medium',
      due: 'This week',
      type: 'schedule'
    },
    {
      title: 'Process student transfers',
      priority: 'Low',
      due: 'Next week',
      type: 'transfer'
    }
  ];

  const quickStats = [
    { label: 'Pending Approvals', value: '12', color: 'bg-red-100 text-red-800' },
    { label: 'New Registrations', value: '8', color: 'bg-blue-100 text-blue-800' },
    { label: 'Leave Requests', value: '5', color: 'bg-yellow-100 text-yellow-800' },
    { label: 'System Notifications', value: '3', color: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#92400E]">Admin Dashboard</h1>
            <p className="text-[#B45309] mt-2">Manage your institution efficiently</p>
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-[#FDE68A]">
            <UserCheck className="h-6 w-6 text-[#D97706]" />
            <span className="font-semibold text-[#92400E]">Administrator</span>
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
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Overview</h2>
          <div className="space-y-3">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Tasks</h2>
          <div className="space-y-4">
            {recentTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    task.type === 'approval' ? 'bg-blue-100 text-blue-600' :
                    task.type === 'report' ? 'bg-green-100 text-green-600' :
                    task.type === 'schedule' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {task.type === 'approval' && <UserCheck className="h-5 w-5" />}
                    {task.type === 'report' && <BarChart3 className="h-5 w-5" />}
                    {task.type === 'schedule' && <Clock className="h-5 w-5" />}
                    {task.type === 'transfer' && <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600">Due: {task.due}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  task.priority === 'High' ? 'bg-red-100 text-red-800' :
                  task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-xl">
            <div className="text-2xl font-bold text-[#D97706]">92%</div>
            <p className="text-sm text-gray-600 mt-1">Student Attendance</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl">
            <div className="text-2xl font-bold text-[#D97706]">88%</div>
            <p className="text-sm text-gray-600 mt-1">Teacher Attendance</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl">
            <div className="text-2xl font-bold text-[#D97706]">76%</div>
            <p className="text-sm text-gray-600 mt-1">Assignment Completion</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-xl">
            <div className="text-2xl font-bold text-[#D97706]">94%</div>
            <p className="text-sm text-gray-600 mt-1">Parent Engagement</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;