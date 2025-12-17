import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import {
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  GraduationCap,
  MapPin,
  User,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  Award,
  BookMarked,
  BarChart3
} from 'lucide-react';

const MyStudents = () => {
  const {
    students,
    classes,
    loading,
    fetchMyStudents,
    fetchMyClasses
  } = useTeacher();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'rollNumber', 'class'
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState({});

  // Ensure classes and students are always arrays
  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const studentList = Array.isArray(students) ? students : (students?.students || []);

  useEffect(() => {
    fetchMyClasses();
    fetchMyStudents();
  }, []);

  useEffect(() => {
    if (studentList.length > 0) {
      calculateStudentStats();
    }
  }, [studentList]);

  const calculateStudentStats = () => {
    const stats = {
      total: studentList.length,
      byClass: {},
      byGender: {
        male: 0,
        female: 0,
        unknown: 0
      }
    };

    studentList.forEach(student => {
      // Count by class
      const className = student.classRoom?.name || 'Unknown';
      stats.byClass[className] = (stats.byClass[className] || 0) + 1;

      // Count by gender
      const gender = student.student?.gender?.toLowerCase() || 'unknown';
      if (gender === 'male') stats.byGender.male++;
      else if (gender === 'female') stats.byGender.female++;
      else stats.byGender.unknown++;
    });

    setStudentStats(stats);
  };

  const filteredStudents = studentList
    .filter(student => {
      const matchesSearch = student.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.rollNumber?.toString().includes(searchTerm) ||
                           student.student?.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !selectedClass || student.classRoom?.id === selectedClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.student?.user?.name || '').localeCompare(b.student?.user?.name || '');
        case 'rollNumber':
          return (a.rollNumber || 0) - (b.rollNumber || 0);
        case 'class':
          return (a.classRoom?.name || '').localeCompare(b.classRoom?.name || '');
        default:
          return 0;
      }
    });

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'inactive':
        return 'text-red-600 bg-red-50';
      case 'transferred':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getClassTypeColor = (type) => {
    switch (type?.toUpperCase()) {
      case 'REGULAR':
        return 'text-blue-600 bg-blue-50';
      case 'HIFZ':
        return 'text-purple-600 bg-purple-50';
      case 'NAZRA':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const StudentCard = ({ student }) => {
    const isExpanded = expandedStudent === student.id;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        {/* Student Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-gold rounded-full flex items-center justify-center text-white font-bold text-lg">
                {getInitials(student.student?.user?.name)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {student.student?.user?.name || 'Unknown Student'}
                </h3>
                <p className="text-sm text-gray-600">
                  Roll No: {student.rollNumber} • Admission: {student.student?.admissionNo || 'N/A'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.student?.status)}`}>
                    {student.student?.status || 'Active'}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClassTypeColor(student.classRoom?.type)}`}>
                    {student.classRoom?.type || 'Regular'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{student.classRoom?.name || 'Unknown Class'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Grade {student.classRoom?.grade || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 capitalize">{student.student?.gender || 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {student.student?.dateOfBirth ? new Date(student.student.dateOfBirth).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        
      </div>
    );
  };

  const StudentListItem = ({ student }) => {
    const isExpanded = expandedStudent === student.id;

    return (
      <div className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
  <div className="px-4 sm:px-6 py-3 sm:py-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
          {getInitials(student.student?.user?.name)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
              {student.student?.user?.name || 'Unknown Student'}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.student?.status)}`}>
              {student.student?.status || 'Active'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            <span className="block sm:inline">Roll: {student.rollNumber}</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">Adm: {student.student?.admissionNo || 'N/A'}</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">{student.classRoom?.name}</span>
          </p>
          
          {/* Mobile class info */}
          <div className="sm:hidden mt-2">
            <p className="text-sm font-medium text-gray-900">
              {student.classRoom?.name}
            </p>
            <p className="text-sm text-gray-600">
              Grade {student.classRoom?.grade || 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Desktop class info */}
        <div className="text-right hidden sm:block flex-shrink-0">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
            {student.classRoom?.name}
          </p>
          <p className="text-sm text-gray-600">
            Grade {student.classRoom?.grade || 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 ml-0 sm:ml-6 mt-3 sm:mt-0">
        <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${getClassTypeColor(student.classRoom?.type)}`}>
          {student.classRoom?.type || 'Regular'}
        </span>
        
        <button
          onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
          className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
        >
          <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
        </button>
      </div>
    </div>

    {isExpanded && (
      <div className="mt-4 pl-0 sm:pl-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Contact Info</h4>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="text-gray-600 truncate">
                {student.student?.user?.email || 'No email'}
              </p>
              <p className="text-gray-600">
                {student.student?.user?.phone || 'No phone'}
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Parents</h4>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="text-gray-600 truncate">
                Father: {student.student?.fatherName || 'N/A'}
              </p>
              <p className="text-gray-600 truncate">
                Mother: {student.student?.motherName || 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Details</h4>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="text-gray-600">
                Gender: {student.student?.gender || 'N/A'}
              </p>
              <p className="text-gray-600">
                DOB: {student.student?.dateOfBirth ? 
                  new Date(student.student.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
    );
  };

  if (loading && !studentList.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage and view all your students' information
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <BookMarked className="h-4 w-4 mr-2" />
                Export List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      {studentStats.total > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-5 w-5 text-gold" />
                  <span className="text-2xl font-bold text-gray-900">{studentStats.total}</span>
                </div>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <User className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900">{studentStats.byGender.male}</span>
                </div>
                <p className="text-sm text-gray-600">Male Students</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <User className="h-5 w-5 text-pink-500" />
                  <span className="text-2xl font-bold text-gray-900">{studentStats.byGender.female}</span>
                </div>
                <p className="text-sm text-gray-600">Female Students</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900">{Object.keys(studentStats.byClass).length}</span>
                </div>
                <p className="text-sm text-gray-600">Classes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classList.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Grade {cls.grade})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, roll number, or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="rollNumber">Roll Number</option>
                <option value="class">Class</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing <strong>{filteredStudents.length}</strong> of <strong>{studentList.length}</strong> students
              {selectedClass && (
                <span> in <strong>{classList.find(c => c.id === selectedClass)?.name}</strong></span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${
                  viewMode === 'grid' 
                    ? 'bg-gold text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${
                  viewMode === 'list' 
                    ? 'bg-gold text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Students Grid/List */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedClass ? 'No students in this class.' : 'No students found matching your search.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {filteredStudents.map(student => (
              <StudentListItem key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;