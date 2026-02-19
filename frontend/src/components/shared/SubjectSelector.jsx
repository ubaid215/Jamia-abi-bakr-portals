// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, Check, Filter, Hash, Building } from 'lucide-react';

const SubjectSelector = ({
  value,
  onChange,
  label = "Select Subject",
  required = false,
  disabled = false,
  className = "",
  subjects = [],
  filterByClassroom = null,
  showCode = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter subjects by classroom if specified
  const filteredSubjects = subjects.filter(subject => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      subject.name?.toLowerCase().includes(searchLower) ||
      subject.code?.toLowerCase().includes(searchLower)
    );
  });

  // Apply classroom filter
  const subjectsToShow = filterByClassroom
    ? filteredSubjects.filter(s => s.classRoomId === filterByClassroom)
    : filteredSubjects;

  const getDisplayValue = () => {
    if (!value) return '';
    return `${value.name}${value.code ? ` (${value.code})` : ''}`;
  };

  const getSubjectCount = () => {
    if (filterByClassroom) {
      return subjectsToShow.length;
    }
    return filteredSubjects.length;
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 text-left bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-yellow-500 border-yellow-500' : 'border-gray-300'}
          flex items-center justify-between
        `}
      >
        <div className="flex items-center space-x-3">
          <BookOpen className="w-4 h-4 text-yellow-600" />
          <span className={`${!value ? 'text-gray-500' : 'text-gray-900'}`}>
            {getDisplayValue() || 'Select a subject...'}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                autoFocus
              />
            </div>
            
            {filterByClassroom && (
              <div className="mt-2 px-1 text-xs text-gray-500 flex items-center">
                <Building className="w-3 h-3 mr-1" />
                Classroom filtered
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {subjectsToShow.length === 0 ? (
              <div className="px-4 py-3 text-center text-gray-500">
                {searchTerm ? 'No subjects found' : 'No subjects available'}
              </div>
            ) : (
              <ul className="py-1">
                {subjectsToShow.map((subject) => {
                  const selected = value?.id === subject.id;
                  return (
                    <li key={subject.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(subject);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`
                          w-full px-4 py-3 text-left flex items-center justify-between
                          hover:bg-yellow-50 transition-colors
                          ${selected ? 'bg-yellow-50' : ''}
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${selected ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-100 text-gray-700'}
                          `}>
                            {selected ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <BookOpen className="w-4 h-4" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {subject.name}
                            </div>
                            {showCode && subject.code && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <Hash className="w-3 h-3 mr-1" />
                                {subject.code}
                              </div>
                            )}
                            {subject.classRoom && (
                              <div className="text-xs text-gray-500">
                                {subject.classRoom.grade}-{subject.classRoom.section}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {subject.teacher && (
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">
                            {subject.teacher.user?.name}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            {getSubjectCount()} subject{getSubjectCount() !== 1 ? 's' : ''} available
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectSelector;