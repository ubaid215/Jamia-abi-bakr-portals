import React, { useState, useEffect } from 'react';
import { useStudent } from '../../contexts/StudentContext';
import {
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  Award,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  User,
  Mail,
  Phone
} from 'lucide-react';

const ClassHistory = () => {
  const {
    classHistory,
    currentClass,
    loading,
    error,
    fetchMyClassHistory,
    fetchMyCurrentClass
  } = useStudent();

  const [activeTab, setActiveTab] = useState('current');
  const [expandedEnrollment, setExpandedEnrollment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchMyClassHistory();
    fetchMyCurrentClass();
  }, [fetchMyClassHistory, fetchMyCurrentClass]);

  const toggleEnrollment = (enrollmentId) => {
    setExpandedEnrollment(expandedEnrollment === enrollmentId ? null : enrollmentId);
  };

  const getStatusBadge = (enrollment) => {
    if (enrollment.isCurrent) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
          Current
        </span>
      );
    } else if (enrollment.endDate && new Date(enrollment.endDate) < new Date()) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full border border-gray-200">
          Completed
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
          Transferred
        </span>
      );
    }
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      'HIFZ': { color: 'bg-purple-100 text-purple-800 border-purple-200' },
      'NAZRA': { color: 'bg-amber-100 text-amber-800 border-amber-200' },
      'REGULAR': { color: 'bg-blue-100 text-blue-800 border-blue-200' }
    };

    const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        {type}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredHistory = classHistory?.classHistory?.filter(enrollment => {
    const matchesSearch = enrollment.classRoom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.classRoom.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.classRoom.classTeacher?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'current' && enrollment.isCurrent) ||
                         (filterType === 'completed' && !enrollment.isCurrent && enrollment.endDate && new Date(enrollment.endDate) < new Date()) ||
                         (filterType === 'transferred' && !enrollment.isCurrent && (!enrollment.endDate || new Date(enrollment.endDate) >= new Date()));

    return matchesSearch && matchesFilter;
  }) || [];

  if (loading && (!classHistory && !currentClass)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">My Classes</h1>
              <p className="text-gray-600 mt-1">
                Track your academic journey and class history
              </p>
            </div>
            {classHistory?.student && (
              <div className="mt-4 sm:mt-0 text-right">
                <p className="text-sm text-gray-600">Admission No</p>
                <p className="font-semibold text-black">{classHistory.student.admissionNo}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'current', name: 'Current Class', count: currentClass ? 1 : 0 },
                { id: 'history', name: 'Class History', count: classHistory?.classHistory?.length || 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.name}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activeTab === tab.id 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by class name, grade, or teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full"
                />
              </div>
              
              {activeTab === 'history' && (
                <div className="flex items-center space-x-4">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="all">All Classes</option>
                    <option value="current">Current</option>
                    <option value="completed">Completed</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Class Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {currentClass ? (
              <>
                {/* Current Class Card */}
                <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                  <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <GraduationCap className="h-6 w-6 text-amber-600" />
                        <h2 className="text-xl font-bold text-black">Current Class</h2>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge({ isCurrent: true })}
                        {getTypeBadge(currentClass.currentClass.type)}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Class Information */}
                      <div className="lg:col-span-2">
                        <h3 className="text-lg font-semibold text-black mb-4">
                          {currentClass.currentClass.name}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Award className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Grade & Section</p>
                                <p className="font-medium text-black">
                                  Grade {currentClass.currentClass.grade} • Section {currentClass.currentClass.section}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Program Type</p>
                                <p className="font-medium text-black capitalize">
                                  {currentClass.currentClass.type.toLowerCase()}
                                </p>
                              </div>
                            </div>
                            
                            {currentClass.currentClass.description && (
                              <div className="flex items-start space-x-3">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-sm text-gray-600">Description</p>
                                  <p className="font-medium text-black">
                                    {currentClass.currentClass.description}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Class Teacher */}
                          {currentClass.currentClass.classTeacher && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-black mb-3 flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>Class Teacher</span>
                              </h4>
                              <div className="space-y-2">
                                <p className="font-medium text-black">
                                  {currentClass.currentClass.classTeacher.name}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Mail className="h-3 w-3" />
                                  <span>{currentClass.currentClass.classTeacher.email}</span>
                                </div>
                                {currentClass.currentClass.classTeacher.phone && (
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span>{currentClass.currentClass.classTeacher.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="font-medium text-black mb-4">Your Information</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Roll Number</p>
                            <p className="font-medium text-black">{currentClass.student.rollNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Admission Number</p>
                            <p className="font-medium text-black">{currentClass.student.admissionNo}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Student Name</p>
                            <p className="font-medium text-black">{currentClass.student.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subjects */}
                    {currentClass.currentClass.subjects && currentClass.currentClass.subjects.length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-medium text-black mb-4">Subjects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentClass.currentClass.subjects.map((subject, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-black">{subject.name}</span>
                                {subject.code && (
                                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    {subject.code}
                                  </span>
                                )}
                              </div>
                              {subject.teacher && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <User className="h-3 w-3" />
                                  <span>{subject.teacher.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">No Current Class</h3>
                <p className="text-gray-600">
                  You are not currently enrolled in any class. Please contact administration.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Class History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((enrollment, index) => (
                <div key={enrollment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleEnrollment(enrollment.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-amber-600" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-black">
                            {enrollment.classRoom.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span>Grade {enrollment.classRoom.grade}</span>
                            <span>•</span>
                            <span>Section {enrollment.classRoom.section}</span>
                            <span>•</span>
                            <span>Roll No: {enrollment.rollNumber}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-1">
                            {getStatusBadge(enrollment)}
                            {getTypeBadge(enrollment.classRoom.type)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(enrollment.startDate)} - {formatDate(enrollment.endDate)}
                          </div>
                        </div>
                        {expandedEnrollment === enrollment.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedEnrollment === enrollment.id && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-black mb-2">Class Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Class Name:</span>
                                <span className="font-medium text-black">{enrollment.classRoom.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Grade & Section:</span>
                                <span className="font-medium text-black">
                                  Grade {enrollment.classRoom.grade} • Section {enrollment.classRoom.section}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Program Type:</span>
                                <span className="font-medium text-black">{enrollment.classRoom.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Class Teacher:</span>
                                <span className="font-medium text-black">
                                  {enrollment.classRoom.classTeacher || 'Not assigned'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-black mb-2">Enrollment Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Roll Number:</span>
                                <span className="font-medium text-black">{enrollment.rollNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Start Date:</span>
                                <span className="font-medium text-black">{formatDate(enrollment.startDate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">End Date:</span>
                                <span className="font-medium text-black">{formatDate(enrollment.endDate)}</span>
                              </div>
                              {enrollment.promotedTo && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Promoted To:</span>
                                  <span className="font-medium text-black">{enrollment.promotedTo}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">No Class History Found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No class history records available'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <GraduationCap className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">Error Loading Classes</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                fetchMyClassHistory();
                fetchMyCurrentClass();
              }}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassHistory;