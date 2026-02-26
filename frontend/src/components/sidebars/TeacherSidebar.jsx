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
  ChartAreaIcon,
  Activity,
  ClipboardList,
  Target,
  LineChart,
  PlusCircle,
} from 'lucide-react';
import SidebarBase from './SidebarBase';
import SidebarItem from './SidebarItem';

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/teacher/dashboard' },
  { icon: School, label: 'Mark Attendance', to: '/teacher/classes' },
  { icon: Users, label: 'My Students', to: '/teacher/students' },
  { icon: Calendar, label: 'Attendance Analysis', to: '/teacher/attendance' },
  { icon: ChartAreaIcon, label: 'Hifz/Nazra Report', to: '/teacher/hifz-progress' },
  // ── Progress Module ────────────────────────────────────────────────
  { icon: Activity, label: 'Record Activity', to: '/teacher/progress/record-activity', dividerBefore: true },
  { icon: ClipboardList, label: 'Activities List', to: '/teacher/progress/activities' },
  { icon: School, label: 'Class Overview', to: '/teacher/progress/class-overview' },
  { icon: BarChart3, label: 'Weekly Progress', to: '/teacher/progress/weekly' },
  { icon: Target, label: 'Student Goals', to: '/teacher/progress/goals' },
  { icon: PlusCircle, label: 'Create Goal', to: '/teacher/progress/goals/create' },
  { icon: LineChart, label: 'Progress Dashboard', to: '/teacher/progress/dashboard' },
  { icon: MessageSquare, label: 'Parent Comms', to: '/teacher/progress/parent-comms', dividerBefore: true },
];

const TeacherSidebar = ({ isOpen, onClose, onToggle }) => (
  <SidebarBase
    isOpen={isOpen}
    onClose={onClose}
    onToggle={onToggle}
    title="Teacher Portal"
  >
    <div className="space-y-1">
      {MENU_ITEMS.map((item, index) => (
        <React.Fragment key={index}>
          {item.dividerBefore && (
            <div className="my-2 border-t border-gray-200" />
          )}
          <SidebarItem
            icon={item.icon}
            label={item.label}
            to={item.to}
            onClick={onClose}
          />
        </React.Fragment>
      ))}
    </div>
  </SidebarBase>
);

export default TeacherSidebar;