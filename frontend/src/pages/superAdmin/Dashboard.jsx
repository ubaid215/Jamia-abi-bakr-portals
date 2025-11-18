import React from 'react';
import { 
  Users, 
  School, 
  UserCheck, 
  BookOpen,
  TrendingUp,
  Activity
} from 'lucide-react';

// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, icon: Icon, change, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm flex items-center mt-2 ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const RecentActivity = () => {
  const activities = [
    { id: 1, user: 'John Doe', action: 'registered as Teacher', time: '2 min ago' },
    { id: 2, user: 'Sarah Smith', action: 'updated profile', time: '5 min ago' },
    { id: 3, user: 'Mike Johnson', action: 'created new class', time: '10 min ago' },
    { id: 4, user: 'Emily Davis', action: 'uploaded document', time: '15 min ago' },
    { id: 5, user: 'David Wilson', action: 'reset password', time: '20 min ago' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user}</span> {activity.action}
              </p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions = () => {
  const actions = [
    { title: 'Register Teacher', icon: UserCheck, path: '/super-admin/register/teacher' },
    { title: 'Add Student', icon: School, path: '/super-admin/register/student' },
    { title: 'Create Class', icon: BookOpen, path: '/super-admin/classes' },
    { title: 'View Reports', icon: Activity, path: '/super-admin/reports' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all duration-200 group"
            >
              <Icon className="w-8 h-8 text-gray-600 group-hover:text-amber-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700 text-center">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Students',
      value: '1,248',
      icon: School,
      change: 12,
      color: 'blue'
    },
    {
      title: 'Total Teachers',
      value: '48',
      icon: Users,
      change: 5,
      color: 'amber'
    },
    {
      title: 'Active Classes',
      value: '24',
      icon: BookOpen,
      change: 3,
      color: 'green'
    },
    {
      title: 'Online Users',
      value: '36',
      icon: UserCheck,
      change: 8,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-linear-to-r from-amber-500 to-yellow-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Super Admin! 👋</h1>
        <p className="text-amber-100">
          Here's what's happening with your institution today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <RecentActivity />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Server</p>
            <p className="font-semibold text-gray-900">Online</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Database</p>
            <p className="font-semibold text-gray-900">Active</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Users</p>
            <p className="font-semibold text-gray-900">1,332</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-3 h-3 bg-amber-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Storage</p>
            <p className="font-semibold text-gray-900">68%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;