import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  School, 
  BookOpen, 
  Calendar,
  BarChart3,
  FileText,
  Settings,
  Shield,
  LockIcon,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Database
} from 'lucide-react';
import SidebarBase from './SidebarBase';
import SidebarItem from './SidebarItem';

const SuperAdminSidebar = ({ isOpen, onClose, onToggle }) => {
  const [openSubmenus, setOpenSubmenus] = useState({
    adminManagement: false,
    userManagement: false,
    academicManagement: false,
    monitoring: false,
    system: false
  });

  const toggleSubmenu = (submenu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [submenu]: !prev[submenu]
    }));
  };

  const menuStructure = [
    {
      type: 'item',
      icon: LayoutDashboard,
      label: 'Dashboard',
      to: '/admin/dashboard'
    },
    {
      type: 'submenu',
      key: 'adminManagement',
      icon: ShieldCheck,
      label: 'Admin Management',
      items: [
        { icon: UserCog, label: 'Manage Administrators', to: '/admin/admins' },
        // { icon: Users, label: 'All Users', to: '/admin/users' },
        // { icon: Shield, label: 'Roles & Permissions', to: '/admin/permissions' },
      ]
    },
    {
      type: 'submenu',
      key: 'userManagement',
      icon: Users,
      label: 'User Management',
      items: [
        { icon: UserCheck, label: 'Teacher Enrollment', to: '/admin/teacher-enroll' },
        { icon: GraduationCap, label: 'Student Enrollment', to: '/admin/student-enroll' },
        { icon: UserCog, label: 'Manage Teachers', to: '/admin/teachers' },
        { icon: Users, label: 'Manage Students', to: '/admin/students' },
      ]
    },
    {
      type: 'submenu',
      key: 'academicManagement',
      icon: School,
      label: 'Academic Management',
      items: [
        { icon: School, label: 'Class Management', to: '/admin/classes' },
        { icon: BookOpen, label: 'Subject Management', to: '/admin/subjects' },
      ]
    },
    {
      type: 'submenu',
      key: 'monitoring',
      icon: BarChart3,
      label: 'Monitoring & Reports',
      items: [
        { icon: Calendar, label: 'Attendance Overview', to: '/admin/attendance' },
        { icon: BarChart3, label: 'Progress Tracking', to: '/admin/progress' },
        { icon: FileText, label: 'Academic Reports', to: '/admin/reports' },
        { icon: BarChart3, label: 'Performance Analytics', to: '/admin/analytics' },
        // { icon: Database, label: 'System Analytics', to: '/admin/system-analytics' }
      ]
    },
    {
      type: 'submenu',
      key: 'system',
      icon: Settings,
      label: 'System Settings',
      items: [
        { icon: LockIcon, label: 'Password Reset', to: '/admin/reset-password' },
        // { icon: Settings, label: 'System Configuration', to: '/admin/configuration' },
        // { icon: Database, label: 'Backup & Restore', to: '/admin/backup' },
        // { icon: Shield, label: 'Security Settings', to: '/admin/security' },
      ]
    }
  ];

  return (
    <SidebarBase 
      isOpen={isOpen} 
      onClose={onClose} 
      onToggle={onToggle}
      title="Super Admin"
    >
      {/* Super Admin Info */}
      <div className="mb-6 p-3 bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-[#D97706]" />
          <span className="text-sm font-semibold text-[#92400E]">Super Administrator</span>
        </div>
        <p className="text-xs text-[#B45309] mt-1">Full system access with admin privileges</p>
      </div>

      {/* Navigation Items */}
      <div className="space-y-1">
        {menuStructure.map((item, index) => {
          if (item.type === 'item') {
            return (
              <SidebarItem
                key={index}
                icon={item.icon}
                label={item.label}
                to={item.to}
                onClick={onClose}
              />
            );
          }

          if (item.type === 'submenu') {
            const isOpen = openSubmenus[item.key];
            const Icon = item.icon;

            return (
              <div key={item.key} className="space-y-1">
                {/* Submenu Header */}
                <button
                  onClick={() => toggleSubmenu(item.key)}
                  className="flex items-center justify-between w-full p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Submenu Items */}
                {isOpen && (
                  <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                    {item.items.map((subItem, subIndex) => (
                      <SidebarItem
                        key={subIndex}
                        icon={subItem.icon}
                        label={subItem.label}
                        to={subItem.to}
                        onClick={onClose}
                        isSubitem={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Quick Actions for Super Admin */}
      <div className="mt-8 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h4 className="text-xs font-semibold text-blue-700 mb-2">Super Admin Actions</h4>
        <div className="space-y-2">
          <button 
            onClick={() => {
              window.location.href = '/admin/admins';
              onClose();
            }}
            className="w-full text-left text-xs text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded flex items-center"
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Add New Admin
          </button>
          <button 
            onClick={() => {
              window.location.href = '/admin/configuration';
              onClose();
            }}
            className="w-full text-left text-xs text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded flex items-center"
          >
            <Settings className="h-3 w-3 mr-1" />
            System Settings
          </button>
          <button 
            onClick={() => {
              window.location.href = '/admin/backup';
              onClose();
            }}
            className="w-full text-left text-xs text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded flex items-center"
          >
            <Database className="h-3 w-3 mr-1" />
            Backup System
          </button>
        </div>
      </div>

      {/* System Status */}
      {/* <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">System Status</h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Active Admins</span>
            <span className="font-medium text-green-600">Online</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Database</span>
            <span className="font-medium text-green-600">Healthy</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">System Load</span>
            <span className="font-medium text-yellow-600">Normal</span>
          </div>
        </div>
      </div> */}
    </SidebarBase>
  );
};

export default SuperAdminSidebar;