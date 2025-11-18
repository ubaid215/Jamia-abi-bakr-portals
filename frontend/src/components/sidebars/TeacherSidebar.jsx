import React from 'react';
import { 
  LayoutDashboard, 
  School, 
  Users, 
  Calendar,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  Clock,
  ChartAreaIcon
} from 'lucide-react';
import SidebarBase from './SidebarBase';
import SidebarItem from './SidebarItem';

const TeacherSidebar = ({ isOpen, onClose, onToggle }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/teacher/dashboard' },
    { icon: School, label: 'My Classes', to: '/teacher/classes' },
    { icon: Users, label: 'My Students', to: '/teacher/students' },
    { icon: Calendar, label: 'Attendance', to: '/teacher/attendance' },
    { icon: ChartAreaIcon, label: 'Hifz/Nazra Report', to: '/teacher/hifz-progress' },
    // { icon: MessageSquare, label: 'Communications', to: '/teacher/communications' },
    { icon: Clock, label: 'Leave Management', to: '/teacher/leave' },
  ];

  return (
    <SidebarBase 
      isOpen={isOpen} 
      onClose={onClose} 
      onToggle={onToggle}
      title="Teacher Portal"
    >
      {/* Teacher Info */}
      <div className="mb-6 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-[#D97706]" />
          <span className="text-sm font-semibold text-[#92400E]">Teacher Account</span>
        </div>
        <p className="text-xs text-[#B45309] mt-1">Teaching access</p>
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

export default TeacherSidebar;