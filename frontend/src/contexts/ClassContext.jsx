import React, { createContext, useContext, useReducer, useCallback } from 'react';
import classService from '../services/classService';
import { toast } from 'react-hot-toast';

const ClassContext = createContext();

// Action types
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
  ASSIGN_TEACHER: 'ASSIGN_TEACHER'
};

// Initial state
const initialState = {
  classes: [],
  classDetail: null,
  classStudents: [],
  classSubjects: [],
  loading: false,
  error: null
};

// Reducer
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
      return {
        ...state,
        classes: [...state.classes, action.payload]
      };
    
    case ACTION_TYPES.UPDATE_CLASS:
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.id ? action.payload : cls
        ),
        classDetail: state.classDetail?.id === action.payload.id ? action.payload : state.classDetail
      };
    
    case ACTION_TYPES.DELETE_CLASS:
      return {
        ...state,
        classes: state.classes.filter(cls => cls.id !== action.payload)
      };
    
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
    
    default:
      return state;
  }
};

export const ClassProvider = ({ children }) => {
  const [state, dispatch] = useReducer(classReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Fetch all classes - FIXED
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await classService.getClasses();
      // Extract classes array from response
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

  // Fetch class by ID - FIXED
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

  // Create new class - FIXED
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

  // Update class - FIXED
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

  // Delete class
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

  // Assign teacher to class
const assignTeacherToClass = useCallback(async (classId, teacherId) => {
  setLoading(true);
  try {
    // Use the correct service method
    const result = await classService.assignTeacher(classId, teacherId);
    
    dispatch({ 
      type: ACTION_TYPES.ASSIGN_TEACHER, 
      payload: { 
        classId, 
        teacherId, 
        result: result.class || result 
      } 
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

  // Fetch class students - FIXED
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

  // Fetch class subjects
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

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
  }, []);

  const value = {
    ...state,
    // Methods
    fetchClasses,
    fetchClassById,
    createClass,
    updateClass,
    deleteClass,
    assignTeacherToClass,
    fetchClassStudents,
    fetchClassSubjects,
    clearError
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