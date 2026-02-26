import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  Award,
  Clock,
  FileText,
  User,
  History,
  Target
} from 'lucide-react';
import SidebarBase from './SidebarBase';
import SidebarItem from './SidebarItem';

const StudentSidebar = ({ isOpen, onClose, onToggle }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/student/dashboard' },
    { icon: Calendar, label: 'My Attendance', to: '/student/attendance' },
    { icon: History, label: 'Class History', to: '/student/class-history' },
    { icon: BarChart3, label: 'My Progress', to: '/student/progress' },
    { icon: Target, label: 'My Goals', to: '/student/goals' },
    { icon: FileText, label: 'Monthly Report', to: '/student/monthly-report' },
    { icon: User, label: 'My Profile', to: '/student/profile' },
  ];

  return (
    <SidebarBase
      isOpen={isOpen}
      onClose={onClose}
      onToggle={onToggle}
      title="Student Portal"
    >
      {/* Student Info */}
      <div className="mb-6 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
        <div className="flex items-center space-x-2">
          <Award className="h-4 w-4 text-[#D97706]" />
          <span className="text-sm font-semibold text-[#92400E]">Student Account</span>
        </div>
        <p className="text-xs text-[#B45309] mt-1">Learning access</p>
      </div>

      {/* Navigation Items */}
      <div className="space-y-1">
        {menuItems.map((item, index) => (
          <SidebarItem
            key={index}
            icon={item.icon}
            label={item.label}
            to={item.to}
            onClick={onClose}
          />
        ))}
      </div>
    </SidebarBase>
  );
};

export default StudentSidebar;