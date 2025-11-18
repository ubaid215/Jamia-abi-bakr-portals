import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Clock,
  GraduationCap,
  User
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

  // Debug: Check the structure of teachers data
  useEffect(() => {
    if (teachers && teachers.length > 0) {
      console.log('Teachers data structure:', teachers[0]);
    }
  }, [teachers]);

  // Safe filtering with proper data access
  const filteredTeachers = Array.isArray(teachers) 
    ? teachers.filter(teacher => {
        // Handle nested user structure from your controller
        const userName = teacher.user?.name || teacher.name || '';
        const userEmail = teacher.user?.email || teacher.email || '';
        const userStatus = teacher.user?.status || teacher.status || '';
        const specialization = teacher.specialization || '';
        const phone = teacher.phone || teacher.user?.phone || '';

        const matchesSearch = 
          userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          specialization.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || userStatus === statusFilter;

        return matchesSearch && matchesStatus;
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

  // eslint-disable-next-line no-unused-vars
  const getLeaveStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTeacherClick = (teacher) => {
    // Use the correct ID - try user.id first, then teacher.id
    const teacherId = teacher.user?.id || teacher.id;
    navigate(`/admin/teachers/${teacherId}`);
  };

  // Helper function to safely get teacher data
  const getTeacherData = (teacher) => {
    return {
      id: teacher.user?.id || teacher.id,
      name: teacher.user?.name || teacher.name || 'Unknown Teacher',
      email: teacher.user?.email || teacher.email || 'No email',
      phone: teacher.user?.phone || teacher.phone || '',
      status: teacher.user?.status || teacher.status || 'UNKNOWN',
      profileImage: teacher.user?.profileImage || teacher.profileImage,
      specialization: teacher.specialization || 'General',
      experience: teacher.experience || '',
      qualification: teacher.qualification || '',
      address: teacher.address || '',
      bio: teacher.bio || ''
    };
  };

  // Mock leave requests data
  const mockLeaveRequests = {
    // This will be populated with actual teacher IDs
  };

  const getTeacherLeaveRequests = (teacherId) => {
    return mockLeaveRequests[teacherId] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Teacher Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1 sm:mt-2">
              Manage teachers and view their details
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-sm text-[#B45309] bg-white px-3 py-2 rounded-lg border border-[#FDE68A]">
            Total Teachers: {filteredTeachers.length}
          </div>
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
              placeholder="Search teachers by name, email, or specialization..."
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
        </div>
      </div>

      

      {/* Teachers Grid */}
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
        ) : filteredTeachers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {teachers.length === 0 ? 'No teachers enrolled yet' : 'No teachers found'}
            </h3>
            <p className="text-gray-500 text-sm">
              {teachers.length === 0 
                ? 'Use the enrollment page to register new teachers' 
                : 'Try adjusting your search criteria'
              }
            </p>
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const teacherData = getTeacherData(teacher);
            const leaveRequests = getTeacherLeaveRequests(teacherData.id);
            const pendingLeaves = leaveRequests.filter(req => req.status === 'PENDING').length;

            return (
              <div
                key={teacherData.id}
                onClick={() => handleTeacherClick(teacher)}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200 cursor-pointer group"
              >
                {/* Teacher Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {teacherData.profileImage ? (
                      <img 
                        src={teacherData.profileImage} 
                        alt={teacherData.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                        {teacherData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-[#92400E]">
                        {teacherData.name}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm">
                        {teacherData.specialization}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(teacherData.status)}`}>
                      {teacherData.status}
                    </span>
                    {pendingLeaves > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {pendingLeaves} Pending Leave{pendingLeaves > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{teacherData.email}</span>
                  </div>
                  {teacherData.phone && (
                    <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{teacherData.phone}</span>
                    </div>
                  )}
                  {teacherData.address && (
                    <div className="flex items-center space-x-2 text-gray-600 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{teacherData.address}</span>
                    </div>
                  )}
                </div>

                {/* Professional Details */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs sm:text-sm">
                  {teacherData.experience && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{teacherData.experience} yrs exp</span>
                    </div>
                  )}
                  {teacherData.qualification && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{teacherData.qualification}</span>
                    </div>
                  )}
                </div>

                {/* Bio Preview */}
                {teacherData.bio && (
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {teacherData.bio}
                    </p>
                  </div>
                )}

                {/* View Details CTA */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button className="w-full text-center text-[#F59E0B] hover:text-[#D97706] text-xs sm:text-sm font-medium transition-colors duration-200">
                    View Full Details →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TeacherLists;