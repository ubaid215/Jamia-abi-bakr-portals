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
  Users,
  UserCheck,
  UserX,
  Edit,
  Download,
  Shield,
  Heart,
  AlertTriangle,
  BarChart3,
  FileText,
  Home,
  Award
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, fetchStudents, updateUserStatus, loading, getStudentDetails } = useAdmin();
  const [student, setStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setDetailsLoading(true);
        
        // First, try to find student in existing list
        const foundStudent = students.find(s => 
          s.id === id || s.user?.id === id || s.userId === id
        );
        
        if (foundStudent) {
          setStudent(foundStudent);
        } else if (students.length === 0) {
          await fetchStudents();
        }

        // Fetch detailed student information
        if (getStudentDetails) {
          const details = await getStudentDetails(id);
          setStudentDetails(details);
        }
      } catch (error) {
        console.error('Error loading student data:', error);
        toast.error('Failed to load student details');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadStudentData();
  }, [id, students, fetchStudents, getStudentDetails]);

  // Helper function to safely get student data
  const getStudentData = () => {
    if (studentDetails) {
      return studentDetails;
    }
    
    if (student) {
      // Handle the nested structure from getAllStudents response
      return {
        ...student,
        user: student.user || {
          name: student.name,
          email: student.email,
          status: student.status,
          phone: student.phone,
          profileImage: student.profileImage,
          createdAt: student.createdAt
        }
      };
    }
    
    return null;
  };

  const currentStudent = getStudentData();

  const handleStatusChange = async (newStatus) => {
    try {
      const userId = currentStudent.user?.id || currentStudent.id;
      await updateUserStatus(userId, newStatus);
      toast.success(`Student status updated to ${newStatus}`);
      // Refresh student data
      fetchStudents();
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

  const getGradeColor = (grade) => {
    if (grade?.includes('A')) return 'bg-green-100 text-green-800';
    if (grade?.includes('B')) return 'bg-blue-100 text-blue-800';
    if (grade?.includes('C')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getClassTypeColor = (type) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-100 text-blue-800';
      case 'HIFZ': return 'bg-purple-100 text-purple-800';
      case 'NAZRA': return 'bg-orange-100 text-orange-800';
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

  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if ((loading || detailsLoading) && !currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Student not found</h3>
        <button 
          onClick={() => navigate('/admin/students')}
          className="text-[#F59E0B] hover:text-[#D97706] text-sm font-medium"
        >
          Back to Students
        </button>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const user = currentStudent.user || {};
  const profile = currentStudent.profile || currentStudent;
  const academic = currentStudent.academic || {};
  const progress = currentStudent.progress || {};
  const parents = currentStudent.parents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate('/admin/students')}
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
                  {user.name?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {user.name}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">
                  {academic.currentEnrollment?.classRoom?.name || 'Not enrolled'} • 
                  Roll No: {academic.currentEnrollment?.rollNumber || 'N/A'}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Admission: {profile.admissionNo}
                  </span>
                  {academic.currentEnrollment?.classRoom?.type && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(academic.currentEnrollment.classRoom.type)}`}>
                      {academic.currentEnrollment.classRoom.type}
                    </span>
                  )}
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
        <div className="flex space-x-1 overflow-x-auto">
          {['overview', 'academic', 'progress', 'attendance', 'medical', 'history', 'parents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'academic' && 'Academic'}
              {tab === 'progress' && 'Progress'}
              {tab === 'attendance' && `Attendance (${academic.attendance?.percentage || 0}%)`}
              {tab === 'medical' && 'Medical'}
              {tab === 'history' && `History (${academic.classHistory?.length || 0})`}
              {tab === 'parents' && `Parents (${parents.length})`}
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
                  <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(profile.dob)} />
                  <InfoItem icon={Calendar} label="Age" value={profile.dob ? `${calculateAge(profile.dob)} years` : 'Unknown'} />
                  <InfoItem icon={Shield} label="Gender" value={profile.gender} />
                  <InfoItem icon={MapPin} label="Place of Birth" value={profile.placeOfBirth} />
                  <InfoItem icon={Shield} label="Nationality" value={profile.nationality} />
                  <InfoItem icon={Shield} label="Religion" value={profile.religion} />
                  <InfoItem icon={Heart} label="Blood Group" value={profile.bloodGroup} />
                </div>
              </div>

              {/* Current Enrollment */}
              {academic.currentEnrollment && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Enrollment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={BookOpen} label="Class" value={academic.currentEnrollment.classRoom?.name} />
                    <InfoItem icon={GraduationCap} label="Class Type" value={academic.currentEnrollment.classRoom?.type} />
                    <InfoItem icon={Users} label="Roll Number" value={academic.currentEnrollment.rollNumber} />
                    <InfoItem icon={Calendar} label="Start Date" value={formatDate(academic.currentEnrollment.startDate)} />
                    {academic.currentEnrollment.classRoom?.grade && (
                      <InfoItem icon={Award} label="Grade Level" value={academic.currentEnrollment.classRoom.grade} />
                    )}
                  </div>
                </div>
              )}

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={MapPin} label="Address" value={profile.address} />
                  <InfoItem icon={Home} label="City" value={profile.city} />
                  <InfoItem icon={Home} label="Province" value={profile.province} />
                  <InfoItem icon={Home} label="Postal Code" value={profile.postalCode} />
                </div>
              </div>
            </div>

            {/* Status & Guardian */}
            <div className="space-y-6">
              {/* Statistics */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <StatItem 
                    label="Attendance Rate" 
                    value={`${academic.attendance?.percentage || 0}%`} 
                  />
                  <StatItem 
                    label="Present Days" 
                    value={academic.attendance?.present || 0} 
                  />
                  <StatItem 
                    label="Total Days" 
                    value={academic.attendance?.total || 0} 
                  />
                  {progress.averagePercentage && (
                    <StatItem 
                      label="Average Score" 
                      value={`${progress.averagePercentage}%`} 
                    />
                  )}
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

              {/* Guardian Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h3>
                <div className="space-y-3 text-sm">
                  <InfoItem icon={Users} label="Name" value={profile.guardianName} />
                  <InfoItem icon={Users} label="Relation" value={profile.guardianRelation} />
                  <InfoItem icon={Phone} label="Phone" value={profile.guardianPhone} />
                  <InfoItem icon={Mail} label="Email" value={profile.guardianEmail} />
                  <InfoItem icon={Shield} label="Occupation" value={profile.guardianOccupation} />
                  <InfoItem icon={Shield} label="CNIC" value={profile.guardianCNIC} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
            
            {academic.currentEnrollment ? (
              <>
                {/* Class Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Current Class</h4>
                    <p className="text-2xl font-bold text-[#92400E]">{academic.currentEnrollment.classRoom?.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{academic.currentEnrollment.classRoom?.type?.toLowerCase()}</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Roll Number</h4>
                    <p className="text-2xl font-bold text-[#92400E]">{academic.currentEnrollment.rollNumber}</p>
                    <p className="text-sm text-gray-600">Class Position</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Enrollment Date</h4>
                    <p className="text-2xl font-bold text-[#92400E]">
                      {academic.currentEnrollment.startDate ? new Date(academic.currentEnrollment.startDate).getFullYear() : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Academic Year</p>
                  </div>
                </div>

                {/* Class Details */}
                {academic.currentEnrollment.classRoom && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Class Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoItem icon={BookOpen} label="Class Name" value={academic.currentEnrollment.classRoom.name} />
                      <InfoItem icon={GraduationCap} label="Class Type" value={academic.currentEnrollment.classRoom.type} />
                      <InfoItem icon={Award} label="Grade Level" value={academic.currentEnrollment.classRoom.grade} />
                      <InfoItem icon={Users} label="Section" value={academic.currentEnrollment.classRoom.section} />
                      {academic.currentEnrollment.classRoom.teacher && (
                        <InfoItem icon={Users} label="Class Teacher" value={academic.currentEnrollment.classRoom.teacher.user?.name} />
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>Not currently enrolled in any class</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {progress.type === 'HIFZ' ? 'Hifz Progress' : 
               progress.type === 'NAZRA' ? 'Nazra Progress' : 
               'Academic Progress'}
            </h3>
            
            {progress.type ? (
              <>
                {/* Progress Summary */}
                {progress.completionStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {progress.completionStats.completionPercentage?.toFixed(1)}%
                      </div>
                      <div className="text-sm text-green-600">Completion</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        {progress.completionStats.parasCompleted || 0}
                      </div>
                      <div className="text-sm text-blue-600">Paras Completed</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-800">
                        {progress.completionStats.totalLinesCompleted || 0}
                      </div>
                      <div className="text-sm text-purple-600">Lines Completed</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-800">
                        {progress.completionStats.averageDailyLines?.toFixed(1) || 0}
                      </div>
                      <div className="text-sm text-orange-600">Avg Daily Lines</div>
                    </div>
                  </div>
                )}

                {/* Recent Progress */}
                {progress.progress && progress.progress.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Progress</h4>
                    <div className="space-y-3">
                      {progress.progress.slice(0, 5).map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {formatDate(item.date)}
                            </span>
                            <span className="text-sm text-gray-600">
                              by {item.teacher?.user?.name || 'Teacher'}
                            </span>
                          </div>
                          {progress.type === 'HIFZ' && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Sabaq Lines: </span>
                                <span className="font-medium">{item.sabaqLines}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Current Para: </span>
                                <span className="font-medium">{item.currentPara}</span>
                              </div>
                            </div>
                          )}
                          {progress.type === 'NAZRA' && (
                            <div>
                              <span className="text-gray-600">Recited Lines: </span>
                              <span className="font-medium">{item.recitedLines}</span>
                            </div>
                          )}
                          {progress.type === 'REGULAR' && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Subject: </span>
                                <span className="font-medium">{item.subject?.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Percentage: </span>
                                <span className="font-medium">{(item.percentage * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No progress data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Record</h3>
            
            {academic.attendance ? (
              <>
                {/* Attendance Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">
                      {academic.attendance.percentage?.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Attendance</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-800">
                      {academic.attendance.present}
                    </div>
                    <div className="text-sm text-gray-600">Present Days</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-800">
                      {academic.attendance.total - academic.attendance.present}
                    </div>
                    <div className="text-sm text-gray-600">Absent Days</div>
                  </div>
                </div>

                {/* Recent Attendance */}
                {academic.attendance.recent && academic.attendance.recent.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Attendance</h4>
                    <div className="space-y-3">
                      {academic.attendance.recent.slice(0, 10).map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                          <div className="flex-1">
                            <span className="font-medium text-sm">
                              {formatDate(record.date)} - {record.classRoom?.name}
                            </span>
                            {record.subject && (
                              <span className="text-sm text-gray-600 ml-2">({record.subject.name})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                              record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                            {record.teacher && (
                              <span className="text-gray-600">by {record.teacher.user?.name}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No attendance records found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem icon={AlertTriangle} label="Medical Conditions" value={profile.medicalConditions || 'None'} />
                <InfoItem icon={AlertTriangle} label="Allergies" value={profile.allergies || 'None'} />
                <InfoItem icon={AlertTriangle} label="Medication" value={profile.medication || 'None'} />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Emergency Notes</h4>
                <p className="text-sm text-yellow-700">
                  In case of emergency, please contact {profile.guardianName || 'the guardian'} immediately 
                  {profile.guardianPhone && ` at ${profile.guardianPhone}`} and follow the medical instructions provided.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment History</h3>
            
            {academic.classHistory && academic.classHistory.length > 0 ? (
              <div className="space-y-3">
                {academic.classHistory.map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#F59E0B] transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold">
                        {enrollment.classRoom?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{enrollment.classRoom?.name}</h4>
                        <p className="text-sm text-gray-600">
                          {enrollment.classRoom?.grade && `Grade ${enrollment.classRoom.grade} • `}
                          {enrollment.classRoom?.type} • Roll No: {enrollment.rollNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(enrollment.startDate)} 
                          {enrollment.endDate && ` to ${formatDate(enrollment.endDate)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        enrollment.isCurrent ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {enrollment.isCurrent ? 'Current' : 'Completed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No enrollment history available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parents' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
            
            {parents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {parents.map((parent, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold">
                        {parent.user?.name?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{parent.user?.name}</h4>
                        <p className="text-sm text-gray-600">{parent.user?.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoItem icon={Phone} label="Phone" value={parent.user?.phone} />
                      <InfoItem icon={Users} label="Relation" value="Parent" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No parent/guardian information available</p>
              </div>
            )}
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

export default StudentDetail;