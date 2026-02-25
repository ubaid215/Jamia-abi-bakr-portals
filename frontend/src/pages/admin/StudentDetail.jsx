/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Award,
  History,
  Clock,
  User,
  School,
  TrendingUp,
  Upload,
  File,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Plus,
  Save,
  X,
  Globe,
  UserCircle,
  PhoneCall,
  Briefcase,
  FileDigit,
  Award as AwardIcon,
  Book,
  Cross,
  Activity,
  Stethoscope,
} from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";
import { toast } from "react-hot-toast";
import axios from "axios";
import StudentMonthlyReport from "../../components/hifz/StudentMonthlyReport";

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    students,
    fetchStudents,
    updateUserStatus,
    loading,
    getStudentDetails,
    updateStudent,
    updateStudentAcademicInfo,
  } = useAdmin();

  const [student, setStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [studentRecordId, setStudentRecordId] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState("");
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Fetch student data
  useEffect(() => {
    // console.log('🔄 [STUDENT DETAILS] useEffect triggered', { id });

    const loadStudentData = async () => {
      try {
        // console.log('⏳ Loading student details...');
        setDetailsLoading(true);

        // Fetch from AdminContext
        // console.log('📡 Fetching student details from context...');
        const details = await getStudentDetails(id);

        // console.log('📦 Student details from context:', details);

        // If context returned valid data
        if (details && (details.student || details.user)) {
          // console.log('✅ Using student details from context');

          setStudentDetails(details);

          if (details.student) {
            // console.log('🧩 Setting student backup state from context');
            setStudent({
              ...details.student,
              studentProfile: details,
            });
          }
        } else {
          // Fallback to API
          console.warn("⚠️ Context returned empty data, falling back to API");

          const token = localStorage.getItem("authToken");
          // console.log('🔐 Auth token exists:', Boolean(token));

          const response = await axios.get(
            `${API_BASE_URL}/admin/students/${id}/details`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          // console.log('📦 Student details from API:', response.data);
          setStudentDetails(response.data);
        }

        // Ensure students list is loaded
        if (students.length === 0) {
          // console.log('📚 Students list empty, fetching students...');
          await fetchStudents();
          console.log("✅ Students list fetched");
        } else {
          // console.log('📚 Students list already loaded:', students.length);
        }
      } catch (error) {
        console.error("🔥 Error loading student data:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        toast.error("Failed to load student details");

        // Try fallback from existing students list
        // console.log('🔍 Attempting fallback from students list...');
        const foundStudent = students.find(
          (s) => s.id === id || s.user?.id === id || s.userId === id,
        );

        if (foundStudent) {
          // console.log('✅ Fallback student found in list:', foundStudent);
          setStudent(foundStudent);
        } else {
          console.warn("❌ No fallback student found");
        }
      } finally {
        // console.log('✔️ Student details loading finished');
        setDetailsLoading(false);
      }
    };

    loadStudentData();
  }, [id, students, fetchStudents, getStudentDetails]);

  // Helper functions
  const normalizeStudentData = (data) => {
    if (!data) return null;

    // Check if data is already in our normalized format
    if (data.student && data.profile && data.academic) {
      return data;
    }

    // Check if data comes from studentProfile structure
    if (data.studentProfile) {
      return {
        student: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          profileImage: data.profileImage,
          status: data.status,
          createdAt: data.createdAt,
        },
        profile: { ...data.studentProfile },
        academic: {
          currentEnrollment: data.studentProfile.currentEnrollment || {},
          attendance: data.studentProfile.attendance || {},
          classHistory: data.studentProfile.classHistory || [],
        },
        progress: data.studentProfile.progress || {},
        parents: data.studentProfile.parents || [],
      };
    }

    // If data is a student object from context
    if (data.user && data.admissionNo) {
      return {
        student: data.user,
        profile: {
          admissionNo: data.admissionNo,
          gender: data.gender,
          dob: data.dob,
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          address: data.address,
          city: data.city,
          province: data.province,
        },
        academic: {
          currentEnrollment: data.currentEnrollment || {},
          attendance: data.attendance || {},
        },
        progress: data.progress || {},
        parents: data.parents || [],
      };
    }

    return {
      student: data.user || data,
      profile: data,
      academic: {
        currentEnrollment: data.currentEnrollment || {},
        attendance: data.attendance || {},
        classHistory: data.classHistory || [],
      },
      progress: data.progress || {},
      parents: data.parents || [],
    };
  };

  const getStudentData = () => {
    if (studentDetails) return normalizeStudentData(studentDetails);
    if (student) return normalizeStudentData(student);
    return null;
  };

  const currentStudent = getStudentData();

  // Get profile image URL
  const getProfileImageUrl = () => {
    if (!currentStudent?.student) return null;

    const userId = currentStudent.student.id;
    const profileImage =
      currentStudent.student.profileImage ||
      studentDetails?.student?.profileImage;

    if (!profileImage) return null;

    if (profileImage.startsWith("http") || profileImage.startsWith("data:")) {
      return profileImage;
    }

    return `${API_BASE_URL}/admin/public/profile-image/${userId}`;
  };

  // Initialize edit data
  const initializeEditData = (mode) => {
    if (!currentStudent) return;

    setEditMode(mode);
    setIsEditing(true);

    switch (mode) {
      case "personal":
        setEditedData({
          name: currentStudent.student?.name || "",
          email: currentStudent.student?.email || "",
          phone: currentStudent.student?.phone || "",
          gender: currentStudent.profile?.gender || "",
          dateOfBirth: currentStudent.profile?.dob
            ? new Date(currentStudent.profile.dob).toISOString().split("T")[0]
            : "",
          placeOfBirth: currentStudent.profile?.placeOfBirth || "",
          nationality: currentStudent.profile?.nationality || "",
          religion: currentStudent.profile?.religion || "",
          bloodGroup: currentStudent.profile?.bloodGroup || "",
        });
        break;

      case "contact":
        setEditedData({
          address: currentStudent.profile?.address || "",
          city: currentStudent.profile?.city || "",
          province: currentStudent.profile?.province || "",
          postalCode: currentStudent.profile?.postalCode || "",
        });
        break;

      case "guardian":
        setEditedData({
          guardianName: currentStudent.profile?.guardianName || "",
          guardianRelation: currentStudent.profile?.guardianRelation || "",
          guardianPhone: currentStudent.profile?.guardianPhone || "",
          guardianEmail: currentStudent.profile?.guardianEmail || "",
          guardianOccupation: currentStudent.profile?.guardianOccupation || "",
          guardianCNIC: currentStudent.profile?.guardianCNIC || "",
        });
        break;

      case "academic":
        setEditedData({
          classRoomId:
            currentStudent.academic?.currentEnrollment?.classRoom?.id || "",
          rollNumber:
            currentStudent.academic?.currentEnrollment?.rollNumber || "",
          startDate: currentStudent.academic?.currentEnrollment?.startDate
            ? new Date(currentStudent.academic.currentEnrollment.startDate)
                .toISOString()
                .split("T")[0]
            : "",
        });
        break;

      case "medical":
        setEditedData({
          medicalConditions: currentStudent.profile?.medicalConditions || "",
          allergies: currentStudent.profile?.allergies || "",
          medication: currentStudent.profile?.medication || "",
        });
        break;
    }
  };

  // Handle save data using AdminContext methods
  const handleSaveData = async () => {
    if (!currentStudent) return;

    try {
      setIsSaving(true);
      const studentId = currentStudent.student?.id || id;

      switch (editMode) {
        case "personal":
          await updateStudent(studentId, {
            name: editedData.name,
            email: editedData.email,
            phone: editedData.phone,
            gender: editedData.gender,
            dateOfBirth: editedData.dateOfBirth,
            placeOfBirth: editedData.placeOfBirth,
            nationality: editedData.nationality,
            religion: editedData.religion,
            bloodGroup: editedData.bloodGroup,
          });
          break;

        case "contact":
          await updateStudent(studentId, {
            address: editedData.address,
            city: editedData.city,
            province: editedData.province,
            postalCode: editedData.postalCode,
          });
          break;

        case "guardian":
          await updateStudent(studentId, {
            guardianName: editedData.guardianName,
            guardianRelation: editedData.guardianRelation,
            guardianPhone: editedData.guardianPhone,
            guardianEmail: editedData.guardianEmail,
            guardianOccupation: editedData.guardianOccupation,
            guardianCNIC: editedData.guardianCNIC,
          });
          break;

        case "academic":
          await updateStudentAcademicInfo(studentId, {
            classRoomId: editedData.classRoomId,
            rollNumber: editedData.rollNumber,
            startDate: editedData.startDate,
          });
          break;

        case "medical":
          await updateStudent(studentId, {
            medicalConditions: editedData.medicalConditions,
            allergies: editedData.allergies,
            medication: editedData.medication,
          });
          break;
      }

      toast.success("Student data updated successfully");

      // Refresh data with correct call to getStudentDetails
      try {
        const updatedDetails = await getStudentDetails(id);
        if (updatedDetails) setStudentDetails(updatedDetails);
      } catch (refreshErr) {
        console.warn(
          "Could not refresh student details after save:",
          refreshErr,
        );
      }

      // Reset edit state
      setIsEditing(false);
      setEditMode("");
      setEditedData({});
    } catch (error) {
      console.error("Error updating student data:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update student data",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditMode("");
    setEditedData({});
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("profileImage", file);

      const token = localStorage.getItem("authToken");
      const response = await axios.put(
        `${API_BASE_URL}/admin/students/${id}/profile-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Profile image updated successfully");

      // Refresh student data correctly
      try {
        const updatedDetails = await getStudentDetails(id);
        if (updatedDetails) setStudentDetails(updatedDetails);
      } catch (refreshErr) {
        console.warn("Could not refresh after image upload:", refreshErr);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(error.response?.data?.error || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };


  // Handle document preview (opens in new tab as blob URL)
 // Update these functions in your React component
const handleDocumentPreview = async (type, index = null) => {
    try {
        const token = localStorage.getItem('authToken');
        
        // Get the student record ID from studentDetails
        const studentRecordId = studentDetails?.studentRecordId || studentDetails?.profile?.id;
        
        if (!studentRecordId) {
            toast.error('Student record ID not found');
            return;
        }
        
        let url = `${API_BASE_URL}/admin/students/${studentRecordId}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;
        
        // Add preview parameter to get inline response
        url += url.includes('?') ? '&preview=true' : '?preview=true';

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        const blob = new Blob([response.data], { type: contentType });
        const fileURL = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(fileURL, '_blank');
        
        // Clean up after some time
        setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
    } catch (error) {
        console.error('Error previewing document:', error);
        toast.error(error.response?.data?.error || 'Document preview failed');
    }
};

const handleDocumentDownload = async (type, index = null) => {
    try {
        const token = localStorage.getItem('authToken');
        
        // Get the student record ID from studentDetails
        const studentRecordId = studentDetails?.studentRecordId || studentDetails?.profile?.id;
        
        if (!studentRecordId) {
            toast.error('Student record ID not found');
            return;
        }
        
        let url = `${API_BASE_URL}/admin/students/${studentRecordId}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;

        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers['content-disposition'];
        let filename;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        if (!filename) {
            const ext = response.headers['content-type']?.split('/')[1] || 'pdf';
            filename = `${type}-${Date.now()}.${ext}`;
        }

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        toast.success('Document downloaded successfully');
    } catch (error) {
        console.error('Error downloading document:', error);
        toast.error(error.response?.data?.error || 'Failed to download document');
    }
};

const handleDocumentDelete = async (type, index = null) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
        const token = localStorage.getItem('authToken');
        const sid = studentRecordId || id;  // ← student record ID
        let url = `${API_BASE_URL}/admin/students/${sid}/documents/${type}`;
        if (index !== null) url += `?index=${index}`;

        await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Document deleted successfully');

        try {
            const updatedDetails = await getStudentDetails(id);
            if (updatedDetails) setStudentDetails(updatedDetails);
        } catch (refreshErr) {
            console.warn('Could not refresh after document delete:', refreshErr);
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
    }
};

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
        const sid = studentRecordId || id;  // ← student record ID

        await axios.post(
            `${API_BASE_URL}/admin/students/${sid}/documents`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
        );

        toast.success('Document uploaded successfully');
        setShowUploadModal(false);
        setUploadFile(null);
        setSelectedDocType('');

        try {
            const updatedDetails = await getStudentDetails(id);
            if (updatedDetails) setStudentDetails(updatedDetails);
        } catch (refreshErr) {
            console.warn('Could not refresh after document upload:', refreshErr);
        }
    } catch (error) {
        console.error('Error uploading document:', error);
        toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
        setUploadingDoc(false);
    }
};

  const handleStatusChange = async (newStatus) => {
    try {
      if (!currentStudent) {
        toast.error("Student data not loaded");
        return;
      }

      const userId = currentStudent.student?.id || currentStudent.id;
      if (!userId) {
        toast.error("Cannot identify student");
        return;
      }

      // Add confirmation for sensitive status changes
      const statusConfig = {
        TERMINATED: {
          title: "Terminate Student Account",
          message: `Are you sure you want to terminate ${currentStudent.student?.name || "this student"}? This action is irreversible and will prevent them from accessing the system.`,
          buttonText: "Terminate Account",
        },
        INACTIVE: {
          title: "Deactivate Student",
          message: `Are you sure you want to deactivate ${currentStudent.student?.name || "this student"}? They will not be able to access the system until reactivated.`,
          buttonText: "Deactivate",
        },
        ACTIVE: {
          title: "Activate Student",
          message: `Activate ${currentStudent.student?.name || "this student"}? They will be able to access the system.`,
          buttonText: "Activate",
        },
      };

      const config = statusConfig[newStatus];
      if (config && !window.confirm(`${config.title}\n\n${config.message}`)) {
        return;
      }

      await updateUserStatus(userId, newStatus);

      // Show specific success messages
      const successMessages = {
        ACTIVE: "Student activated successfully!",
        INACTIVE: "Student deactivated successfully!",
        TERMINATED: "Student account terminated successfully!",
      };

      toast.success(
        successMessages[newStatus] || `Student status updated to ${newStatus}`,
      );

      // Refresh the data
      await Promise.all([
        fetchStudents(),
        (async () => {
          const updatedDetails = await getStudentDetails(id);
          setStudentDetails(updatedDetails);
        })(),
      ]);
    } catch (error) {
      console.error("Status update error:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update status",
      );
    }
  };

  // Helper functions for styling
  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "TERMINATED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getClassTypeColor = (type) => {
    switch (type) {
      case "REGULAR":
        return "bg-blue-100 text-blue-800";
      case "HIFZ":
        return "bg-purple-100 text-purple-800";
      case "NAZRA":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return "Unknown";
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    } catch (error) {
      return "Unknown";
    }
  };

  // Helper to get class history data
  const getClassHistoryData = () => {
    if (!currentStudent) return [];

    if (currentStudent.academic?.classHistory?.length > 0) {
      return currentStudent.academic.classHistory;
    }

    if (currentStudent.classHistory?.length > 0) {
      return currentStudent.classHistory;
    }

    return [];
  };

  // Helper to get attendance data
  const getAttendanceData = () => {
    if (!currentStudent) return null;

    return (
      currentStudent.academic?.attendance || currentStudent.attendance || null
    );
  };

  // Helper to get progress data
  const getProgressData = () => {
    if (!currentStudent) return {};

    return currentStudent.progress || {};
  };

  // Helper to get parents data
  const getParentsData = () => {
    if (!currentStudent) return [];

    return currentStudent.parents || [];
  };

  // Edit form fields based on mode
  const renderEditForm = () => {
    switch (editMode) {
      case "personal":
        return (
          <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-yellow-800">
                Edit Personal Information
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editedData.name || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editedData.email || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editedData.phone || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, phone: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={editedData.gender || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, gender: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editedData.dateOfBirth || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      dateOfBirth: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place of Birth
                </label>
                <input
                  type="text"
                  value={editedData.placeOfBirth || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      placeOfBirth: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={editedData.nationality || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      nationality: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <input
                  type="text"
                  value={editedData.religion || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, religion: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={editedData.bloodGroup || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, bloodGroup: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-800">
                Edit Contact Information
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editedData.address || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, address: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={editedData.city || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, city: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={editedData.province || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, province: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={editedData.postalCode || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, postalCode: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "guardian":
        return (
          <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-green-800">
                Edit Guardian Information
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={editedData.guardianName || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianName: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation
                </label>
                <input
                  type="text"
                  value={editedData.guardianRelation || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianRelation: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editedData.guardianPhone || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianPhone: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editedData.guardianEmail || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianEmail: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={editedData.guardianOccupation || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianOccupation: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNIC
                </label>
                <input
                  type="text"
                  value={editedData.guardianCNIC || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      guardianCNIC: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  placeholder="XXXXX-XXXXXXX-X"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "academic":
        return (
          <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-800">
                Edit Academic Information
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Room ID
                </label>
                <input
                  type="text"
                  value={editedData.classRoomId || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      classRoomId: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  placeholder="Enter class room ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="number"
                  value={editedData.rollNumber || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, rollNumber: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  placeholder="Enter roll number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editedData.startDate || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, startDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "medical":
        return (
          <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-red-800">
                Edit Medical Information
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Conditions
                </label>
                <textarea
                  value={editedData.medicalConditions || ""}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      medicalConditions: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] h-24"
                  placeholder="List any medical conditions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                <textarea
                  value={editedData.allergies || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, allergies: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] h-24"
                  placeholder="List any allergies..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Medication
                </label>
                <textarea
                  value={editedData.medication || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, medication: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] h-24"
                  placeholder="List any current medications..."
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Student not found
        </h3>
        <button
          onClick={() => navigate("/admin/students")}
          className="text-[#F59E0B] hover:text-[#D97706] text-sm font-medium"
        >
          Back to Students
        </button>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const user =
    currentStudent.student || currentStudent.user || currentStudent || {};
  const profile = currentStudent.profile || {};
  const academic = currentStudent.academic || {};
  const progress = getProgressData();
  const parents = getParentsData();
  const documents = studentDetails?.documents || {};
  const urls = studentDetails?.urls || {};

  // Get specific data
  const attendanceData = getAttendanceData();
  const classHistoryData = getClassHistoryData();

  return (
    <div className="space-y-6">
      {/* Header with Profile Image */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate("/admin/students")}
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
                  {user.name?.charAt(0).toUpperCase() || "S"}
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
                {academic.currentEnrollment?.classRoom?.name || "Not enrolled"}{" "}
                • Roll No: {academic.currentEnrollment?.rollNumber || "N/A"}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}
                >
                  {user.status}
                </span>
                <span className="text-sm text-gray-500">
                  Admission: {profile.admissionNo || "N/A"}
                </span>
                {academic.currentEnrollment?.classRoom?.type && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(academic.currentEnrollment.classRoom.type)}`}
                  >
                    {academic.currentEnrollment.classRoom.type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => navigate(`/admin/students/${id}/history`)}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <History className="h-4 w-4" />
              <span>View Full History</span>
            </button>
            {!isEditing && (
              <button
                onClick={() => initializeEditData("personal")}
                className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Student</span>
              </button>
            )}
            <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-[#F59E0B] text-[#F59E0B] rounded-lg hover:bg-[#FFFBEB] transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form (when active) */}
      {isEditing && renderEditForm()}

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            "overview",
            "academic",
            "progress",
            "attendance",
            "documents",
            "medical",
            "history",
            "parents",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "academic" && "Academic"}
              {tab === "progress" && "Progress"}
              {tab === "attendance" &&
                `Attendance (${attendanceData?.percentage || 0}%)`}
              {tab === "documents" && (
                <span className="flex items-center space-x-1">
                  <File className="h-4 w-4" />
                  <span>Documents</span>
                </span>
              )}
              {tab === "medical" && "Medical"}
              {tab === "history" && (
                <span className="flex items-center space-x-1">
                  <History className="h-4 w-4" />
                  <span>History ({classHistoryData.length || 0})</span>
                </span>
              )}
              {tab === "parents" && "Parents"}
            </button>
          ))}
          {/* Monthly Report tab — only for Hifz students */}
          {academic?.currentEnrollment?.classRoom?.type === "HIFZ" && (
            <button
              onClick={() => setActiveTab("monthly-report")}
              className={`shrink-0 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === "monthly-report"
                  ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📋 Monthly Report
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        {/* Overview Tab */}
        {activeTab === "overview" && !isEditing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                  <button
                    onClick={() => initializeEditData("personal")}
                    className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={Mail} label="Email" value={user.email} />
                  <InfoItem
                    icon={Calendar}
                    label="Date of Birth"
                    value={formatDate(profile.dob)}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Age"
                    value={
                      profile.dob
                        ? `${calculateAge(profile.dob)} years`
                        : "Unknown"
                    }
                  />
                  <InfoItem
                    icon={UserCircle}
                    label="Gender"
                    value={profile.gender}
                  />
                  <InfoItem
                    icon={MapPin}
                    label="Place of Birth"
                    value={profile.placeOfBirth}
                  />
                  <InfoItem
                    icon={Globe}
                    label="Nationality"
                    value={profile.nationality}
                  />
                  <InfoItem
                    icon={Book}
                    label="Religion"
                    value={profile.religion}
                  />
                  <InfoItem
                    icon={Heart}
                    label="Blood Group"
                    value={profile.bloodGroup}
                  />
                </div>
              </div>

              {/* Current Enrollment */}
              {academic.currentEnrollment && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Current Enrollment
                    </h3>
                    <button
                      onClick={() => initializeEditData("academic")}
                      className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem
                      icon={BookOpen}
                      label="Class"
                      value={academic.currentEnrollment.classRoom?.name}
                    />
                    <InfoItem
                      icon={GraduationCap}
                      label="Class Type"
                      value={academic.currentEnrollment.classRoom?.type}
                    />
                    <InfoItem
                      icon={Users}
                      label="Roll Number"
                      value={academic.currentEnrollment.rollNumber}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="Start Date"
                      value={formatDate(academic.currentEnrollment.startDate)}
                    />
                    {academic.currentEnrollment.classRoom?.grade && (
                      <InfoItem
                        icon={Award}
                        label="Grade Level"
                        value={academic.currentEnrollment.classRoom.grade}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Address Information */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Address Information
                  </h3>
                  <button
                    onClick={() => initializeEditData("contact")}
                    className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem
                    icon={MapPin}
                    label="Address"
                    value={profile.address}
                  />
                  <InfoItem icon={Home} label="City" value={profile.city} />
                  <InfoItem
                    icon={Home}
                    label="Province"
                    value={profile.province}
                  />
                  <InfoItem
                    icon={Home}
                    label="Postal Code"
                    value={profile.postalCode}
                  />
                </div>
              </div>
            </div>

            {/* Status & Guardian */}
            <div className="space-y-6">
              {/* Statistics */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <StatItem
                    label="Attendance Rate"
                    value={`${attendanceData?.percentage || 0}%`}
                  />
                  <StatItem
                    label="Present Days"
                    value={attendanceData?.present || 0}
                  />
                  <StatItem
                    label="Total Days"
                    value={attendanceData?.total || 0}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Status
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={user.status === "ACTIVE"}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Activate Account</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("INACTIVE")}
                    disabled={user.status === "INACTIVE"}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Deactivate Account</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("TERMINATED")}
                    disabled={user.status === "TERMINATED"}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Terminate Account</span>
                  </button>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Guardian Information
                  </h3>
                  <button
                    onClick={() => initializeEditData("guardian")}
                    className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <InfoItem
                    icon={Users}
                    label="Name"
                    value={profile.guardianName}
                  />
                  <InfoItem
                    icon={Users}
                    label="Relation"
                    value={profile.guardianRelation}
                  />
                  <InfoItem
                    icon={Phone}
                    label="Phone"
                    value={profile.guardianPhone}
                  />
                  <InfoItem
                    icon={Mail}
                    label="Email"
                    value={profile.guardianEmail}
                  />
                  <InfoItem
                    icon={Briefcase}
                    label="Occupation"
                    value={profile.guardianOccupation}
                  />
                  <InfoItem
                    icon={FileDigit}
                    label="CNIC"
                    value={profile.guardianCNIC}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Academic Tab */}
        {activeTab === "academic" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Academic Information
              </h3>
              <button
                onClick={() => initializeEditData("academic")}
                className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            </div>

            {academic.currentEnrollment ? (
              <>
                {/* Class Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Current Class
                    </h4>
                    <p className="text-2xl font-bold text-[#92400E]">
                      {academic.currentEnrollment.classRoom?.name || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {academic.currentEnrollment.classRoom?.type?.toLowerCase() ||
                        "N/A"}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Roll Number
                    </h4>
                    <p className="text-2xl font-bold text-[#92400E]">
                      {academic.currentEnrollment.rollNumber || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">Class Position</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Enrollment Date
                    </h4>
                    <p className="text-2xl font-bold text-[#92400E]">
                      {academic.currentEnrollment.startDate
                        ? new Date(
                            academic.currentEnrollment.startDate,
                          ).getFullYear()
                        : "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">Academic Year</p>
                  </div>
                </div>

                {/* Class Details */}
                {academic.currentEnrollment.classRoom && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Class Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoItem
                        icon={BookOpen}
                        label="Class Name"
                        value={academic.currentEnrollment.classRoom.name}
                      />
                      <InfoItem
                        icon={GraduationCap}
                        label="Class Type"
                        value={academic.currentEnrollment.classRoom.type}
                      />
                      <InfoItem
                        icon={Award}
                        label="Grade Level"
                        value={academic.currentEnrollment.classRoom.grade}
                      />
                      <InfoItem
                        icon={Users}
                        label="Section"
                        value={academic.currentEnrollment.classRoom.section}
                      />
                      {academic.currentEnrollment.classRoom.teacher && (
                        <InfoItem
                          icon={Users}
                          label="Class Teacher"
                          value={
                            academic.currentEnrollment.classRoom.teacher.user
                              ?.name
                          }
                        />
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

        {/* Progress Tab */}
        {activeTab === "progress" && !isEditing && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {progress.type === "HIFZ"
                ? "Hifz Progress"
                : progress.type === "NAZRA"
                  ? "Nazra Progress"
                  : "Academic Progress"}
            </h3>

            {progress.type ? (
              <>
                {/* Progress Summary */}
                {progress.completionStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {progress.completionStats.completionPercentage?.toFixed(
                          1,
                        ) || 0}
                        %
                      </div>
                      <div className="text-sm text-green-600">Completion</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        {progress.completionStats.parasCompleted || 0}
                      </div>
                      <div className="text-sm text-blue-600">
                        Paras Completed
                      </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-800">
                        {progress.completionStats.totalLinesCompleted || 0}
                      </div>
                      <div className="text-sm text-purple-600">
                        Lines Completed
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-800">
                        {progress.completionStats.averageDailyLines?.toFixed(
                          1,
                        ) || 0}
                      </div>
                      <div className="text-sm text-orange-600">
                        Avg Daily Lines
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Progress */}
                {progress.progress && progress.progress.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Recent Progress
                    </h4>
                    <div className="space-y-3">
                      {progress.progress.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {formatDate(item.date)}
                            </span>
                            <span className="text-sm text-gray-600">
                              by {item.teacher?.user?.name || "Teacher"}
                            </span>
                          </div>
                          {progress.type === "HIFZ" && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">
                                  Sabaq Lines:{" "}
                                </span>
                                <span className="font-medium">
                                  {item.sabaqLines || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Current Para:{" "}
                                </span>
                                <span className="font-medium">
                                  {item.currentPara || "N/A"}
                                </span>
                              </div>
                            </div>
                          )}
                          {progress.type === "NAZRA" && (
                            <div>
                              <span className="text-gray-600">
                                Recited Lines:{" "}
                              </span>
                              <span className="font-medium">
                                {item.recitedLines || 0}
                              </span>
                            </div>
                          )}
                          {progress.type === "REGULAR" && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Subject: </span>
                                <span className="font-medium">
                                  {item.subject?.name || "N/A"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Percentage:{" "}
                                </span>
                                <span className="font-medium">
                                  {item.percentage
                                    ? (item.percentage * 100).toFixed(1) + "%"
                                    : "N/A"}
                                </span>
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

        {/* Attendance Tab */}
        {activeTab === "attendance" && !isEditing && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attendance Record
            </h3>

            {attendanceData ? (
              <>
                {/* Attendance Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">
                      {attendanceData.percentage?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Overall Attendance
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-800">
                      {attendanceData.present || 0}
                    </div>
                    <div className="text-sm text-gray-600">Present Days</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-800">
                      {(attendanceData.total || 0) -
                        (attendanceData.present || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Absent Days</div>
                  </div>
                </div>

                {/* Recent Attendance */}
                {attendanceData.recent && attendanceData.recent.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Recent Attendance
                    </h4>
                    <div className="space-y-3">
                      {attendanceData.recent
                        .slice(0, 10)
                        .map((record, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-xl"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-sm">
                                {formatDate(record.date)} -{" "}
                                {record.classRoom?.name || "Class"}
                              </span>
                              {record.subject && (
                                <span className="text-sm text-gray-600 ml-2">
                                  ({record.subject.name})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.status === "PRESENT"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "ABSENT"
                                      ? "bg-red-100 text-red-800"
                                      : record.status === "LATE"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {record.status || "UNKNOWN"}
                              </span>
                              {record.teacher && (
                                <span className="text-gray-600">
                                  by {record.teacher.user?.name || "Teacher"}
                                </span>
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

        {/* Documents Tab */}
        {activeTab === "documents" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Student Documents
              </h3>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                <span>Upload New</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Birth Certificate */}
              <DocumentCard
                title="Birth Certificate"
                icon={FileText}
                available={!!documents.birthCertificate}
                onDownload={() => handleDocumentDownload("birth-certificate")}
                onDelete={() => handleDocumentDelete("birth-certificate")}
                onPreview={() => handleDocumentPreview("birth-certificate")} // ← add this
              />

              {/* CNIC / B-Form */}
              <DocumentCard
                title="CNIC / B-Form"
                icon={Shield}
                available={!!documents.cnicOrBForm}
                onDownload={() => handleDocumentDownload("cnic-bform")}
                onDelete={() => handleDocumentDelete("cnic-bform")}
                onPreview={() => handleDocumentPreview("cnic-bform")} // ← add this
              />

              {/* Previous School Certificate */}
              <DocumentCard
                title="Previous School Certificate"
                icon={School}
                available={!!documents.previousSchoolCertificate}
                onDownload={() => handleDocumentDownload("previous-school")}
                onDelete={() => handleDocumentDelete("previous-school")}
                onPreview={() => handleDocumentPreview("previous-school")} // ← add this
              />

              {/* Other Documents */}
              {documents.otherDocuments &&
                documents.otherDocuments.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Other Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.otherDocuments.map((doc, index) => (
                        <DocumentCard
                          key={index}
                          title={`Document ${index + 1}`}
                          icon={File}
                          available={true}
                          onDownload={() =>
                            handleDocumentDownload("other", index)
                          }
                          onDelete={() => handleDocumentDelete("other", index)}
                          onPreview={() =>
                            handleDocumentPreview("other", index)
                          } // ← add this
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
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Document Status
                  </h4>
                  <p className="text-sm text-blue-700">
                    Total documents available:{" "}
                    {(documents.birthCertificate ? 1 : 0) +
                      (documents.cnicOrBForm ? 1 : 0) +
                      (documents.previousSchoolCertificate ? 1 : 0) +
                      (documents.otherDocuments?.length || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical Tab */}
        {activeTab === "medical" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Medical Information
              </h3>
              <button
                onClick={() => initializeEditData("medical")}
                className="flex items-center space-x-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem
                  icon={AlertTriangle}
                  label="Medical Conditions"
                  value={profile.medicalConditions || "None"}
                />
                <InfoItem
                  icon={Cross}
                  label="Allergies"
                  value={profile.allergies || "None"}
                />
                <InfoItem
                  icon={Stethoscope}
                  label="Medication"
                  value={profile.medication || "None"}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  Emergency Notes
                </h4>
                <p className="text-sm text-yellow-700">
                  In case of emergency, please contact{" "}
                  {profile.guardianName || "the guardian"} immediately
                  {profile.guardianPhone && ` at ${profile.guardianPhone}`} and
                  follow the medical instructions provided.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Enrollment History
              </h3>
              <button
                onClick={() => navigate(`/admin/students/${id}/history`)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                <span>View Detailed History</span>
              </button>
            </div>

            {classHistoryData.length > 0 ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-800">
                      {classHistoryData.length}
                    </div>
                    <div className="text-sm text-blue-600">
                      Total Enrollments
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">
                      {classHistoryData.filter((e) => e.isCurrent).length}
                    </div>
                    <div className="text-sm text-green-600">Current</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-800">
                      {classHistoryData.filter((e) => !e.isCurrent).length}
                    </div>
                    <div className="text-sm text-purple-600">Completed</div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {classHistoryData.map((enrollment, index) => {
                    const startDate = new Date(enrollment.startDate);
                    const endDate = enrollment.endDate
                      ? new Date(enrollment.endDate)
                      : new Date();
                    const duration = Math.ceil(
                      (endDate - startDate) / (1000 * 60 * 60 * 24),
                    );
                    const months = Math.floor(duration / 30);

                    return (
                      <div key={index} className="relative pb-8">
                        {/* Timeline Line */}
                        {index !== classHistoryData.length - 1 && (
                          <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200"></div>
                        )}

                        {/* Enrollment Card */}
                        <div className="flex items-start space-x-4">
                          {/* Timeline Dot */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                              enrollment.isCurrent
                                ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706]"
                                : "bg-gray-300"
                            }`}
                          >
                            <School className="h-6 w-6 text-white" />
                          </div>

                          {/* Card Content */}
                          <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-[#F59E0B] transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                                  <span>
                                    {enrollment.classRoom?.name ||
                                      "Unknown Class"}
                                  </span>
                                  {enrollment.isCurrent && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                                      Current
                                    </span>
                                  )}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {enrollment.classRoom?.grade && (
                                    <span className="text-sm text-gray-600">
                                      Grade {enrollment.classRoom.grade}
                                    </span>
                                  )}
                                  {enrollment.classRoom?.type && (
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full font-medium ${getClassTypeColor(enrollment.classRoom.type)}`}
                                    >
                                      {enrollment.classRoom.type}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Roll No: {enrollment.rollNumber || "N/A"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 sm:mt-0 sm:text-right">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>
                                    {months > 0
                                      ? `${months} month${months > 1 ? "s" : ""}`
                                      : `${duration} days`}
                                  </span>
                                </div>
                                {enrollment.classRoom?.teacher && (
                                  <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <User className="h-4 w-4 mr-1" />
                                    <span>
                                      {enrollment.classRoom.teacher.user
                                        ?.name || "Teacher"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <div>
                                  <span className="font-medium">Started:</span>
                                  <span className="ml-1">
                                    {formatDate(enrollment.startDate)}
                                  </span>
                                </div>
                              </div>
                              {enrollment.endDate && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  <div>
                                    <span className="font-medium">Ended:</span>
                                    <span className="ml-1">
                                      {formatDate(enrollment.endDate)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Promotion/Transfer Info */}
                            {enrollment.promotedTo && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-start space-x-2">
                                  <TrendingUp className="h-4 w-4 mt-0.5 text-green-600" />
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      Promoted to:{" "}
                                    </span>
                                    <span className="text-green-600">
                                      {enrollment.promotedTo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No enrollment history available</p>
              </div>
            )}
          </div>
        )}

        {/* Parents Tab */}
        {activeTab === "parents" && !isEditing && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Parent/Guardian Information
            </h3>

            {parents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {parents.map((parent, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4 hover:border-[#F59E0B] transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold">
                        {parent.user?.name?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {parent.user?.name || "Parent"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {parent.user?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoItem
                        icon={Phone}
                        label="Phone"
                        value={parent.user?.phone}
                      />
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

        {/* Monthly Report Tab — Hifz students only */}
        {activeTab === "monthly-report" &&
          academic?.currentEnrollment?.classRoom?.type === "HIFZ" &&
          !isEditing && (
            <div className="space-y-4">
              <StudentMonthlyReport
                studentId={
                  currentStudent?.profile?.id || studentDetails?.profile?.id
                }
                studentName={user?.name}
                rollNumber={academic?.currentEnrollment?.rollNumber || "N/A"}
                teacherName={
                  academic?.currentEnrollment?.classRoom?.teacher?.user?.name ||
                  "N/A"
                }
              />
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Upload Document
            </h3>

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
                  <option value="birth-certificate">Birth Certificate</option>
                  <option value="cnic-bform">CNIC / B-Form</option>
                  <option value="previous-school">
                    Previous School Certificate
                  </option>
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
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploadFile ? uploadFile.name : "Click to select file"}
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
                    "Upload Document"
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
const DocumentCard = ({
  title,
  icon: Icon,
  available,
  url,
  onDownload,
  onDelete,
  onPreview,
}) => (
  <div
    className={`border-2 rounded-xl p-4 transition-all duration-200 ${
      available
        ? "border-green-200 bg-green-50 hover:border-green-400"
        : "border-gray-200 bg-gray-50"
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div
          className={`p-2 rounded-lg ${available ? "bg-green-100" : "bg-gray-200"}`}
        >
          <Icon
            className={`h-5 w-5 ${available ? "text-green-600" : "text-gray-400"}`}
          />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600">
            {available ? "Document available" : "Not uploaded"}
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
          onClick={onPreview} // ← use onPreview instead of window.open(url)
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
      <p className="text-sm font-medium text-gray-900">
        {value || "Not provided"}
      </p>
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

export default StudentDetail;
