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
  Mail,
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

// ─── Normalise teacher from AdminContext ───────────────────────────────────────
// AdminContext.teachers = Teacher records: { id: Teacher.id, user: { name }, specialization }
// ClassRoom.teacherId   = Teacher.id
// Result: { teacherId, name, specialization, email }
const normaliseTeacher = (raw) => {
  if (!raw?.id) return null;

  // Shape A: Teacher record from adminService.getAllTeachers
  //   { id: Teacher.id, user: { name, email }, specialization }
  if (raw.user?.name) {
    return {
      teacherId:      raw.id,
      name:           raw.user.name,
      email:          raw.user.email || '',
      specialization: raw.specialization || '',
    };
  }

  // Shape B: User record with teacherProfile (other contexts)
  //   { id: User.id, name, email, teacherProfile: { id: Teacher.id, specialization } }
  if (raw.teacherProfile?.id) {
    return {
      teacherId:      raw.teacherProfile.id,
      name:           raw.name || 'Unknown',
      email:          raw.email || '',
      specialization: raw.teacherProfile.specialization || '',
    };
  }

  return null;
};

const ClassManagement = () => {
  const { classes, fetchClasses, createClass, updateClass, deleteClass, assignTeacherToClass, loading } = useClass();
  const { teachers: rawTeachers, fetchTeachers } = useAdmin();

  // Normalise once — consistent { teacherId, name, specialization, email }
  const availableTeachers = Array.isArray(rawTeachers)
    ? rawTeachers.map(normaliseTeacher).filter(Boolean)
    : [];

  const [searchTerm, setSearchTerm]       = useState('');
  const [typeFilter, setTypeFilter]       = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [selectedClass, setSelectedClass]   = useState(null);
  const [actionMenu, setActionMenu]         = useState(null);
  const [assignLoading, setAssignLoading]   = useState(false);
  const [createLoading, setCreateLoading]   = useState(false);
  const [editLoading, setEditLoading]       = useState(false);

  const actionMenuRef = useRef(null);

  const emptyClassForm = { name: '', grade: '', section: '', type: 'REGULAR', description: '', teacherId: '' };

  const [newClass, setNewClass]         = useState(emptyClassForm);
  const [editClass, setEditClass]       = useState(emptyClassForm);
  const [assignmentData, setAssignmentData] = useState({ classId: '', teacherId: '' });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  useEffect(() => {
    const handler = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target))
        setActionMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredClasses = Array.isArray(classes)
    ? classes.filter(c => {
        const matchSearch =
          (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.grade || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.section || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = typeFilter === 'ALL' || c.type === typeFilter;
        return matchSearch && matchType;
      })
    : [];

  // ── Teacher helpers ───────────────────────────────────────────────────────

  // Find normalised teacher by Teacher.id (= ClassRoom.teacherId)
  const findTeacher = (teacherId) =>
    availableTeachers.find(t => t.teacherId === teacherId) || null;

  // Get teacher display info for a class card.
  // classItem.teacher (populated by backend) = { id: Teacher.id, user: { name }, specialization }
  const getTeacherFromClass = (classItem) => {
    if (classItem.teacher?.user?.name) {
      return {
        teacherId:      classItem.teacher.id,
        name:           classItem.teacher.user.name,
        email:          classItem.teacher.user.email || '',
        specialization: classItem.teacher.specialization || '',
      };
    }
    if (classItem.teacherId) return findTeacher(classItem.teacherId);
    return null;
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const getStudentCount = (c) => c._count?.enrollments ?? c.enrollments?.length ?? 0;
  const getSubjectCount = (c) => c._count?.subjects    ?? c.subjects?.length    ?? 0;

  // ── Styling ───────────────────────────────────────────────────────────────
  const getTypeColor = (type) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'HIFZ':    return 'bg-purple-100 text-purple-800';
      case 'NAZRA':   return 'bg-orange-100 text-orange-800';
      default:        return 'bg-gray-100 text-gray-800';
    }
  };
  const getTypeLabel = (type) => {
    switch (type) {
      case 'REGULAR': return 'Regular';
      case 'HIFZ':    return 'Hifz';
      case 'NAZRA':   return 'Nazra';
      default:        return type;
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await createClass({ ...newClass, teacherId: newClass.teacherId || null });
      toast.success('Class created successfully');
      setShowCreateModal(false);
      setNewClass(emptyClassForm);
    } catch (err) {
      toast.error(err.message || 'Failed to create class');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await updateClass(selectedClass.id, {
        name:        editClass.name,
        grade:       editClass.grade       || null,
        section:     editClass.section     || null,
        type:        editClass.type,
        description: editClass.description || null,
        teacherId:   editClass.teacherId   || null,  // Teacher.id ✓
      });
      toast.success('Class updated successfully');
      setShowEditModal(false);
      setSelectedClass(null);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update class');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    setAssignLoading(true);
    try {
      await assignTeacherToClass(assignmentData.classId, assignmentData.teacherId || null);
      toast.success('Teacher assigned successfully');
      setShowAssignModal(false);
      setAssignmentData({ classId: '', teacherId: '' });
      await fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to assign teacher');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteClass(classId);
      toast.success('Class deleted successfully');
      setActionMenu(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete class');
    }
  };

  const openEditModal = (classItem) => {
    setSelectedClass(classItem);
    setEditClass({
      name:        classItem.name        || '',
      grade:       classItem.grade       || '',
      section:     classItem.section     || '',
      type:        classItem.type        || 'REGULAR',
      description: classItem.description || '',
      teacherId:   classItem.teacherId   || '',  // Teacher.id ✓
    });
    setShowEditModal(true);
    setActionMenu(null);
  };

  const openAssignModal = (classItem) => {
    setSelectedClass(classItem);
    setAssignmentData({
      classId:   classItem.id,
      teacherId: classItem.teacherId || '',  // Teacher.id ✓
    });
    setShowAssignModal(true);
    setActionMenu(null);
  };

  const handleActionMenuClick = (e, classId) => {
    e.stopPropagation();
    setActionMenu(actionMenu === classId ? null : classId);
  };

  // ── Shared teacher <option> list ─────────────────────────────────────────
  const TeacherOptions = () =>
    availableTeachers.length === 0
      ? <option disabled>No teachers available</option>
      : availableTeachers.map(t => (
          <option key={t.teacherId} value={t.teacherId}>
            {t.name}{t.specialization ? ` - ${t.specialization}` : ''}
          </option>
        ));

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes by name, grade, or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            />
          </div>
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
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
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
                : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          filteredClasses.map((classItem) => {
            const assignedTeacher = getTeacherFromClass(classItem);
            const studentCount    = getStudentCount(classItem);
            const subjectCount    = getSubjectCount(classItem);

            return (
              <div
                key={classItem.id}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {classItem.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{classItem.name}</h3>
                      <p className="text-gray-500 text-xs sm:text-sm">
                        {classItem.grade}{classItem.section && ` • ${classItem.section}`}
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
                      <div ref={actionMenuRef} className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-36">
                        <button
                          onClick={(e) => { e.stopPropagation(); openAssignModal(classItem); }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          <span>Assign Teacher</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(classItem); }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <Edit className="h-3 w-3 text-gray-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClass(classItem.id); }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <div className="mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(classItem.type)}`}>
                    {getTypeLabel(classItem.type)}
                  </span>
                </div>

                {/* Stats */}
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

                {/* Teacher section */}
                <div className="border-t border-gray-100 pt-3">
                  {assignedTeacher ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-6 h-6 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {assignedTeacher.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{assignedTeacher.name}</p>
                          {assignedTeacher.specialization && (
                            <p className="text-xs text-gray-400 truncate">{assignedTeacher.specialization}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <button
                          onClick={() => openAssignModal(classItem)}
                          className="text-xs text-[#F59E0B] hover:text-[#D97706] font-medium"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAssignModal(classItem)}
                      className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-colors py-2 border border-dashed border-gray-300 rounded-lg hover:border-[#F59E0B]"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>Assign Teacher</span>
                    </button>
                  )}
                </div>

                {/* Created date */}
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

      {/* ── Create Class Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
              <p className="text-gray-600 text-sm mt-1">Add a new class to the system</p>
            </div>
            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                <input
                  type="text" required
                  value={newClass.name}
                  onChange={(e) => setNewClass(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  placeholder="e.g., Class 5A, Hifz Batch 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={newClass.grade}
                    onChange={(e) => setNewClass(p => ({ ...p, grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                    placeholder="e.g., 5, 6, 7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={newClass.section}
                    onChange={(e) => setNewClass(p => ({ ...p, section: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Type *</label>
                <select
                  required
                  value={newClass.type}
                  onChange={(e) => setNewClass(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                >
                  <option value="REGULAR">Regular (Dars-e-Nizami)</option>
                  <option value="HIFZ">Hifz</option>
                  <option value="NAZRA">Nazra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Teacher (Optional)</label>
                <select
                  value={newClass.teacherId}
                  onChange={(e) => setNewClass(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                >
                  <option value="">No teacher assigned</option>
                  <TeacherOptions />
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass(p => ({ ...p, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  placeholder="Optional class description..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium">
                  {createLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Class Modal ── */}
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Class</h2>
              <p className="text-gray-600 text-sm mt-1">Update class information</p>
            </div>
            <form onSubmit={handleEditClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                <input
                  type="text" required
                  value={editClass.name}
                  onChange={(e) => setEditClass(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input type="text" value={editClass.grade}
                    onChange={(e) => setEditClass(p => ({ ...p, grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input type="text" value={editClass.section}
                    onChange={(e) => setEditClass(p => ({ ...p, section: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Type *</label>
                <select required value={editClass.type}
                  onChange={(e) => setEditClass(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm">
                  <option value="REGULAR">Regular (Dars-e-Nizami)</option>
                  <option value="HIFZ">Hifz</option>
                  <option value="NAZRA">Nazra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Teacher (Optional)</label>
                <select value={editClass.teacherId}
                  onChange={(e) => setEditClass(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm">
                  <option value="">No teacher assigned</option>
                  <TeacherOptions />
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editClass.description}
                  onChange={(e) => setEditClass(p => ({ ...p, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium">
                  {editLoading ? 'Updating...' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Teacher Modal ── */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign Teacher</h2>
              <p className="text-gray-600 text-sm mt-1">
                Assign a teacher to <span className="font-semibold">{selectedClass.name}</span>
              </p>
            </div>
            <form onSubmit={handleAssignTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher *</label>
                <select required value={assignmentData.teacherId}
                  onChange={(e) => setAssignmentData(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm">
                  <option value="">Choose a teacher</option>
                  <TeacherOptions />
                </select>
              </div>

              {/* Teacher preview */}
              {assignmentData.teacherId && (() => {
                const t = availableTeachers.find(t => t.teacherId === assignmentData.teacherId);
                return t ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">Selected Teacher</h4>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {t.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {t.specialization && <span>{t.specialization}</span>}
                          {t.email && (
                            <>
                              {t.specialization && <span>•</span>}
                              <span className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{t.email}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={assignLoading || !assignmentData.teacherId}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium">
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