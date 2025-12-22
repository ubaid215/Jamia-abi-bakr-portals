import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Square,
  Eye,
  MoreVertical,
  Edit,
  UserCheck,
  UserX,
  Trash2,
  MoveVertical,
  School,
  Plus,
  Check,
  X,
  Trash2Icon,
} from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";
import { useClass } from "../../contexts/ClassContext"; // Import ClassContext
import BatchPromotionModal from "../../components/BatchPromotionModal";
import { toast } from "react-hot-toast";
import axios from "axios";

const StudentLists = () => {
  const { students, fetchStudents, loading } = useAdmin();
  const { 
    classes: availableClasses, 
    fetchClasses, 
    loading: classesLoading,
    bulkAssignClassToStudents // Get the new method from context
  } = useClass(); // Use ClassContext
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // New states for dropdown and class assignment
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showAssignClassModal, setShowAssignClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [assigningClass, setAssigningClass] = useState(false);
  const [studentsToAssign, setStudentsToAssign] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchStudents();
    fetchClasses(); // Use context method to fetch classes
  }, [fetchStudents, fetchClasses]);

  // ============================================
  // Helper Functions for Safe Data Access
  // ============================================

  const getStudentName = (student) =>
    student.user?.name || student.name || "Unknown Student";

  const getStudentEmail = (student) =>
    student.user?.email || student.email || "No email";

  const getStudentStatus = (student) =>
    student.user?.status || student.status || "UNKNOWN";

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
    student.admissionNo || student.studentProfile?.admissionNo || "N/A";

  // ============================================
  // Profile Image URL Generation
  // ============================================

  const getProfileImageUrl = useCallback((student) => {
    try {
      const userId = getStudentUserId(student);
      const profileImage = getStudentProfileImage(student);

      if (!profileImage) {
        return null;
      }

      if (profileImage.startsWith("http") || profileImage.startsWith("data:")) {
        return profileImage;
      }

      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api"
      ).replace(/\/$/, "");
      const imageUrl = `${baseUrl}/admin/public/profile-image/${userId}`;

      return imageUrl;
    } catch (error) {
      console.error("Error generating profile image URL:", error);
      return null;
    }
  }, []);

  // ============================================
  // Student Selection Handlers
  // ============================================

  const toggleStudentSelection = (student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.some((s) => s.id === student.id);
      return isSelected
        ? prev.filter((s) => s.id !== student.id)
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
    selectedStudents.some((s) => s.id === studentId);

  // ============================================
  // Dropdown Menu Handlers
  // ============================================

  const toggleDropdown = (studentId) => {
    setDropdownOpen(dropdownOpen === studentId ? null : studentId);
  };

  const handleAssignClass = (student) => {
    setStudentsToAssign([student]);
    setShowAssignClassModal(true);
    setDropdownOpen(null);
  };

  const handleBulkAssignClass = () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    setStudentsToAssign([...selectedStudents]);
    setShowAssignClassModal(true);
  };

  const handleUpdateStatus = (student, status) => {
    setStudentsToAssign([student]);
    setSelectedStatus(status);
    setShowStatusModal(true);
    setDropdownOpen(null);
  };

  const handleBulkUpdateStatus = (status) => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    setStudentsToAssign([...selectedStudents]);
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  // ============================================
  // Class Assignment Functions - UPDATED
  // ============================================

  const handleClassAssignment = async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    if (studentsToAssign.length === 0) {
      toast.error("No students selected");
      return;
    }

    try {
      setAssigningClass(true);
      
      // Get the selected class details from context
      const classDetails = availableClasses.find((c) => c.id === selectedClass);
      if (!classDetails) {
        throw new Error("Class not found");
      }

      // Use the new context method for bulk assignment
      await bulkAssignClassToStudents(
        studentsToAssign.map(s => getStudentUserId(s)),
        selectedClass,
        {
          startDate: new Date().toISOString(),
          isCurrent: true
        }
      );

      // Note: bulkAssignClassToStudents already shows toast success message
      
      setShowAssignClassModal(false);
      setSelectedClass("");
      setStudentsToAssign([]);
      setSelectedStudents([]); // Clear selection
      fetchStudents(); // Refresh student list
    } catch (error) {
      console.error("Error assigning class:", error);
      // Error is already handled by the context
    } finally {
      setAssigningClass(false);
    }
  };

  // ============================================
  // Student Deletion Functions
  // ============================================

  const deleteStudent = async (studentId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this student? This action cannot be undone and will delete all student data including attendance, progress, and documents."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.delete(
        `${API_BASE_URL}/admin/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(response.data.message || "Student deleted successfully");

      // Remove from selected students if present
      setSelectedStudents((prev) =>
        prev.filter((s) => getStudentUserId(s) !== studentId)
      );

      // Refresh the student list
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error(error.response?.data?.error || "Failed to delete student");
    }
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to delete");
      return;
    }

    const studentNames = selectedStudents
      .map((s) => getStudentName(s))
      .join(", ");

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedStudents.length} student(s)?\n\nSelected students: ${studentNames}\n\nThis action cannot be undone and will delete all student data.`
      )
    ) {
      return;
    }

    // Show loading state
    const deletePromises = selectedStudents.map(async (student) => {
      try {
        const studentId = getStudentUserId(student);
        const token = localStorage.getItem("authToken");
        return axios.delete(`${API_BASE_URL}/admin/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error(`Error deleting student ${student.id}:`, error);
        throw error;
      }
    });

    Promise.allSettled(deletePromises)
      .then((results) => {
        const successful = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (successful > 0) {
          toast.success(`Successfully deleted ${successful} student(s)`);
        }
        if (failed > 0) {
          toast.error(`Failed to delete ${failed} student(s)`);
        }

        // Clear selection and refresh list
        setSelectedStudents([]);
        fetchStudents();
      })
      .catch((error) => {
        toast.error("An error occurred during bulk deletion");
        console.error("Bulk delete error:", error);
      });
  };

  // ============================================
  // Status Update Functions
  // ============================================

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    if (studentsToAssign.length === 0) {
      toast.error("No students selected");
      return;
    }

    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem("authToken");

      const promises = studentsToAssign.map(async (student) => {
        const studentId = getStudentUserId(student);

        return axios.put(
          `${API_BASE_URL}/admin/students/${studentId}/status`,
          { status: selectedStatus },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      });

      await Promise.all(promises);

      toast.success(
        `Updated status to ${selectedStatus} for ${studentsToAssign.length} student(s)`
      );
      setShowStatusModal(false);
      setSelectedStatus("");
      setStudentsToAssign([]);
      fetchStudents(); // Refresh student list
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ============================================
  // Filtering Logic
  // ============================================

  const filteredStudents = Array.isArray(students)
    ? students.filter((student) => {
        const studentName = getStudentName(student).toLowerCase();
        const studentEmail = getStudentEmail(student).toLowerCase();
        const admissionNo = getAdmissionNo(student).toLowerCase();
        const studentStatus = getStudentStatus(student);
        const currentClass = getCurrentClass(student);
        const className = currentClass?.name || "";

        const matchesSearch =
          studentName.includes(searchTerm.toLowerCase()) ||
          studentEmail.includes(searchTerm.toLowerCase()) ||
          admissionNo.includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL" || studentStatus === statusFilter;
        const matchesClass = classFilter === "ALL" || className === classFilter;

        return matchesSearch && matchesStatus && matchesClass;
      })
    : [];

  const uniqueClasses = Array.isArray(students)
    ? [
        ...new Set(
          students
            .map((student) => getCurrentClass(student)?.name)
            .filter(Boolean)
        ),
      ]
    : [];

  // ============================================
  // Style Helpers
  // ============================================

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: "text-green-600",
      INACTIVE: "text-yellow-600",
      TERMINATED: "text-red-600",
    };
    return colors[status] || "text-gray-600";
  };

  const getClassTypeColor = (type) => {
    const colors = {
      REGULAR: "text-blue-600",
      HIFZ: "text-purple-600",
      NAZRA: "text-orange-600",
    };
    return colors[type] || "text-gray-600";
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleStudentClick = (student, e) => {
    if (
      e.target.type === "checkbox" ||
      e.target.closest(".selection-checkbox") ||
      e.target.closest("button") ||
      e.target.closest(".dropdown-menu")
    ) {
      return;
    }
    navigate(`/admin/students/${getStudentUserId(student)}`);
  };

  const handlePromotionSuccess = () => {
    setSelectedStudents([]);
    fetchStudents();
    toast.success("Students promoted successfully");
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">
              Student Management
            </h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1">
              Manage students and track their progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedStudents.length > 0 && (
              <>
                <button
                  onClick={handleBulkAssignClass}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-sm hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <School className="h-4 w-4" />
                  <span>Assign Class ({selectedStudents.length})</span>
                </button>
                <button
                  onClick={() => setShowPromotionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Promote ({selectedStudents.length})</span>
                </button>
              </>
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
                {uniqueClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Controls */}
          {filteredStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-200 gap-3">
              <div className="flex items-center gap-3">
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
                    {selectedStudents.length === filteredStudents.length
                      ? "Deselect All"
                      : "Select All"}
                  </span>
                </button>

                {/* Bulk Actions for Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-6 border-l border-gray-300"></div>
                    <span className="text-sm font-medium text-gray-600">
                      Bulk Actions:
                    </span>
                    <button
                      onClick={() => handleBulkUpdateStatus("ACTIVE")}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-200"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>Activate</span>
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus("INACTIVE")}
                      className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 px-2 py-1 rounded transition-colors duration-200"
                    >
                      <UserX className="h-3 w-3" />
                      <span>Deactivate</span>
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus("TERMINATED")}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200"
                    >
                      <UserX className="h-3 w-3" />
                      <span>Terminate</span>
                    </button>
                    {/* Add Bulk Delete button */}
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200 border border-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {selectedStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    📋 {selectedStudents.length} student
                    {selectedStudents.length > 1 ? "s" : ""} selected
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
              dropdownOpen={dropdownOpen === student.id}
              onToggleDropdown={() => toggleDropdown(student.id)}
              onAssignClass={() => handleAssignClass(student)}
              onUpdateStatus={(status) => handleUpdateStatus(student, status)}
              onToggleSelection={() => toggleStudentSelection(student)}
              onClick={(e) => handleStudentClick(student, e)}
              onViewHistory={() =>
                navigate(`/admin/students/${getStudentUserId(student)}/history`)
              }
              onViewDetails={() =>
                navigate(`/admin/students/${getStudentUserId(student)}`)
              }
              // Add delete functionality
              onDelete={() => {
                const studentId = getStudentUserId(student);
                deleteStudent(studentId);
              }}
              getStatusColor={getStatusColor}
              getClassTypeColor={getClassTypeColor}
            />
          ))
        )}
      </div>

      {/* Selection Summary */}
      {selectedStudents.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 min-w-[300px]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {selectedStudents.length}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedStudents.length} student
                  {selectedStudents.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-gray-500">Ready for actions</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStudents([])}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkAssignClass}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <School className="h-4 w-4" />
              Assign Class
            </button>
            <button
              onClick={() => setShowPromotionModal(true)}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] rounded-lg transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Promote
            </button>
            {/* Add Delete button to selection summary */}
            <button
              onClick={handleBulkDelete}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Assign Class Modal */}
      {showAssignClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Assign Class to {studentsToAssign.length} Student
                {studentsToAssign.length > 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => {
                  setShowAssignClassModal(false);
                  setSelectedClass("");
                  setStudentsToAssign([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={classesLoading}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a class</option>
                  {classesLoading ? (
                    <option value="" disabled>
                      Loading classes...
                    </option>
                  ) : availableClasses.length === 0 ? (
                    <option value="" disabled>
                      No classes available
                    </option>
                  ) : (
                    availableClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} - {classItem.type} (Grade{" "}
                        {classItem.grade})
                      </option>
                    ))
                  )}
                </select>
                {classesLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    Loading classes from server...
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Students ({studentsToAssign.length})
                </h4>
                <div className="space-y-1">
                  {studentsToAssign.map((student, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-gray-600">
                        {getStudentName(student)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getCurrentClass(student)?.name || "No class"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAssignClassModal(false);
                    setSelectedClass("");
                    setStudentsToAssign([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={assigningClass}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClassAssignment}
                  disabled={!selectedClass || assigningClass || classesLoading}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {assigningClass ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    "Assign Class"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Update Status for {studentsToAssign.length} Student
                {studentsToAssign.length > 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedStatus("");
                  setStudentsToAssign([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  <option value="">Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Students ({studentsToAssign.length})
                </h4>
                <div className="space-y-1">
                  {studentsToAssign.map((student, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-gray-600">
                        {getStudentName(student)}
                      </span>
                      <span
                        className={`text-xs font-medium ${getStatusColor(
                          getStudentStatus(student)
                        )}`}
                      >
                        {getStudentStatus(student)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus("");
                    setStudentsToAssign([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updatingStatus}
                  className="flex-1 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {updatingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    "Update Status"
                  )}
                </button>
              </div>
            </div>
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
      {studentsCount === 0 ? "No students enrolled yet" : "No students found"}
    </h3>
    <p className="text-gray-500 text-sm">
      {studentsCount === 0
        ? "Use the enrollment page to register new students"
        : "Try adjusting your search criteria"}
    </p>
  </div>
);

const StudentCard = ({
  student,
  studentName,
  studentEmail,
  studentStatus,
  admissionNo,
  currentClass,
  attendance,
  selected,
  profileImageUrl,
  dropdownOpen,
  onToggleDropdown,
  onAssignClass,
  onUpdateStatus,
  onToggleSelection,
  onClick,
  onDelete,
  onViewHistory,
  onViewDetails,
  getStatusColor,
  getClassTypeColor,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg border transition-all duration-300 cursor-pointer group hover:shadow-xl relative ${
      selected
        ? "border-[#F59E0B] ring-2 ring-[#F59E0B] ring-opacity-30 bg-gradient-to-br from-[#FFFBEB] to-white"
        : "border-gray-100 hover:border-[#F59E0B] bg-gradient-to-br from-white to-gray-50"
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
          <div className="flex items-center gap-2 mt-1">
            {currentClass && (
              <p className="text-gray-600 text-xs truncate">
                🏫 {currentClass.name}
              </p>
            )}
            <span
              className={`text-xs font-medium ${getStatusColor(studentStatus)}`}
            >
              • {studentStatus}
            </span>
            {currentClass?.type && (
              <span
                className={`text-xs font-medium ${getClassTypeColor(
                  currentClass.type
                )}`}
              >
                • {currentClass.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Three-dot dropdown menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDropdown();
          }}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <MoreVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </button>

        {dropdownOpen && (
          <div
            className="dropdown-menu absolute right-0 top-8 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  onViewDetails();
                  onToggleDropdown();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="h-4 w-4" />
                View Details
              </button>
              <button
                onClick={() => {
                  onViewHistory();
                  onToggleDropdown();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <History className="h-4 w-4" />
                View History
              </button>
              <button
                onClick={onAssignClass}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <School className="h-4 w-4" />
                Assign Class
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => onUpdateStatus("ACTIVE")}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
              >
                <UserCheck className="h-4 w-4" />
                Activate
              </button>
              <button
                onClick={() => onUpdateStatus("INACTIVE")}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
              >
                <UserX className="h-4 w-4" />
                Deactivate
              </button>
              <button
                onClick={() => onUpdateStatus("TERMINATED")}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <UserX className="h-4 w-4" />
                Terminate
              </button>
              {/* Add Delete option */}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  onDelete();
                  onToggleDropdown();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2Icon className="h-4 w-4" />
                Delete Student
              </button>
            </div>
          </div>
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
      {currentClass ? (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Class</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentClass.name}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
          <School className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Class</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              Not Assigned
            </p>
          </div>
        </div>
      )}
      {student.guardianName ? (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Guardian</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {student.guardianName}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Guardian</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              Not Provided
            </p>
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
            <span className="text-lg font-bold text-gray-900">
              {attendance.present}
            </span>
            <span className="text-sm text-gray-500">
              / {attendance.total} days
            </span>
          </div>
          <span
            className={`text-sm font-bold ${
              attendance.percentage > 80
                ? "text-green-600"
                : attendance.percentage > 60
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {attendance.percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              attendance.percentage > 80
                ? "bg-green-500"
                : attendance.percentage > 60
                ? "bg-yellow-500"
                : "bg-red-500"
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
    .split(" ")
    .map((n) => n[0])
    .join("")
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
              imgLoaded ? "block" : "hidden"
            }`}
            onLoad={() => {
              setImgLoaded(true);
            }}
            onError={() => {
              setImgError(true);
            }}
          />
        </>
      ) : (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg text-sm">
          {initials}
        </div>
      )}

      {studentStatus === "ACTIVE" && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
};

export default StudentLists;