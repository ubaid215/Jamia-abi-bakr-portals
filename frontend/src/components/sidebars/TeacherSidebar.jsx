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
    { icon: School, label: 'Mark Attendance', to: '/teacher/classes' },
    { icon: Users, label: 'My Students', to: '/teacher/students' },
    { icon: Calendar, label: 'Attendance Analysis', to: '/teacher/attendance' },
    { icon: ChartAreaIcon, label: 'Hifz/Nazra Report', to: '/teacher/hifz-progress' },
  ];

  return (
    <SidebarBase 
      isOpen={isOpen} 
      onClose={onClose} 
      onToggle={onToggle}
      title="Teacher Portal"
    >
     

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