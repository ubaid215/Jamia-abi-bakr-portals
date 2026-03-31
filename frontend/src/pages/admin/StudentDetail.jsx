/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, GraduationCap,
  Users, UserCheck, UserX, Edit, Download, Shield, Heart, AlertTriangle,
  BarChart3, FileText, Home, Award, History, Clock, User, School,
  TrendingUp, Upload, File, Eye, Trash2, CheckCircle, XCircle,
  Save, X, Globe, UserCircle, Briefcase, FileDigit, Book, Cross, Stethoscope,
} from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";
import { toast } from "react-hot-toast";
import axios from "axios";
import StudentMonthlyReport from "../../components/hifz/StudentMonthlyReport";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  TERMINATED: "bg-red-100 text-red-800",
};

const CLASS_TYPE_COLORS = {
  REGULAR: "bg-blue-100 text-blue-800",
  HIFZ: "bg-purple-100 text-purple-800",
  NAZRA: "bg-orange-100 text-orange-800",
};

const TABS = ["overview", "academic", "progress", "attendance", "documents", "medical", "history", "parents"];

const STATUS_ACTIONS = {
  ACTIVE:     { label: "Activate Account",    style: "bg-green-100 text-green-800 hover:bg-green-200",   icon: UserCheck },
  INACTIVE:   { label: "Deactivate Account",  style: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200", icon: UserX },
  TERMINATED: { label: "Terminate Account",   style: "bg-red-100 text-red-800 hover:bg-red-200",         icon: UserX },
};

const STATUS_CONFIRM = {
  TERMINATED: {
    title: "Terminate Student Account",
    message: (name) => `Are you sure you want to terminate ${name}? This action is irreversible.`,
  },
  INACTIVE: {
    title: "Deactivate Student",
    message: (name) => `Are you sure you want to deactivate ${name}? They won't be able to access the system.`,
  },
  ACTIVE: {
    title: "Activate Student",
    message: (name) => `Activate ${name}? They will regain system access.`,
  },
};

const SUCCESS_MESSAGES = {
  ACTIVE: "Student activated successfully!",
  INACTIVE: "Student deactivated successfully!",
  TERMINATED: "Student account terminated successfully!",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Strips null, undefined, and empty-string values from a payload
 * so optional fields are never sent as "" to the backend.
 */
const cleanPayload = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  );

const formatDate = (dateString) => {
  if (!dateString) return "Not provided";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

const calculateAge = (dob) => {
  if (!dob) return "Unknown";
  try {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return "Unknown";
  }
};

const getAuthToken = () => localStorage.getItem("authToken");

/**
 * Normalize whatever shape the API returns into a consistent
 * { student, profile, academic, progress, parents } object.
 */
const normalizeStudentData = (data) => {
  if (!data) return null;

  // Already normalized
  if (data.student && data.profile && data.academic) return data;

  // studentProfile shape (from list fallback)
  if (data.studentProfile) {
    const sp = data.studentProfile;
    return {
      student: { id: data.id, name: data.name, email: data.email, phone: data.phone, profileImage: data.profileImage, status: data.status, createdAt: data.createdAt },
      profile: { ...sp },
      academic: { currentEnrollment: sp.currentEnrollment || {}, attendance: sp.attendance || {}, classHistory: sp.classHistory || [] },
      progress: sp.progress || {},
      parents: sp.parents || [],
    };
  }

  // Direct student record shape
  if (data.user && data.admissionNo) {
    return {
      student: data.user,
      profile: {
        admissionNo: data.admissionNo, gender: data.gender, dob: data.dob,
        guardianName: data.guardianName, guardianPhone: data.guardianPhone,
        address: data.address, city: data.city, province: data.province,
      },
      academic: { currentEnrollment: data.currentEnrollment || {}, attendance: data.attendance || {} },
      progress: data.progress || {},
      parents: data.parents || [],
    };
  }

  return {
    student: data.user || data,
    profile: data,
    academic: { currentEnrollment: data.currentEnrollment || {}, attendance: data.attendance || {}, classHistory: data.classHistory || [] },
    progress: data.progress || {},
    parents: data.parents || [],
  };
};

// ─── Validation ───────────────────────────────────────────────────────────────

const PHONE_RE  = /^[\d\s\-+()]{7,15}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CNIC_RE   = /^\d{5}-\d{7}-\d{1}$/;

const validateEditData = (mode, data) => {
  const errors = [];
  switch (mode) {
    case "personal":
      if (!data.name?.trim())                          errors.push("Full name is required");
      if (data.email?.trim() && !EMAIL_RE.test(data.email))   errors.push("Invalid email format");
      if (data.phone?.trim() && !PHONE_RE.test(data.phone))   errors.push("Invalid phone number");
      break;
    case "contact":
      if (!data.address?.trim()) errors.push("Address is required");
      if (!data.city?.trim())    errors.push("City is required");
      break;
    case "guardian":
      if (!data.guardianName?.trim())                              errors.push("Guardian name is required");
      if (!data.guardianPhone?.trim())                             errors.push("Guardian phone is required");
      if (data.guardianPhone?.trim() && !PHONE_RE.test(data.guardianPhone)) errors.push("Guardian phone must be 7–15 digits");
      if (data.guardianEmail?.trim() && !EMAIL_RE.test(data.guardianEmail)) errors.push("Guardian email format is invalid");
      if (data.guardianCNIC?.trim()  && !CNIC_RE.test(data.guardianCNIC))   errors.push("CNIC must follow format: XXXXX-XXXXXXX-X");
      break;
    case "academic":
      if (data.rollNumber && isNaN(Number(data.rollNumber))) errors.push("Roll number must be a valid number");
      break;
    case "medical":
      break; // all optional
  }
  return errors;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoItem = React.memo(({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-3">
    <Icon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || "Not provided"}</p>
    </div>
  </div>
));

const StatItem = React.memo(({ label, value }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-[#92400E]">{value}</span>
  </div>
));

const SaveButton = React.memo(({ isSaving, onClick }) => (
  <button
    onClick={onClick}
    disabled={isSaving}
    className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center justify-center transition-colors"
  >
    {isSaving ? (
      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving...</>
    ) : (
      <><Save className="h-4 w-4 mr-2" />Save Changes</>
    )}
  </button>
));

const CancelButton = React.memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
  >
    Cancel
  </button>
));

const FormActions = React.memo(({ isSaving, onCancel, onSave }) => (
  <div className="flex space-x-3 pt-4 border-t border-gray-200 mt-4">
    <CancelButton onClick={onCancel} />
    <SaveButton isSaving={isSaving} onClick={onSave} />
  </div>
));

const DocumentCard = React.memo(({ title, icon: Icon, available, onDownload, onDelete, onPreview }) => (
  <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${available ? "border-green-200 bg-green-50 hover:border-green-400" : "border-gray-200 bg-gray-50"}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${available ? "bg-green-100" : "bg-gray-200"}`}>
          <Icon className={`h-5 w-5 ${available ? "text-green-600" : "text-gray-400"}`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{available ? "Document available" : "Not uploaded"}</p>
        </div>
      </div>
      {available ? (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-5 w-5 text-green-600" />
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-red-100 rounded-full transition-colors" title="Delete">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )}
    </div>
    {available && (
      <div className="flex space-x-2">
        <button onClick={onDownload} className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium">
          <Download className="h-4 w-4" /><span>Download</span>
        </button>
        <button onClick={onPreview} className="flex items-center justify-center px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors" title="Preview">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
));

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // ── State ──────────────────────────────────────────────────────────────────

  const [studentDetails, setStudentDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Image
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Documents
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  // Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState("");
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Prevent double-fetches
  const fetchedRef = useRef(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const refreshStudentDetails = useCallback(async () => {
    try {
      const details = await getStudentDetails(id);
      if (details) setStudentDetails(details);
    } catch (err) {
      console.warn("Could not refresh student details:", err);
    }
  }, [id, getStudentDetails]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      setDetailsLoading(true);
      try {
        const details = await getStudentDetails(id);
        if (details?.student || details?.user) {
          setStudentDetails(details);
        } else {
          // Fallback to direct API call
          const token = getAuthToken();
          const res = await axios.get(`${API_BASE_URL}/admin/students/${id}/details`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setStudentDetails(res.data);
        }
      } catch (err) {
        console.error("Error loading student:", err);
        toast.error("Failed to load student details");
      } finally {
        setDetailsLoading(false);
      }
    };

    load();
  }, [id, getStudentDetails]); // intentionally excludes `students` and `fetchStudents` to prevent infinite loops

  // ── Derived / memoized data ────────────────────────────────────────────────

  const currentStudent = useMemo(() => normalizeStudentData(studentDetails), [studentDetails]);

  const profileImageUrl = useMemo(() => {
    const s = currentStudent?.student;
    if (!s) return null;
    const img = s.profileImage;
    if (!img) return null;
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    return `${API_BASE_URL}/admin/public/profile-image/${s.id}`;
  }, [currentStudent]);

  const attendanceData = useMemo(() => (
    currentStudent?.academic?.attendance || null
  ), [currentStudent]);

  const classHistoryData = useMemo(() => (
    currentStudent?.academic?.classHistory || []
  ), [currentStudent]);

  const progressData = useMemo(() => (
    currentStudent?.progress || {}
  ), [currentStudent]);

  const parentsData = useMemo(() => (
    currentStudent?.parents || []
  ), [currentStudent]);

  const documents = useMemo(() => studentDetails?.documents || {}, [studentDetails]);
  const studentRecordId = useMemo(() => studentDetails?.profile?.id, [studentDetails]);

  // ── Edit helpers ───────────────────────────────────────────────────────────

  const initializeEditData = useCallback((mode) => {
    if (!currentStudent) return;
    const { student: s, profile: p, academic: a } = currentStudent;

    const modeData = {
      personal: {
        name: s?.name || "",
        email: s?.email || "",
        phone: s?.phone || "",
        gender: p?.gender || "",
        dateOfBirth: p?.dob ? new Date(p.dob).toISOString().split("T")[0] : "",
        placeOfBirth: p?.placeOfBirth || "",
        nationality: p?.nationality || "",
        religion: p?.religion || "",
        bloodGroup: p?.bloodGroup || "",
      },
      contact: {
        address: p?.address || "",
        city: p?.city || "",
        province: p?.province || "",
        postalCode: p?.postalCode || "",
      },
      guardian: {
        guardianName: p?.guardianName || "",
        guardianRelation: p?.guardianRelation || "",
        guardianPhone: p?.guardianPhone || "",
        guardianEmail: p?.guardianEmail || "",
        guardianOccupation: p?.guardianOccupation || "",
        guardianCNIC: p?.guardianCNIC || "",
      },
      academic: {
        classRoomId: a?.currentEnrollment?.classRoom?.id || "",
        rollNumber: a?.currentEnrollment?.rollNumber || "",
        startDate: a?.currentEnrollment?.startDate
          ? new Date(a.currentEnrollment.startDate).toISOString().split("T")[0]
          : "",
      },
      medical: {
        medicalConditions: p?.medicalConditions || "",
        allergies: p?.allergies || "",
        medication: p?.medication || "",
      },
    };

    setEditMode(mode);
    setEditedData(modeData[mode] || {});
    setIsEditing(true);
  }, [currentStudent]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditMode("");
    setEditedData({});
  }, []);

  const setField = useCallback((field) => (e) => {
    setEditedData((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSaveData = useCallback(async () => {
    if (!currentStudent) return;

    const errors = validateEditData(editMode, editedData);
    if (errors.length > 0) {
      errors.forEach((msg) => toast.error(msg));
      return;
    }

    setIsSaving(true);
    try {
      // Always use the URL `id` — backend resolves student by userId first
      const payloads = {
        personal: cleanPayload({
          name: editedData.name,
          email: editedData.email,
          phone: editedData.phone,
          gender: editedData.gender,
          dateOfBirth: editedData.dateOfBirth,
          placeOfBirth: editedData.placeOfBirth,
          nationality: editedData.nationality,
          religion: editedData.religion,
          bloodGroup: editedData.bloodGroup,
        }),
        contact: cleanPayload({
          address: editedData.address,
          city: editedData.city,
          province: editedData.province,
          postalCode: editedData.postalCode,
        }),
        guardian: cleanPayload({
          guardianName: editedData.guardianName,
          guardianRelation: editedData.guardianRelation,
          guardianPhone: editedData.guardianPhone,
          guardianEmail: editedData.guardianEmail,      // skipped if ""
          guardianOccupation: editedData.guardianOccupation,
          guardianCNIC: editedData.guardianCNIC,
        }),
        medical: cleanPayload({
          medicalConditions: editedData.medicalConditions,
          allergies: editedData.allergies,
          medication: editedData.medication,
        }),
      };

      if (editMode === "academic") {
        await updateStudentAcademicInfo(id, cleanPayload({
          classRoomId: editedData.classRoomId,
          rollNumber: editedData.rollNumber,
          startDate: editedData.startDate,
        }));
      } else {
        await updateStudent(id, payloads[editMode]);
      }

      toast.success("Student updated successfully");
      await refreshStudentDetails();
      handleCancelEdit();
    } catch (err) {
      console.error("Save error:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.message ||
        "Failed to update student";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }, [currentStudent, editMode, editedData, id, updateStudent, updateStudentAcademicInfo, refreshStudentDetails, handleCancelEdit]);

  // ── Status change ──────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!currentStudent) return toast.error("Student data not loaded");
    const userId = currentStudent.student?.id;
    if (!userId) return toast.error("Cannot identify student");

    const cfg = STATUS_CONFIRM[newStatus];
    const name = currentStudent.student?.name || "this student";
    if (!window.confirm(`${cfg.title}\n\n${cfg.message(name)}`)) return;

    try {
      await updateUserStatus(userId, newStatus);
      toast.success(SUCCESS_MESSAGES[newStatus]);
      await refreshStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Failed to update status");
    }
  }, [currentStudent, updateUserStatus, refreshStudentDetails]);

  // ── Profile image ──────────────────────────────────────────────────────────

  const handleProfileImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      await axios.put(`${API_BASE_URL}/admin/students/${id}/profile-image`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${getAuthToken()}` },
      });
      toast.success("Profile image updated");
      await refreshStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }, [id, refreshStudentDetails]);

  // ── Documents ──────────────────────────────────────────────────────────────

  const handleDocumentPreview = useCallback(async (type, index = null) => {
    if (!studentRecordId) return toast.error("Student record ID not found");
    try {
      let url = `${API_BASE_URL}/admin/students/${studentRecordId}/documents/${type}`;
      url += index !== null ? `?index=${index}&preview=true` : "?preview=true";

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Document preview failed");
    }
  }, [studentRecordId]);

  const handleDocumentDownload = useCallback(async (type, index = null) => {
    if (!studentRecordId) return toast.error("Student record ID not found");
    try {
      let url = `${API_BASE_URL}/admin/students/${studentRecordId}/documents/${type}`;
      if (index !== null) url += `?index=${index}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        responseType: "blob",
      });

      const downloadUrl = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;

      const cd = res.headers["content-disposition"];
      const match = cd?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      link.download = match?.[1]?.replace(/['"]/g, "") || `${type}-${Date.now()}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast.success("Document downloaded");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to download document");
    }
  }, [studentRecordId]);

  const handleDocumentDelete = useCallback(async (type, index = null) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    if (!studentRecordId) return toast.error("Student record ID not found");
    try {
      let url = `${API_BASE_URL}/admin/students/${studentRecordId}/documents/${type}`;
      if (index !== null) url += `?index=${index}`;
      await axios.delete(url, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Document deleted");
      await refreshStudentDetails();
    } catch (err) {
      toast.error("Failed to delete document");
    }
  }, [studentRecordId, refreshStudentDetails]);

  const handleDocumentUpload = useCallback(async () => {
    if (!selectedDocType || !uploadFile) return toast.error("Please select document type and file");
    if (!studentRecordId) return toast.error("Student record ID not found");

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("document", uploadFile);
      formData.append("type", selectedDocType);
      await axios.post(`${API_BASE_URL}/admin/students/${studentRecordId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${getAuthToken()}` },
      });
      toast.success("Document uploaded");
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedDocType("");
      await refreshStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  }, [selectedDocType, uploadFile, studentRecordId, refreshStudentDetails]);

  // ── CNIC formatter ─────────────────────────────────────────────────────────

  const handleCNICChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    let fmt = raw;
    if (raw.length > 5)  fmt = raw.slice(0, 5) + "-" + raw.slice(5);
    if (raw.length > 12) fmt = fmt.slice(0, 13) + "-" + raw.slice(12);
    setEditedData((prev) => ({ ...prev, guardianCNIC: fmt.slice(0, 15) }));
  }, []);

  // ── Edit forms ─────────────────────────────────────────────────────────────

  const renderEditForm = () => {
    const formWrappers = {
      personal:  { bg: "bg-yellow-50 border-yellow-200", title: "Edit Personal Information",  titleColor: "text-yellow-800" },
      contact:   { bg: "bg-blue-50 border-blue-200",     title: "Edit Contact Information",   titleColor: "text-blue-800"   },
      guardian:  { bg: "bg-green-50 border-green-200",   title: "Edit Guardian Information",  titleColor: "text-green-800"  },
      academic:  { bg: "bg-purple-50 border-purple-200", title: "Edit Academic Information",  titleColor: "text-purple-800" },
      medical:   { bg: "bg-red-50 border-red-200",       title: "Edit Medical Information",   titleColor: "text-red-800"    },
    };

    const fw = formWrappers[editMode];
    if (!fw) return null;

    const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] bg-white";
    const labelCls = "block text-xs font-medium text-gray-600 mb-1";

    const fields = {
      personal: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={editedData.name || ""} onChange={setField("name")} className={inputCls} /></div>
          <div><label className={labelCls}>Email <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="email" value={editedData.email || ""} onChange={setField("email")} className={inputCls} placeholder="student@email.com" /></div>
          <div><label className={labelCls}>Phone</label>
            <input type="tel" value={editedData.phone || ""} onChange={setField("phone")} className={inputCls} placeholder="+92 XXX XXXXXXX" /></div>
          <div><label className={labelCls}>Gender</label>
            <select value={editedData.gender || ""} onChange={setField("gender")} className={inputCls}>
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select></div>
          <div><label className={labelCls}>Date of Birth</label>
            <input type="date" value={editedData.dateOfBirth || ""} onChange={setField("dateOfBirth")} className={inputCls} /></div>
          <div><label className={labelCls}>Place of Birth</label>
            <input type="text" value={editedData.placeOfBirth || ""} onChange={setField("placeOfBirth")} className={inputCls} /></div>
          <div><label className={labelCls}>Nationality</label>
            <input type="text" value={editedData.nationality || ""} onChange={setField("nationality")} className={inputCls} /></div>
          <div><label className={labelCls}>Religion</label>
            <input type="text" value={editedData.religion || ""} onChange={setField("religion")} className={inputCls} /></div>
          <div><label className={labelCls}>Blood Group</label>
            <select value={editedData.bloodGroup || ""} onChange={setField("bloodGroup")} className={inputCls}>
              <option value="">Select</option>
              {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(g => <option key={g} value={g}>{g}</option>)}
            </select></div>
        </div>
      ),
      contact: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={labelCls}>Address <span className="text-red-500">*</span></label>
            <input type="text" value={editedData.address || ""} onChange={setField("address")} className={inputCls} /></div>
          <div><label className={labelCls}>City <span className="text-red-500">*</span></label>
            <input type="text" value={editedData.city || ""} onChange={setField("city")} className={inputCls} /></div>
          <div><label className={labelCls}>Province</label>
            <input type="text" value={editedData.province || ""} onChange={setField("province")} className={inputCls} /></div>
          <div><label className={labelCls}>Postal Code</label>
            <input type="text" value={editedData.postalCode || ""} onChange={setField("postalCode")} className={inputCls} /></div>
        </div>
      ),
      guardian: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Guardian Name <span className="text-red-500">*</span></label>
            <input type="text" value={editedData.guardianName || ""} onChange={setField("guardianName")} className={inputCls} /></div>
          <div><label className={labelCls}>Relation</label>
            <input type="text" value={editedData.guardianRelation || ""} onChange={setField("guardianRelation")} className={inputCls} placeholder="Father / Mother / Uncle…" /></div>
          <div>
            <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
            <input type="tel" value={editedData.guardianPhone || ""} onChange={setField("guardianPhone")}
              className={`${inputCls} ${editedData.guardianPhone && !PHONE_RE.test(editedData.guardianPhone) ? "border-red-400 bg-red-50" : ""}`}
              placeholder="+92 XXX XXXXXXX" />
            {editedData.guardianPhone && !PHONE_RE.test(editedData.guardianPhone) && (
              <p className="text-xs text-red-500 mt-1">Enter a valid phone number</p>)}
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="email" value={editedData.guardianEmail || ""} onChange={setField("guardianEmail")}
              className={`${inputCls} ${editedData.guardianEmail && !EMAIL_RE.test(editedData.guardianEmail) ? "border-red-400 bg-red-50" : ""}`}
              placeholder="guardian@email.com" />
            {editedData.guardianEmail && !EMAIL_RE.test(editedData.guardianEmail) && (
              <p className="text-xs text-red-500 mt-1">Invalid email format</p>)}
          </div>
          <div><label className={labelCls}>Occupation <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="text" value={editedData.guardianOccupation || ""} onChange={setField("guardianOccupation")} className={inputCls} /></div>
          <div>
            <label className={labelCls}>CNIC <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="text" value={editedData.guardianCNIC || ""} onChange={handleCNICChange}
              className={`${inputCls} ${editedData.guardianCNIC && !CNIC_RE.test(editedData.guardianCNIC) ? "border-red-400 bg-red-50" : ""}`}
              placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
            {editedData.guardianCNIC && !CNIC_RE.test(editedData.guardianCNIC) && (
              <p className="text-xs text-red-500 mt-1">Format: XXXXX-XXXXXXX-X</p>)}
          </div>
        </div>
      ),
      academic: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Class Room ID</label>
            <input type="text" value={editedData.classRoomId || ""} onChange={setField("classRoomId")} className={inputCls} placeholder="Enter class room ID" /></div>
          <div><label className={labelCls}>Roll Number</label>
            <input type="number" value={editedData.rollNumber || ""} onChange={setField("rollNumber")} className={inputCls} placeholder="Enter roll number" /></div>
          <div><label className={labelCls}>Start Date</label>
            <input type="date" value={editedData.startDate || ""} onChange={setField("startDate")} className={inputCls} /></div>
        </div>
      ),
      medical: (
        <div className="space-y-4">
          {[
            { field: "medicalConditions", label: "Medical Conditions", placeholder: "List any medical conditions…" },
            { field: "allergies",         label: "Allergies",          placeholder: "List any allergies…" },
            { field: "medication",        label: "Current Medication",  placeholder: "List any current medications…" },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className={labelCls}>{label} <span className="text-gray-400 text-xs">(optional)</span></label>
              <textarea value={editedData[field] || ""} onChange={setField(field)}
                className={`${inputCls} h-20 resize-none`} placeholder={placeholder} />
            </div>
          ))}
        </div>
      ),
    };

    return (
      <div className={`space-y-4 p-5 border rounded-xl ${fw.bg}`}>
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold ${fw.titleColor}`}>{fw.title}</h4>
          <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {fields[editMode]}
        <FormActions isSaving={isSaving} onCancel={handleCancelEdit} onSave={handleSaveData} />
      </div>
    );
  };

  // ── Loading / not found guards ─────────────────────────────────────────────

  if (detailsLoading && !currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B] mx-auto" />
          <p className="text-sm text-gray-500">Loading student details…</p>
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="text-center py-16">
        <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Student not found</h3>
        <button onClick={() => navigate("/admin/students")} className="text-[#F59E0B] hover:text-[#D97706] text-sm font-medium">
          ← Back to Students
        </button>
      </div>
    );
  }

  // ── Resolved data ──────────────────────────────────────────────────────────

  const user     = currentStudent.student || {};
  const profile  = currentStudent.profile || {};
  const academic = currentStudent.academic || {};

  const isHifz = academic?.currentEnrollment?.classRoom?.type === "HIFZ";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start space-x-4">
            <button onClick={() => navigate("/admin/students")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            {/* Avatar */}
            <div className="relative group shrink-0">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#F59E0B] cursor-pointer"
                  onClick={() => setShowImageModal(true)} />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {user.name?.charAt(0).toUpperCase() || "S"}
                </div>
              )}
              <label htmlFor="profile-image-upload"
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="h-5 w-5 text-white" />
                <input id="profile-image-upload" type="file" accept="image/*" className="hidden"
                  onChange={handleProfileImageUpload} disabled={uploadingImage} />
              </label>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white" />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {academic.currentEnrollment?.classRoom?.name || "Not enrolled"} • Roll No: {academic.currentEnrollment?.rollNumber || "N/A"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.status] || "bg-gray-100 text-gray-800"}`}>
                  {user.status}
                </span>
                <span className="text-xs text-gray-400">Admission: {profile.admissionNo || "N/A"}</span>
                {academic.currentEnrollment?.classRoom?.type && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLASS_TYPE_COLORS[academic.currentEnrollment.classRoom.type] || "bg-gray-100 text-gray-800"}`}>
                    {academic.currentEnrollment.classRoom.type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <button onClick={() => navigate(`/admin/students/${id}/history`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
              <History className="h-4 w-4" /><span>History</span>
            </button>
            {!isEditing && (
              <button onClick={() => initializeEditData("personal")}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                <Edit className="h-4 w-4" /><span>Edit</span>
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-2 border border-[#F59E0B] text-[#F59E0B] rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" /><span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit form (inline) ── */}
      {isEditing && renderEditForm()}

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`shrink-0 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${activeTab === tab ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              {tab === "attendance" ? `Attendance (${attendanceData?.percentage?.toFixed(0) || 0}%)` :
               tab === "history"    ? `History (${classHistoryData.length})` :
               tab === "documents"  ? <span className="flex items-center gap-1"><File className="h-3.5 w-3.5" />Documents</span> :
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {isHifz && (
            <button onClick={() => setActiveTab("monthly-report")}
              className={`shrink-0 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${activeTab === "monthly-report" ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              📋 Monthly Report
            </button>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">

        {/* OVERVIEW */}
        {activeTab === "overview" && !isEditing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-8">

              {/* Personal */}
              <Section title="Personal Information" onEdit={() => initializeEditData("personal")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={Mail}       label="Email"         value={user.email} />
                  <InfoItem icon={Phone}      label="Phone"         value={user.phone} />
                  <InfoItem icon={Calendar}   label="Date of Birth" value={formatDate(profile.dob)} />
                  <InfoItem icon={Calendar}   label="Age"           value={profile.dob ? `${calculateAge(profile.dob)} years` : undefined} />
                  <InfoItem icon={UserCircle} label="Gender"        value={profile.gender} />
                  <InfoItem icon={MapPin}     label="Place of Birth" value={profile.placeOfBirth} />
                  <InfoItem icon={Globe}      label="Nationality"   value={profile.nationality} />
                  <InfoItem icon={Book}       label="Religion"      value={profile.religion} />
                  <InfoItem icon={Heart}      label="Blood Group"   value={profile.bloodGroup} />
                </div>
              </Section>

              {/* Enrollment */}
              {academic.currentEnrollment && (
                <Section title="Current Enrollment" onEdit={() => initializeEditData("academic")}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={BookOpen}     label="Class"       value={academic.currentEnrollment.classRoom?.name} />
                    <InfoItem icon={GraduationCap} label="Class Type" value={academic.currentEnrollment.classRoom?.type} />
                    <InfoItem icon={Users}        label="Roll Number" value={academic.currentEnrollment.rollNumber} />
                    <InfoItem icon={Calendar}     label="Start Date"  value={formatDate(academic.currentEnrollment.startDate)} />
                    {academic.currentEnrollment.classRoom?.grade && (
                      <InfoItem icon={Award} label="Grade Level" value={academic.currentEnrollment.classRoom.grade} />
                    )}
                  </div>
                </Section>
              )}

              {/* Address */}
              <Section title="Address Information" onEdit={() => initializeEditData("contact")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={MapPin} label="Address"     value={profile.address} />
                  <InfoItem icon={Home}   label="City"        value={profile.city} />
                  <InfoItem icon={Home}   label="Province"    value={profile.province} />
                  <InfoItem icon={Home}   label="Postal Code" value={profile.postalCode} />
                </div>
              </Section>
            </div>

            <div className="space-y-5">
              {/* Quick stats */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
                <div className="divide-y divide-gray-100">
                  <StatItem label="Attendance Rate"  value={`${attendanceData?.percentage?.toFixed(1) || 0}%`} />
                  <StatItem label="Present Days"     value={attendanceData?.present || 0} />
                  <StatItem label="Total Days"       value={attendanceData?.total || 0} />
                  {progressData.averagePercentage && (
                    <StatItem label="Avg Score" value={`${progressData.averagePercentage}%`} />
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Status</h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_ACTIONS).map(([status, { label, style, icon: Icon }]) => (
                    <button key={status} onClick={() => handleStatusChange(status)} disabled={user.status === status}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium ${style}`}>
                      <Icon className="h-4 w-4" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guardian */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Guardian</h3>
                  <button onClick={() => initializeEditData("guardian")} className="text-xs text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1">
                    <Edit className="h-3 w-3" />Edit
                  </button>
                </div>
                <div className="space-y-3">
                  <InfoItem icon={Users}    label="Name"       value={profile.guardianName} />
                  <InfoItem icon={Users}    label="Relation"   value={profile.guardianRelation} />
                  <InfoItem icon={Phone}    label="Phone"      value={profile.guardianPhone} />
                  <InfoItem icon={Mail}     label="Email"      value={profile.guardianEmail} />
                  <InfoItem icon={Briefcase} label="Occupation" value={profile.guardianOccupation} />
                  <InfoItem icon={FileDigit} label="CNIC"      value={profile.guardianCNIC} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACADEMIC */}
        {activeTab === "academic" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
              <button onClick={() => initializeEditData("academic")} className="text-sm text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1">
                <Edit className="h-4 w-4" />Edit
              </button>
            </div>
            {academic.currentEnrollment ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "Current Class",    value: academic.currentEnrollment.classRoom?.name, sub: academic.currentEnrollment.classRoom?.type?.toLowerCase() },
                    { title: "Roll Number",      value: academic.currentEnrollment.rollNumber,       sub: "Class Position" },
                    { title: "Enrollment Year",  value: academic.currentEnrollment.startDate ? new Date(academic.currentEnrollment.startDate).getFullYear() : "N/A", sub: "Academic Year" },
                  ].map(({ title, value, sub }) => (
                    <div key={title} className="border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                      <p className="text-2xl font-bold text-[#92400E]">{value || "N/A"}</p>
                      <p className="text-xs text-gray-400 capitalize">{sub}</p>
                    </div>
                  ))}
                </div>
                {academic.currentEnrollment.classRoom && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm">Class Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoItem icon={BookOpen}      label="Class Name"    value={academic.currentEnrollment.classRoom.name} />
                      <InfoItem icon={GraduationCap} label="Class Type"    value={academic.currentEnrollment.classRoom.type} />
                      <InfoItem icon={Award}         label="Grade Level"   value={academic.currentEnrollment.classRoom.grade} />
                      <InfoItem icon={Users}         label="Section"       value={academic.currentEnrollment.classRoom.section} />
                      {academic.currentEnrollment.classRoom.teacher && (
                        <InfoItem icon={User} label="Class Teacher" value={academic.currentEnrollment.classRoom.teacher.user?.name} />
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={BookOpen} message="Not currently enrolled in any class" />
            )}
          </div>
        )}

        {/* PROGRESS */}
        {activeTab === "progress" && !isEditing && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {progressData.type === "HIFZ" ? "Hifz Progress" : progressData.type === "NAZRA" ? "Nazra Progress" : "Academic Progress"}
            </h3>
            {progressData.type ? (
              <>
                {progressData.completionStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Completion",       value: `${progressData.completionStats.completionPercentage?.toFixed(1) || 0}%`, color: "green" },
                      { label: "Paras Completed",  value: progressData.completionStats.parasCompleted || 0,                         color: "blue"  },
                      { label: "Lines Completed",  value: progressData.completionStats.totalLinesCompleted || 0,                    color: "purple" },
                      { label: "Avg Daily Lines",  value: progressData.completionStats.averageDailyLines?.toFixed(1) || 0,         color: "orange" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 text-center`}>
                        <div className={`text-2xl font-bold text-${color}-800`}>{value}</div>
                        <div className={`text-xs text-${color}-600 mt-1`}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {progressData.progress?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Progress</h4>
                    <div className="space-y-3">
                      {progressData.progress.slice(0, 5).map((item, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{formatDate(item.date)}</span>
                            <span className="text-xs text-gray-500">by {item.teacher?.user?.name || "Teacher"}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            {progressData.type === "HIFZ" && (<>
                              <span>Sabaq Lines: <strong>{item.sabaqLines || 0}</strong></span>
                              <span>Para: <strong>{item.currentPara || "N/A"}</strong></span>
                            </>)}
                            {progressData.type === "NAZRA" && (
                              <span>Recited Lines: <strong>{item.recitedLines || 0}</strong></span>
                            )}
                            {progressData.type === "REGULAR" && (<>
                              <span>Subject: <strong>{item.subject?.name || "N/A"}</strong></span>
                              <span>Score: <strong>{item.percentage ? (item.percentage * 100).toFixed(1) + "%" : "N/A"}</strong></span>
                            </>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={BarChart3} message="No progress data available" />
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && !isEditing && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Record</h3>
            {attendanceData ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{attendanceData.percentage?.toFixed(1) || 0}%</div>
                    <div className="text-xs text-gray-500 mt-1">Overall</div>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{attendanceData.present || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Present</div>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{(attendanceData.total || 0) - (attendanceData.present || 0)}</div>
                    <div className="text-xs text-gray-500 mt-1">Absent</div>
                  </div>
                </div>
                {attendanceData.recent?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Recent Attendance</h4>
                    {attendanceData.recent.slice(0, 10).map((rec, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                        <span className="text-sm text-gray-700">
                          {formatDate(rec.date)} — {rec.classRoom?.name || "Class"}
                          {rec.subject && <span className="text-gray-400 ml-1">({rec.subject.name})</span>}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.status === "PRESENT" ? "bg-green-100 text-green-700" :
                          rec.status === "ABSENT"  ? "bg-red-100 text-red-700" :
                          rec.status === "LATE"    ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"}`}>
                          {rec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={Calendar} message="No attendance records found" />
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Student Documents</h3>
              <button onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors text-sm font-medium">
                <Upload className="h-4 w-4" />Upload New
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentCard title="Birth Certificate"         icon={FileText} available={!!documents.birthCertificate}          onDownload={() => handleDocumentDownload("birth-certificate")} onDelete={() => handleDocumentDelete("birth-certificate")} onPreview={() => handleDocumentPreview("birth-certificate")} />
              <DocumentCard title="CNIC / B-Form"            icon={Shield}   available={!!documents.cnicOrBForm}               onDownload={() => handleDocumentDownload("cnic-bform")}        onDelete={() => handleDocumentDelete("cnic-bform")}        onPreview={() => handleDocumentPreview("cnic-bform")} />
              <DocumentCard title="Previous School Cert."    icon={School}   available={!!documents.previousSchoolCertificate} onDownload={() => handleDocumentDownload("previous-school")}   onDelete={() => handleDocumentDelete("previous-school")}   onPreview={() => handleDocumentPreview("previous-school")} />
              {documents.otherDocuments?.map((_, idx) => (
                <DocumentCard key={idx} title={`Other Document ${idx + 1}`} icon={File} available
                  onDownload={() => handleDocumentDownload("other", idx)} onDelete={() => handleDocumentDelete("other", idx)} onPreview={() => handleDocumentPreview("other", idx)} />
              ))}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Total documents: {(documents.birthCertificate ? 1 : 0) + (documents.cnicOrBForm ? 1 : 0) + (documents.previousSchoolCertificate ? 1 : 0) + (documents.otherDocuments?.length || 0)}
              </p>
            </div>
          </div>
        )}

        {/* MEDICAL */}
        {activeTab === "medical" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
              <button onClick={() => initializeEditData("medical")} className="text-sm text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1">
                <Edit className="h-4 w-4" />Edit
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem icon={AlertTriangle} label="Medical Conditions" value={profile.medicalConditions || "None"} />
                <InfoItem icon={Cross}         label="Allergies"          value={profile.allergies || "None"} />
                <InfoItem icon={Stethoscope}   label="Medication"         value={profile.medication || "None"} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 text-sm mb-2">Emergency Contact</h4>
                <p className="text-sm text-amber-700">
                  Contact {profile.guardianName || "the guardian"}{profile.guardianPhone ? ` at ${profile.guardianPhone}` : ""} in case of emergency.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === "history" && !isEditing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Enrollment History</h3>
              <button onClick={() => navigate(`/admin/students/${id}/history`)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <FileText className="h-4 w-4" />View Detailed
              </button>
            </div>
            {classHistoryData.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total",     value: classHistoryData.length,                                  color: "blue"  },
                    { label: "Current",   value: classHistoryData.filter(e => e.isCurrent).length,         color: "green" },
                    { label: "Completed", value: classHistoryData.filter(e => !e.isCurrent).length,        color: "purple"},
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 text-center`}>
                      <div className={`text-2xl font-bold text-${color}-800`}>{value}</div>
                      <div className={`text-xs text-${color}-600 mt-1`}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="relative space-y-6">
                  {classHistoryData.map((enrollment, idx) => {
                    const start = new Date(enrollment.startDate);
                    const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
                    const days = Math.ceil((end - start) / 86400000);
                    const months = Math.floor(days / 30);
                    return (
                      <div key={idx} className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${enrollment.isCurrent ? "bg-gradient-to-br from-[#F59E0B] to-[#D97706]" : "bg-gray-200"}`}>
                          <School className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-amber-200 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{enrollment.classRoom?.name || "Unknown"}</span>
                              {enrollment.isCurrent && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Current</span>}
                              {enrollment.classRoom?.type && <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${CLASS_TYPE_COLORS[enrollment.classRoom.type] || "bg-gray-100 text-gray-700"}`}>{enrollment.classRoom.type}</span>}
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Roll #{enrollment.rollNumber || "N/A"}</span>
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />{months > 0 ? `${months}mo` : `${days}d`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span><Calendar className="h-3 w-3 inline mr-1" />Started: {formatDate(enrollment.startDate)}</span>
                            {enrollment.endDate && <span><Calendar className="h-3 w-3 inline mr-1" />Ended: {formatDate(enrollment.endDate)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState icon={FileText} message="No enrollment history available" />
            )}
          </div>
        )}

        {/* PARENTS */}
        {activeTab === "parents" && !isEditing && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Parent / Guardian Information</h3>
            {parentsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentsData.map((parent, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-amber-200 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-bold">
                        {parent.user?.name?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{parent.user?.name || "Parent"}</p>
                        <p className="text-xs text-gray-500">{parent.user?.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <InfoItem icon={Phone} label="Phone"    value={parent.user?.phone} />
                      <InfoItem icon={Users} label="Relation" value="Parent / Guardian" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} message="No parent/guardian information available" />
            )}
          </div>
        )}

        {/* MONTHLY REPORT */}
        {activeTab === "monthly-report" && isHifz && !isEditing && (
          <StudentMonthlyReport
            studentId={currentStudent?.profile?.id}
            studentName={user?.name}
            rollNumber={academic?.currentEnrollment?.rollNumber || "N/A"}
            teacherName={academic?.currentEnrollment?.classRoom?.teacher?.user?.name || "N/A"}
          />
        )}
      </div>

      {/* ── Image Modal ── */}
      {showImageModal && profileImageUrl && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowImageModal(false)} className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300">
              <XCircle className="h-6 w-6" />
            </button>
            <img src={profileImageUrl} alt={user.name} className="w-full h-auto rounded-xl" />
          </div>
        </div>
      )}

      {/* ── Upload Document Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
                <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]">
                  <option value="">Select document type</option>
                  <option value="birth-certificate">Birth Certificate</option>
                  <option value="cnic-bform">CNIC / B-Form</option>
                  <option value="previous-school">Previous School Certificate</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Choose File</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-[#F59E0B] transition-colors">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-600">{uploadFile ? uploadFile.name : "Click to select"}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC — max 5MB</p>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setSelectedDocType(""); }} disabled={uploadingDoc}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handleDocumentUpload} disabled={!selectedDocType || !uploadFile || uploadingDoc}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 text-sm transition-colors flex items-center justify-center">
                  {uploadingDoc ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Uploading…</> : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Shared layout helpers ────────────────────────────────────────────────────

const Section = React.memo(({ title, onEdit, children }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {onEdit && (
        <button onClick={onEdit} className="text-xs text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1">
          <Edit className="h-3.5 w-3.5" />Edit
        </button>
      )}
    </div>
    {children}
  </div>
));

const EmptyState = React.memo(({ icon: Icon, message }) => (
  <div className="text-center py-12 text-gray-400">
    <Icon className="h-12 w-12 mx-auto text-gray-200 mb-3" />
    <p className="text-sm">{message}</p>
  </div>
));

export default StudentDetail;