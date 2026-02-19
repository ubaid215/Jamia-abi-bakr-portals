import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StudentSidebar from '../components/sidebars/StudentSidebar';
import { LogOut, User, Menu, Home } from 'lucide-react';

// Layout-level providers (scoped to student routes only)
import { StudentProvider } from '../contexts/StudentContext';
import { AttendanceProvider } from '../contexts/AttendanceContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { HifzProvider } from '../contexts/HifzContext';
import { ClassProvider } from '../contexts/ClassContext';

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm border-b border-[#FDE68A]">
          <div className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4">
            <div className="flex items-center justify-between gap-2">
              {/* Left side - Menu button and title */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white transition-colors flex-shrink-0 lg:hidden"
                >
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                </button>

                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-amber-900 truncate">
                    {user?.name?.split(' ')[0] || 'Student'}
                  </h1>
                  <p className="text-xs text-amber-700 truncate">
                    Student • {user?.admissionNo || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* Quick home button for mobile */}
                <button
                  onClick={() => navigate('/student/dashboard')}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white transition-colors lg:hidden"
                >
                  <Home className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                </button>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-medium text-xs sm:text-sm whitespace-nowrap"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                  <span className="inline sm:hidden">Exit</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <StudentProvider>
            <AttendanceProvider>
              <ProgressProvider>
                <HifzProvider>
                  <ClassProvider>
                    <Outlet />
                  </ClassProvider>
                </HifzProvider>
              </ProgressProvider>
            </AttendanceProvider>
          </StudentProvider>
        </main>

        {/* Mobile menu button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-4 left-4 z-40 p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-full shadow-lg hover:from-amber-600 hover:to-amber-800 transition-all duration-200 shadow-amber-300/50"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

      </div>
    </div>
  );
};

export default StudentLayout;