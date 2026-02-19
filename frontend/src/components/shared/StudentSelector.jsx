import React, { useState, useEffect } from 'react';
import { Search, User, ChevronDown, Check, X, Filter } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';

const StudentSelector = ({ 
  value, 
  onChange, 
  label = "Select Student",
  required = false,
  disabled = false,
  className = "",
  filterByClassroom = null,
  showMode = false,
  multiSelect = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { classroomStudents, loading, selectedClassroom } = useActivity();
  
  // Use provided classroom students or get from context
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    if (classroomStudents && classroomStudents.length > 0) {
      let filteredStudents = [...classroomStudents];
      
      // Filter by classroom if specified
      if (filterByClassroom) {
        filteredStudents = filteredStudents.filter(student => 
          student.currentEnrollment?.classRoomId === filterByClassroom
        );
      }
      
      setStudents(filteredStudents);
    }
  }, [classroomStudents, filterByClassroom]);

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.user?.name?.toLowerCase().includes(searchLower) ||
      student.admissionNo?.toLowerCase().includes(searchLower) ||
      student.guardianName?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (student) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.some(s => s.id === student.id);
      
      if (isSelected) {
        onChange(currentValues.filter(s => s.id !== student.id));
      } else {
        onChange([...currentValues, student]);
      }
    } else {
      onChange(student);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const isSelected = (student) => {
    if (multiSelect && Array.isArray(value)) {
      return value.some(s => s.id === student.id);
    }
    return value?.id === student.id;
  };

  const getDisplayValue = () => {
    if (multiSelect && Array.isArray(value)) {
      if (value.length === 0) return 'No students selected';
      if (value.length === 1) return value[0].user?.name;
      return `${value.length} students selected`;
    }
    return value?.user?.name || '';
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
          <User className="w-4 h-4 text-yellow-600" />
          <span className={`${!getDisplayValue() ? 'text-gray-500' : 'text-gray-900'}`}>
            {getDisplayValue() || 'Select a student...'}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                autoFocus
              />
            </div>
            
            {selectedClassroom && (
              <div className="mt-2 px-1 text-xs text-gray-500 flex items-center">
                <Filter className="w-3 h-3 mr-1" />
                Classroom: {selectedClassroom.name} ({selectedClassroom.grade}-{selectedClassroom.section})
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="mt-2">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="px-4 py-3 text-center text-gray-500">
                {searchTerm ? 'No students found' : 'No students available'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredStudents.map((student) => {
                  const selected = isSelected(student);
                  return (
                    <li key={student.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(student)}
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
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {student.user?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Admission: {student.admissionNo}
                              {showMode && student.studentMode && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                  student.studentMode === 'PHYSICAL' 
                                    ? 'bg-green-100 text-green-800' 
                                    : student.studentMode === 'ONLINE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {student.studentMode.toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {student.guardianPhone && (
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">
                            {student.guardianName} • {student.guardianPhone}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          {multiSelect && value && value.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {value.map((student) => (
                  <span 
                    key={student.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800"
                  >
                    {student.user?.name}
                    <button
                      type="button"
                      onClick={() => handleSelect(student)}
                      className="ml-1 hover:text-yellow-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSelector;