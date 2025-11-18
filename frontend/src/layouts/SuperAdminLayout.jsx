import React, { useState } from 'react';
import SuperAdminSidebar from '../components/common/SuperAdminSidebar';
import Header from '../components/common/Header';
import { useLocation } from 'react-router-dom';

const SuperAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    const routes = {
      '/super-admin': 'Dashboard',
      '/super-admin/users': 'User Management',
      '/super-admin/register': 'Register Users',
      '/super-admin/register/teacher': 'Register Teacher',
      '/super-admin/register/student': 'Register Student',
      '/super-admin/register/parent': 'Register Parent',
      '/super-admin/classes': 'Classes & Courses',
      '/super-admin/students': 'Student Management',
      '/super-admin/teachers': 'Teacher Management',
      '/super-admin/reports': 'Reports & Analytics',
      '/super-admin/documents': 'Documents',
      '/super-admin/settings': 'Settings',
    };
    
    return routes[pathname] || 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:block">
        <SuperAdminSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50">
            <SuperAdminSidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          pageTitle={getPageTitle(location.pathname)} 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;