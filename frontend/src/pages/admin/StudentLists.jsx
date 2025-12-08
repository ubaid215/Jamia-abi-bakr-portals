import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Mail, Phone, MapPin, BookOpen, Calendar, 
  GraduationCap, Users, TrendingUp, History, CheckSquare, Square, Eye
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import BatchPromotionModal from '../../components/BatchPromotionModal';
import { toast } from 'react-hot-toast';

const StudentLists = () => {
  const { students, fetchStudents, loading } = useAdmin();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ============================================
  // Helper Functions for Safe Data Access
  // ============================================
  
  const getStudentName = (student) => 
    student.user?.name || student.name || 'Unknown Student';

  const getStudentEmail = (student) => 
    student.user?.email || student.email || 'No email';

  const getStudentStatus = (student) => 
    student.user?.status || student.status || 'UNKNOWN';

  const getStudentProfileImage = (student) => 
    student.user?.profileImage || 
    student.profileImage || 
    student.studentProfile?.profileImage || 
    null;

  const getStudentUserId = (student) => 
    student.user?.id || student.userId || student.id;

  const getCurrentClass = (student) => 
    student.currentEnrollment?.classRoom || 
    student.currentClass || 
    student.classRoom || 
    student.studentProfile?.currentEnrollment?.classRoom || 
    null;

  const getAdmissionNo = (student) => 
    student.admissionNo || student.studentProfile?.admissionNo || 'N/A';

  // ============================================
  // Profile Image URL Generation
  // ============================================
  
  // Generate profile image URL - Using PUBLIC endpoint (no auth required)
const getProfileImageUrl = useCallback((student) => {
  try {
    const userId = getStudentUserId(student);
    const profileImage = getStudentProfileImage(student);
    
    if (!profileImage) {
      console.log(`⚠️ No profile image found for student`, student);
      return null;
    }

    // If already a full URL, return as-is
    if (profileImage.startsWith('http') || profileImage.startsWith('data:')) {
      console.log(`🔗 Using existing URL:`, profileImage);
      return profileImage;
    }

    // CRITICAL: Use PUBLIC endpoint - does NOT require authentication
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    
    // OLD (Wrong): const imageUrl = `${baseUrl}/admin/files/profile-image/${userId}`;
    // NEW (Correct): Use public endpoint
    const imageUrl = `${baseUrl}/admin/public/profile-image/${userId}`;
    
    console.log(`🖼️ Generated PUBLIC image URL for ${getStudentName(student)}:`, imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('❌ Error generating profile image URL:', error);
    return null;
  }
}, []);

  // ============================================
  // Student Selection Handlers
  // ============================================
  
  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      return isSelected 
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student];
    });
  };

  const selectAllStudents = () => {
    setSelectedStudents(
      selectedStudents.length === filteredStudents.length 
        ? [] 
        : [...filteredStudents]
    );
  };

  const isStudentSelected = (studentId) => 
    selectedStudents.some(s => s.id === studentId);

  // ============================================
  // Filtering Logic
  // ============================================
  
  const filteredStudents = Array.isArray(students) 
    ? students.filter(student => {
        const studentName = getStudentName(student).toLowerCase();
        const studentEmail = getStudentEmail(student).toLowerCase();
        const admissionNo = getAdmissionNo(student).toLowerCase();
        const studentStatus = getStudentStatus(student);
        const currentClass = getCurrentClass(student);
        const className = currentClass?.name || '';

        const matchesSearch = 
          studentName.includes(searchTerm.toLowerCase()) ||
          studentEmail.includes(searchTerm.toLowerCase()) ||
          admissionNo.includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || studentStatus === statusFilter;
        const matchesClass = classFilter === 'ALL' || className === classFilter;

        return matchesSearch && matchesStatus && matchesClass;
      })
    : [];

  const uniqueClasses = Array.isArray(students) 
    ? [...new Set(students
        .map(student => getCurrentClass(student)?.name)
        .filter(Boolean)
      )]
    : [];

  // ============================================
  // Style Helpers
  // ============================================
  
  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
      INACTIVE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      TERMINATED: 'bg-red-100 text-red-800 border-red-200'
    };
    return `${colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'} border`;
  };

  const getClassTypeColor = (type) => {
    const colors = {
      REGULAR: 'bg-blue-100 text-blue-800 border-blue-200',
      HIFZ: 'bg-purple-100 text-purple-800 border-purple-200',
      NAZRA: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return `${colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'} border`;
  };

  // ============================================
  // Event Handlers
  // ============================================
  
  const handleStudentClick = (student, e) => {
    if (e.target.type === 'checkbox' || 
        e.target.closest('.selection-checkbox') || 
        e.target.closest('button')) {
      return;
    }
    navigate(`/admin/students/${getStudentUserId(student)}`);
  };

  const handlePromotionSuccess = () => {
    setSelectedStudents([]);
    fetchStudents();
    toast.success('Students promoted successfully');
  };

  // Mock attendance - replace with real API data
  const getStudentAttendance = () => ({ present: 0, total: 0, percentage: 0 });

  // ============================================
  // Render
  // ============================================
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Student Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1">
              Manage students and track their progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedStudents.length > 0 && (
              <button
                onClick={() => setShowPromotionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Promote ({selectedStudents.length})</span>
              </button>
            )}
            <div className="text-sm text-[#B45309] bg-white px-3 py-2 rounded-lg border border-[#FDE68A] shadow-sm">
              📊 Total: {filteredStudents.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, email, or admission number..."
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

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base shadow-sm"
              >
                <option value="ALL">All Classes</option>
                {uniqueClasses.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Controls */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={selectAllStudents}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors duration-200"
              >
                {selectedStudents.length === filteredStudents.length ? (
                  <CheckSquare className="h-5 w-5 text-[#F59E0B]" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
              {selectedStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    📋 {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedStudents([])}
                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          // Loading Skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))
        ) : filteredStudents.length === 0 ? (
          <EmptyState studentsCount={students.length} />
        ) : (
          filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              studentName={getStudentName(student)}
              studentEmail={getStudentEmail(student)}
              studentStatus={getStudentStatus(student)}
              admissionNo={getAdmissionNo(student)}
              currentClass={getCurrentClass(student)}
              attendance={getStudentAttendance()}
              selected={isStudentSelected(student.id)}
              profileImageUrl={getProfileImageUrl(student)}
              onToggleSelection={() => toggleStudentSelection(student)}
              onClick={(e) => handleStudentClick(student, e)}
              onViewHistory={() => navigate(`/admin/students/${student.id}/history`)}
              onViewDetails={() => navigate(`/admin/students/${student.id}`)}
              getStatusColor={getStatusColor}
              getClassTypeColor={getClassTypeColor}
            />
          ))
        )}
      </div>

      {/* Selection Summary */}
      {selectedStudents.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{selectedStudents.length}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-500">Ready for promotion</p>
              </div>
            </div>
            <button
              onClick={() => setShowPromotionModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200"
            >
              Promote Now
            </button>
          </div>
        </div>
      )}

      {/* Batch Promotion Modal */}
      <BatchPromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        selectedStudents={selectedStudents}
        onSuccess={handlePromotionSuccess}
      />
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

const EmptyState = ({ studentsCount }) => (
  <div className="col-span-full text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200">
    <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {studentsCount === 0 ? 'No students enrolled yet' : 'No students found'}
    </h3>
    <p className="text-gray-500 text-sm">
      {studentsCount === 0 
        ? 'Use the enrollment page to register new students' 
        : 'Try adjusting your search criteria'
      }
    </p>
  </div>
);

const StudentCard = ({ 
  student, studentName, studentEmail, studentStatus, admissionNo, 
  currentClass, attendance, selected, profileImageUrl, onToggleSelection, 
  onClick, onViewHistory, onViewDetails, getStatusColor, getClassTypeColor
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg border transition-all duration-300 cursor-pointer group hover:shadow-xl ${
      selected 
        ? 'border-[#F59E0B] ring-2 ring-[#F59E0B] ring-opacity-30 bg-gradient-to-br from-[#FFFBEB] to-white' 
        : 'border-gray-100 hover:border-[#F59E0B] bg-gradient-to-br from-white to-gray-50'
    }`}
  >
    {/* Student Header */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3 flex-1">
        <div 
          className="selection-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            className="w-5 h-5 text-[#F59E0B] border-gray-300 rounded focus:ring-[#F59E0B] cursor-pointer hover:border-[#F59E0B] transition-colors"
          />
        </div>
        
        <ProfileImage 
          profileImageUrl={profileImageUrl}
          studentName={studentName}
          studentStatus={studentStatus}
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#92400E] truncate">
            {studentName}
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm truncate">
            🎫 Admission: {admissionNo}
          </p>
          {currentClass && (
            <p className="text-gray-600 text-xs mt-1 truncate">
              🏫 {currentClass.name}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(studentStatus)}`}>
          {studentStatus}
        </span>
        {currentClass && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(currentClass.type)}`}>
            {currentClass.type}
          </span>
        )}
      </div>
    </div>

    {/* Contact Info */}
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
        <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="truncate">{studentEmail}</span>
      </div>
      {student.guardianPhone && (
        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
          <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">📞 {student.guardianPhone}</span>
        </div>
      )}
      {student.address && (
        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm p-2 bg-gray-50 rounded-lg">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">{student.address}</span>
        </div>
      )}
    </div>

    {/* Guardian & Class Info */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {currentClass && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Class</p>
            <p className="text-sm font-medium text-gray-900 truncate">{currentClass.name}</p>
          </div>
        </div>
      )}
      {student.guardianName && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Guardian</p>
            <p className="text-sm font-medium text-gray-900 truncate">{student.guardianName}</p>
          </div>
        </div>
      )}
    </div>

    {/* Attendance */}
    <div className="border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Attendance</span>
        </div>
        <span className="text-xs font-medium text-gray-500">This Month</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">{attendance.present}</span>
            <span className="text-sm text-gray-500">/ {attendance.total} days</span>
          </div>
          <span className={`text-sm font-bold ${
            attendance.percentage > 80 ? 'text-green-600' : 
            attendance.percentage > 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {attendance.percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              attendance.percentage > 80 ? 'bg-green-500' : 
              attendance.percentage > 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(attendance.percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onViewHistory();
        }}
        className="flex-1 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-medium transition-all duration-200 py-2.5 border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm"
      >
        <History className="h-3 w-3" />
        <span>History</span>
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        className="flex-1 flex items-center justify-center gap-2 text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-all duration-200 py-2.5 border border-[#FDE68A] rounded-xl hover:bg-[#FFFBEB] hover:border-[#F59E0B] hover:shadow-sm"
      >
        <Eye className="h-3 w-3" />
        <span>Details</span>
      </button>
    </div>
  </div>
);

const ProfileImage = ({ profileImageUrl, studentName, studentStatus }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [profileImageUrl]);

  const shouldShowImage = profileImageUrl && !imgError;

  return (
    <div className="relative flex-shrink-0">
      {shouldShowImage ? (
        <>
          {!imgLoaded && (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full animate-pulse" />
          )}
          
          <img
            src={profileImageUrl}
            alt={studentName}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-[#F59E0B] ${
              imgLoaded ? 'block' : 'hidden'
            }`}
            onLoad={() => {
              console.log(`✅ Image loaded: ${studentName}`);
              setImgLoaded(true);
            }}
            onError={() => {
              console.error(`❌ Image failed: ${studentName}`, profileImageUrl);
              setImgError(true);
            }}
          />
        </>
      ) : (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg text-sm">
          {initials}
        </div>
      )}
      
      {studentStatus === 'ACTIVE' && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
};

export default StudentLists;