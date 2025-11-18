import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  GraduationCap,
  Clock,
  DollarSign,
  UserCheck,
  UserX,
  Edit,
  Download,
  Shield,
  Briefcase,
  Award,
  Users,
  FileText
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { teachers, fetchTeachers, updateUserStatus, loading, getTeacherDetails } = useAdmin();
  const [teacher, setTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        setDetailsLoading(true);
        
        // First, try to find teacher in existing list
        const foundTeacher = teachers.find(t => 
          t.id === id || t.user?.id === id || t.userId === id
        );
        
        if (foundTeacher) {
          setTeacher(foundTeacher);
        } else if (teachers.length === 0) {
          await fetchTeachers();
        }

        // Fetch detailed teacher information
        if (getTeacherDetails) {
          const details = await getTeacherDetails(id);
          setTeacherDetails(details);
        }
      } catch (error) {
        console.error('Error loading teacher data:', error);
        toast.error('Failed to load teacher details');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadTeacherData();
  }, [id, teachers, fetchTeachers, getTeacherDetails]);

  // Helper function to safely get teacher data
  const getTeacherData = () => {
    if (teacherDetails) {
      return teacherDetails;
    }
    
    if (teacher) {
      // Handle the nested structure from getAllTeachers response
      return {
        ...teacher,
        user: teacher.user || {
          name: teacher.name,
          email: teacher.email,
          status: teacher.status,
          phone: teacher.phone,
          profileImage: teacher.profileImage,
          createdAt: teacher.createdAt
        }
      };
    }
    
    return null;
  };

  const currentTeacher = getTeacherData();

  const handleStatusChange = async (newStatus) => {
    try {
      const userId = currentTeacher.user?.id || currentTeacher.id;
      await updateUserStatus(userId, newStatus);
      toast.success(`Teacher status updated to ${newStatus}`);
      // Refresh teacher data
      fetchTeachers();
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(salary);
  };

  if ((loading || detailsLoading) && !currentTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
      </div>
    );
  }

  if (!currentTeacher) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Teacher not found</h3>
        <button 
          onClick={() => navigate('/admin/teachers')}
          className="text-[#F59E0B] hover:text-[#D97706] text-sm font-medium"
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const user = currentTeacher.user || {};
  const profile = currentTeacher.profile || currentTeacher;
  const assignments = currentTeacher.assignments || {};
  const statistics = currentTeacher.statistics || {};
  const recentActivities = currentTeacher.recentActivities || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate('/admin/teachers')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-4">
              {user.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#F59E0B]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {user.name?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {user.name}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">
                  {profile.specialization || 'Teacher'} • {profile.employmentType || 'Full-time'}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Since {formatDate(profile.joiningDate || user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-[#F59E0B] text-[#F59E0B] rounded-lg hover:bg-[#FFFBEB] transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
        <div className="flex space-x-1">
          {['overview', 'classes', 'subjects', 'leave', 'attendance', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'classes' && `Classes (${assignments.classes?.length || 0})`}
              {tab === 'subjects' && `Subjects (${assignments.subjects?.length || 0})`}
              {tab === 'leave' && `Leave (${recentActivities.leaveRequests?.length || 0})`}
              {tab === 'attendance' && 'Attendance'}
              {tab === 'documents' && 'Documents'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={Mail} label="Email" value={user.email} />
                  <InfoItem icon={Phone} label="Phone" value={user.phone || profile.phone} />
                  <InfoItem icon={MapPin} label="Address" value={profile.address} />
                  <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                  <InfoItem icon={Shield} label="CNIC" value={profile.cnic} />
                  <InfoItem icon={Calendar} label="Joining Date" value={formatDate(profile.joiningDate)} />
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={BookOpen} label="Qualification" value={profile.qualification} />
                  <InfoItem icon={GraduationCap} label="Specialization" value={profile.specialization} />
                  <InfoItem icon={Clock} label="Experience" value={profile.experience ? `${profile.experience} years` : 'Not specified'} />
                  <InfoItem icon={DollarSign} label="Salary" value={formatSalary(profile.salary)} />
                  <InfoItem icon={Briefcase} label="Employment Type" value={profile.employmentType} />
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Emergency Contact */}
              {profile.emergencyContactName && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={Users} label="Name" value={profile.emergencyContactName} />
                    <InfoItem icon={Phone} label="Phone" value={profile.emergencyContactPhone} />
                    <InfoItem icon={UserCheck} label="Relation" value={profile.emergencyContactRelation} />
                  </div>
                </div>
              )}
            </div>

            {/* Status & Statistics */}
            <div className="space-y-6">
              {/* Statistics */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                <div className="space-y-3">
                  <StatItem 
                    label="Classes Assigned" 
                    value={statistics.totalClasses || assignments.classes?.length || 0} 
                  />
                  <StatItem 
                    label="Subjects Teaching" 
                    value={statistics.totalSubjects || assignments.subjects?.length || 0} 
                  />
                  <StatItem 
                    label="Total Students" 
                    value={statistics.totalStudents || 0} 
                  />
                  <StatItem 
                    label="Attendance Marked" 
                    value={statistics.totalAttendanceMarked || 0} 
                  />
                  <StatItem 
                    label="Pending Leave Requests" 
                    value={statistics.pendingLeaveRequests || 0} 
                  />
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleStatusChange('ACTIVE')}
                    disabled={user.status === 'ACTIVE'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Activate Account</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('INACTIVE')}
                    disabled={user.status === 'INACTIVE'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Deactivate Account</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('TERMINATED')}
                    disabled={user.status === 'TERMINATED'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Terminate Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Classes</h3>
            {(!assignments.classes || assignments.classes.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No classes assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.classes.map((classItem) => (
                  <div key={classItem.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                    <h4 className="font-semibold text-gray-900 mb-2">{classItem.name}</h4>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        classItem.type === 'HIFZ' ? 'bg-purple-100 text-purple-800' :
                        classItem.type === 'NAZRA' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {classItem.type}
                      </span>
                      <span className="text-[#F59E0B] font-medium">
                        {classItem._count?.enrollments || 0} students
                      </span>
                    </div>
                    {classItem.grade && (
                      <p className="text-xs text-gray-600">Grade: {classItem.grade}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Subjects</h3>
            {(!assignments.subjects || assignments.subjects.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No subjects assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.subjects.map((subject) => (
                  <div key={subject.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                    <h4 className="font-semibold text-gray-900 mb-2">{subject.name}</h4>
                    <div className="space-y-1 text-sm">
                      {subject.classRoom && (
                        <p className="text-gray-600">Class: {subject.classRoom.name}</p>
                      )}
                      {subject.gradeLevel && (
                        <p className="text-gray-600">Grade: {subject.gradeLevel}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests</h3>
            {(!recentActivities.leaveRequests || recentActivities.leaveRequests.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.leaveRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#F59E0B] transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <span className="font-medium text-sm">
                          {formatDate(request.fromDate)} - {formatDate(request.toDate)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{request.reason}</p>
                      {request.response && (
                        <p className="text-gray-500 text-xs mt-1">Response: {request.response}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {request.status === 'PENDING' && (
                        <>
                          <button className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium hover:bg-green-200">
                            Approve
                          </button>
                          <button className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-medium hover:bg-red-200">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
            {(!recentActivities.attendanceMarked || recentActivities.attendanceMarked.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.attendanceMarked.map((attendance) => (
                  <div key={attendance.id} className="p-4 border border-gray-200 rounded-xl hover:border-[#F59E0B] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {attendance.student?.user?.name} - {attendance.classRoom?.name}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendance.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                        attendance.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                        attendance.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {attendance.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Date: {formatDate(attendance.date)}</span>
                      {attendance.subject && (
                        <span>Subject: {attendance.subject.name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No documents uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for info items
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || 'Not provided'}</p>
    </div>
  </div>
);

// Helper component for statistics
const StatItem = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-[#92400E]">{value}</span>
  </div>
);

export default TeacherDetail;