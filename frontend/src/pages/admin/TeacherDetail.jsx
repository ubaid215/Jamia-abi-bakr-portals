import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, GraduationCap,
  Clock, DollarSign, UserCheck, UserX, Edit, Download, Shield,
  Briefcase, Award, Users, FileText, Upload, Eye, Trash2, 
  CheckCircle, XCircle, Home, Heart, AlertTriangle, File,
  School, Building, CreditCard, User, FileSpreadsheet,
  TrendingUp, BarChart3, Plus
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { teachers, fetchTeachers, updateUserStatus, loading } = useAdmin();
  const [teacher, setTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [documentDetails, setDocumentDetails] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch teacher data
  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        setDetailsLoading(true);
        
        const foundTeacher = teachers.find(t => 
          t.id === id || t.user?.id === id || t.userId === id
        );
        
        if (foundTeacher) {
          setTeacher(foundTeacher);
        } else if (teachers.length === 0) {
          await fetchTeachers();
        }

        // Fetch detailed teacher information with documents
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/admin/teachers/${id}/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Teacher details with documents:', response.data);
        setTeacherDetails(response.data);
        setDocumentDetails(response.data.documents);
      } catch (error) {
        console.error('Error loading teacher data:', error);
        toast.error('Failed to load teacher details');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadTeacherData();
  }, [id, teachers, fetchTeachers]);

  // Helper functions
  const normalizeTeacherData = (data) => {
    if (!data) return null;
    
    if (data.teacher && data.profile && data.assignments) {
      return data;
    }
    
    if (data.teacherProfile) {
      return {
        teacher: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          profileImage: data.profileImage,
          status: data.status,
          createdAt: data.createdAt
        },
        profile: {
          ...data.teacherProfile,
          bio: data.teacherProfile.bio,
          specialization: data.teacherProfile.specialization,
          experience: data.teacherProfile.experience,
          qualification: data.teacherProfile.qualification,
          joiningDate: data.teacherProfile.joiningDate,
          salary: data.teacherProfile.salary,
          employmentType: data.teacherProfile.employmentType,
          dateOfBirth: data.teacherProfile.dateOfBirth,
          gender: data.teacherProfile.gender,
          cnic: data.teacherProfile.cnic,
          address: data.teacherProfile.address,
          phoneSecondary: data.teacherProfile.phoneSecondary,
          emergencyContactName: data.teacherProfile.emergencyContactName,
          emergencyContactPhone: data.teacherProfile.emergencyContactPhone,
          emergencyContactRelation: data.teacherProfile.emergencyContactRelation,
          bloodGroup: data.teacherProfile.bloodGroup,
          medicalConditions: data.teacherProfile.medicalConditions,
          bankName: data.teacherProfile.bankName,
          accountNumber: data.teacherProfile.accountNumber,
          iban: data.teacherProfile.iban
        },
        assignments: {
          classes: data.teacherProfile.classes || [],
          subjects: data.teacherProfile.subjects || []
        },
        statistics: {
          totalClasses: data.teacherProfile.classes?.length || 0,
          totalSubjects: data.teacherProfile.subjects?.length || 0,
          totalStudents: data.teacherProfile._count?.students || 0,
          totalAttendanceMarked: data.teacherProfile._count?.attendances || 0,
          pendingLeaveRequests: data.teacherProfile.pendingLeaveRequests || 0
        },
        recentActivities: {
          leaveRequests: data.leaveRequests || [],
          attendanceMarked: data.recentAttendance || []
        }
      };
    }
    
    return {
      teacher: data.user || {
        id: data.id,
        name: data.name,
        email: data.email,
        status: data.status,
        phone: data.phone,
        profileImage: data.profileImage,
        createdAt: data.createdAt
      },
      profile: data,
      assignments: {
        classes: data.classes || [],
        subjects: data.subjects || []
      },
      statistics: {},
      recentActivities: {}
    };
  };

  const getTeacherData = () => {
    if (teacherDetails) return normalizeTeacherData(teacherDetails);
    if (teacher) return normalizeTeacherData(teacher);
    return null;
  };

  const currentTeacher = getTeacherData();

  // Get profile image URL
  const getProfileImageUrl = () => {
    if (!currentTeacher?.teacher) return null;
    
    const userId = currentTeacher.teacher.id;
    const profileImage = currentTeacher.teacher.profileImage || teacherDetails?.teacher?.profileImage;
    
    if (!profileImage) return null;
    
    if (profileImage.startsWith('http') || profileImage.startsWith('data:')) {
      return profileImage;
    }
    
    return `${API_BASE_URL}/admin/public/profile-image/${userId}`;
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/admin/teachers/${id}/profile-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Profile image updated successfully');
      
      // Refresh teacher data
      await fetchTeachers();
      window.location.reload(); // Reload to show new image
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async () => {
    if (!selectedDocType || !uploadFile) {
      toast.error('Please select document type and file');
      return;
    }

    try {
      setUploadingDoc(true);
      
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('type', selectedDocType);

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/admin/teachers/${id}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedDocType('');
      
      // Refresh teacher data
      const docsResponse = await axios.get(`${API_BASE_URL}/admin/teachers/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherDetails(docsResponse.data);
      setDocumentDetails(docsResponse.data.documents);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle document download
  const handleDocumentDownload = async (type, index = null) => {
    try {
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE_URL}/admin/teachers/${id}/documents/${type}`;
      if (index !== null) {
        url += `?index=${index}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${type}-${Date.now()}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  // Handle document delete
  const handleDocumentDelete = async (type, index = null) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE_URL}/admin/teachers/${id}/documents/${type}`;
      if (index !== null) {
        url += `?index=${index}`;
      }

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Document deleted successfully');
      
      // Refresh teacher data
      const response = await axios.get(`${API_BASE_URL}/admin/teachers/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherDetails(response.data);
      setDocumentDetails(response.data.documents);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Handle document preview
  const handleDocumentPreview = (type, index = null) => {
    const urls = teacherDetails?.urls || {};
    let url;
    
    if (type === 'qualification') url = urls.qualificationCertificatesUrl?.[index] || urls.qualificationCertificateUrl;
    else if (type === 'cnic') url = urls.cnicUrl;
    else if (type === 'experience') url = urls.experienceCertificatesUrl?.[index] || urls.experienceCertificateUrl;
    else if (type === 'other') url = urls.otherDocumentsUrls?.[index];
    
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Document preview not available');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const userId = currentTeacher.teacher?.id || currentTeacher.id;
      await updateUserStatus(userId, newStatus);
      toast.success(`Teacher status updated to ${newStatus}`);
      fetchTeachers();
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  // Helper functions for styling
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

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(salary);
  };

  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return 'Unknown';
    }
  };

  // Helper to get classes data
  const getClassesData = () => {
    if (!currentTeacher) return [];
    
    if (currentTeacher.assignments?.classes?.length > 0) {
      return currentTeacher.assignments.classes;
    }
    
    if (currentTeacher.profile?.classes?.length > 0) {
      return currentTeacher.profile.classes;
    }
    
    if (currentTeacher.classes?.length > 0) {
      return currentTeacher.classes;
    }
    
    return [];
  };

  // Helper to get subjects data
  const getSubjectsData = () => {
    if (!currentTeacher) return [];
    
    if (currentTeacher.assignments?.subjects?.length > 0) {
      return currentTeacher.assignments.subjects;
    }
    
    if (currentTeacher.profile?.subjects?.length > 0) {
      return currentTeacher.profile.subjects;
    }
    
    if (currentTeacher.subjects?.length > 0) {
      return currentTeacher.subjects;
    }
    
    return [];
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
  const user = currentTeacher.teacher || currentTeacher.user || currentTeacher || {};
  const profile = currentTeacher.profile || {};
  const assignments = currentTeacher.assignments || {};
  const statistics = currentTeacher.statistics || {};
  const recentActivities = currentTeacher.recentActivities || {};
  const urls = teacherDetails?.urls || {};

  // Get actual classes and subjects data
  const classesData = getClassesData();
  const subjectsData = getSubjectsData();

  return (
    <div className="space-y-6">
      {/* Header with Profile Image */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate('/admin/teachers')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Profile Image with Edit */}
            <div className="relative group">
              {getProfileImageUrl() ? (
                <img 
                  src={getProfileImageUrl()} 
                  alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#F59E0B] cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {user.name?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}
              
              {/* Edit Overlay */}
              <label 
                htmlFor="profile-image-upload"
                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Upload className="h-6 w-6 text-white" />
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageUpload}
                  disabled={uploadingImage}
                />
              </label>
              
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
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
          
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button 
              onClick={() => navigate(`/admin/teachers/${id}/attendance`)}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <UserCheck className="h-4 w-4" />
              <span>Attendance</span>
            </button>
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
          {['overview', 'classes', 'subjects', 'documents', 'leave', 'attendance', 'bank'].map((tab) => (
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
              {tab === 'classes' && `Classes (${classesData.length || 0})`}
              {tab === 'subjects' && `Subjects (${subjectsData.length || 0})`}
              {tab === 'documents' && (
                <span className="flex items-center justify-center space-x-1">
                  <File className="h-4 w-4" />
                  <span>Documents</span>
                </span>
              )}
              {tab === 'leave' && `Leave (${recentActivities.leaveRequests?.length || 0})`}
              {tab === 'attendance' && 'Attendance'}
              {tab === 'bank' && 'Bank Details'}
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
                  <InfoItem icon={Phone} label="Secondary Phone" value={profile.phoneSecondary} />
                  <InfoItem icon={MapPin} label="Address" value={profile.address} />
                  <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                  <InfoItem icon={Calendar} label="Age" value={profile.dateOfBirth ? `${calculateAge(profile.dateOfBirth)} years` : 'Unknown'} />
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

              {/* Medical Information */}
              {(profile.bloodGroup || profile.medicalConditions) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={Heart} label="Blood Group" value={profile.bloodGroup} />
                    <InfoItem icon={AlertTriangle} label="Medical Conditions" value={profile.medicalConditions || 'None'} />
                  </div>
                </div>
              )}

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
                    value={statistics.totalClasses || classesData.length || 0} 
                  />
                  <StatItem 
                    label="Subjects Teaching" 
                    value={statistics.totalSubjects || subjectsData.length || 0} 
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
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Classes</h3>
            {classesData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No classes assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classesData.map((classItem) => (
                  <div key={classItem.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">{classItem.name || 'Unnamed Class'}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            classItem.type === 'HIFZ' ? 'bg-purple-100 text-purple-800' :
                            classItem.type === 'NAZRA' ? 'bg-orange-100 text-orange-800' :
                            classItem.type ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {classItem.type || 'GENERAL'}
                          </span>
                          <span className="text-[#F59E0B] font-medium text-xs">
                            {classItem._count?.enrollments || classItem.studentCount || 0} students
                          </span>
                        </div>
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {classItem.grade && (
                        <InfoItem icon={Award} label="Grade" value={classItem.grade} />
                      )}
                      {classItem.section && (
                        <InfoItem icon={Building} label="Section" value={classItem.section} />
                      )}
                      {classItem.description && (
                        <p className="text-xs text-gray-500 mt-2">{classItem.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Subjects</h3>
            {subjectsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No subjects assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectsData.map((subject) => (
                  <div key={subject.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">{subject.name || 'Unnamed Subject'}</h4>
                        {subject.code && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {subject.code}
                          </span>
                        )}
                      </div>
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {subject.description && (
                        <p className="text-gray-600 text-xs mb-2">{subject.description}</p>
                      )}
                      {subject.classRoom && (
                        <InfoItem icon={School} label="Class" value={subject.classRoom.name} />
                      )}
                      {subject.gradeLevel && (
                        <InfoItem icon={Award} label="Grade" value={subject.gradeLevel} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Teacher Documents</h3>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                <span>Upload New</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CNIC Document */}
              <DocumentCard
                title="CNIC Document"
                icon={Shield}
                available={!!documentDetails?.cnic}
                onDownload={() => handleDocumentDownload('cnic')}
                onDelete={() => handleDocumentDelete('cnic')}
                onPreview={() => handleDocumentPreview('cnic')}
              />

              {/* Qualification Certificates */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-3">Qualification Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentDetails?.qualificationCertificates?.map((doc, index) => (
                    <DocumentCard
                      key={index}
                      title={`Qualification ${index + 1}`}
                      icon={GraduationCap}
                      available={true}
                      onDownload={() => handleDocumentDownload('qualification', index)}
                      onDelete={() => handleDocumentDelete('qualification', index)}
                      onPreview={() => handleDocumentPreview('qualification', index)}
                    />
                  ))}
                  {(!documentDetails?.qualificationCertificates || documentDetails.qualificationCertificates.length === 0) && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <File className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p>No qualification certificates uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Certificates */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-3">Experience Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentDetails?.experienceCertificates?.map((doc, index) => (
                    <DocumentCard
                      key={index}
                      title={`Experience Certificate ${index + 1}`}
                      icon={Briefcase}
                      available={true}
                      onDownload={() => handleDocumentDownload('experience', index)}
                      onDelete={() => handleDocumentDelete('experience', index)}
                      onPreview={() => handleDocumentPreview('experience', index)}
                    />
                  ))}
                  {(!documentDetails?.experienceCertificates || documentDetails.experienceCertificates.length === 0) && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <File className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p>No experience certificates uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Documents */}
              {documentDetails?.otherDocuments && documentDetails.otherDocuments.length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-3">Other Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentDetails.otherDocuments.map((doc, index) => (
                      <DocumentCard
                        key={index}
                        title={`Document ${index + 1}`}
                        icon={File}
                        available={true}
                        onDownload={() => handleDocumentDownload('other', index)}
                        onDelete={() => handleDocumentDelete('other', index)}
                        onPreview={() => handleDocumentPreview('other', index)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Summary */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Document Status</h4>
                  <p className="text-sm text-blue-700">
                    Total documents available: {
                      (documentDetails?.cnic ? 1 : 0) +
                      (documentDetails?.qualificationCertificates?.length || 0) +
                      (documentDetails?.experienceCertificates?.length || 0) +
                      (documentDetails?.otherDocuments?.length || 0)
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="space-y-6">
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
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance Marked</h3>
            {(!recentActivities.attendanceMarked || recentActivities.attendanceMarked.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No attendance records found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">
                      {recentActivities.attendanceMarked.filter(a => a.status === 'PRESENT').length}
                    </div>
                    <div className="text-sm text-gray-600">Present Marked</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-800">
                      {recentActivities.attendanceMarked.filter(a => a.status === 'ABSENT').length}
                    </div>
                    <div className="text-sm text-gray-600">Absent Marked</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-800">
                      {recentActivities.attendanceMarked.filter(a => a.status === 'LATE').length}
                    </div>
                    <div className="text-sm text-gray-600">Late Marked</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {recentActivities.attendanceMarked.slice(0, 10).map((attendance) => (
                    <div key={attendance.id} className="p-4 border border-gray-200 rounded-xl hover:border-[#F59E0B] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {attendance.student?.user?.name || attendance.student?.name || 'Unknown Student'} 
                          {attendance.classRoom?.name && ` - ${attendance.classRoom.name}`}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(attendance.status)}`}>
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
              </>
            )}
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Details</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem icon={Building} label="Bank Name" value={profile.bankName} />
                <InfoItem icon={CreditCard} label="Account Number" value={profile.accountNumber} />
                <InfoItem icon={FileSpreadsheet} label="IBAN" value={profile.iban} />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Payment Information</h4>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p>Salary: {formatSalary(profile.salary)}</p>
                  <p>Payment Schedule: Monthly</p>
                  <p>Last Payment Date: {profile.lastPaymentDate ? formatDate(profile.lastPaymentDate) : 'Not paid yet'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {showImageModal && getProfileImageUrl() && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <XCircle className="h-6 w-6 text-gray-600" />
            </button>
            <img
              src={getProfileImageUrl()}
              alt={user.name}
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h3>
            
            <div className="space-y-4">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  <option value="">Select document type</option>
                  <option value="cnic">CNIC</option>
                  <option value="qualification">Qualification Certificate</option>
                  <option value="experience">Experience Certificate</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#F59E0B] transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="teacher-file-upload"
                  />
                  <label htmlFor="teacher-file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploadFile ? uploadFile.name : 'Click to select file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG, DOC (Max 5MB)
                    </p>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={uploadingDoc}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentUpload}
                  disabled={!selectedDocType || !uploadFile || uploadingDoc}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ title, icon: Icon, available, onDownload, onDelete, onPreview }) => (
  <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${
    available 
      ? 'border-green-200 bg-green-50 hover:border-green-400' 
      : 'border-gray-200 bg-gray-50'
  }`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${available ? 'bg-green-100' : 'bg-gray-200'}`}>
          <Icon className={`h-5 w-5 ${available ? 'text-green-600' : 'text-gray-400'}`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600">
            {available ? 'Document available' : 'Not uploaded'}
          </p>
        </div>
      </div>
      {available ? (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded-full transition-colors"
              title="Delete document"
            >
              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
            </button>
          )}
        </div>
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )}
    </div>
    
    {available && (
      <div className="flex space-x-2">
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
        <button
          onClick={onPreview}
          className="flex items-center justify-center px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
          title="Preview document"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
);

// Info Item Component
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || 'Not provided'}</p>
    </div>
  </div>
);

// Stat Item Component
const StatItem = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-[#92400E]">{value}</span>
  </div>
);

export default TeacherDetail; 