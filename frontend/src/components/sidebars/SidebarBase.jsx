import React from 'react';
import { X, Menu } from 'lucide-react';

const SidebarBase = ({ 
  isOpen, 
  onClose, 
  onToggle, 
  children, 
  title = "Madrassa System" 
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-2xl bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-white border-r border-gold-200
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-linear-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">{title}</h1>
              <p className="text-xs text-[#B45309]">Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-[#FFFBEB] transition-colors duration-200"
          >
            <X className="h-5 w-5 text-[#92400E]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {children}
        </nav>

        {/* Mobile Toggle Button */}
        <div className="lg:hidden p-4 border-t border-gold-100">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-3 bg-[#FFFBEB] text-[#92400E] rounded-lg font-semibold hover:bg-[#FEF3C7] transition-colors duration-200"
          >
            <Menu className="h-5 w-5 mr-2" />
            Toggle Menu
          </button>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-4 left-4 lg:hidden z-40 p-3 bg-[#F59E0B] text-white rounded-full shadow-lg hover:bg-[#D97706] transition-colors duration-200"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default SidebarBase;