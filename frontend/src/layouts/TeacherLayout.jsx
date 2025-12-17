import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TeacherSidebar from '../components/sidebars/TeacherSidebar';
import { LogOut, User, Menu } from 'lucide-react';

const TeacherLayout = () => {
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
        <header className="bg-white shadow-sm border-b border-[#FDE68A]">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left section with title and mobile menu button */}
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-[#FFFBEB] transition-colors"
                >
                  <Menu className="h-5 w-5 text-[#92400E]" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-black truncate">
                    Welcome, {user?.name?.split(' ')[0] || 'Teacher'}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#B45309]">
                    Teacher Portal
                  </p>
                </div>
              </div>

              {/* Right section with user info and logout */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between xs:justify-end gap-3">
                {/* User info - hidden on mobile */}
                <div className="hidden sm:flex items-center space-x-2 text-gray-700">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base truncate max-w-[150px] lg:max-w-none">
                    {user?.name}
                  </span>
                </div>
                
                {/* Mobile user info */}
                <div className="sm:hidden flex items-center space-x-2 text-gray-700">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-sm truncate max-w-[120px]">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                </div>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 bg-[#FFFBEB] text-[#92400E] rounded-lg hover:bg-[#FEF3C7] transition-colors duration-200 font-semibold text-sm sm:text-base w-full xs:w-auto"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>

        {/* Mobile floating menu button - shown when sidebar is closed */}
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

export default TeacherLayout;