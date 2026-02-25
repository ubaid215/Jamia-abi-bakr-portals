import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Mail, Phone, MapPin, BookOpen, Clock,
  GraduationCap, User, MoreVertical, Eye, Edit,
  UserCheck, UserX, Trash2, X
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/ui/Pagination'; 

const TeacherLists = () => {
  const { teachers, fetchTeachers, loading } = useAdmin();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [teachersToUpdate, setTeachersToUpdate] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // ============================================
  // Helper Functions
  // ============================================

  const getTeacherName = (teacher) =>
    teacher.user?.name || teacher.name || 'Unknown Teacher';

  const getTeacherEmail = (teacher) =>
    teacher.user?.email || teacher.email || 'No email';

  const getTeacherStatus = (teacher) =>
    teacher.user?.status || teacher.status || 'UNKNOWN';

  const getTeacherPhone = (teacher) =>
    teacher.user?.phone || teacher.phone || '';

  const getTeacherProfileImage = (teacher) =>
    teacher.user?.profileImage || teacher.profileImage || null;

  const getTeacherUserId = (teacher) =>
    teacher.user?.id || teacher.userId || teacher.id;

  const getProfileImageUrl = useCallback((teacher) => {
    try {
      const userId = getTeacherUserId(teacher);
      const profileImage = getTeacherProfileImage(teacher);
      if (!profileImage) return null;
      if (profileImage.startsWith('http') || profileImage.startsWith('data:')) return profileImage;
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
      return `${baseUrl}/admin/public/profile-image/${userId}`;
    } catch (error) {
      console.error('Error generating profile image URL:', error);
      return null;
    }
  }, []);

  // ============================================
  // Teacher Selection Handlers
  // ============================================

  const toggleTeacherSelection = (teacher) => {
    setSelectedTeachers(prev => {
      const isSelected = prev.some(t => getTeacherUserId(t) === getTeacherUserId(teacher));
      return isSelected
        ? prev.filter(t => getTeacherUserId(t) !== getTeacherUserId(teacher))
        : [...prev, teacher];
    });
  };

  const selectAllTeachers = () => {
    setSelectedTeachers(
      selectedTeachers.length === filteredTeachers.length ? [] : [...filteredTeachers]
    );
  };

  const isTeacherSelected = (teacher) =>
    selectedTeachers.some(t => getTeacherUserId(t) === getTeacherUserId(teacher));

  // ============================================
  // Dropdown Menu Handlers
  // ============================================

  const toggleDropdown = (teacherId) => {
    setDropdownOpen(dropdownOpen === teacherId ? null : teacherId);
  };

  const handleUpdateStatus = (teacher, status) => {
    setTeachersToUpdate([teacher]);
    setSelectedStatus(status);
    setShowStatusModal(true);
    setDropdownOpen(null);
  };

  const handleBulkUpdateStatus = (status) => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select at least one teacher');
      return;
    }
    setTeachersToUpdate([...selectedTeachers]);
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  // ============================================
  // Delete Functions
  // ============================================

  const deleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone and will delete all teacher data including attendance, progress, and documents.')) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.delete(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message || 'Teacher deleted successfully');
      setSelectedTeachers(prev => prev.filter(t => getTeacherUserId(t) !== teacherId));
      fetchTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast.error(error.response?.data?.error || 'Failed to delete teacher');
    }
  };

  const handleBulkDelete = () => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select at least one teacher to delete');
      return;
    }
    const teacherNames = selectedTeachers.map(t => getTeacherName(t)).join(', ');
    if (!window.confirm(`Are you sure you want to delete ${selectedTeachers.length} teacher(s)?\n\nSelected teachers: ${teacherNames}\n\nThis action cannot be undone.`)) return;

    const deletePromises = selectedTeachers.map(async (teacher) => {
      const teacherId = getTeacherUserId(teacher);
      const token = localStorage.getItem('authToken');
      return axios.delete(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    });

    Promise.allSettled(deletePromises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      if (successful > 0) toast.success(`Successfully deleted ${successful} teacher(s)`);
      if (failed > 0) toast.error(`Failed to delete ${failed} teacher(s)`);
      setSelectedTeachers([]);
      fetchTeachers();
    });
  };

  // ============================================
  // Status Update Functions
  // ============================================

  const handleStatusUpdate = async () => {
    if (!selectedStatus) { toast.error('Please select a status'); return; }
    if (teachersToUpdate.length === 0) { toast.error('No teachers selected'); return; }
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('authToken');
      const promises = teachersToUpdate.map((teacher) => {
        const teacherId = getTeacherUserId(teacher);
        return axios.put(
          `${API_BASE_URL}/admin/teachers/${teacherId}/status`,
          { status: selectedStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });
      await Promise.all(promises);
      toast.success(`Updated status to ${selectedStatus} for ${teachersToUpdate.length} teacher(s)`);
      setShowStatusModal(false);
      setSelectedStatus('');
      setTeachersToUpdate([]);
      fetchTeachers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ============================================
  // Filtering & Pagination Logic
  // ============================================

  const filteredTeachers = Array.isArray(teachers)
    ? teachers.filter(teacher => {
      const teacherName = getTeacherName(teacher).toLowerCase();
      const teacherEmail = getTeacherEmail(teacher).toLowerCase();
      const specialization = (teacher.specialization || '').toLowerCase();
      const teacherStatus = getTeacherStatus(teacher);
      const matchesSearch =
        teacherName.includes(searchTerm.toLowerCase()) ||
        teacherEmail.includes(searchTerm.toLowerCase()) ||
        specialization.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || teacherStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    : [];

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ============================================
  // Style Helpers
  // ============================================

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-yellow-100 text-yellow-800',
      TERMINATED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleTeacherClick = (teacher, e) => {
    if (
      e.target.type === 'checkbox' ||
      e.target.closest('.selection-checkbox') ||
      e.target.closest('button') ||
      e.target.closest('.dropdown-menu')
    ) return;
    navigate(`/admin/teachers/${getTeacherUserId(teacher)}`);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Teacher Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1">
              Manage teachers and view their details
            </p>
          </div>
          {selectedTeachers.length > 0 && (
            <div className="text-sm text-[#B45309] bg-white px-3 py-2 rounded-lg border border-[#FDE68A] shadow-sm">
              📊 Selected: {selectedTeachers.length}
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers by name, email, or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base shadow-sm"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          {filteredTeachers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-200 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAllTeachers}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors duration-200"
                >
                  <span className="font-medium">
                    {selectedTeachers.length === filteredTeachers.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>

                {selectedTeachers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-6 border-l border-gray-300" />
                    <span className="text-sm font-medium text-gray-600">Bulk Actions:</span>
                    <button onClick={() => handleBulkUpdateStatus('ACTIVE')} className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors">
                      <UserCheck className="h-3 w-3" /> Activate
                    </button>
                    <button onClick={() => handleBulkUpdateStatus('INACTIVE')} className="flex items-center gap-1 text-xs text-yellow-600 hover:bg-yellow-50 px-2 py-1 rounded transition-colors">
                      <UserX className="h-3 w-3" /> Deactivate
                    </button>
                    <button onClick={() => handleBulkUpdateStatus('TERMINATED')} className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                      <UserX className="h-3 w-3" /> Terminate
                    </button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors border border-red-200">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>

              {selectedTeachers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    📋 {selectedTeachers.length} teacher{selectedTeachers.length > 1 ? 's' : ''} selected
                  </span>
                  <button onClick={() => setSelectedTeachers([])} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors">
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton key={index} />)
        ) : filteredTeachers.length === 0 ? (
          <EmptyState teachersCount={Array.isArray(teachers) ? teachers.length : 0} />
        ) : (
          paginatedTeachers.map((teacher) => (
            <TeacherCard
              key={getTeacherUserId(teacher)}
              teacher={teacher}
              teacherName={getTeacherName(teacher)}
              teacherEmail={getTeacherEmail(teacher)}
              teacherStatus={getTeacherStatus(teacher)}
              teacherPhone={getTeacherPhone(teacher)}
              profileImageUrl={getProfileImageUrl(teacher)}
              selected={isTeacherSelected(teacher)}
              dropdownOpen={dropdownOpen === getTeacherUserId(teacher)}
              onToggleDropdown={() => toggleDropdown(getTeacherUserId(teacher))}
              onUpdateStatus={(status) => handleUpdateStatus(teacher, status)}
              onDelete={() => deleteTeacher(getTeacherUserId(teacher))}
              onToggleSelection={() => toggleTeacherSelection(teacher)}
              onClick={(e) => handleTeacherClick(teacher, e)}
              getStatusColor={getStatusColor}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredTeachers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTeachers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[6, 12, 24, 48]}
          showItemsPerPage={true}
          itemLabel="teachers"
        />
      )}

      {/* Floating Selection Summary */}
      {selectedTeachers.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 min-w-[300px]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{selectedTeachers.length}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTeachers.length} teacher{selectedTeachers.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-500">Ready for actions</p>
              </div>
            </div>
            <button onClick={() => setSelectedTeachers([])} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleBulkUpdateStatus('ACTIVE')} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
              <UserCheck className="h-4 w-4" /> Activate
            </button>
            <button onClick={() => handleBulkUpdateStatus('INACTIVE')} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors">
              <UserX className="h-4 w-4" /> Deactivate
            </button>
            <button onClick={handleBulkDelete} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Update Status for {teachersToUpdate.length} Teacher{teachersToUpdate.length > 1 ? 's' : ''}
              </h3>
              <button onClick={() => { setShowStatusModal(false); setSelectedStatus(''); setTeachersToUpdate([]); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  <option value="">Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Teachers ({teachersToUpdate.length})</h4>
                <div className="space-y-1">
                  {teachersToUpdate.map((teacher, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600">{getTeacherName(teacher)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(getTeacherStatus(teacher))}`}>
                        {getTeacherStatus(teacher)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => { setShowStatusModal(false); setSelectedStatus(''); setTeachersToUpdate([]); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updatingStatus}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {updatingStatus ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Updating...</>
                  ) : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Sub-Components
// ============================================

const LoadingSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  </div>
);

const EmptyState = ({ teachersCount }) => (
  <div className="col-span-full text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200">
    <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {teachersCount === 0 ? 'No teachers enrolled yet' : 'No teachers found'}
    </h3>
    <p className="text-gray-500 text-sm">
      {teachersCount === 0
        ? 'Use the enrollment page to register new teachers'
        : 'Try adjusting your search criteria'}
    </p>
  </div>
);

const TeacherCard = ({
  teacher,
  teacherName,
  teacherEmail,
  teacherStatus,
  teacherPhone,
  profileImageUrl,
  selected,
  dropdownOpen,
  onToggleDropdown,
  onUpdateStatus,
  onDelete,
  onToggleSelection,
  onClick,
  getStatusColor
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const initials = teacherName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [profileImageUrl]);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg border transition-all duration-300 cursor-pointer group hover:shadow-xl relative ${
        selected
          ? 'border-[#F59E0B] ring-2 ring-[#F59E0B] ring-opacity-30 bg-gradient-to-br from-[#FFFBEB] to-white'
          : 'border-gray-100 hover:border-[#F59E0B] bg-gradient-to-br from-white to-gray-50'
      }`}
    >
      {/* Teacher Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="selection-checkbox" onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {}}
              className="w-5 h-5 text-[#F59E0B] border-gray-300 rounded focus:ring-[#F59E0B] cursor-pointer"
            />
          </div>

          <div className="relative flex-shrink-0">
            {profileImageUrl && !imgError ? (
              <>
                {!imgLoaded && <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full animate-pulse" />}
                <img
                  src={profileImageUrl}
                  alt={teacherName}
                  loading="lazy"
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-[#F59E0B] ${imgLoaded ? 'block' : 'hidden'}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base border-2 border-white shadow-lg">
                {initials}
              </div>
            )}
            {teacherStatus === 'ACTIVE' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#92400E] truncate transition-colors">
              {teacherName}
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm truncate">
              {teacher.specialization || 'General Teacher'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(teacherStatus)}`}>
            {teacherStatus}
          </span>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu absolute right-0 top-8 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="py-1">
                  <button onClick={(e) => { e.stopPropagation(); onClick(e); onToggleDropdown(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Eye className="h-4 w-4" /> View Details
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Edit className="h-4 w-4" /> Edit Teacher
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={(e) => { e.stopPropagation(); onUpdateStatus('ACTIVE'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50">
                    <UserCheck className="h-4 w-4" /> Activate
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onUpdateStatus('INACTIVE'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50">
                    <UserX className="h-4 w-4" /> Deactivate
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onUpdateStatus('TERMINATED'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <UserX className="h-4 w-4" /> Terminate
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); onToggleDropdown(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete Teacher
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">{teacherEmail}</span>
        </div>
        {teacherPhone && (
          <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span>📞 {teacherPhone}</span>
          </div>
        )}
        {teacher.address && (
          <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{teacher.address}</span>
          </div>
        )}
      </div>

      {/* Professional Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {teacher.experience && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Experience</p>
              <p className="text-sm font-medium text-gray-900">{teacher.experience} yrs</p>
            </div>
          </div>
        )}
        {teacher.qualification && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Qualification</p>
              <p className="text-sm font-medium text-gray-900 truncate">{teacher.qualification}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {(teacher.classes?.length > 0 || teacher.subjects?.length > 0) && (
        <div className="border-t border-gray-100 pt-3 mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            {teacher.classes?.length > 0 && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{teacher.classes.length} Class{teacher.classes.length > 1 ? 'es' : ''}</span>
              </div>
            )}
            {teacher.subjects?.length > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{teacher.subjects.length} Subject{teacher.subjects.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bio Preview */}
      {teacher.bio && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-600 line-clamp-2">{teacher.bio}</p>
        </div>
      )}

      {/* View Details CTA */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(e); }}
          className="w-full text-center text-[#F59E0B] hover:text-[#D97706] text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
        >
          <span>View Full Details</span>
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherLists;