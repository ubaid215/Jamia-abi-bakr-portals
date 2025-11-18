import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  School, 
  BookOpen, 
  Calendar,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';
import SidebarBase from './SidebarBase';
import SidebarItem from './SidebarItem';

const SuperAdminSidebar = ({ isOpen, onClose, onToggle }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
    { icon: Users, label: 'User Management', to: '/admin/users' },
    { icon: UserCog, label: 'Admin Management', to: '/admin/admins' },
    { icon: School, label: 'Class Management', to: '/admin/classes' },
    { icon: BookOpen, label: 'Subject Management', to: '/admin/subjects' },
    { icon: Users, label: 'Teacher Management', to: '/admin/teachers' },
    { icon: Users, label: 'Student Management', to: '/admin/students' },
    { icon: Calendar, label: 'Attendance Overview', to: '/admin/attendance' },
    { icon: BarChart3, label: 'Progress Tracking', to: '/admin/progress' },
    { icon: BarChart3, label: 'System Reports', to: '/admin/reports' },
    { icon: Settings, label: 'System Settings', to: '/admin/settings' },
  ];

  return (
    <SidebarBase 
      isOpen={isOpen} 
      onClose={onClose} 
      onToggle={onToggle}
      title="Super Admin"
    >
      {/* Super Admin Badge */}
      <div className="mb-6 p-3 bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-[#D97706]" />
          <span className="text-sm font-semibold text-[#92400E]">Super Administrator</span>
        </div>
        <p className="text-xs text-[#B45309] mt-1">Full system access</p>
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

export default SuperAdminSidebar;