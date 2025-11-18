import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SuperAdminSidebar from "../components/sidebars/SuperAdminSidebar";
import AdminSidebar from "../components/sidebars/AdminSidebar";
import { LogOut, User, Menu } from "lucide-react";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {isSuperAdmin ? (
        <SuperAdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      ) : (
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-[#FDE68A] sticky top-0 z-30">
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] transition-colors duration-200"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-black truncate max-w-[160px] sm:max-w-none">
                  Welcome, {user?.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#B45309]">
                  {isSuperAdmin ? "Super Administrator" : "Administrator"}
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-2 text-gray-700 truncate">
                <User className="h-5 w-5" />
                <span className="max-w-[100px] truncate">{user?.name}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#FFFBEB] text-[#92400E] rounded-md hover:bg-[#FEF3C7] transition-colors duration-200 font-semibold text-sm sm:text-base"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
