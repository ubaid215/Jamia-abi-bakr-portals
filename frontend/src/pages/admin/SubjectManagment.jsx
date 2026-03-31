/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Import extracted components
import CreateSubjectModal from '../../components/subjects/CreateSubjectModal';
import AssignTeacherModal from '../../components/subjects/AssignTeacherModal';
import SubjectCard from '../../components/subjects/SubjectCard';
import LoadingSkeleton from '../../components/subjects/LoadingSkeleton';
import EmptyState from '../../components/subjects/EmptyState';

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ─── Normalise a raw teacher record into a flat shape usable everywhere ───────
const normaliseTeacher = (raw) => {
  if (!raw?.id) return null;

  // Filter out terminated teachers
  const status = raw.user?.status || raw.status;
  if (status === 'TERMINATED') return null;

  // Shape A: Teacher record direct from adminService.getAllTeachers
  if (raw.user?.name) {
    return {
      teacherId:      raw.id,
      name:           raw.user.name,
      specialization: raw.specialization || '',
      status:         raw.user.status || raw.status,
    };
  }

  // Shape B: User record with nested teacherProfile
  if (raw.teacherProfile?.id) {
    return {
      teacherId:      raw.teacherProfile.id,
      name:           raw.name || 'Unknown',
      specialization: raw.teacherProfile.specialization || '',
      status:         raw.status,
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

  // ── Normalise teachers with memoization and filter terminated ──────────────────
  const teachers = useMemo(() => {
    if (!Array.isArray(rawTeachers)) return [];
    return rawTeachers.map(normaliseTeacher).filter(Boolean);
  }, [rawTeachers]);

  const teachersLoading = false;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState(null);

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

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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

  // ── Derived data with useMemo ───────────────────────────────────────────────
  const availableClasses = useMemo(() => 
    Array.isArray(classes) ? classes : [], 
    [classes]
  );

  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(s => {
      const matchSearch =
        s.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchClass = classFilter === 'ALL' || s.classRoomId === classFilter;
      return matchSearch && matchClass;
    });
  }, [subjects, debouncedSearchTerm, classFilter]);

  // ── Teacher helpers with useCallback ────────────────────────────────────────
  const findTeacherById = useCallback((teacherId) =>
    teachers.find(t => t.teacherId === teacherId) || null,
    [teachers]
  );

  const getTeacherFromSubject = useCallback((subject) => {
    if (subject.teacher?.user?.name) {
      return {
        teacherId:      subject.teacher.id,
        name:           subject.teacher.user.name,
        specialization: subject.teacher.specialization || '',
      };
    }
    if (subject.teacherId) return findTeacherById(subject.teacherId);
    return null;
  }, [findTeacherById]);

  const getClassById = useCallback((classId) => 
    availableClasses.find(c => c.id === classId),
    [availableClasses]
  );

  // ── Resets ─────────────────────────────────────────────────────────────────
  const resetNewSubject = useCallback(() =>
    setNewSubject({ name: '', code: '', classRoomId: '', teacherId: '' }), []
  );

  const resetEditForm = useCallback(() => {
    setEditSubjectId(null);
    setIsEditing(false);
    setEditForm({ name: '', code: '', classRoomId: '', teacherId: '' });
  }, []);

  // ── Handlers with useCallback ───────────────────────────────────────────────
  const handleCreateSubject = useCallback(async (formData) => {
    try {
      await createSubject({
        name:        formData.name,
        code:        formData.code || null,
        teacherId:   formData.teacherId || null,
        classRoomId: formData.classRoomId || null,
      });
      toast.success('Subject created successfully');
      setShowCreateModal(false);
      resetNewSubject();
    } catch (err) {
      toast.error(err.message || 'Failed to create subject');
    }
  }, [createSubject, resetNewSubject]);

  const handleAssignTeacher = useCallback(async (subjectId, teacherId) => {
    if (!subjectId || !teacherId) {
      toast.error('Please select a teacher');
      return;
    }
    try {
      await assignTeacherToSubject(subjectId, teacherId);
      toast.success('Teacher assigned successfully');
      setShowAssignModal(false);
      setAssignmentData({ subjectId: '', teacherId: '' });
      await fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign teacher');
    }
  }, [assignTeacherToSubject, fetchSubjects]);

  const handleDeleteSubject = useCallback(async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await deleteSubject(subjectId);
      toast.success('Subject deleted successfully');
      setActionMenu(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete subject');
    }
  }, [deleteSubject]);

  const openEditMode = useCallback((subject) => {
    setEditSubjectId(subject.id);
    setEditForm({
      name:        subject.name || '',
      code:        subject.code || '',
      classRoomId: subject.classRoomId || '',
      teacherId:   subject.teacherId || '',
    });
    setIsEditing(true);
    setActionMenu(null);
  }, []);

  const saveEdit = useCallback(async (subjectId) => {
    try {
      await updateSubject(subjectId, {
        name:        editForm.name,
        code:        editForm.code || null,
        classRoomId: editForm.classRoomId || null,
        teacherId:   editForm.teacherId || null,
      });
      toast.success('Subject updated successfully');
      resetEditForm();
      await fetchSubjects();
    } catch (err) {
      toast.error(err.message || 'Failed to update subject');
    }
  }, [editForm, updateSubject, resetEditForm, fetchSubjects]);

  const openAssignModal = useCallback((subject) => {
    setSelectedSubject(subject);
    setAssignmentData({
      subjectId: subject.id,
      teacherId: subject.teacherId || '',
    });
    setShowAssignModal(true);
    setActionMenu(null);
  }, []);

  const handleActionMenuClick = useCallback((e, subjectId) => {
    e.stopPropagation();
    setActionMenu(prev => prev === subjectId ? null : subjectId);
  }, []);

  // ── Shared teacher options list (memoized) ────────────────────────────────
  const TeacherOptions = useMemo(() => {
    return ({ exclude = [] }) => {
      if (teachersLoading) return <option disabled>Loading teachers…</option>;
      if (teachers.length === 0) return <option disabled>No teachers available</option>;
      const filteredTeachers = teachers.filter(t => !exclude.includes(t.teacherId));
      return filteredTeachers.map(t => (
        <option key={t.teacherId} value={t.teacherId}>
          {t.name}{t.specialization ? ` (${t.specialization})` : ''}
        </option>
      ));
    };
  }, [teachers, teachersLoading]);

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
          Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} />)
        ) : filteredSubjects.length === 0 ? (
          <EmptyState 
            itemsCount={subjects?.length || 0} 
            searchTerm={debouncedSearchTerm}
            icon={BookOpen}
            title="No subjects found"
            actionText="Create your first subject to get started"
          />
        ) : (
          filteredSubjects.map((subject) => {
            const assignedClass = subject.classRoom || getClassById(subject.classRoomId);
            const assignedTeacher = getTeacherFromSubject(subject);
            const cardIsEditing = editSubjectId === subject.id;

            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                assignedClass={assignedClass}
                assignedTeacher={assignedTeacher}
                isEditing={cardIsEditing}
                editForm={editForm}
                setEditForm={setEditForm}
                actionMenu={actionMenu}
                actionMenuRef={actionMenuRef}
                availableClasses={availableClasses}
                teachersLoading={teachersLoading}
                TeacherOptions={TeacherOptions}
                loading={loading}
                onActionMenuClick={handleActionMenuClick}
                onOpenAssignModal={openAssignModal}
                onOpenEditMode={openEditMode}
                onDeleteSubject={handleDeleteSubject}
                onSaveEdit={saveEdit}
                onCancelEdit={resetEditForm}
              />
            );
          })
        )}
      </div>

      {/* Modals - Extracted Components */}
      <CreateSubjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetNewSubject();
        }}
        onSubmit={handleCreateSubject}
        loading={loading}
        availableClasses={availableClasses}
        teachersLoading={teachersLoading}
        TeacherOptions={TeacherOptions}
      />

      <AssignTeacherModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignmentData({ subjectId: '', teacherId: '' });
        }}
        onSubmit={handleAssignTeacher}
        subject={selectedSubject}
        assignmentData={assignmentData}
        setAssignmentData={setAssignmentData}
        assignedTeacher={selectedSubject ? getTeacherFromSubject(selectedSubject) : null}
        loading={loading}
        teachersLoading={teachersLoading}
        teachers={teachers}
        onRetryFetch={fetchTeachers}
        TeacherOptions={TeacherOptions}
      />
    </div>
  );
};

export default SubjectManagement;