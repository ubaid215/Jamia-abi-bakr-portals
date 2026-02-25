/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, GraduationCap,
  Clock, DollarSign, UserCheck, UserX, Edit, Download, Shield,
  Briefcase, Award, Users, FileText, Upload, Eye, Trash2,
  CheckCircle, XCircle, Home, Heart, AlertTriangle, File,
  School, Building, CreditCard, User, FileSpreadsheet,
  TrendingUp, Save, X
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const EditWrapper = ({ title, color, onCancel, onSave, isSaving, children }) => (
  <div className={`space-y-4 p-4 bg-${color}-50 border border-${color}-200 rounded-xl`}>
    <div className="flex items-center justify-between">
      <h4 className={`font-semibold text-${color}-800`}>{title}</h4>
      <button onClick={onCancel} className="p-2 text-gray-600 hover:text-gray-900">
        <X className="h-5 w-5" />
      </button>
    </div>
    {children}
    <div className="flex space-x-3 pt-2">
      <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center text-sm"
      >
        {isSaving ? (
          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving...</>
        ) : (
          <><Save className="h-4 w-4 mr-2" />Save Changes</>
        )}
      </button>
    </div>
  </div>
);

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { teachers, fetchTeachers, updateUserStatus, loading } = useAdmin();
  const [teacher, setTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [teacherRecordId, setTeacherRecordId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [documentDetails, setDocumentDetails] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState('');
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);


const refreshTeacherDetails = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
        `${API_BASE_URL}/admin/teachers/${id}/documents?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setTeacherDetails(data);
    setDocumentDetails(data.documents);
    if (data.teacherRecordId) {
        setTeacherRecordId(data.teacherRecordId);
    }
}, [id]);

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

        await refreshTeacherDetails();
      } catch (error) {
        console.error('Error loading teacher data:', error);
        toast.error('Failed to load teacher details');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadTeacherData();
  }, [id, teachers, fetchTeachers, refreshTeacherDetails]);

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
    const profileImage = currentTeacher.teacher.profileImage || teacherDetails?.teacher?.profileImage;
    if (!profileImage) return null;
    if (profileImage.startsWith('http') || profileImage.startsWith('data:')) return profileImage;
    const userId = currentTeacher.teacher.id;
    return `${API_BASE_URL}/admin/public/profile-image/${userId}`;
  };

  // Initialize edit data
  const initializeEditData = (mode) => {
    if (!currentTeacher) return;
    setEditMode(mode);
    setIsEditing(true);

    switch (mode) {
      case 'personal':
        setEditedData({
          name: currentTeacher.teacher?.name || '',
          email: currentTeacher.teacher?.email || '',
          phone: currentTeacher.teacher?.phone || '',
          phoneSecondary: currentTeacher.profile?.phoneSecondary || '',
          gender: currentTeacher.profile?.gender || '',
          dateOfBirth: currentTeacher.profile?.dateOfBirth
            ? new Date(currentTeacher.profile.dateOfBirth).toISOString().split('T')[0]
            : '',
          cnic: currentTeacher.profile?.cnic || '',
          address: currentTeacher.profile?.address || '',
          bloodGroup: currentTeacher.profile?.bloodGroup || '',
          medicalConditions: currentTeacher.profile?.medicalConditions || '',
        });
        break;

      case 'professional':
        setEditedData({
          bio: currentTeacher.profile?.bio || '',
          specialization: currentTeacher.profile?.specialization || '',
          qualification: currentTeacher.profile?.qualification || '',
          experience: currentTeacher.profile?.experience || '',
          salary: currentTeacher.profile?.salary || '',
          employmentType: currentTeacher.profile?.employmentType || '',
          joiningDate: currentTeacher.profile?.joiningDate
            ? new Date(currentTeacher.profile.joiningDate).toISOString().split('T')[0]
            : '',
        });
        break;

      case 'emergency':
        setEditedData({
          emergencyContactName: currentTeacher.profile?.emergencyContactName || '',
          emergencyContactPhone: currentTeacher.profile?.emergencyContactPhone || '',
          emergencyContactRelation: currentTeacher.profile?.emergencyContactRelation || '',
        });
        break;

      case 'bank':
        setEditedData({
          bankName: currentTeacher.profile?.bankName || '',
          accountNumber: currentTeacher.profile?.accountNumber || '',
          iban: currentTeacher.profile?.iban || '',
        });
        break;

      default:
        break;
    }
  };

  // Save edited data
  const handleSaveData = async () => {
    if (!currentTeacher) return;

    try {
      setIsSaving(true);
      const teacherId = currentTeacher.teacher?.id || id;
      const token = localStorage.getItem('authToken');

      await axios.put(
        `${API_BASE_URL}/admin/teachers/${teacherId}`,
        editedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Teacher updated successfully');
      await refreshTeacherDetails();
      setIsEditing(false);
      setEditMode('');
      setEditedData({});
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error(error.response?.data?.error || 'Failed to update teacher');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditMode('');
    setEditedData({});
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('authToken');
      await axios.put(
        `${API_BASE_URL}/admin/teachers/${id}/profile-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
      );

      toast.success('Profile image updated successfully');
      await fetchTeachers();
      await refreshTeacherDetails();
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
        const tid = teacherRecordId || id;  // ← use record ID

        await axios.post(
            `${API_BASE_URL}/admin/teachers/${tid}/documents`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
        );

        toast.success('Document uploaded successfully');
        setShowUploadModal(false);
        setUploadFile(null);
        setSelectedDocType('');
        await refreshTeacherDetails();
    } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
        setUploadingDoc(false);
    }
};

  // Handle document download
const handleDocumentDownload = async (type, index = null) => {
    try {
        const token = localStorage.getItem('authToken');
        const tid = teacherRecordId || id;  // ← use record ID
        let url = `${API_BASE_URL}/admin/teachers/${tid}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;

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
    } catch {
        toast.error('Failed to download document');
    }
};

const handleDocumentDelete = async (type, index = null) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
        const token = localStorage.getItem('authToken');
        const tid = teacherRecordId || id;  // ← use record ID
        let url = `${API_BASE_URL}/admin/teachers/${tid}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;

        await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Document deleted successfully');
        await refreshTeacherDetails();
    } catch {
        toast.error('Failed to delete document');
    }
};

const handleDocumentPreview = async (type, index = null) => {
    try {
        const token = localStorage.getItem('authToken');
        const tid = teacherRecordId || id;  // ← use record ID
        let url = `${API_BASE_URL}/admin/teachers/${tid}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const fileURL = URL.createObjectURL(blob);
        const previewWindow = window.open(fileURL, '_blank');
        if (!previewWindow) toast.error('Preview blocked by popup blocker');
    } catch {
        toast.error('Document preview is unavailable or missing');
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

  // Styling helpers
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
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(salary);
  };

  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    } catch {
      return 'Unknown';
    }
  };

  const getClassesData = () => {
    if (!currentTeacher) return [];
    return currentTeacher.assignments?.classes?.length > 0 ? currentTeacher.assignments.classes :
      currentTeacher.profile?.classes?.length > 0 ? currentTeacher.profile.classes :
        currentTeacher.classes || [];
  };

  const getSubjectsData = () => {
    if (!currentTeacher) return [];
    return currentTeacher.assignments?.subjects?.length > 0 ? currentTeacher.assignments.subjects :
      currentTeacher.profile?.subjects?.length > 0 ? currentTeacher.profile.subjects :
        currentTeacher.subjects || [];
  };

  

  // Edit forms
  const renderEditForm = () => {
    const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    const wrapperProps = {
      onCancel: handleCancelEdit,
      onSave: handleSaveData,
      isSaving,
    };

    switch (editMode) {
      case 'personal':
        return (
          <EditWrapper title="Edit Personal Information" color="yellow" {...wrapperProps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Full Name</label>
                <input type="text" value={editedData.name || ''} onChange={e => setEditedData(prev => ({ ...prev, name: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Email</label>
                <input type="email" value={editedData.email || ''} onChange={e => setEditedData(prev => ({ ...prev, email: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Primary Phone</label>
                <input type="tel" value={editedData.phone || ''} onChange={e => setEditedData(prev => ({ ...prev, phone: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Secondary Phone</label>
                <input type="tel" value={editedData.phoneSecondary || ''} onChange={e => setEditedData(prev => ({ ...prev, phoneSecondary: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Gender</label>
                <select value={editedData.gender || ''} onChange={e => setEditedData(prev => ({ ...prev, gender: e.target.value }))} className={inputClass}>
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select></div>
              <div><label className={labelClass}>Date of Birth</label>
                <input type="date" value={editedData.dateOfBirth || ''} onChange={e => setEditedData(prev => ({ ...prev, dateOfBirth: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>CNIC</label>
                <input type="text" value={editedData.cnic || ''} onChange={e => setEditedData(prev => ({ ...prev, cnic: e.target.value }))} className={inputClass} placeholder="XXXXX-XXXXXXX-X" /></div>
              <div><label className={labelClass}>Blood Group</label>
                <select value={editedData.bloodGroup || ''} onChange={e => setEditedData(prev => ({ ...prev, bloodGroup: e.target.value }))} className={inputClass}>
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select></div>
              <div className="md:col-span-2"><label className={labelClass}>Address</label>
                <input type="text" value={editedData.address || ''} onChange={e => setEditedData(prev => ({ ...prev, address: e.target.value }))} className={inputClass} /></div>
              <div className="md:col-span-2"><label className={labelClass}>Medical Conditions</label>
                <textarea value={editedData.medicalConditions || ''} onChange={e => setEditedData(prev => ({ ...prev, medicalConditions: e.target.value }))} className={`${inputClass} h-20`} placeholder="List any medical conditions..." /></div>
            </div>
          </EditWrapper>
        );

      case 'professional':
        return (
          <EditWrapper title="Edit Professional Information" color="blue" {...wrapperProps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Specialization</label>
                <input type="text" value={editedData.specialization || ''} onChange={e => setEditedData(prev => ({ ...prev, specialization: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Qualification</label>
                <input type="text" value={editedData.qualification || ''} onChange={e => setEditedData(prev => ({ ...prev, qualification: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Experience (years)</label>
                <input type="text" value={editedData.experience || ''} onChange={e => setEditedData(prev => ({ ...prev, experience: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Salary</label>
                <input type="number" value={editedData.salary || ''} onChange={e => setEditedData(prev => ({ ...prev, salary: e.target.value }))} className={inputClass} min="0" /></div>
              <div><label className={labelClass}>Employment Type</label>
                <select value={editedData.employmentType || ''} onChange={e => setEditedData(prev => ({ ...prev, employmentType: e.target.value }))} className={inputClass}>
                  <option value="">Select Type</option>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select></div>
              <div><label className={labelClass}>Joining Date</label>
                <input type="date" value={editedData.joiningDate || ''} onChange={e => setEditedData(prev => ({ ...prev, joiningDate: e.target.value }))} className={inputClass} /></div>
              <div className="md:col-span-2"><label className={labelClass}>Bio</label>
                <textarea value={editedData.bio || ''} onChange={e => setEditedData(prev => ({ ...prev, bio: e.target.value }))} className={`${inputClass} h-24`} placeholder="Brief bio..." /></div>
            </div>
          </EditWrapper>
        );

      case 'emergency':
        return (
          <EditWrapper title="Edit Emergency Contact" color="green" {...wrapperProps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Contact Name</label>
                <input type="text" value={editedData.emergencyContactName || ''} onChange={e => setEditedData(prev => ({ ...prev, emergencyContactName: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Contact Phone</label>
                <input type="tel" value={editedData.emergencyContactPhone || ''} onChange={e => setEditedData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Relation</label>
                <input type="text" value={editedData.emergencyContactRelation || ''} onChange={e => setEditedData(prev => ({ ...prev, emergencyContactRelation: e.target.value }))} className={inputClass} /></div>
            </div>
          </EditWrapper>
        );

      case 'bank':
        return (
          <EditWrapper title="Edit Bank Details" color="purple" {...wrapperProps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Bank Name</label>
                <input type="text" value={editedData.bankName || ''} onChange={e => setEditedData(prev => ({ ...prev, bankName: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>Account Number</label>
                <input type="text" value={editedData.accountNumber || ''} onChange={e => setEditedData(prev => ({ ...prev, accountNumber: e.target.value }))} className={inputClass} /></div>
              <div className="md:col-span-2"><label className={labelClass}>IBAN</label>
                <input type="text" value={editedData.iban || ''} onChange={e => setEditedData(prev => ({ ...prev, iban: e.target.value }))} className={inputClass} /></div>
            </div>
          </EditWrapper>
        );

      default:
        return null;
    }
  };

  if ((loading || detailsLoading) && !currentTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]" />
      </div>
    );
  }

  if (!currentTeacher) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Teacher not found</h3>
        <button onClick={() => navigate('/admin/teachers')} className="text-[#F59E0B] hover:text-[#D97706] text-sm font-medium">
          Back to Teachers
        </button>
      </div>
    );
  }

  const user = currentTeacher.teacher || currentTeacher.user || currentTeacher || {};
  const profile = currentTeacher.profile || {};
  const statistics = currentTeacher.statistics || {};
  const recentActivities = currentTeacher.recentActivities || {};
  const classesData = getClassesData();
  const subjectsData = getSubjectsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <button onClick={() => navigate('/admin/teachers')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            {/* Profile Image */}
            <div className="relative group">
              {getProfileImageUrl() ? (
                <img
                  src={getProfileImageUrl()}
                  alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#F59E0B] cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {user.name?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}
              <label htmlFor="profile-image-upload" className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="h-6 w-6 text-white" />
                <input id="profile-image-upload" type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={uploadingImage} />
              </label>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                {profile.specialization || 'Teacher'} • {profile.employmentType || 'Full-time'}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>{user.status}</span>
                <span className="text-sm text-gray-500">Since {formatDate(profile.joiningDate || user.createdAt)}</span>
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
            {!isEditing && (
              <button
                onClick={() => initializeEditData('personal')}
                className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Teacher</span>
              </button>
            )}
            <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-[#F59E0B] text-[#F59E0B] rounded-lg hover:bg-[#FFFBEB] transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
          {renderEditForm()}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
        <div className="flex space-x-1 overflow-x-auto">
          {['overview', 'classes', 'subjects', 'documents', 'leave', 'attendance', 'bank'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === tab
                ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'classes' && `Classes (${classesData.length})`}
              {tab === 'subjects' && `Subjects (${subjectsData.length})`}
              {tab === 'documents' && <span className="flex items-center space-x-1"><File className="h-4 w-4" /><span>Documents</span></span>}
              {tab === 'leave' && `Leave (${recentActivities.leaveRequests?.length || 0})`}
              {tab === 'attendance' && 'Attendance'}
              {tab === 'bank' && 'Bank Details'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">

        {/* Overview Tab */}
        {activeTab === 'overview' && !isEditing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Personal Information */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <button onClick={() => initializeEditData('personal')} className="flex items-center space-x-1 text-sm text-[#F59E0B] hover:text-[#D97706]">
                    <Edit className="h-4 w-4" /><span>Edit</span>
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
                  <button onClick={() => initializeEditData('professional')} className="flex items-center space-x-1 text-sm text-[#F59E0B] hover:text-[#D97706]">
                    <Edit className="h-4 w-4" /><span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={BookOpen} label="Qualification" value={profile.qualification} />
                  <InfoItem icon={GraduationCap} label="Specialization" value={profile.specialization} />
                  <InfoItem icon={Clock} label="Experience" value={profile.experience ? `${profile.experience} years` : 'Not specified'} />
                  <InfoItem icon={DollarSign} label="Salary" value={formatSalary(profile.salary)} />
                  <InfoItem icon={Briefcase} label="Employment Type" value={profile.employmentType} />
                </div>
                {profile.bio && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                  </div>
                )}
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

              {/* Emergency Contact */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  <button onClick={() => initializeEditData('emergency')} className="flex items-center space-x-1 text-sm text-[#F59E0B] hover:text-[#D97706]">
                    <Edit className="h-4 w-4" /><span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={Users} label="Name" value={profile.emergencyContactName} />
                  <InfoItem icon={Phone} label="Phone" value={profile.emergencyContactPhone} />
                  <InfoItem icon={UserCheck} label="Relation" value={profile.emergencyContactRelation} />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                <div className="space-y-3">
                  <StatItem label="Classes Assigned" value={statistics.totalClasses || classesData.length || 0} />
                  <StatItem label="Subjects Teaching" value={statistics.totalSubjects || subjectsData.length || 0} />
                  <StatItem label="Total Students" value={statistics.totalStudents || 0} />
                  <StatItem label="Attendance Marked" value={statistics.totalAttendanceMarked || 0} />
                  <StatItem label="Pending Leave Requests" value={statistics.pendingLeaveRequests || 0} />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <button onClick={() => handleStatusChange('ACTIVE')} disabled={user.status === 'ACTIVE'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                    <UserCheck className="h-4 w-4" /><span>Activate Account</span>
                  </button>
                  <button onClick={() => handleStatusChange('INACTIVE')} disabled={user.status === 'INACTIVE'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                    <UserX className="h-4 w-4" /><span>Deactivate Account</span>
                  </button>
                  <button onClick={() => handleStatusChange('TERMINATED')} disabled={user.status === 'TERMINATED'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                    <UserX className="h-4 w-4" /><span>Terminate Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classes Tab */}
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${classItem.type === 'HIFZ' ? 'bg-purple-100 text-purple-800' :
                            classItem.type === 'NAZRA' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'}`}>
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
                      {classItem.grade && <InfoItem icon={Award} label="Grade" value={classItem.grade} />}
                      {classItem.section && <InfoItem icon={Building} label="Section" value={classItem.section} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subjects Tab */}
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
                        {subject.code && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{subject.code}</span>}
                      </div>
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-2 text-sm">
                      {subject.description && <p className="text-gray-600 text-xs mb-2">{subject.description}</p>}
                      {subject.classRoom && <InfoItem icon={School} label="Class" value={subject.classRoom.name} />}
                      {subject.gradeLevel && <InfoItem icon={Award} label="Grade" value={subject.gradeLevel} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Teacher Documents</h3>
              <button onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors text-sm font-medium">
                <Upload className="h-4 w-4" /><span>Upload New</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocumentCard title="CNIC Front" icon={Shield} available={!!documentDetails?.cnicFront}
                onDownload={() => handleDocumentDownload('cnic-front')}
                onDelete={() => handleDocumentDelete('cnic-front')}
                onPreview={() => handleDocumentPreview('cnic-front')} />
              <DocumentCard title="CNIC Back" icon={Shield} available={!!documentDetails?.cnicBack}
                onDownload={() => handleDocumentDownload('cnic-back')}
                onDelete={() => handleDocumentDelete('cnic-back')}
                onPreview={() => handleDocumentPreview('cnic-back')} />

              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-3">Qualification Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentDetails?.degreeDocuments?.length > 0 ? (
                    documentDetails.degreeDocuments.map((_, index) => (
                      <DocumentCard key={index} title={`Degree ${index + 1}`} icon={GraduationCap} available={true}
                        onDownload={() => handleDocumentDownload('degree', index)}
                        onDelete={() => handleDocumentDelete('degree', index)}
                        onPreview={() => handleDocumentPreview('degree', index)} />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <File className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p>No qualification certificates uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {documentDetails?.otherDocuments?.length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-3">Other Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentDetails.otherDocuments.map((_, index) => (
                      <DocumentCard key={index} title={`Document ${index + 1}`} icon={File} available={true}
                        onDownload={() => handleDocumentDownload('other', index)}
                        onDelete={() => handleDocumentDelete('other', index)}
                        onPreview={() => handleDocumentPreview('other', index)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Document Status</h4>
                  <p className="text-sm text-blue-700">
                    Total documents available: {
                      (documentDetails?.cnicFront ? 1 : 0) +
                      (documentDetails?.cnicBack ? 1 : 0) +
                      (documentDetails?.degreeDocuments?.length || 0) +
                      (documentDetails?.otherDocuments?.length || 0)
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Tab */}
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
                        <span className="font-medium text-sm">{formatDate(request.fromDate)} - {formatDate(request.toDate)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveStatusColor(request.status)}`}>{request.status}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{request.reason}</p>
                      {request.response && <p className="text-gray-500 text-xs mt-1">Response: {request.response}</p>}
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium hover:bg-green-200">Approve</button>
                        <button className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
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
                    <div className="text-2xl font-bold text-green-800">{recentActivities.attendanceMarked.filter(a => a.status === 'PRESENT').length}</div>
                    <div className="text-sm text-gray-600">Present Marked</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-800">{recentActivities.attendanceMarked.filter(a => a.status === 'ABSENT').length}</div>
                    <div className="text-sm text-gray-600">Absent Marked</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-800">{recentActivities.attendanceMarked.filter(a => a.status === 'LATE').length}</div>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(attendance.status)}`}>{attendance.status}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Date: {formatDate(attendance.date)}</span>
                        {attendance.subject && <span>Subject: {attendance.subject.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>
              {!isEditing && (
                <button onClick={() => initializeEditData('bank')} className="flex items-center space-x-1 text-sm text-[#F59E0B] hover:text-[#D97706]">
                  <Edit className="h-4 w-4" /><span>Edit</span>
                </button>
              )}
            </div>

            {isEditing && editMode === 'bank' ? renderEditForm() : (
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
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {showImageModal && getProfileImageUrl() && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl w-full">
            <button onClick={() => setShowImageModal(false)} className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
              <XCircle className="h-6 w-6 text-gray-600" />
            </button>
            <img src={getProfileImageUrl()} alt={user.name} className="w-full h-auto rounded-lg" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]">
                  <option value="">Select document type</option>
                  <option value="cnic-front">CNIC Front</option>
                  <option value="cnic-back">CNIC Back</option>
                  <option value="degree">Qualification/Degree</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#F59E0B] transition-colors">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" id="teacher-file-upload" />
                  <label htmlFor="teacher-file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">{uploadFile ? uploadFile.name : 'Click to select file'}</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (Max 5MB)</p>
                  </label>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowUploadModal(false)} disabled={uploadingDoc}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleDocumentUpload} disabled={!selectedDocType || !uploadFile || uploadingDoc}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                  {uploadingDoc ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Uploading...</> : 'Upload Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const DocumentCard = ({ title, icon: Icon, available, onDownload, onDelete, onPreview }) => (
  <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${available ? 'border-green-200 bg-green-50 hover:border-green-400' : 'border-gray-200 bg-gray-50'}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${available ? 'bg-green-100' : 'bg-gray-200'}`}>
          <Icon className={`h-5 w-5 ${available ? 'text-green-600' : 'text-gray-400'}`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600">{available ? 'Document available' : 'Not uploaded'}</p>
        </div>
      </div>
      {available ? (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-red-100 rounded-full transition-colors" title="Delete document">
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
        <button onClick={onDownload} className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium">
          <Download className="h-4 w-4" /><span>Download</span>
        </button>
        <button onClick={onPreview} className="flex items-center justify-center px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors" title="Preview document">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
);

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || 'Not provided'}</p>
    </div>
  </div>
);

const StatItem = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-[#92400E]">{value}</span>
  </div>
);

// Suppress unused import warnings for icons used conditionally
const _unusedIcons = { Home, User, FileText };
void _unusedIcons;

export default TeacherDetail;