import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from './NotificationBell';

const Header = ({ pageTitle, onMenuToggle }) => {
  // eslint-disable-next-line no-unused-vars
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        {/* Left Section (Menu & Title) */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
          <h1 className="text-lg sm:text-2xl font-bold text-black truncate">
            {pageTitle}
          </h1>
        </div>

        {/* Right Section (Search, Notifications, Profile) */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

          {/* Search Bar - Desktop hidden on mobile */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 sm:py-2">
            <Search className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none focus:outline-none text-sm w-40 lg:w-64"
            />
          </div>

          <NotificationBell />

          {/* User Profile Area */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-sm font-medium text-black truncate max-w-[120px] lg:max-w-[160px]">
                {user?.name || 'Super Admin'}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate max-w-[120px] lg:max-w-[160px]">
                {user?.role?.toLowerCase().replace('_', ' ') || 'super admin'}
              </p>
            </div>
            {/* Mobile user initials (optional if avatar is small enough) */}
            <div className="sm:hidden text-right hidden">
              <p className="text-xs font-medium text-gray-700">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'SA'}
              </p>
            </div>

            <Avatar
              src={user?.profileImage}
              fallback={user?.name?.charAt(0) || 'SA'}
              size="sm"
              className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden mt-3">
        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none focus:outline-none text-sm w-full"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;