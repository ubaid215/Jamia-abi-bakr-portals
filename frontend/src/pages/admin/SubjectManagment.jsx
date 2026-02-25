/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { useSubject } from '../../contexts/SubjectContext';
import { useClass } from '../../contexts/ClassContext';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

// ─── Normalise a raw teacher record into a flat shape usable everywhere ───────
//
// AdminContext.teachers (from adminService.getAllTeachers) stores Teacher records:
//   { id: Teacher.id, userId, specialization, user: { id, name, email } }
//
// Subject.teacherId = Teacher.id
// We normalise to: { teacherId, name, specialization }
const normaliseTeacher = (raw) => {
  if (!raw?.id) return null;

  // Shape A: Teacher record direct from adminService.getAllTeachers
  //   { id: Teacher.id, user: { name }, specialization }
  if (raw.user?.name) {
    return {
      teacherId:      raw.id,                    // Teacher.id ✓
      name:           raw.user.name,
      specialization: raw.specialization || '',
    };
  }

  // Shape B: User record with nested teacherProfile (other contexts)
  //   { id: User.id, name, teacherProfile: { id: Teacher.id, specialization } }
  if (raw.teacherProfile?.id) {
    return {
      teacherId:      raw.teacherProfile.id,     // Teacher.id ✓
      name:           raw.name || 'Unknown',
      specialization: raw.teacherProfile.specialization || '',
    };
  }

  return null;
};

const SubjectManagement = () => {
  const {
    subjects,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    assignTeacherToSubject,
    loading: subjectLoading,
  } = useSubject();

  const { classes, fetchClasses } = useClass();
  const { teachers: rawTeachers, fetchTeachers } = useAdmin();

  // ── Normalise teachers from AdminContext ──────────────────────────────────
  // AdminContext.teachers = Teacher records: { id: Teacher.id, user: { name }, specialization }
  // After normalisation: { teacherId: Teacher.id, name, specialization }
  const teachers = Array.isArray(rawTeachers)
    ? rawTeachers.map(normaliseTeacher).filter(Boolean)
    : [];

  // teachersLoading tracks the AdminContext loading state
  const teachersLoading = false; // AdminContext loading is shared with subjectLoading

  // ── UI state ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]           = useState('');
  const [classFilter, setClassFilter]         = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [actionMenu, setActionMenu]           = useState(null);
  const [isEditing, setIsEditing]             = useState(false);
  const [editSubjectId, setEditSubjectId]     = useState(null);

  const [editForm, setEditForm] = useState({
    name: '', code: '', classRoomId: '', teacherId: ''
  });
  const [newSubject, setNewSubject] = useState({
    name: '', code: '', classRoomId: '', teacherId: ''
  });
  const [assignmentData, setAssignmentData] = useState({
    subjectId: '', teacherId: ''
  });

  const actionMenuRef = useRef(null);
  const loading = subjectLoading;

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchTeachers();
  }, [fetchSubjects, fetchClasses, fetchTeachers]);

  // ── Close action menu on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target))
        setActionMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const availableClasses = Array.isArray(classes) ? classes : [];

  const filteredSubjects = Array.isArray(subjects)
    ? subjects.filter(s => {
        const matchSearch =
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchClass = classFilter === 'ALL' || s.classRoomId === classFilter;
        return matchSearch && matchClass;
      })
    : [];

  // ── Teacher helpers ────────────────────────────────────────────────────────

  // Find normalised teacher by Teacher.id (= Subject.teacherId)
  const findTeacherById = (teacherId) =>
    teachers.find(t => t.teacherId === teacherId) || null;

  // Get display info for a subject's teacher.
  // subject.teacher (populated by backend) has: { id: Teacher.id, user: { name }, specialization }
  const getTeacherFromSubject = (subject) => {
    if (subject.teacher?.user?.name) {
      return {
        teacherId:      subject.teacher.id,
        name:           subject.teacher.user.name,
        specialization: subject.teacher.specialization || '',
      };
    }
    if (subject.teacherId) return findTeacherById(subject.teacherId);
    return null;
  };

  const getClassById = (classId) => availableClasses.find(c => c.id === classId);

  // ── Resets ─────────────────────────────────────────────────────────────────
  const resetNewSubject = () =>
    setNewSubject({ name: '', code: '', classRoomId: '', teacherId: '' });

  const resetEditForm = () => {
    setEditSubjectId(null);
    setIsEditing(false);
    setEditForm({ name: '', code: '', classRoomId: '', teacherId: '' });
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await createSubject({
        name:        newSubject.name,
        code:        newSubject.code        || null,
        teacherId:   newSubject.teacherId   || null,   // Teacher.id ✓
        classRoomId: newSubject.classRoomId || null,
      });
      toast.success('Subject created successfully');
      setShowCreateModal(false);
      resetNewSubject();
    } catch (err) {
      toast.error(err.message || 'Failed to create subject');
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assignmentData.subjectId || !assignmentData.teacherId) {
      toast.error('Please select a teacher');
      return;
    }
    try {
      await assignTeacherToSubject(
        assignmentData.subjectId,
        assignmentData.teacherId   // Teacher.id ✓
      );
      toast.success('Teacher assigned successfully');
      setShowAssignModal(false);
      setAssignmentData({ subjectId: '', teacherId: '' });
      await fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign teacher');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await deleteSubject(subjectId);
      toast.success('Subject deleted successfully');
      setActionMenu(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete subject');
    }
  };

  const openEditMode = (subject) => {
    setEditSubjectId(subject.id);
    setEditForm({
      name:        subject.name        || '',
      code:        subject.code        || '',
      classRoomId: subject.classRoomId || '',
      teacherId:   subject.teacherId   || '',   // Teacher.id ✓
    });
    setIsEditing(true);
    setActionMenu(null);
  };

  const saveEdit = async (subjectId) => {
    try {
      await updateSubject(subjectId, {
        name:        editForm.name,
        code:        editForm.code        || null,
        classRoomId: editForm.classRoomId || null,
        teacherId:   editForm.teacherId   || null,   // Teacher.id ✓
      });
      toast.success('Subject updated successfully');
      resetEditForm();
      await fetchSubjects();
    } catch (err) {
      toast.error(err.message || 'Failed to update subject');
    }
  };

  const openAssignModal = (subject) => {
    setSelectedSubject(subject);
    setAssignmentData({
      subjectId: subject.id,
      teacherId: subject.teacherId || '',   // Teacher.id ✓
    });
    setShowAssignModal(true);
    setActionMenu(null);
  };

  const handleActionMenuClick = (e, subjectId) => {
    e.stopPropagation();
    setActionMenu(actionMenu === subjectId ? null : subjectId);
  };

  // ── Shared teacher <option> list ────────────────────────────────────────────
  const TeacherOptions = () => {
    if (teachersLoading) return <option disabled>Loading teachers…</option>;
    if (teachers.length === 0) return <option disabled>No teachers available</option>;
    return teachers.map(t => (
      <option key={t.teacherId} value={t.teacherId}>
        {t.name}{t.specialization ? ` (${t.specialization})` : ''}
      </option>
    ));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects by name or code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            >
              <option value="ALL">All Classes</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.grade ? ` - Grade ${c.grade}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
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
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No subjects found</h3>
            <p className="text-gray-500 text-sm">
              {subjects.length === 0
                ? 'Create your first subject to get started'
                : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const assignedClass   = subject.classRoom || getClassById(subject.classRoomId);
            const assignedTeacher = getTeacherFromSubject(subject);
            const cardIsEditing   = editSubjectId === subject.id;

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200 relative"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {subject.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      {cardIsEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm font-semibold"
                            placeholder="Subject name"
                          />
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) => setEditForm(p => ({ ...p, code: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-xs"
                            placeholder="Subject code (optional)"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{subject.name}</h3>
                          {subject.code && (
                            <p className="text-gray-500 text-xs sm:text-sm">Code: {subject.code}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action menu */}
                  {!cardIsEditing && (
                    <div className="relative flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => handleActionMenuClick(e, subject.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      {actionMenu === subject.id && (
                        <div
                          ref={actionMenuRef}
                          className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-36"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); openAssignModal(subject); }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <UserCheck className="h-3 w-3 text-blue-600" />
                            <span>Assign Teacher</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditMode(subject); }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Edit className="h-3 w-3 text-gray-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Class assignment */}
                <div className="mb-3">
                  {cardIsEditing ? (
                    <select
                      value={editForm.classRoomId}
                      onChange={(e) => setEditForm(p => ({ ...p, classRoomId: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                    >
                      <option value="">No class assigned</option>
                      {availableClasses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.grade ? ` - Grade ${c.grade}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : assignedClass ? (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <School className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium">{assignedClass.name}</span>
                      {assignedClass.grade && (
                        <span className="text-gray-500">(Grade {assignedClass.grade})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No class assigned</div>
                  )}
                </div>

                {/* Teacher section */}
                <div className="border-t border-gray-100 pt-3">
                  {cardIsEditing ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Assigned Teacher</p>
                      <select
                        value={editForm.teacherId}
                        onChange={(e) => setEditForm(p => ({ ...p, teacherId: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        disabled={teachersLoading}
                      >
                        <option value="">No teacher assigned</option>
                        <TeacherOptions />
                      </select>
                    </div>
                  ) : assignedTeacher ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {assignedTeacher.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{assignedTeacher.name}</p>
                          {assignedTeacher.specialization && (
                            <p className="text-xs text-gray-400 truncate">{assignedTeacher.specialization}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        <UserCheck className="h-3.5 w-3.5 text-green-500" />
                        <button
                          onClick={() => openAssignModal(subject)}
                          className="text-xs text-[#F59E0B] hover:text-[#D97706] font-medium transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAssignModal(subject)}
                      className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] border border-dashed border-[#F59E0B] hover:border-[#D97706] rounded-lg py-2 text-xs font-medium transition-all duration-200"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Assign Teacher</span>
                    </button>
                  )}
                </div>

                {/* Edit actions */}
                {cardIsEditing && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                      onClick={resetEditForm}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" /><span>Cancel</span>
                    </button>
                    <button
                      onClick={() => saveEdit(subject.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg text-xs hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 flex items-center space-x-1"
                    >
                      <Save className="h-3 w-3" /><span>Save</span>
                    </button>
                  </div>
                )}

                {/* Created date */}
                {!cardIsEditing && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-1 text-gray-400 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>Created {new Date(subject.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Subject Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Subject</h2>
              <p className="text-gray-600 text-sm mt-1">Add a new subject to the system</p>
            </div>

            <form onSubmit={handleCreateSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  placeholder="e.g., Quran, Arabic, Islamic Studies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code (Optional)</label>
                <input
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject(p => ({ ...p, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  placeholder="e.g., QUR-101, ARB-102"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Class (Optional)</label>
                <select
                  value={newSubject.classRoomId}
                  onChange={(e) => setNewSubject(p => ({ ...p, classRoomId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                >
                  <option value="">No class assigned</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.grade ? ` - Grade ${c.grade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Assign Teacher (Optional)
                  {teachersLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                </label>
                <select
                  value={newSubject.teacherId}
                  onChange={(e) => setNewSubject(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  disabled={teachersLoading}
                >
                  <option value="">No teacher assigned</option>
                  <TeacherOptions />
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetNewSubject(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Creating…' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Teacher Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign Teacher</h2>
              <p className="text-gray-600 text-sm mt-1">
                Assign a teacher to{' '}
                <span className="font-semibold text-gray-800">{selectedSubject?.name}</span>
              </p>
            </div>

            <form onSubmit={handleAssignTeacher} className="p-6 space-y-4">
              {/* Currently assigned banner */}
              {selectedSubject && getTeacherFromSubject(selectedSubject) && (
                <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <UserCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Currently assigned:{' '}
                    <span className="font-semibold">{getTeacherFromSubject(selectedSubject).name}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Select Teacher *
                  {teachersLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                </label>
                <select
                  required
                  value={assignmentData.teacherId}
                  onChange={(e) => setAssignmentData(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                  disabled={teachersLoading}
                >
                  <option value="">Choose a teacher</option>
                  <TeacherOptions />
                </select>

                {/* Empty state with retry */}
                {!teachersLoading && teachers.length === 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-red-500">No teachers found.</p>
                    <button
                      type="button"
                      onClick={fetchTeachers}
                      className="text-xs text-[#F59E0B] underline hover:text-[#D97706]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setAssignmentData({ subjectId: '', teacherId: '' }); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !assignmentData.teacherId || teachersLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Assigning…' : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubjectManagement;