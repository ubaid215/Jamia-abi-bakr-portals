import React from 'react';
import { X, Menu } from 'lucide-react';

const SidebarBase = ({ 
  isOpen, 
  onClose, 
  onToggle, 
  children, 
  title = "Jamia Abi Bakar",
  subtitle = "Islamia Institute"
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
            {/* Logo Container - Original gold gradient */}
            <div className="w-10 h-10 bg-linear-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center shadow-md">
              {/* Option 3: Or use your actual logo image */}
              <img 
                src="/images/Astana-logo.png" 
                alt="Jamia Abi Bakar Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            
            {/* Institute Name */}
            <div>
              <h1 className="text-xl font-bold text-black leading-tight">{title}</h1>
              <p className="text-xs text-[#B45309] font-medium">{subtitle}</p>
              {/* Optional: Add location or tagline */}
              <p className="text-xs text-amber-700 mt-0.5">Islamic Education Center</p>
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

        {/* Footer */}
        <div className="p-4 border-t border-gold-100">
          <div className="text-center">
            <p className="text-sm text-[#92400E] font-medium">{title}</p>
            <p className="text-xs text-amber-700 mt-1">Management System v1.0</p>
          </div>
        </div>
      </div>

      {/* Mobile Menu Toggle - ONLY show when sidebar is closed */}
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