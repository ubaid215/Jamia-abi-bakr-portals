import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  School,
  Users,
  BookOpen,
  UserCheck,
  Clock,
  User,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const ClassManagement = () => {
  const { classes, fetchClasses, createClass, updateClass, deleteClass, assignTeacherToClass, loading } = useClass();
  const { teachers, fetchTeachers } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Ref to handle click outside
  const actionMenuRef = useRef(null);

  const [newClass, setNewClass] = useState({
    name: '',
    grade: '',
    section: '',
    type: 'REGULAR',
    description: '',
    teacherId: ''
  });

  const [editClass, setEditClass] = useState({
    name: '',
    grade: '',
    section: '',
    type: 'REGULAR',
    description: '',
    teacherId: ''
  });

  const [assignmentData, setAssignmentData] = useState({
    classId: '',
    teacherId: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  // Handle click outside to close action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debug: Check data structure
  useEffect(() => {
    if (classes && classes.length > 0) {
      console.log('=== CLASSES DATA STRUCTURE ===');
      console.log('Classes data:', classes);
      // Show first class structure
      if (classes[0]) {
        console.log('First class structure:', {
          id: classes[0].id,
          name: classes[0].name,
          teacherId: classes[0].teacherId,
          teacher: classes[0].teacher,
          _count: classes[0]._count
        });
      }
    }
    if (teachers && teachers.length > 0) {
      console.log('=== TEACHERS DATA STRUCTURE ===');
      console.log('Teachers data:', teachers);
      // Show first teacher structure
      if (teachers[0]) {
        console.log('First teacher structure:', {
          id: teachers[0].id, // User ID
          name: teachers[0].name,
          teacherProfile: teachers[0].teacherProfile,
          teacherProfileId: teachers[0].teacherProfile?.id // Teacher table ID
        });
      }
    }
  }, [classes, teachers]);

  // Filter out teachers without teacherProfile and ensure array
  const availableTeachers = Array.isArray(teachers) 
    ? teachers.filter(teacher => teacher.teacherProfile?.id) 
    : [];

  // Ensure classes is always an array before filtering
  const filteredClasses = Array.isArray(classes) 
    ? classes.filter(classItem => {
        const className = classItem.name || '';
        const classGrade = classItem.grade || '';
        const classSection = classItem.section || '';
        
        const matchesSearch = 
          className.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classGrade.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classSection.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === 'ALL' || classItem.type === typeFilter;

        return matchesSearch && matchesType;
      })
    : [];

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      console.log('=== CREATE CLASS DEBUG ===');
      console.log('Creating class with data:', newClass);
      
      // Make sure we're sending the correct teacherId format
      const dataToSend = {
        ...newClass,
        // If teacherId is empty string, set it to null
        teacherId: newClass.teacherId || null
      };
      
      await createClass(dataToSend);
      toast.success('Class created successfully');
      setShowCreateModal(false);
      setNewClass({
        name: '',
        grade: '',
        section: '',
        type: 'REGULAR',
        description: '',
        teacherId: ''
      });
    } catch (error) {
      console.error('Create class error:', error);
      toast.error(error.message || 'Failed to create class');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    
    try {
      console.log('=== EDIT CLASS DEBUG START ===');
      console.log('1. Selected class ID:', selectedClass?.id);
      console.log('2. Selected class raw data:', selectedClass);
      console.log('3. Edit form data:', editClass);
      
      // Prepare data exactly as backend expects
      const dataToSend = {
        name: editClass.name,
        grade: editClass.grade || null,
        section: editClass.section || null,
        type: editClass.type,
        description: editClass.description || null,
        teacherId: editClass.teacherId || null // Send null if empty
      };
      
      console.log('4. Data being sent to backend:', dataToSend);
      
      // Call your context method
      const result = await updateClass(selectedClass.id, dataToSend);
      console.log('5. Update result:', result);
      
      console.log('=== EDIT CLASS DEBUG END ===');
      
      toast.success('Class updated successfully');
      setShowEditModal(false);
      setSelectedClass(null);
      
      // Refresh the classes list
      await fetchClasses();
      
    } catch (error) {
      console.error('=== EDIT CLASS ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.error) {
        toast.error(`Failed: ${error.response.data.error}`);
      } else {
        toast.error(error.message || 'Failed to update class');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    setAssignLoading(true);
    
    try {
      console.log('=== ASSIGN TEACHER DEBUG ===');
      console.log('Assignment data:', assignmentData);
      
      await assignTeacherToClass(assignmentData.classId, assignmentData.teacherId || null);
      
      toast.success('Teacher assigned to class successfully');
      setShowAssignModal(false);
      setAssignmentData({
        classId: '',
        teacherId: ''
      });
    } catch (error) {
      console.error('Failed to assign teacher:', error);
      toast.error(error.message || 'Failed to assign teacher');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      try {
        await deleteClass(classId);
        toast.success('Class deleted successfully');
        setActionMenu(null);
      } catch (error) {
        toast.error(error.message || 'Failed to delete class');
      }
    }
  };

  const openEditModal = (classItem) => {
    setSelectedClass(classItem);
    
    // Get the correct teacher ID for the select dropdown
    let teacherIdForEdit = '';
    if (classItem.teacherId) {
      // Find the teacher in availableTeachers that matches this teacherId
      const teacher = availableTeachers.find(t => t.teacherProfile?.id === classItem.teacherId);
      if (teacher) {
        teacherIdForEdit = teacher.teacherProfile.id;
      }
    }
    
    setEditClass({
      name: classItem.name || '',
      grade: classItem.grade || '',
      section: classItem.section || '',
      type: classItem.type || 'REGULAR',
      description: classItem.description || '',
      teacherId: teacherIdForEdit
    });
    setShowEditModal(true);
    setActionMenu(null);
  };

  const openAssignModal = (classItem) => {
    setSelectedClass(classItem);
    
    // Get the correct teacher ID for the select dropdown
    let teacherIdForAssign = '';
    if (classItem.teacherId) {
      const teacher = availableTeachers.find(t => t.teacherProfile?.id === classItem.teacherId);
      if (teacher) {
        teacherIdForAssign = teacher.teacherProfile.id;
      }
    }
    
    setAssignmentData({
      classId: classItem.id,
      teacherId: teacherIdForAssign
    });
    setShowAssignModal(true);
    setActionMenu(null);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'HIFZ': return 'bg-purple-100 text-purple-800';
      case 'NAZRA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'REGULAR': return 'Regular';
      case 'HIFZ': return 'Hifz';
      case 'NAZRA': return 'Nazra';
      default: return type;
    }
  };

  // Helper function to get teacher name - FIXED
  const getTeacherName = (teacherId) => {
    if (!teacherId) return null;
    
    // Find the teacher by Teacher.id (from teacherProfile)
    const teacher = availableTeachers.find(t => t.teacherProfile?.id === teacherId);
    
    return teacher?.name || 'Unknown Teacher';
  };

  // Helper function to get teacher data - FIXED
  const getTeacherData = (teacherId) => {
    if (!teacherId) return null;
    
    return availableTeachers.find(t => t.teacherProfile?.id === teacherId);
  };

  // Get student count from class data
  const getStudentCount = (classItem) => {
    return classItem._count?.enrollments || 
           classItem.enrollments?.length || 
           0;
  };

  // Get subject count from class data
  const getSubjectCount = (classItem) => {
    return classItem._count?.subjects || 
           classItem.subjects?.length || 
           0;
  };

  // Get teacher name from class data structure
  const getTeacherFromClass = (classItem) => {
    // If class has teacher object populated
    if (classItem.teacher) {
      return classItem.teacher.user?.name || 'Unknown Teacher';
    }
    
    // Fallback to teacherId lookup
    return getTeacherName(classItem.teacherId);
  };

  // Get teacher profile from class data structure
  const getTeacherProfileFromClass = (classItem) => {
    // If class has teacher object populated
    if (classItem.teacher) {
      return classItem.teacher.user;
    }
    
    // Fallback to teacherId lookup
    return getTeacherData(classItem.teacherId)?.user;
  };

  // Handle action menu click with proper event handling
  const handleActionMenuClick = (e, classId) => {
    e.stopPropagation();
    setActionMenu(actionMenu === classId ? null : classId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Class Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1 sm:mt-2">
              Create and manage classes, assign teachers
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes by name, grade, or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            >
              <option value="ALL">All Types</option>
              <option value="REGULAR">Regular</option>
              <option value="HIFZ">Hifz</option>
              <option value="NAZRA">Nazra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          // Loading Skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <School className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {classes.length === 0 ? 'No classes created yet' : 'No classes found'}
            </h3>
            <p className="text-gray-500 text-sm">
              {classes.length === 0 
                ? 'Create your first class to get started' 
                : 'Try adjusting your search criteria'
              }
            </p>
          </div>
        ) : (
          filteredClasses.map((classItem) => {
            const teacherName = getTeacherFromClass(classItem);
            const teacherProfile = getTeacherProfileFromClass(classItem);
            const studentCount = getStudentCount(classItem);
            const subjectCount = getSubjectCount(classItem);

            return (
              <div
                key={classItem.id}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200"
              >
                {/* Class Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {classItem.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {classItem.name}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm">
                        {classItem.grade} {classItem.section && `• ${classItem.section}`}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => handleActionMenuClick(e, classItem.id)}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                    {actionMenu === classItem.id && (
                      <div 
                        ref={actionMenuRef}
                        className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-32"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal(classItem);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          <span>Assign Teacher</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(classItem);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <Edit className="h-3 w-3 text-gray-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(classItem.id);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Type */}
                <div className="mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(classItem.type)}`}>
                    {getTypeLabel(classItem.type)}
                  </span>
                </div>

                {/* Class Details */}
                <div className="space-y-2 mb-4 text-xs sm:text-sm">
                  {classItem.description && (
                    <p className="text-gray-600 line-clamp-2">{classItem.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{studentCount} Students</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{subjectCount} Subjects</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Teacher */}
                <div className="border-t border-gray-100 pt-3">
                  {teacherName ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {teacherProfile?.profileImage ? (
                            <img 
                              src={teacherProfile.profileImage} 
                              alt={teacherName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                              {teacherName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700">
                            {teacherName}
                          </span>
                        </div>
                        <UserCheck className="h-3 w-3 text-green-500" />
                      </div>
                      {/* Show specialization if available */}
                      {classItem.teacher?.specialization && (
                        <p className="text-xs text-gray-500">{classItem.teacher.specialization}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => openAssignModal(classItem)}
                      className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-colors duration-200 py-2 border border-dashed border-gray-300 rounded-lg hover:border-[#F59E0B]"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>Assign Teacher</span>
                    </button>
                  )}
                </div>

                {/* Created Date */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-gray-500 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>Created {new Date(classItem.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
              <p className="text-gray-600 text-sm mt-1">Add a new class to the system</p>
            </div>
            
            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={newClass.name}
                  onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="e.g., Class 5A, Hifz Batch 1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={newClass.grade}
                    onChange={(e) => setNewClass({...newClass, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                    placeholder="e.g., 5, 6, 7"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newClass.section}
                    onChange={(e) => setNewClass({...newClass, section: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Type *
                </label>
                <select
                  required
                  value={newClass.type}
                  onChange={(e) => setNewClass({...newClass, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="REGULAR">Regular (Dars-e-Nizami)</option>
                  <option value="HIFZ">Hifz</option>
                  <option value="NAZRA">Nazra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Teacher (Optional)
                </label>
                <select
                  value={newClass.teacherId}
                  onChange={(e) => setNewClass({...newClass, teacherId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="">No teacher assigned</option>
                  {availableTeachers.map(teacher => (
                    <option 
                      key={teacher.teacherProfile.id} 
                      value={teacher.teacherProfile.id}
                    >
                      {teacher.name} - {teacher.teacherProfile?.specialization || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Optional class description..."
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {createLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Class</h2>
              <p className="text-gray-600 text-sm mt-1">Update class information</p>
            </div>
            
            <form onSubmit={handleEditClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={editClass.name}
                  onChange={(e) => setEditClass({...editClass, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={editClass.grade}
                    onChange={(e) => setEditClass({...editClass, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editClass.section}
                    onChange={(e) => setEditClass({...editClass, section: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Type *
                </label>
                <select
                  required
                  value={editClass.type}
                  onChange={(e) => setEditClass({...editClass, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="REGULAR">Regular (Dars-e-Nizami)</option>
                  <option value="HIFZ">Hifz</option>
                  <option value="NAZRA">Nazra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Teacher (Optional)
                </label>
                <select
                  value={editClass.teacherId}
                  onChange={(e) => setEditClass({...editClass, teacherId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="">No teacher assigned</option>
                  {availableTeachers.map(teacher => (
                    <option 
                      key={teacher.teacherProfile.id} 
                      value={teacher.teacherProfile.id}
                    >
                      {teacher.name} - {teacher.teacherProfile?.specialization || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editClass.description}
                  onChange={(e) => setEditClass({...editClass, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {editLoading ? 'Updating...' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign Teacher</h2>
              <p className="text-gray-600 text-sm mt-1">
                Assign a teacher to {selectedClass.name}
              </p>
            </div>
            
            <form onSubmit={handleAssignTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Teacher *
                </label>
                <select
                  required
                  value={assignmentData.teacherId}
                  onChange={(e) => setAssignmentData({...assignmentData, teacherId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="">Choose a teacher</option>
                  {availableTeachers.map(teacher => (
                    <option 
                      key={teacher.teacherProfile.id} 
                      value={teacher.teacherProfile.id}
                    >
                      {teacher.name} - {teacher.teacherProfile?.specialization || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Preview */}
              {assignmentData.teacherId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Selected Teacher:</h4>
                  {(() => {
                    const selectedTeacher = availableTeachers.find(t => 
                      t.teacherProfile?.id === assignmentData.teacherId
                    );
                    return selectedTeacher ? (
                      <div className="flex items-center space-x-3">
                        {selectedTeacher.profileImage ? (
                          <img 
                            src={selectedTeacher.profileImage} 
                            alt={selectedTeacher.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {selectedTeacher.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{selectedTeacher.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            {selectedTeacher.teacherProfile?.specialization && (
                              <span>{selectedTeacher.teacherProfile.specialization}</span>
                            )}
                            {selectedTeacher.email && (
                              <>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{selectedTeacher.email}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {assignLoading ? 'Assigning...' : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;