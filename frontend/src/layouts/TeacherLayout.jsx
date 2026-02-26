import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TeacherSidebar from '../components/sidebars/TeacherSidebar';
import { LogOut, User, Menu } from 'lucide-react';

// Layout-level providers (scoped to teacher routes only)
import { TeacherProvider } from '../contexts/TeacherContext';
import { AttendanceProvider } from '../contexts/AttendanceContext';
import { HifzProvider } from '../contexts/HifzContext';
import { HifzReportProvider } from '../contexts/HifzReportContext';
import { ClassProvider } from '../contexts/ClassContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { ActivityProvider } from '../contexts/ActivityContext';
import { RegularProgressProvider } from '../contexts/RegularProgressContext';
import { SocketProvider } from '../contexts/SocketContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Notification bell — must be inside SocketProvider + NotificationProvider
import NotificationDropdown from '../components/shared/NotificationDropdown';

/* ─── Inner layout (rendered inside providers so bell can use useNotifications) ─── */
const TeacherLayoutInner = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <TeacherSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-[#FDE68A] sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Left — mobile menu + title */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-[#FFFBEB] transition-colors flex-shrink-0"
                >
                  <Menu className="h-5 w-5 text-[#92400E]" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-black truncate">
                    Welcome, {user?.name?.split(' ')[0] || 'Teacher'}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#B45309]">Teacher Portal</p>
                </div>
              </div>

              {/* Right — bell + user + logout */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* 🔔 Notification Bell */}
                <NotificationDropdown />

                {/* User info */}
                <div className="hidden sm:flex items-center gap-2 text-gray-700">
                  <User className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm truncate max-w-[120px] lg:max-w-[160px]">
                    {user?.name}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 bg-[#FFFBEB] text-[#92400E] rounded-lg hover:bg-[#FEF3C7] transition-colors font-semibold text-sm"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <TeacherProvider>
            <ClassProvider>
              <AttendanceProvider>
                <HifzProvider>
                  <HifzReportProvider>
                    <ProgressProvider>
                      <RegularProgressProvider>
                        <ActivityProvider>
                          <Outlet />
                        </ActivityProvider>
                      </RegularProgressProvider>
                    </ProgressProvider>
                  </HifzReportProvider>
                </HifzProvider>
              </AttendanceProvider>
            </ClassProvider>
          </TeacherProvider>
        </main>

        {/* Mobile floating menu button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-4 left-4 z-40 p-3 bg-[#F59E0B] text-white rounded-full shadow-lg hover:bg-[#D97706] transition-colors duration-200"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Outer shell wraps with Socket + Notification providers ─── */
const TeacherLayout = () => (
  <SocketProvider>
    <NotificationProvider>
      <TeacherLayoutInner />
    </NotificationProvider>
  </SocketProvider>
);

export default TeacherLayout;