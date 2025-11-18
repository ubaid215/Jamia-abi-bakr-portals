import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  BookOpen,
  UserCheck,
  School,
  Clock
} from 'lucide-react';
import { useSubject } from '../../contexts/SubjectContext';
import { useClass } from '../../contexts/ClassContext'; // Use ClassContext instead
import { useAdmin } from '../../contexts/AdminContext'; // Keep for teachers if needed
import { toast } from 'react-hot-toast';

const SubjectManagement = () => {
  const { subjects, fetchSubjects, createSubject, deleteSubject, assignTeacherToSubject, loading } = useSubject();
  const { classes, fetchClasses } = useClass(); // Get classes from ClassContext
  const { teachers, fetchTeachers } = useAdmin(); // Get teachers from AdminContext
  
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    classRoomId: ''
  });

  const [assignmentData, setAssignmentData] = useState({
    subjectId: '',
    teacherId: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchClasses(); // This should work from ClassContext
    fetchTeachers();
  }, [fetchSubjects, fetchClasses, fetchTeachers]);

  // Ensure subjects is always an array before filtering
  const filteredSubjects = Array.isArray(subjects) 
    ? subjects.filter(subject => {
        const matchesSearch = subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             subject.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = classFilter === 'ALL' || subject.classRoomId === classFilter;
        return matchesSearch && matchesClass;
      })
    : [];

  // Ensure classes and teachers are always arrays
  const availableClasses = Array.isArray(classes) ? classes : [];
  const availableTeachers = Array.isArray(teachers) ? teachers : [];

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    
    try {
      await createSubject(newSubject);
      toast.success('Subject created successfully');
      setShowCreateModal(false);
      setNewSubject({
        name: '',
        code: '',
        classRoomId: ''
      });
    } catch (error) {
      toast.error(error.message || 'Failed to create subject');
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    
    try {
      await assignTeacherToSubject(assignmentData.subjectId, assignmentData.teacherId);
      toast.success('Teacher assigned to subject successfully');
      setShowAssignModal(false);
      setAssignmentData({
        subjectId: '',
        teacherId: ''
      });
    } catch (error) {
      toast.error(error.message || 'Failed to assign teacher');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      try {
        await deleteSubject(subjectId);
        toast.success('Subject deleted successfully');
        setActionMenu(null);
      } catch (error) {
        toast.error(error.message || 'Failed to delete subject');
      }
    }
  };

  const getClassById = (classId) => {
    return availableClasses.find(c => c.id === classId);
  };

  const getTeacherById = (teacherId) => {
    return availableTeachers.find(t => t.id === teacherId);
  };

  const openAssignModal = (subject) => {
    setSelectedSubject(subject);
    setAssignmentData({
      subjectId: subject.id,
      teacherId: subject.teacherId || ''
    });
    setShowAssignModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Subject Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1 sm:mt-2">
              Create and manage subjects, assign to teachers and classes
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Add Subject</span>
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
              placeholder="Search subjects by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            >
              <option value="ALL">All Classes</option>
              {availableClasses.map(classItem => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
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
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No subjects found</h3>
            <p className="text-gray-500 text-sm">Create your first subject to get started</p>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const assignedClass = getClassById(subject.classRoomId);
            const assignedTeacher = getTeacherById(subject.teacherId);

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200"
              >
                {/* Subject Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {subject.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {subject.name}
                      </h3>
                      {subject.code && (
                        <p className="text-gray-500 text-xs sm:text-sm">
                          Code: {subject.code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(subject.id)}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                    {actionMenu === subject.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-32">
                        <button
                          onClick={() => openAssignModal(subject)}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          <span>Assign Teacher</span>
                        </button>
                        <button
                          onClick={() => {/* Edit functionality */}}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <Edit className="h-3 w-3 text-gray-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subject.id)}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Assignment */}
                {assignedClass && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <School className="h-3 w-3" />
                      <span className="font-medium">{assignedClass.name}</span>
                    </div>
                  </div>
                )}

                {/* Assigned Teacher */}
                <div className="border-t border-gray-100 pt-3">
                  {assignedTeacher ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {assignedTeacher.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {assignedTeacher.user?.name}
                        </span>
                      </div>
                      <UserCheck className="h-3 w-3 text-green-500" />
                    </div>
                  ) : (
                    <button
                      onClick={() => openAssignModal(subject)}
                      className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-colors duration-200"
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
                    <span>Created {new Date(subject.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Subject</h2>
              <p className="text-gray-600 text-sm mt-1">Add a new subject to the system</p>
            </div>
            
            <form onSubmit={handleCreateSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="e.g., Quran, Arabic, Islamic Studies"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="e.g., QUR-101, ARB-102"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Class
                </label>
                <select
                  value={newSubject.classRoomId}
                  onChange={(e) => setNewSubject({...newSubject, classRoomId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                >
                  <option value="">Select a class (optional)</option>
                  {availableClasses.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.grade} {classItem.section}
                    </option>
                  ))}
                </select>
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
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign Teacher</h2>
              <p className="text-gray-600 text-sm mt-1">
                Assign a teacher to {selectedSubject?.name}
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
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user?.name} - {teacher.specialization}
                    </option>
                  ))}
                </select>
              </div>
              
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
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Assigning...' : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close action menu when clicking outside */}
      {actionMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActionMenu(null)}
        />
      )}
    </div>
  );
};

export default SubjectManagement;