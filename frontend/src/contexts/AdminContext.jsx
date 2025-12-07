import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import adminService from "../services/adminService";

const AdminContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: "SET_LOADING",
  SET_ADMINS: "SET_ADMINS",
  SET_USERS: "SET_USERS",
  SET_TEACHERS: "SET_TEACHERS",
  SET_STUDENTS: "SET_STUDENTS",
  SET_LEAVE_REQUESTS: "SET_LEAVE_REQUESTS",
  SET_STATS: "SET_STATS",
  SET_ATTENDANCE_OVERVIEW: "SET_ATTENDANCE_OVERVIEW",
  SET_ATTENDANCE_TRENDS: "SET_ATTENDANCE_TRENDS",
  SET_CLASS_ATTENDANCE_COMPARISON: "SET_CLASS_ATTENDANCE_COMPARISON",
  SET_STUDENT_ENROLLMENT_HISTORY: "SET_STUDENT_ENROLLMENT_HISTORY",
  SET_ERROR: "SET_ERROR",
  UPDATE_USER: "UPDATE_USER",
  UPDATE_LEAVE_REQUEST: "UPDATE_LEAVE_REQUEST",
  ADD_ADMIN: "ADD_ADMIN",
  DELETE_USER: "DELETE_USER",
};

// Initial state
const initialState = {
  admins: [],
  users: [],
  teachers: [],
  students: [],
  leaveRequests: [],
  stats: null,
  attendanceOverview: null,
  attendanceTrends: null,
  classAttendanceComparison: null,
  studentEnrollmentHistory: null,
  loading: false,
  error: null,
};

// Reducer
const adminReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTION_TYPES.SET_ADMINS:
      return { ...state, admins: action.payload };

    case ACTION_TYPES.SET_USERS:
      return { ...state, users: action.payload };

    case ACTION_TYPES.SET_TEACHERS:
      return { ...state, teachers: action.payload };

    case ACTION_TYPES.SET_STUDENTS:
      return { ...state, students: action.payload };

    case ACTION_TYPES.SET_LEAVE_REQUESTS:
      return { ...state, leaveRequests: action.payload };

    case ACTION_TYPES.SET_STATS:
      return { ...state, stats: action.payload };

    case ACTION_TYPES.SET_ATTENDANCE_OVERVIEW:
      return { ...state, attendanceOverview: action.payload };

    case ACTION_TYPES.SET_ATTENDANCE_TRENDS:
      return { ...state, attendanceTrends: action.payload };

    case ACTION_TYPES.SET_CLASS_ATTENDANCE_COMPARISON:
      return { ...state, classAttendanceComparison: action.payload };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTION_TYPES.SET_STUDENT_ENROLLMENT_HISTORY:
      return { ...state, studentEnrollmentHistory: action.payload };

    case ACTION_TYPES.UPDATE_USER:
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        ),
        admins: state.admins.map((admin) =>
          admin.id === action.payload.id ? action.payload : admin
        ),
        teachers: state.teachers.map((teacher) =>
          teacher.userId === action.payload.id
            ? { ...teacher, user: action.payload }
            : teacher
        ),
        students: state.students.map((student) =>
          student.userId === action.payload.id
            ? { ...student, user: action.payload }
            : student
        ),
      };

    case ACTION_TYPES.UPDATE_LEAVE_REQUEST:
      return {
        ...state,
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === action.payload.id ? action.payload : request
        ),
      };

    case ACTION_TYPES.ADD_ADMIN:
      return {
        ...state,
        admins: [...state.admins, action.payload],
        users: [...state.users, action.payload],
      };

    case ACTION_TYPES.DELETE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
        admins: state.admins.filter((admin) => admin.id !== action.payload),
        teachers: state.teachers.filter(
          (teacher) => teacher.userId !== action.payload
        ),
        students: state.students.filter(
          (student) => student.userId !== action.payload
        ),
      };

    default:
      return state;
  }
};

export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Admin Management (Super Admin only)
  const createAdmin = useCallback(async (adminData) => {
    setLoading(true);
    try {
      const newAdmin = await adminService.createAdmin(adminData);
      dispatch({ type: ACTION_TYPES.ADD_ADMIN, payload: newAdmin });
      return newAdmin;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create admin");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const users = await adminService.getUsers({ role: "ADMIN" });
      dispatch({ type: ACTION_TYPES.SET_ADMINS, payload: users });
      return users;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch admins");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // User Management
  const fetchUsers = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const users = await adminService.getUsers(filters);
      dispatch({ type: ACTION_TYPES.SET_USERS, payload: users });
      return users;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch users");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserStatus = useCallback(async (userId, status) => {
    setLoading(true);
    try {
      const updatedUser = await adminService.updateUserStatus(userId, status);
      dispatch({ type: ACTION_TYPES.UPDATE_USER, payload: updatedUser });
      return updatedUser;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update user status");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    setLoading(true);
    try {
      await adminService.deleteUser(userId);
      dispatch({ type: ACTION_TYPES.DELETE_USER, payload: userId });
      return true;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete user");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Teacher Management
  const fetchTeachers = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const response = await adminService.getAllTeachers(filters);
      dispatch({
        type: ACTION_TYPES.SET_TEACHERS,
        payload: response.teachers || [],
      });
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch teachers");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerTeacher = useCallback(
    async (teacherData) => {
      setLoading(true);
      try {
        const newTeacher = await adminService.registerTeacher(teacherData);
        await fetchTeachers(); // Refresh teachers list
        return newTeacher;
      } catch (error) {
        setError(error.response?.data?.message || "Failed to register teacher");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchTeachers]
  );

  // Student Management
  const fetchStudents = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const response = await adminService.getAllStudents(filters);
      dispatch({
        type: ACTION_TYPES.SET_STUDENTS,
        payload: response.students || [],
      });
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch students");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerStudent = useCallback(
    async (studentData) => {
      setLoading(true);
      try {
        const newStudent = await adminService.registerStudent(studentData);
        await fetchStudents(); // Refresh students list
        return newStudent;
      } catch (error) {
        setError(error.response?.data?.message || "Failed to register student");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents]
  );

  // Get student enrollment history
  const fetchStudentEnrollmentHistory = useCallback(
    async (studentId, filters = {}) => {
      setLoading(true);
      try {
        const history = await adminService.getStudentEnrollmentHistory(
          studentId,
          filters
        );
        dispatch({
          type: ACTION_TYPES.SET_STUDENT_ENROLLMENT_HISTORY,
          payload: history,
        });
        return history;
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to fetch enrollment history"
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Batch promote students
  const promoteStudents = useCallback(
    async (promotionData) => {
      setLoading(true);
      try {
        const result = await adminService.promoteStudents(promotionData);
        await fetchStudents(); // Refresh students list
        return result;
      } catch (error) {
        setError(error.response?.data?.message || "Failed to promote students");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents]
  );

  // Class Management
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const classes = await adminService.getClasses();
      return classes;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch classes");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClass = useCallback(async (classData) => {
    setLoading(true);
    try {
      const newClass = await adminService.createClass(classData);
      return newClass;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClass = useCallback(async (id, classData) => {
    setLoading(true);
    try {
      const updatedClass = await adminService.updateClass(id, classData);
      return updatedClass;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteClass = useCallback(async (id) => {
    setLoading(true);
    try {
      await adminService.deleteClass(id);
      return true;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignTeacherToClass = useCallback(async (classId, teacherId) => {
    setLoading(true);
    try {
      const result = await adminService.assignTeacherToClass(
        classId,
        teacherId
      );
      return result;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to assign teacher to class"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Subject Management
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const subjects = await adminService.getSubjects();
      return subjects;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch subjects");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(async (subjectData) => {
    setLoading(true);
    try {
      const newSubject = await adminService.createSubject(subjectData);
      return newSubject;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create subject");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignTeacherToSubject = useCallback(async (subjectId, teacherId) => {
    setLoading(true);
    try {
      const result = await adminService.assignTeacherToSubject(
        subjectId,
        teacherId
      );
      return result;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to assign teacher to subject"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enrollment Management
  const enrollStudentInClass = useCallback(
    async (enrollmentData) => {
      setLoading(true);
      try {
        const enrollment = await adminService.enrollStudentInClass(
          enrollmentData
        );
        await fetchStudents(); // Refresh students list
        return enrollment;
      } catch (error) {
        setError(error.response?.data?.message || "Failed to enroll student");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents]
  );

  const transferStudent = useCallback(
    async (transferData) => {
      setLoading(true);
      try {
        const result = await adminService.transferStudent(transferData);
        await fetchStudents(); // Refresh students list
        return result;
      } catch (error) {
        setError(error.response?.data?.message || "Failed to transfer student");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents]
  );

  // Leave Management
  const fetchLeaveRequests = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const leaveRequests = await adminService.manageLeaveRequests(filters);
      dispatch({
        type: ACTION_TYPES.SET_LEAVE_REQUESTS,
        payload: leaveRequests,
      });
      return leaveRequests;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to fetch leave requests"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLeaveRequestStatus = useCallback(async (leaveId, leaveData) => {
    setLoading(true);
    try {
      const updatedRequest = await adminService.updateLeaveRequest(
        leaveId,
        leaveData
      );
      dispatch({
        type: ACTION_TYPES.UPDATE_LEAVE_REQUEST,
        payload: updatedRequest,
      });
      return updatedRequest;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to update leave request"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // System Stats
  const fetchSystemStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await adminService.getSystemStats();
      dispatch({ type: ACTION_TYPES.SET_STATS, payload: stats });
      return stats;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch system stats");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ATTENDANCE OVERVIEW METHODS (NEW)
  // ============================================
  const fetchAttendanceOverview = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const overview = await adminService.getAttendanceOverview(filters);
      dispatch({
        type: ACTION_TYPES.SET_ATTENDANCE_OVERVIEW,
        payload: overview,
      });
      return overview;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to fetch attendance overview"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendanceTrends = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const trends = await adminService.getAttendanceTrends(filters);
      dispatch({ type: ACTION_TYPES.SET_ATTENDANCE_TRENDS, payload: trends });
      return trends;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to fetch attendance trends"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassAttendanceComparison = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const comparison = await adminService.getClassAttendanceComparison(
        filters
      );
      dispatch({
        type: ACTION_TYPES.SET_CLASS_ATTENDANCE_COMPARISON,
        payload: comparison,
      });
      return comparison;
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to fetch class attendance comparison"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Legacy attendance overview (for backward compatibility)
  const fetchLegacyAttendanceOverview = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const attendance = await adminService.getLegacyAttendanceOverview(
        filters
      );
      return attendance;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to fetch attendance overview"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Admin management (Super Admin only)
    createAdmin,
    fetchAdmins,
    // User management
    fetchUsers,
    updateUserStatus,
    deleteUser,
    // Teacher management
    fetchTeachers,
    registerTeacher,
    // Student management
    fetchStudents,
    registerStudent,
    fetchStudentEnrollmentHistory,
    promoteStudents,
    // Class management
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    assignTeacherToClass,
    // Subject management
    fetchSubjects,
    createSubject,
    assignTeacherToSubject,
    // Enrollment management
    enrollStudentInClass,
    transferStudent,
    // Leave management
    fetchLeaveRequests,
    updateLeaveRequestStatus,
    // System stats
    fetchSystemStats,
    // Attendance overview (NEW)
    fetchAttendanceOverview,
    fetchAttendanceTrends,
    fetchClassAttendanceComparison,
    fetchLegacyAttendanceOverview,
    // Error handling
    clearError,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

export default AdminContext;
