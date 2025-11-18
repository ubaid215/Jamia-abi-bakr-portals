import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ pageTitle, onMenuToggle }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-black">{pageTitle}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none focus:outline-none text-sm w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <Avatar 
              src={user?.profileImage} 
              fallback={user?.name || 'Super Admin'}
              size="md"
            />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-black">{user?.name || 'Super Admin'}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.toLowerCase().replace('_', ' ') || 'super admin'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden mt-4">
        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
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