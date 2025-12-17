import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ pageTitle, onMenuToggle }) => {
  // eslint-disable-next-line no-unused-vars
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
  <div className="flex items-center justify-between">
    {/* Left Section */}
    <div className="flex items-center space-x-3 sm:space-x-4">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
      </button>
      <h1 className="text-xl sm:text-2xl font-bold text-black truncate max-w-[200px] sm:max-w-none">
        {pageTitle}
      </h1>
    </div>

    {/* Right Section */}
    <div className="flex items-center space-x-2 sm:space-x-4">
      {/* Search Bar - Desktop */}
      <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 sm:py-2">
        <Search className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none focus:outline-none text-sm w-40 lg:w-64"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></span>
      </button>

      {/* User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Avatar 
          src={user?.profileImage} 
          fallback={user?.name?.charAt(0) || 'SA'}
          size="sm"
          className="w-8 h-8 sm:w-10 sm:h-10"
        />
        <div className="hidden sm:block text-right min-w-0">
          <p className="text-sm font-medium text-black truncate max-w-[120px] lg:max-w-[200px]">
            {user?.name || 'Super Admin'}
          </p>
          <p className="text-xs text-gray-500 capitalize truncate max-w-[120px] lg:max-w-[200px]">
            {user?.role?.toLowerCase().replace('_', ' ') || 'super admin'}
          </p>
        </div>
        {/* Mobile user initials */}
        <div className="sm:hidden text-right">
          <p className="text-xs font-medium text-gray-700">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'SA'}
          </p>
        </div>
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