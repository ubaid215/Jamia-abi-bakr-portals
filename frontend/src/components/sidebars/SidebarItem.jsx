import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const SidebarItem = ({ 
  // eslint-disable-next-line no-unused-vars
  icon: Icon, 
  label, 
  to, 
  isActive = false,
  onClick 
}) => {
  const location = useLocation();
  const active = isActive || location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center justify-between p-4 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-semibold' 
          : 'text-gray-700 hover:bg-[#FFFBEB] hover:text-[#92400E]'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${active ? 'text-[#D97706]' : 'text-gray-500'}`} />
        <span className="font-medium">{label}</span>
      </div>
      {active && <ChevronRight className="h-4 w-4 text-[#D97706]" />}
    </Link>
  );
};

export default SidebarItem;