import React, { createContext, useContext, useReducer, useCallback } from 'react';
import subjectService from '../services/subjectService';
import { toast } from 'react-hot-toast';

const SubjectContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_SUBJECTS: 'SET_SUBJECTS',
  SET_SUBJECT_DETAIL: 'SET_SUBJECT_DETAIL',
  SET_CLASS_SUBJECTS: 'SET_CLASS_SUBJECTS',
  SET_ERROR: 'SET_ERROR',
  ADD_SUBJECT: 'ADD_SUBJECT',
  UPDATE_SUBJECT: 'UPDATE_SUBJECT',
  DELETE_SUBJECT: 'DELETE_SUBJECT',
  ASSIGN_TEACHER: 'ASSIGN_TEACHER'
};

// Initial state
const initialState = {
  subjects: [],
  subjectDetail: null,
  classSubjects: [],
  loading: false,
  error: null
};

// Reducer
const subjectReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_SUBJECTS:
      return { ...state, subjects: action.payload };
    
    case ACTION_TYPES.SET_SUBJECT_DETAIL:
      return { ...state, subjectDetail: action.payload };
    
    case ACTION_TYPES.SET_CLASS_SUBJECTS:
      return { ...state, classSubjects: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.ADD_SUBJECT:
      return {
        ...state,
        subjects: [...state.subjects, action.payload]
      };
    
    case ACTION_TYPES.UPDATE_SUBJECT:
      return {
        ...state,
        subjects: state.subjects.map(subject =>
          subject.id === action.payload.id ? action.payload : subject
        ),
        subjectDetail: state.subjectDetail?.id === action.payload.id ? action.payload : state.subjectDetail
      };
    
    case ACTION_TYPES.DELETE_SUBJECT:
      return {
        ...state,
        subjects: state.subjects.filter(subject => subject.id !== action.payload)
      };
    
    case ACTION_TYPES.ASSIGN_TEACHER:
  // If we have the full updated subject, use it
  if (action.payload.subject) {
    return {
      ...state,
      subjects: state.subjects.map(subject =>
        subject.id === action.payload.subjectId ? action.payload.subject : subject
      ),
      subjectDetail: state.subjectDetail?.id === action.payload.subjectId
        ? action.payload.subject
        : state.subjectDetail,
      classSubjects: state.classSubjects.map(subject =>
        subject.id === action.payload.subjectId ? action.payload.subject : subject
      )
    };
  }
  
  // Fallback to just updating teacherId
  return {
    ...state,
    subjects: state.subjects.map(subject =>
      subject.id === action.payload.subjectId 
        ? { ...subject, teacherId: action.payload.teacherId }
        : subject
    ),
    subjectDetail: state.subjectDetail?.id === action.payload.subjectId
      ? { ...state.subjectDetail, teacherId: action.payload.teacherId }
      : state.subjectDetail,
    classSubjects: state.classSubjects.map(subject =>
      subject.id === action.payload.subjectId
        ? { ...subject, teacherId: action.payload.teacherId }
        : subject
    )
  };
    
    default:
      return state;
  }
};

export const SubjectProvider = ({ children }) => {
  const [state, dispatch] = useReducer(subjectReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  };

  // Fetch all subjects - FIXED
const fetchSubjects = useCallback(async () => {
  setLoading(true);
  try {
    const response = await subjectService.getSubjects();
    // Handle both response structures
    let subjects = [];
    
    if (response.subjects && Array.isArray(response.subjects)) {
      // Structure: { subjects: [...], pagination: {...} }
      subjects = response.subjects;
    } else if (Array.isArray(response)) {
      // Structure: [...]
      subjects = response;
    } else {
      subjects = [];
    }
    
    dispatch({ type: ACTION_TYPES.SET_SUBJECTS, payload: subjects });
    return subjects;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch subjects';
    setError(errorMessage);
    toast.error(errorMessage);
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

// Fetch subjects by class - FIXED
const fetchClassSubjects = useCallback(async (classId) => {
  setLoading(true);
  try {
    const response = await subjectService.getClassSubjects(classId);
    // Extract subjects array from response
    const subjects = response.subjects || response || [];
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

// Create new subject - FIXED
const createSubject = useCallback(async (subjectData) => {
  setLoading(true);
  try {
    const response = await subjectService.createSubject(subjectData);
    // Extract subject from response
    const newSubject = response.subject || response;
    dispatch({ type: ACTION_TYPES.ADD_SUBJECT, payload: newSubject });
    toast.success('Subject created successfully');
    return newSubject;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to create subject';
    setError(errorMessage);
    toast.error(errorMessage);
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

// Update subject - FIXED
const updateSubject = useCallback(async (id, subjectData) => {
  setLoading(true);
  try {
    const response = await subjectService.updateSubject(id, subjectData);
    // Extract subject from response
    const updatedSubject = response.subject || response;
    dispatch({ type: ACTION_TYPES.UPDATE_SUBJECT, payload: updatedSubject });
    toast.success('Subject updated successfully');
    return updatedSubject;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update subject';
    setError(errorMessage);
    toast.error(errorMessage);
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

  // Fetch subject by ID
  const fetchSubjectById = useCallback(async (id) => {
    setLoading(true);
    try {
      const subjectDetail = await subjectService.getSubjectById(id);
      dispatch({ type: ACTION_TYPES.SET_SUBJECT_DETAIL, payload: subjectDetail });
      return subjectDetail;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch subject details';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete subject
  const deleteSubject = useCallback(async (id) => {
    setLoading(true);
    try {
      await subjectService.deleteSubject(id);
      dispatch({ type: ACTION_TYPES.DELETE_SUBJECT, payload: id });
      toast.success('Subject deleted successfully');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete subject';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Assign teacher to subject
const assignTeacherToSubject = useCallback(async (subjectId, teacherId) => {
  setLoading(true);
  try {
    const result = await subjectService.assignTeacherToSubject(subjectId, teacherId);
    // Extract the subject from the response properly
    const updatedSubject = result.subject || result;
    
    dispatch({ 
      type: ACTION_TYPES.ASSIGN_TEACHER, 
      payload: { 
        subjectId, 
        teacherId,
        subject: updatedSubject  // Store the full updated subject
      } 
    });
    toast.success('Teacher assigned to subject successfully');
    return updatedSubject;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to assign teacher';
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
    fetchSubjects,
    fetchSubjectById,
    fetchClassSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    assignTeacherToSubject,
    clearError
  };

  return (
    <SubjectContext.Provider value={value}>
      {children}
    </SubjectContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSubject = () => {
  const context = useContext(SubjectContext);
  if (!context) {
    throw new Error('useSubject must be used within a SubjectProvider');
  }
  return context;
};

export default SubjectContext;