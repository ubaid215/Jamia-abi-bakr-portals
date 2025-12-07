import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
  TrendingUp,
  History,
  CheckSquare,
  Square
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

  // Toggle student selection
  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // Select all filtered students
  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents([...filteredStudents]);
    }
  };

  // Safe filtering with proper data access
  const filteredStudents = Array.isArray(students) 
    ? students.filter(student => {
        const userName = student.user?.name || student.name || '';
        const userEmail = student.user?.email || student.email || '';
        const userStatus = student.user?.status || student.status || '';
        const admissionNo = student.admissionNo || '';
        
        const currentClass = student.currentEnrollment?.classRoom || student.classRoom;
        const className = currentClass?.name || '';

        const matchesSearch = 
          userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admissionNo.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || userStatus === statusFilter;
        const matchesClass = classFilter === 'ALL' || className === classFilter;

        return matchesSearch && matchesStatus && matchesClass;
      })
    : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassTypeColor = (type) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'HIFZ': return 'bg-purple-100 text-purple-800';
      case 'NAZRA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStudentClick = (student, e) => {
    // Prevent navigation when clicking checkbox
    if (e.target.type === 'checkbox' || e.target.closest('.selection-checkbox')) {
      return;
    }
    const studentId = student.user?.id || student.id;
    navigate(`/admin/students/${studentId}`);
  };

  const getStudentData = (student) => {
    const currentClass = student.currentEnrollment?.classRoom || student.classRoom;
    
    return {
      id: student.id,
      user: student.user || { 
        id: student.id, 
        name: student.name || 'Unknown Student',
        email: student.email || 'No email',
        status: student.status || 'UNKNOWN',
        profileImage: student.profileImage
      },
      admissionNo: student.admissionNo || 'N/A',
      guardianName: student.guardianName || 'Not specified',
      guardianPhone: student.guardianPhone || '',
      address: student.address || '',
      currentEnrollment: student.currentEnrollment || null,
      currentClass: currentClass || null
    };
  };

  const uniqueClasses = Array.isArray(students) 
    ? [...new Set(students
        .map(student => {
          const currentClass = student.currentEnrollment?.classRoom || student.classRoom;
          return currentClass?.name;
        })
        .filter(Boolean)
      )]
    : [];

  const mockAttendance = {};

  const getStudentAttendance = (studentId) => {
    return mockAttendance[studentId] || { present: 0, total: 0, percentage: 0 };
  };

  const handlePromotionSuccess = () => {
    setSelectedStudents([]);
    fetchStudents();
    toast.success('Students promoted successfully');
  };

  const isStudentSelected = (studentId) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Student Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1 sm:mt-2">
              Manage students and track their progress
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {selectedStudents.length > 0 && (
              <button
                onClick={() => setShowPromotionModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Promote ({selectedStudents.length})</span>
              </button>
            )}
            <div className="text-sm text-[#B45309] bg-white px-3 py-2 rounded-lg border border-[#FDE68A]">
              Total: {filteredStudents.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, email, or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
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
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <button
                onClick={selectAllStudents}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedStudents.length === filteredStudents.length ? (
                  <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedStudents.length === filteredStudents.length 
                    ? 'Deselect All' 
                    : 'Select All'
                  }
                </span>
              </button>
              {selectedStudents.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                </span>
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
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {students.length === 0 ? 'No students enrolled yet' : 'No students found'}
            </h3>
            <p className="text-gray-500 text-sm">
              {students.length === 0 
                ? 'Use the enrollment page to register new students' 
                : 'Try adjusting your search criteria'
              }
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const studentData = getStudentData(student);
            const attendance = getStudentAttendance(studentData.id);
            const currentClass = studentData.currentClass;
            const selected = isStudentSelected(studentData.id);

            return (
              <div
                key={studentData.id}
                onClick={(e) => handleStudentClick(student, e)}
                className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg border transition-all duration-200 cursor-pointer group ${
                  selected 
                    ? 'border-[#F59E0B] ring-2 ring-[#F59E0B] ring-opacity-50' 
                    : 'border-gray-100 hover:border-[#F59E0B] hover:shadow-xl'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="selection-checkbox flex items-center space-x-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleStudentSelection(studentData)}
                      className="w-5 h-5 text-[#F59E0B] border-gray-300 rounded focus:ring-[#F59E0B] cursor-pointer"
                    />
                    {studentData.user.profileImage ? (
                      <img 
                        src={studentData.user.profileImage} 
                        alt={studentData.user.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                        {studentData.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-[#92400E]">
                        {studentData.user.name}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm">Admission: {studentData.admissionNo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(studentData.user.status)}`}>
                      {studentData.user.status}
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
                  <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{studentData.user.email}</span>
                  </div>
                  {studentData.guardianPhone && (
                    <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{studentData.guardianPhone}</span>
                    </div>
                  )}
                  {studentData.address && (
                    <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{studentData.address}</span>
                    </div>
                  )}
                </div>

                {/* Class & Guardian Info */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs sm:text-sm">
                  {currentClass && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{currentClass.name}</span>
                    </div>
                  )}
                  {studentData.guardianName && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{studentData.guardianName}</span>
                    </div>
                  )}
                </div>

                {/* Attendance & Progress */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Attendance</span>
                    <Calendar className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>This Month:</span>
                      <span className="font-medium">{attendance.present}/{attendance.total} days</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${attendance.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Rate:</span>
                      <span className="font-medium">{attendance.percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/students/${studentData.id}/history`);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors duration-200 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    <History className="h-3 w-3" />
                    <span>History</span>
                  </button>
                  <button className="flex-1 text-center text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-colors duration-200 py-2 border border-[#FDE68A] rounded-lg hover:bg-[#FFFBEB]">
                    View Details →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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

export default StudentLists;