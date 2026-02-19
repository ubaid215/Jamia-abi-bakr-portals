/* eslint-disable no-unused-vars */
import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const SidebarCollapsibleItem = ({ 
  icon: Icon, 
  label, 
  isExpanded, 
  onToggle, 
  subItems = [], 
  onClick 
}) => {
  return (
    <div className="mb-2">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <div className="flex items-center">
          <Icon className="w-5 h-5 mr-3" />
          <span className="font-medium">{label}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Sub Items */}
      {isExpanded && subItems.length > 0 && (
        <div className="ml-8 mt-1 space-y-1">
          {subItems.map((subItem, index) => (
            <Link
              key={index}
              to={subItem.to}
              onClick={onClick}
              className="flex items-center p-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <subItem.icon className="w-4 h-4 mr-3" />
              <span>{subItem.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarCollapsibleItem;