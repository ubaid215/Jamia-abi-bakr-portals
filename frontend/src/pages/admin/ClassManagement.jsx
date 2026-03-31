/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  UserPlus,
  UserMinus,
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';
import classService from '../../services/classService';

// Import extracted components
import CreateClassModal from '../../components/classes/CreateClassModal';
import EditClassModal from '../../components/classes/EditClassModal';
import AssignTeacherModal from '../../components/classes/AssignTeacherModal';
import ManageTeachersModal from '../../components/classes/ManageTeachersModal';
import ClassCard from '../../components/classes/ClassCard';
import LoadingSkeleton from '../../components/classes/LoadingSkeleton';
import EmptyState from '../../components/classes/EmptyState';

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

// ─── Teacher normalisation ────────────────────────────────────────────────────
const normaliseTeacher = (raw) => {
  if (!raw?.id) return null;
  
  // Filter out terminated teachers
  const status = raw.user?.status || raw.status;
  if (status === 'TERMINATED') return null;
  
  if (raw.user?.name) {
    return {
      teacherId:      raw.id,
      name:           raw.user.name,
      email:          raw.user.email || '',
      specialization: raw.specialization || '',
      status:         raw.user.status || raw.status,
    };
  }
  if (raw.teacherProfile?.id) {
    return {
      teacherId:      raw.teacherProfile.id,
      name:           raw.name || 'Unknown',
      email:          raw.email || '',
      specialization: raw.teacherProfile.specialization || '',
      status:         raw.status,
    };
  }
  return null;
};

// ─── Role config ──────────────────────────────────────────────────────────────
export const ROLE_OPTIONS = [
  { value: 'CLASS_TEACHER',   label: 'Class Teacher',   color: 'bg-purple-100 text-purple-800' },
  { value: 'SUBJECT_TEACHER', label: 'Subject Teacher', color: 'bg-blue-100 text-blue-800'   },
  { value: 'CO_TEACHER',      label: 'Co-Teacher',      color: 'bg-teal-100 text-teal-800'   },
];

export const getRoleConfig = (role) =>
  ROLE_OPTIONS.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-700' };

// ─── Component ────────────────────────────────────────────────────────────────
const ClassManagement = () => {
  const {
    classes, fetchClasses, createClass, updateClass, deleteClass,
    assignTeacherToClass, loading
  } = useClass();
  const { teachers: rawTeachers, fetchTeachers } = useAdmin();

  // Filter out terminated teachers
  const availableTeachers = useMemo(() => {
    if (!Array.isArray(rawTeachers)) return [];
    return rawTeachers.map(normaliseTeacher).filter(Boolean);
  }, [rawTeachers]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ── Modal visibility ─────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [showEditModal,   setShowEditModal]     = useState(false);
  const [showAssignModal, setShowAssignModal]   = useState(false);
  const [showTeachersModal, setShowTeachersModal] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [actionMenu,    setActionMenu]    = useState(null);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading,   setEditLoading]   = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Multi-teacher panel state ─────────────────────────────────────────────
  const [classTeachers,      setClassTeachers]      = useState([]);
  const [teachersLoading,    setTeachersLoading]    = useState(false);
  const [addTeacherForm,     setAddTeacherForm]     = useState({ teacherId: '', role: 'SUBJECT_TEACHER' });
  const [addingTeacher,      setAddingTeacher]      = useState(false);
  const [removingTeacherId,  setRemovingTeacherId]  = useState(null);

  const actionMenuRef = useRef(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const emptyClassForm = { name: '', grade: '', section: '', type: 'REGULAR', description: '', teacherId: '' };
  const [newClass,        setNewClass]        = useState(emptyClassForm);
  const [editClass,       setEditClass]       = useState(emptyClassForm);
  const [assignmentData,  setAssignmentData]  = useState({ classId: '', teacherId: '' });

  useEffect(() => { 
    fetchClasses(); 
    fetchTeachers(); 
  }, [fetchClasses, fetchTeachers]);

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target))
        setActionMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    // Reset pagination if needed
  }, [debouncedSearchTerm, typeFilter]);

  // ── Derived with useMemo ───────────────────────────────────────────────────
  const filteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    return classes.filter(c => {
      const matchSearch =
        (c.name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (c.grade || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (c.section || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return matchSearch && (typeFilter === 'ALL' || c.type === typeFilter);
    });
  }, [classes, debouncedSearchTerm, typeFilter]);

  // ── Teacher helpers (memoized) ───────────────────────────────────────────
  const findTeacher = useCallback((teacherId) =>
    availableTeachers.find(t => t.teacherId === teacherId) || null, 
    [availableTeachers]
  );

  const getPrimaryTeacher = useCallback((classItem) => {
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
  }, [findTeacher]);

  const getClassTeacherCount = useCallback((classItem) =>
    classItem.classTeachers?.length ?? (classItem.teacherId ? 1 : 0), []
  );

  const getStudentCount = useCallback((c) => 
    c._count?.enrollments ?? c.enrollments?.length ?? 0, []
  );

  const getSubjectCount = useCallback((c) => 
    c._count?.subjects ?? c.subjects?.length ?? 0, []
  );

  // ── Styling (memoized) ───────────────────────────────────────────────────
  const getTypeColor = useCallback((type) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'HIFZ':    return 'bg-purple-100 text-purple-800';
      case 'NAZRA':   return 'bg-orange-100 text-orange-800';
      default:        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // ── Handlers: CRUD ────────────────────────────────────────────────────────
  const handleCreateClass = useCallback(async (formData) => {
    setCreateLoading(true);
    try {
      await createClass({ ...formData, teacherId: formData.teacherId || null });
      toast.success('Class created successfully');
      setShowCreateModal(false);
      setNewClass(emptyClassForm);
      await fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to create class');
    } finally {
      setCreateLoading(false);
    }
  }, [createClass, fetchClasses, emptyClassForm]);

  const handleEditClass = useCallback(async (formData) => {
    setEditLoading(true);
    try {
      await updateClass(selectedClass.id, {
        name:        formData.name,
        grade:       formData.grade || null,
        section:     formData.section || null,
        type:        formData.type,
        description: formData.description || null,
        teacherId:   formData.teacherId || null,
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
  }, [selectedClass, updateClass, fetchClasses]);

  const handleAssignTeacher = useCallback(async (classId, teacherId) => {
    setAssignLoading(true);
    try {
      await assignTeacherToClass(classId, teacherId || null);
      toast.success('Primary teacher assigned successfully');
      setShowAssignModal(false);
      setAssignmentData({ classId: '', teacherId: '' });
      await fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to assign teacher');
    } finally {
      setAssignLoading(false);
    }
  }, [assignTeacherToClass, fetchClasses]);

  const handleDeleteClass = useCallback(async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteClass(classId);
      toast.success('Class deleted successfully');
      setActionMenu(null);
      await fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete class');
    }
  }, [deleteClass, fetchClasses]);

  // ── Handlers: Multi-teacher panel ────────────────────────────────────────
  const openTeachersModal = useCallback(async (classItem) => {
    setSelectedClass(classItem);
    setShowTeachersModal(true);
    setAddTeacherForm({ teacherId: '', role: 'SUBJECT_TEACHER' });
    setTeachersLoading(true);
    setActionMenu(null);
    try {
      const res = await classService.getClassTeachers(classItem.id);
      setClassTeachers(res.teachers || []);
    } catch {
      toast.error('Failed to load teachers');
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  const handleAddTeacher = useCallback(async (teacherId, role) => {
    if (!teacherId) return;
    setAddingTeacher(true);
    try {
      await classService.assignTeachers(selectedClass.id, [
        { teacherId, role }
      ]);
      toast.success('Teacher added successfully');
      setAddTeacherForm({ teacherId: '', role: 'SUBJECT_TEACHER' });
      const res = await classService.getClassTeachers(selectedClass.id);
      setClassTeachers(res.teachers || []);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add teacher');
    } finally {
      setAddingTeacher(false);
    }
  }, [selectedClass, fetchClasses]);

  const handleChangeRole = useCallback(async (teacherId, newRole) => {
    try {
      await classService.updateClassTeacherRole(selectedClass.id, teacherId, newRole);
      toast.success('Role updated');
      const res = await classService.getClassTeachers(selectedClass.id);
      setClassTeachers(res.teachers || []);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  }, [selectedClass, fetchClasses]);

  const handleRemoveTeacher = useCallback(async (teacherId, teacherName) => {
    if (!window.confirm(`Remove ${teacherName} from this class?`)) return;
    setRemovingTeacherId(teacherId);
    try {
      await classService.removeClassTeacher(selectedClass.id, teacherId);
      toast.success('Teacher removed');
      const res = await classService.getClassTeachers(selectedClass.id);
      setClassTeachers(res.teachers || []);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove teacher');
    } finally {
      setRemovingTeacherId(null);
    }
  }, [selectedClass, fetchClasses]);

  // ── Modal openers ─────────────────────────────────────────────────────────
  const openEditModal = useCallback((classItem) => {
    setSelectedClass(classItem);
    setEditClass({
      name:        classItem.name || '',
      grade:       classItem.grade || '',
      section:     classItem.section || '',
      type:        classItem.type || 'REGULAR',
      description: classItem.description || '',
      teacherId:   classItem.teacherId || '',
    });
    setShowEditModal(true);
    setActionMenu(null);
  }, []);

  const openAssignModal = useCallback((classItem) => {
    setSelectedClass(classItem);
    setAssignmentData({ classId: classItem.id, teacherId: classItem.teacherId || '' });
    setShowAssignModal(true);
    setActionMenu(null);
  }, []);

  const handleActionMenuClick = useCallback((e, classId) => {
    e.stopPropagation();
    setActionMenu(prev => prev === classId ? null : classId);
  }, []);

  // ── Shared teacher options list (memoized) ────────────────────────────────
  const TeacherOptions = useMemo(() => {
    return ({ exclude = [] }) => (
      availableTeachers.length === 0
        ? <option disabled>No teachers available</option>
        : availableTeachers
            .filter(t => !exclude.includes(t.teacherId))
            .map(t => (
              <option key={t.teacherId} value={t.teacherId}>
                {t.name}{t.specialization ? ` — ${t.specialization}` : ''}
              </option>
            ))
    );
  }, [availableTeachers]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Class Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1">
              Create classes, assign multiple teachers per class
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
              placeholder="Search by name, grade, or section…"
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
          Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} />)
        ) : filteredClasses.length === 0 ? (
          <EmptyState 
            classesCount={classes?.length || 0} 
            searchTerm={debouncedSearchTerm}
          />
        ) : (
          filteredClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              getPrimaryTeacher={getPrimaryTeacher}
              getClassTeacherCount={getClassTeacherCount}
              getStudentCount={getStudentCount}
              getSubjectCount={getSubjectCount}
              getTypeColor={getTypeColor}
              actionMenu={actionMenu}
              actionMenuRef={actionMenuRef}
              onActionMenuClick={handleActionMenuClick}
              onOpenTeachersModal={openTeachersModal}
              onOpenAssignModal={openAssignModal}
              onOpenEditModal={openEditModal}
              onDeleteClass={handleDeleteClass}
            />
          ))
        )}
      </div>

      {/* Modals - Extracted Components */}
      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClass}
        loading={createLoading}
        TeacherOptions={TeacherOptions}
      />

      <EditClassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditClass}
        classData={editClass}
        loading={editLoading}
        TeacherOptions={TeacherOptions}
      />

      <AssignTeacherModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSubmit={handleAssignTeacher}
        classData={selectedClass}
        assignmentData={assignmentData}
        setAssignmentData={setAssignmentData}
        loading={assignLoading}
        TeacherOptions={TeacherOptions}
        availableTeachers={availableTeachers}
      />

      <ManageTeachersModal
        isOpen={showTeachersModal}
        onClose={() => setShowTeachersModal(false)}
        classData={selectedClass}
        classTeachers={classTeachers}
        teachersLoading={teachersLoading}
        addTeacherForm={addTeacherForm}
        setAddTeacherForm={setAddTeacherForm}
        addingTeacher={addingTeacher}
        removingTeacherId={removingTeacherId}
        onAddTeacher={handleAddTeacher}
        onChangeRole={handleChangeRole}
        onRemoveTeacher={handleRemoveTeacher}
        TeacherOptions={TeacherOptions}
        availableTeachers={availableTeachers}
      />
    </div>
  );
};

export default ClassManagement;