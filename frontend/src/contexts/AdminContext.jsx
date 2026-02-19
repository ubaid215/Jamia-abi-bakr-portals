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
  SET_TRACKING_STATS: "SET_TRACKING_STATS",
  SET_PENDING_REPORTS: "SET_PENDING_REPORTS",
  SET_AT_RISK_STUDENTS: "SET_AT_RISK_STUDENTS",
  SET_SYSTEM_HEALTH: "SET_SYSTEM_HEALTH",
  SET_JOBS_LIST: "SET_JOBS_LIST",
  SET_ERROR: "SET_ERROR",
  UPDATE_USER: "UPDATE_USER",
  UPDATE_TEACHER: "UPDATE_TEACHER",
  UPDATE_STUDENT: "UPDATE_STUDENT",
  UPDATE_STUDENT_ACADEMIC: "UPDATE_STUDENT_ACADEMIC",
  UPDATE_LEAVE_REQUEST: "UPDATE_LEAVE_REQUEST",
  ADD_ADMIN: "ADD_ADMIN",
  DELETE_USER: "DELETE_USER",
  DELETE_TEACHER: "DELETE_TEACHER",
  DELETE_STUDENT: "DELETE_STUDENT",
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
  trackingStats: null,
  pendingReports: [],
  atRiskStudents: [],
  systemHealth: null,
  jobsList: [],
  loading: false,
  error: null,
};

// Reducer
const adminReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTION_TYPES.SET_ADMINS:
      return { ...state, admins: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_USERS:
      return { ...state, users: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_TEACHERS:
      return { ...state, teachers: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_STUDENTS:
      return { ...state, students: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_LEAVE_REQUESTS:
      return { ...state, leaveRequests: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_STATS:
      return { ...state, stats: action.payload };

    case ACTION_TYPES.SET_ATTENDANCE_OVERVIEW:
      return { ...state, attendanceOverview: action.payload };

    case ACTION_TYPES.SET_ATTENDANCE_TRENDS:
      return { ...state, attendanceTrends: action.payload };

    case ACTION_TYPES.SET_CLASS_ATTENDANCE_COMPARISON:
      return { ...state, classAttendanceComparison: action.payload };

    case ACTION_TYPES.SET_STUDENT_ENROLLMENT_HISTORY:
      return { ...state, studentEnrollmentHistory: action.payload };

    case ACTION_TYPES.SET_TRACKING_STATS:
      return { ...state, trackingStats: action.payload };

    case ACTION_TYPES.SET_PENDING_REPORTS:
      return { ...state, pendingReports: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_AT_RISK_STUDENTS:
      return { ...state, atRiskStudents: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_SYSTEM_HEALTH:
      return { ...state, systemHealth: action.payload };

    case ACTION_TYPES.SET_JOBS_LIST:
      return { ...state, jobsList: Array.isArray(action.payload) ? action.payload : [] };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTION_TYPES.UPDATE_USER:
      return {
        ...state,
        users: Array.isArray(state.users) 
          ? state.users.map((user) => user.id === action.payload.id ? action.payload : user)
          : [],
        admins: Array.isArray(state.admins) 
          ? state.admins.map((admin) => admin.id === action.payload.id ? action.payload : admin)
          : [],
        teachers: Array.isArray(state.teachers) 
          ? state.teachers.map((teacher) => 
              teacher.userId === action.payload.id 
                ? { ...teacher, user: action.payload } 
                : teacher
            )
          : [],
        students: Array.isArray(state.students) 
          ? state.students.map((student) => 
              student.userId === action.payload.id 
                ? { ...student, user: action.payload } 
                : student
            )
          : [],
      };

    case ACTION_TYPES.UPDATE_TEACHER:
      return {
        ...state,
        teachers: Array.isArray(state.teachers) 
          ? state.teachers.map((teacher) => 
              teacher.id === action.payload.id || 
              teacher.userId === action.payload.id 
                ? { ...teacher, ...action.payload } 
                : teacher
            )
          : [],
        users: Array.isArray(state.users) 
          ? state.users.map((user) => 
              user.id === action.payload.id 
                ? { ...user, ...action.payload.user } 
                : user
            )
          : [],
      };

    case ACTION_TYPES.UPDATE_STUDENT:
      return {
        ...state,
        students: Array.isArray(state.students) 
          ? state.students.map((student) => 
              student.id === action.payload.id || 
              student.userId === action.payload.id 
                ? { ...student, ...action.payload } 
                : student
            )
          : [],
        users: Array.isArray(state.users) 
          ? state.users.map((user) => 
              user.id === action.payload.id 
                ? { ...user, ...action.payload.user } 
                : user
            )
          : [],
      };

    case ACTION_TYPES.UPDATE_STUDENT_ACADEMIC:
      return {
        ...state,
        students: Array.isArray(state.students) 
          ? state.students.map((student) => 
              student.id === action.payload.studentId 
                ? { 
                    ...student, 
                    currentEnrollment: action.payload.enrollment 
                  } 
                : student
            )
          : [],
      };

    case ACTION_TYPES.UPDATE_LEAVE_REQUEST:
      return {
        ...state,
        leaveRequests: Array.isArray(state.leaveRequests)
          ? state.leaveRequests.map((request) => 
              request.id === action.payload.id ? action.payload : request
            )
          : [],
      };

    case ACTION_TYPES.ADD_ADMIN:
      return {
        ...state,
        admins: Array.isArray(state.admins) ? [...state.admins, action.payload] : [action.payload],
        users: Array.isArray(state.users) ? [...state.users, action.payload] : [action.payload],
      };

    case ACTION_TYPES.DELETE_USER:
      return {
        ...state,
        users: Array.isArray(state.users) 
          ? state.users.filter((user) => user.id !== action.payload) 
          : [],
        admins: Array.isArray(state.admins) 
          ? state.admins.filter((admin) => admin.id !== action.payload) 
          : [],
        teachers: Array.isArray(state.teachers) 
          ? state.teachers.filter((teacher) => teacher.userId !== action.payload)
          : [],
        students: Array.isArray(state.students) 
          ? state.students.filter((student) => student.userId !== action.payload)
          : [],
      };

    case ACTION_TYPES.DELETE_TEACHER:
      return {
        ...state,
        teachers: Array.isArray(state.teachers) 
          ? state.teachers.filter((teacher) => {
              const teacherId = teacher.userId || teacher.id;
              return teacherId !== action.payload.id && teacher.id !== action.payload.id;
            })
          : [],
        users: Array.isArray(state.users) 
          ? state.users.filter((user) => user.id !== action.payload.userId) 
          : [],
      };

    case ACTION_TYPES.DELETE_STUDENT:
      return {
        ...state,
        students: Array.isArray(state.students) 
          ? state.students.filter((student) => {
              const studentId = student.userId || student.id;
              return studentId !== action.payload.id && student.id !== action.payload.id;
            })
          : [],
        users: Array.isArray(state.users) 
          ? state.users.filter((user) => user.id !== action.payload.userId) 
          : [],
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

  // ============================================
  // ADMIN MANAGEMENT (Super Admin only)
  // ============================================
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
      const response = await adminService.getUsers({ role: "ADMIN" });
      
      let adminsArray = [];
      if (Array.isArray(response)) {
        adminsArray = response;
      } else if (response && Array.isArray(response.users)) {
        adminsArray = response.users;
      } else if (response && Array.isArray(response.admins)) {
        adminsArray = response.admins;
      } else if (response && response.data && Array.isArray(response.data)) {
        adminsArray = response.data;
      }
      
      dispatch({ type: ACTION_TYPES.SET_ADMINS, payload: adminsArray });
      return adminsArray;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch admins");
      dispatch({ type: ACTION_TYPES.SET_ADMINS, payload: [] });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // USER MANAGEMENT
  // ============================================
  const fetchUsers = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const response = await adminService.getUsers(filters);
      
      let usersArray = [];
      if (Array.isArray(response)) {
        usersArray = response;
      } else if (response && Array.isArray(response.users)) {
        usersArray = response.users;
      } else if (response && response.data && Array.isArray(response.data)) {
        usersArray = response.data;
      }
      
      dispatch({ type: ACTION_TYPES.SET_USERS, payload: usersArray });
      return usersArray;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch users");
      dispatch({ type: ACTION_TYPES.SET_USERS, payload: [] });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = useCallback(async (id) => {
    setLoading(true);
    try {
      const user = await adminService.getUserById(id);
      return user;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch user");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id, userData) => {
    setLoading(true);
    try {
      const updatedUser = await adminService.updateUser(id, userData);
      dispatch({ type: ACTION_TYPES.UPDATE_USER, payload: updatedUser });
      return updatedUser;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update user");
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

  const resetUserPassword = useCallback(async (userId) => {
    setLoading(true);
    try {
      const result = await adminService.resetUserPassword(userId);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reset password");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // TEACHER MANAGEMENT
  // ============================================
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

  const getTeacherDetails = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await adminService.getTeacherDetails(id);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch teacher details");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeacherWithDocuments = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await adminService.getTeacherWithDocuments(id);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch teacher documents");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeacher = useCallback(async (id, teacherData) => {
    setLoading(true);
    try {
      const updatedTeacher = await adminService.updateTeacher(id, teacherData);
      dispatch({ type: ACTION_TYPES.UPDATE_TEACHER, payload: updatedTeacher.teacher || updatedTeacher });
      return updatedTeacher;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update teacher");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTeacher = useCallback(async (id) => {
    setLoading(true);
    try {
      const result = await adminService.deleteTeacher(id);
      
      dispatch({ 
        type: ACTION_TYPES.DELETE_TEACHER, 
        payload: result.deletedTeacher || { id, userId: id } 
      });
      
      if (result.deletedTeacher?.userId) {
        dispatch({ 
          type: ACTION_TYPES.DELETE_USER, 
          payload: result.deletedTeacher.userId 
        });
      }
      
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete teacher");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerTeacher = useCallback(async (teacherData) => {
    setLoading(true);
    try {
      const newTeacher = await adminService.registerTeacher(teacherData);
      await fetchTeachers();
      return newTeacher;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to register teacher");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchTeachers]);

  const uploadTeacherDocument = useCallback(async (teacherId, formData) => {
    setLoading(true);
    try {
      const result = await adminService.uploadTeacherDocument(teacherId, formData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to upload document");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTeacherDocument = useCallback(async (teacherId, documentType) => {
    setLoading(true);
    try {
      const result = await adminService.deleteTeacherDocument(teacherId, documentType);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete document");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeacherActivity = useCallback(async (teacherId, params = {}) => {
    setLoading(true);
    try {
      const activity = await adminService.getTeacherActivity(teacherId, params);
      return activity;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch teacher activity");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // STUDENT MANAGEMENT
  // ============================================
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

  const getStudentDetails = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await adminService.getStudentDetails(id);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch student details");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentWithDocuments = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await adminService.getStudentWithDocuments(id);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch student documents");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudent = useCallback(async (id, studentData) => {
    setLoading(true);
    try {
      const updatedStudent = await adminService.updateStudent(id, studentData);
      dispatch({ type: ACTION_TYPES.UPDATE_STUDENT, payload: updatedStudent.student || updatedStudent });
      return updatedStudent;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update student");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudentAcademicInfo = useCallback(async (id, academicData) => {
    setLoading(true);
    try {
      const result = await adminService.updateStudentAcademicInfo(id, academicData);
      dispatch({ 
        type: ACTION_TYPES.UPDATE_STUDENT_ACADEMIC, 
        payload: { 
          studentId: id, 
          enrollment: result.student?.currentEnrollment 
        } 
      });
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update student academic info");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudentProfileImage = useCallback(async (studentId, formData) => {
    setLoading(true);
    try {
      const result = await adminService.updateStudentProfileImage(studentId, formData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile image");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudent = useCallback(async (id) => {
    setLoading(true);
    try {
      const result = await adminService.deleteStudent(id);
      
      dispatch({ 
        type: ACTION_TYPES.DELETE_STUDENT, 
        payload: result.deletedStudent || { id, userId: id } 
      });
      
      if (result.deletedStudent?.userId) {
        dispatch({ 
          type: ACTION_TYPES.DELETE_USER, 
          payload: result.deletedStudent.userId 
        });
      }
      
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete student");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerStudent = useCallback(async (studentData) => {
    setLoading(true);
    try {
      const newStudent = await adminService.registerStudent(studentData);
      await fetchStudents();
      return newStudent;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to register student");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const uploadStudentDocument = useCallback(async (studentId, formData) => {
    setLoading(true);
    try {
      const result = await adminService.uploadStudentDocument(studentId, formData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to upload document");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudentDocument = useCallback(async (studentId, documentType) => {
    setLoading(true);
    try {
      const result = await adminService.deleteStudentDocument(studentId, documentType);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete document");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentEnrollmentHistory = useCallback(async (studentId, filters = {}) => {
    setLoading(true);
    try {
      const history = await adminService.getStudentEnrollmentHistory(studentId, filters);
      dispatch({
        type: ACTION_TYPES.SET_STUDENT_ENROLLMENT_HISTORY,
        payload: history,
      });
      return history;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch enrollment history");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const promoteStudents = useCallback(async (promotionData) => {
    setLoading(true);
    try {
      const result = await adminService.promoteStudents(promotionData);
      await fetchStudents();
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to promote students");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const getAtRiskStudents = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const students = await adminService.getAtRiskStudents(params);
      dispatch({ type: ACTION_TYPES.SET_AT_RISK_STUDENTS, payload: students });
      return students;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch at-risk students");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // CLASS MANAGEMENT
  // ============================================
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

  const assignTeacherToClass = useCallback(async (assignmentData) => {
    setLoading(true);
    try {
      const result = await adminService.assignTeacherToClass(assignmentData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to assign teacher to class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTeacherFromClass = useCallback(async (classRoomId) => {
    setLoading(true);
    try {
      const result = await adminService.removeTeacherFromClass(classRoomId);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to remove teacher from class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignStudentToClass = useCallback(async (assignmentData) => {
    setLoading(true);
    try {
      const result = await adminService.assignStudentToClass(assignmentData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to assign student to class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkAssignStudentsToClass = useCallback(async (bulkData) => {
    setLoading(true);
    try {
      const result = await adminService.bulkAssignStudentsToClass(bulkData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to bulk assign students");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeStudentFromClass = useCallback(async (enrollmentId) => {
    setLoading(true);
    try {
      const result = await adminService.removeStudentFromClass(enrollmentId);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to remove student from class");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // SUBJECT MANAGEMENT
  // ============================================
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
      const result = await adminService.assignTeacherToSubject(subjectId, teacherId);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to assign teacher to subject");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ENROLLMENT MANAGEMENT
  // ============================================
  const enrollStudentInClass = useCallback(async (enrollmentData) => {
    setLoading(true);
    try {
      const enrollment = await adminService.enrollStudentInClass(enrollmentData);
      await fetchStudents();
      return enrollment;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to enroll student");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const transferStudent = useCallback(async (transferData) => {
    setLoading(true);
    try {
      const result = await adminService.transferStudent(transferData);
      await fetchStudents();
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to transfer student");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  // ============================================
  // LEAVE MANAGEMENT
  // ============================================
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
      setError(error.response?.data?.message || "Failed to fetch leave requests");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLeaveRequestStatus = useCallback(async (leaveId, leaveData) => {
    setLoading(true);
    try {
      const updatedRequest = await adminService.updateLeaveRequest(leaveId, leaveData);
      dispatch({
        type: ACTION_TYPES.UPDATE_LEAVE_REQUEST,
        payload: updatedRequest,
      });
      return updatedRequest;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update leave request");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // SYSTEM STATS
  // ============================================
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
  // ATTENDANCE OVERVIEW
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
      setError(error.response?.data?.message || "Failed to fetch attendance overview");
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
      setError(error.response?.data?.message || "Failed to fetch attendance trends");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassAttendanceComparison = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const comparison = await adminService.getClassAttendanceComparison(filters);
      dispatch({
        type: ACTION_TYPES.SET_CLASS_ATTENDANCE_COMPARISON,
        payload: comparison,
      });
      return comparison;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch class attendance comparison");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLegacyAttendanceOverview = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const attendance = await adminService.getLegacyAttendanceOverview(filters);
      return attendance;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch attendance overview");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // DAILY ACTIVITY TRACKING SYSTEM
  // ============================================
  const getTrackingDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await adminService.getTrackingDashboardStats();
      dispatch({ type: ACTION_TYPES.SET_TRACKING_STATS, payload: stats });
      return stats;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch tracking stats");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPendingReports = useCallback(async () => {
    setLoading(true);
    try {
      const reports = await adminService.getPendingReports();
      dispatch({ type: ACTION_TYPES.SET_PENDING_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch pending reports");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkGenerateWeeklyReports = useCallback(async (reportData) => {
    setLoading(true);
    try {
      const result = await adminService.bulkGenerateWeeklyReports(reportData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to generate weekly reports");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkRefreshSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.bulkRefreshSnapshots();
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to refresh snapshots");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSystemHealth = useCallback(async () => {
    setLoading(true);
    try {
      const health = await adminService.getSystemHealth();
      dispatch({ type: ACTION_TYPES.SET_SYSTEM_HEALTH, payload: health });
      return health;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch system health");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanupOldData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const result = await adminService.cleanupOldData(params);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to cleanup old data");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUrgentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const notifications = await adminService.getUrgentNotifications();
      return notifications;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch urgent notifications");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const broadcastNotification = useCallback(async (broadcastData) => {
    setLoading(true);
    try {
      const result = await adminService.broadcastNotification(broadcastData);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to broadcast notification");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // JOB MANAGEMENT
  // ============================================
  const getJobsList = useCallback(async () => {
    setLoading(true);
    try {
      const jobs = await adminService.getJobsList();
      dispatch({ type: ACTION_TYPES.SET_JOBS_LIST, payload: jobs });
      return jobs;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch jobs list");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const runJob = useCallback(async (jobName) => {
    setLoading(true);
    try {
      const result = await adminService.runJob(jobName);
      return result;
    } catch (error) {
      setError(error.response?.data?.message || `Failed to run job: ${jobName}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // FILE OPERATIONS
  // ============================================
  const getProfileImage = useCallback(async (userId) => {
    try {
      const image = await adminService.getProfileImage(userId);
      return image;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch profile image");
      throw error;
    }
  }, []);

  const getPublicProfileImage = useCallback(async (userId) => {
    try {
      const image = await adminService.getPublicProfileImage(userId);
      return image;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch public profile image");
      throw error;
    }
  }, []);

  const exportUserDocumentsInfo = useCallback(async (userId, userType) => {
    setLoading(true);
    try {
      const info = await adminService.exportUserDocumentsInfo(userId, userType);
      return info;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to export documents info");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ERROR HANDLING
  // ============================================
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Admin management
    createAdmin,
    fetchAdmins,
    // User management
    fetchUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,
    resetUserPassword,
    // Teacher management
    fetchTeachers,
    getTeacherDetails,
    getTeacherWithDocuments,
    updateTeacher,
    deleteTeacher,
    registerTeacher,
    uploadTeacherDocument,
    deleteTeacherDocument,
    getTeacherActivity,
    // Student management
    fetchStudents,
    getStudentDetails,
    getStudentWithDocuments,
    updateStudent,
    updateStudentAcademicInfo,
    updateStudentProfileImage,
    deleteStudent,
    registerStudent,
    uploadStudentDocument,
    deleteStudentDocument,
    fetchStudentEnrollmentHistory,
    promoteStudents,
    getAtRiskStudents,
    // Class management
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    assignTeacherToClass,
    removeTeacherFromClass,
    assignStudentToClass,
    bulkAssignStudentsToClass,
    removeStudentFromClass,
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
    // Attendance overview
    fetchAttendanceOverview,
    fetchAttendanceTrends,
    fetchClassAttendanceComparison,
    fetchLegacyAttendanceOverview,
    // Daily Activity Tracking
    getTrackingDashboardStats,
    getPendingReports,
    bulkGenerateWeeklyReports,
    bulkRefreshSnapshots,
    getSystemHealth,
    cleanupOldData,
    getUrgentNotifications,
    broadcastNotification,
    // Job Management
    getJobsList,
    runJob,
    // File operations
    getProfileImage,
    getPublicProfileImage,
    exportUserDocumentsInfo,
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