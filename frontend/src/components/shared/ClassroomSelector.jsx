/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Building, ChevronDown, Check, Filter, Users, BookOpen } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';

const ClassroomSelector = ({
  value,
  onChange,
  label = "Select Classroom",
  required = false,
  disabled = false,
  className = "",
  filterByTeacher = null,
  showDetails = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { teacherClasses, loading, selectedClassroom } = useActivity();

  const filteredClasses = teacherClasses.filter(classroom => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      classroom.name?.toLowerCase().includes(searchLower) ||
      classroom.grade?.toLowerCase().includes(searchLower) ||
      classroom.section?.toLowerCase().includes(searchLower)
    );
  });

  // Filter by teacher if specified
  const classesToShow = filterByTeacher 
    ? filteredClasses.filter(c => c.teacherId === filterByTeacher)
    : filteredClasses;

  const getDisplayValue = () => {
    if (!value) return '';
    return `${value.name} (Grade ${value.grade} - Section ${value.section})`;
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
          <Building className="w-4 h-4 text-yellow-600" />
          <span className={`${!value ? 'text-gray-500' : 'text-gray-900'}`}>
            {getDisplayValue() || 'Select a classroom...'}
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
                placeholder="Search classrooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="mt-2">Loading classrooms...</p>
              </div>
            ) : classesToShow.length === 0 ? (
              <div className="px-4 py-3 text-center text-gray-500">
                {searchTerm ? 'No classrooms found' : 'No classrooms available'}
              </div>
            ) : (
              <ul className="py-1">
                {classesToShow.map((classroom) => {
                  const selected = value?.id === classroom.id;
                  return (
                    <li key={classroom.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(classroom);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`
                          w-full px-4 py-3 text-left flex items-start justify-between
                          hover:bg-yellow-50 transition-colors
                          ${selected ? 'bg-yellow-50' : ''}
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center mt-0.5
                            ${selected ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-100 text-gray-700'}
                          `}>
                            {selected ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Building className="w-4 h-4" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {classroom.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Grade {classroom.grade} • Section {classroom.section}
                            </div>
                            
                            {showDetails && (
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center text-xs text-gray-500">
                                  <Users className="w-3 h-3 mr-1" />
                                  {classroom.totalStudents || 0} students
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {classroom.type?.toLowerCase()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {classroom.teacher?.user?.name || 'No teacher'}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomSelector;