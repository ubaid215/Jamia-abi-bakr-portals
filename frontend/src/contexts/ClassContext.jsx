import React, { createContext, useContext, useReducer, useCallback } from 'react';
import classService from '../services/classService';
import { toast } from 'react-hot-toast';

const ClassContext = createContext();

const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_CLASSES: 'SET_CLASSES',
  SET_CLASS_DETAIL: 'SET_CLASS_DETAIL',
  SET_CLASS_STUDENTS: 'SET_CLASS_STUDENTS',
  SET_CLASS_SUBJECTS: 'SET_CLASS_SUBJECTS',
  SET_ERROR: 'SET_ERROR',
  ADD_CLASS: 'ADD_CLASS',
  UPDATE_CLASS: 'UPDATE_CLASS',
  DELETE_CLASS: 'DELETE_CLASS',
  ASSIGN_TEACHER: 'ASSIGN_TEACHER',
  UPDATE_CLASS_STUDENTS: 'UPDATE_CLASS_STUDENTS'
};

const initialState = {
  classes: [],
  classDetail: null,
  classStudents: [],
  classSubjects: [],
  loading: false,
  error: null
};

const classReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTION_TYPES.SET_CLASSES:
      return { ...state, classes: action.payload };
    case ACTION_TYPES.SET_CLASS_DETAIL:
      return { ...state, classDetail: action.payload };
    case ACTION_TYPES.SET_CLASS_STUDENTS:
      return { ...state, classStudents: action.payload };
    case ACTION_TYPES.SET_CLASS_SUBJECTS:
      return { ...state, classSubjects: action.payload };
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case ACTION_TYPES.ADD_CLASS:
      return { ...state, classes: [...state.classes, action.payload] };
    case ACTION_TYPES.UPDATE_CLASS:
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.id ? action.payload : cls
        ),
        classDetail: state.classDetail?.id === action.payload.id ? action.payload : state.classDetail
      };
    case ACTION_TYPES.DELETE_CLASS:
      return { ...state, classes: state.classes.filter(cls => cls.id !== action.payload) };
    case ACTION_TYPES.ASSIGN_TEACHER:
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.classId
            ? { ...cls, teacherId: action.payload.teacherId }
            : cls
        ),
        classDetail: state.classDetail?.id === action.payload.classId
          ? { ...state.classDetail, teacherId: action.payload.teacherId }
          : state.classDetail
      };
    case ACTION_TYPES.UPDATE_CLASS_STUDENTS:
      return { ...state, classStudents: action.payload };
    default:
      return state;
  }
};

export const ClassProvider = ({ children }) => {
  const [state, dispatch] = useReducer(classReducer, initialState);

  const setLoading = (loading) => dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  const setError = (error) => dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });

  // ✅ FIXED: pass limit=100 so all classes load, not just the default 10
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await classService.getClasses({ limit: 100 });
      dispatch({ type: ACTION_TYPES.SET_CLASSES, payload: response.classes || [] });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch classes';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassById = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await classService.getClassById(id);
      dispatch({ type: ACTION_TYPES.SET_CLASS_DETAIL, payload: response.class || response });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch class details';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClass = useCallback(async (classData) => {
    setLoading(true);
    try {
      const response = await classService.createClass(classData);
      dispatch({ type: ACTION_TYPES.ADD_CLASS, payload: response.class || response });
      toast.success('Class created successfully');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClass = useCallback(async (id, classData) => {
    setLoading(true);
    try {
      const response = await classService.updateClass(id, classData);
      dispatch({ type: ACTION_TYPES.UPDATE_CLASS, payload: response.class || response });
      toast.success('Class updated successfully');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteClass = useCallback(async (id) => {
    setLoading(true);
    try {
      await classService.deleteClass(id);
      dispatch({ type: ACTION_TYPES.DELETE_CLASS, payload: id });
      toast.success('Class deleted successfully');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignTeacherToClass = useCallback(async (classId, teacherId) => {
    setLoading(true);
    try {
      const result = await classService.assignTeacher(classId, teacherId);
      dispatch({
        type: ACTION_TYPES.ASSIGN_TEACHER,
        payload: { classId, teacherId, result: result.class || result }
      });
      toast.success('Teacher assigned to class successfully');
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to assign teacher';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassStudents = useCallback(async (classId) => {
    setLoading(true);
    try {
      const response = await classService.getClassStudents(classId);
      dispatch({ type: ACTION_TYPES.SET_CLASS_STUDENTS, payload: response.students || [] });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch class students';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassSubjects = useCallback(async (classId) => {
    setLoading(true);
    try {
      const subjects = await classService.getClassSubjects(classId);
      dispatch({ type: ACTION_TYPES.SET_CLASS_SUBJECTS, payload: subjects });
      return subjects;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch class subjects';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateRollNumber = useCallback(async (classId) => {
    setLoading(true);
    try {
      const response = await classService.generateRollNumber(classId);
      toast.success(`Generated roll number: ${response.rollNumber}`);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate roll number';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNextRollNumber = useCallback(async (classId) => {
    setLoading(true);
    try {
      const response = await classService.getNextRollNumber(classId);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to get next roll number';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateMultipleRollNumbers = useCallback(async (classId, count = 1) => {
    setLoading(true);
    try {
      const response = await classService.generateMultipleRollNumbers(classId, count);
      toast.success(`Generated ${response.totalGenerated} roll number(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate multiple roll numbers';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignClassToStudent = useCallback(async (studentId, classId, enrollmentData = {}) => {
    setLoading(true);
    try {
      const response = await classService.assignClassToStudent(studentId, classId, enrollmentData);
      toast.success('Student assigned to class successfully');
      if (state.classDetail?.id === classId) {
        fetchClassStudents(classId);
      }
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to assign student to class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.classDetail, fetchClassStudents]);

  const bulkAssignClassToStudents = useCallback(async (studentIds, classId, enrollmentData = {}) => {
    setLoading(true);
    try {
      const response = await classService.bulkAssignClassToStudents(studentIds, classId, enrollmentData);
      toast.success(`Successfully enrolled ${studentIds.length} student(s)`);
      if (state.classDetail?.id === classId) {
        fetchClassStudents(classId);
      }
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to assign students to class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.classDetail, fetchClassStudents]);

  const removeStudentFromClass = useCallback(async (enrollmentId) => {
    setLoading(true);
    try {
      const response = await classService.removeStudentFromClass(enrollmentId);
      toast.success('Student removed from class successfully');
      const updatedStudents = state.classStudents.filter(s => s.id !== enrollmentId);
      dispatch({ type: ACTION_TYPES.UPDATE_CLASS_STUDENTS, payload: updatedStudents });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove student from class';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.classStudents]);

  const transferStudentToClass = useCallback(async (studentId, fromClassId, toClassId, enrollmentData = {}) => {
    setLoading(true);
    try {
      const response = await assignClassToStudent(studentId, toClassId, {
        ...enrollmentData,
        transferFromClassId: fromClassId
      });
      toast.success('Student transferred to new class successfully');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to transfer student';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [assignClassToStudent]);

  const clearError = useCallback(() => dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null }), []);
  const clearClassStudents = useCallback(() => dispatch({ type: ACTION_TYPES.SET_CLASS_STUDENTS, payload: [] }), []);
  const clearClassDetail = useCallback(() => dispatch({ type: ACTION_TYPES.SET_CLASS_DETAIL, payload: null }), []);

  const value = {
    ...state,
    fetchClasses,
    fetchClassById,
    createClass,
    updateClass,
    deleteClass,
    assignTeacherToClass,
    fetchClassStudents,
    fetchClassSubjects,
    generateRollNumber,
    getNextRollNumber,
    generateMultipleRollNumbers,
    assignClassToStudent,
    bulkAssignClassToStudents,
    removeStudentFromClass,
    transferStudentToClass,
    clearError,
    clearClassStudents,
    clearClassDetail
  };

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) {
    throw new Error('useClass must be used within a ClassProvider');
  }
  return context;
};

export default ClassContext;