import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Mail, Phone, MapPin, BookOpen, Clock, 
  GraduationCap, User
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

const TeacherLists = () => {
  const { teachers, fetchTeachers, loading } = useAdmin();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const getTeacherId = (teacher) => 
    teacher.user?.id || teacher.id;

  // Generate profile image URL - Using PUBLIC endpoint
  const getProfileImageUrl = useCallback((teacher) => {
    try {
      const userId = getTeacherId(teacher);
      const profileImage = getTeacherProfileImage(teacher);
      
      if (!profileImage) return null;

      if (profileImage.startsWith('http') || profileImage.startsWith('data:')) {
        return profileImage;
      }

      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
      return `${baseUrl}/admin/public/profile-image/${userId}`;
    } catch (error) {
      console.error('Error generating profile image URL:', error);
      return null;
    }
  }, []);

  // ============================================
  // Filtering Logic
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
  
  const handleTeacherClick = (teacher) => {
    const teacherId = getTeacherId(teacher);
    navigate(`/admin/teachers/${teacherId}`);
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
          <div className="text-sm text-[#B45309] bg-white px-3 py-2 rounded-lg border border-[#FDE68A] shadow-sm">
            📊 Total: {filteredTeachers.length}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
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

          {/* Status Filter */}
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
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))
        ) : filteredTeachers.length === 0 ? (
          <EmptyState teachersCount={teachers.length} />
        ) : (
          filteredTeachers.map((teacher) => (
            <TeacherCard
              key={getTeacherId(teacher)}
              teacher={teacher}
              teacherName={getTeacherName(teacher)}
              teacherEmail={getTeacherEmail(teacher)}
              teacherStatus={getTeacherStatus(teacher)}
              teacherPhone={getTeacherPhone(teacher)}
              profileImageUrl={getProfileImageUrl(teacher)}
              onClick={() => handleTeacherClick(teacher)}
              getStatusColor={getStatusColor}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================
// Sub-Components
// ============================================

const LoadingSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
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
        : 'Try adjusting your search criteria'
      }
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
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-gray-50"
    >
      {/* Teacher Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Profile Image */}
          <div className="relative flex-shrink-0">
            {profileImageUrl && !imgError ? (
              <>
                {!imgLoaded && (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full animate-pulse" />
                )}
                <img 
                  src={profileImageUrl} 
                  alt={teacherName}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-[#F59E0B] ${
                    imgLoaded ? 'block' : 'hidden'
                  }`}
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
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          {/* Teacher Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#92400E] truncate transition-colors">
              {teacherName}
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm truncate">
              {teacher.specialization || 'General Teacher'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(teacherStatus)}`}>
          {teacherStatus}
        </span>
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
          <p className="text-xs text-gray-600 line-clamp-2">
            {teacher.bio}
          </p>
        </div>
      )}

      {/* View Details CTA */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button className="w-full text-center text-[#F59E0B] hover:text-[#D97706] text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1">
          <span>View Full Details</span>
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherLists;