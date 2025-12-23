// src/contexts/HifzContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import hifzServices from '../services/hifzServices';
import { toast } from 'react-hot-toast'; // or your preferred toast library

/**
 * Hifz Context - Global state management for Hifz program
 * Provides centralized data and actions for Hifz progress tracking
 */

const HifzContext = createContext(undefined);

export const useHifz = () => {
  const context = useContext(HifzContext);
  if (!context) {
    throw new Error('useHifz must be used within a HifzProvider');
  }
  return context;
};

export const HifzProvider = ({ children }) => {
  // ============= State =============
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressRecords, setProgressRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [hifzStatus, setHifzStatus] = useState(null);
  const [poorPerformers, setPoorPerformers] = useState([]);
  const [classAnalytics, setClassAnalytics] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState({
    progress: false,
    analytics: false,
    status: false,
    poorPerformers: false,
    classAnalytics: false
  });

  // Error states
  const [error, setError] = useState(null);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 1,
    total: 0
  });

  // ============= Helper Functions =============

  const setLoadingState = (key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleError = (error, customMessage = 'An error occurred') => {
    console.error(customMessage, error);
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        customMessage;
    setError(errorMessage);
    toast.error(errorMessage);
    return errorMessage;
  };

  // ============= Progress Management =============


// ============= Analytics Functions (Define First) =============

/**
 * Fetch analytics for a student
 */
const fetchAnalytics = useCallback(async (studentId, days = 30) => {
  const id = studentId || selectedStudent?.id;
  if (!id) return;

  setLoadingState('analytics', true);
  setError(null);

  try {
    const result = await hifzServices.getStudentAnalytics(id, days);
    setAnalytics(result.analytics);
    return { success: true, data: result };
  } catch (error) {
    handleError(error, 'Failed to fetch analytics');
    return { success: false };
  } finally {
    setLoadingState('analytics', false);
  }
}, [selectedStudent]);

/**
 * Fetch progress records for a student
 */
const fetchStudentProgress = useCallback(async (studentId, params = {}) => {
  const id = studentId || selectedStudent?.id;
  if (!id) return;

  setLoadingState('progress', true);
  setError(null);

  try {
    const result = await hifzServices.getStudentProgress(id, {
      page: pagination.page,
      limit: pagination.limit,
      ...params
    });

    setProgressRecords(result.progress || []);
    setHifzStatus(result.hifzStatus);
    setPagination(prev => ({
      ...prev,
      ...result.pagination
    }));

    return { success: true, data: result };
  } catch (error) {
    handleError(error, 'Failed to fetch progress records');
    return { success: false };
  } finally {
    setLoadingState('progress', false);
  }
}, [selectedStudent, pagination.page, pagination.limit]);

// ============= Progress Management Functions (Define After Analytics) =============

const saveProgress = useCallback(async (studentIdOrData, progressData) => {
  
  let actualStudentId;
  let actualProgressData;
  
  // 🔥 FIXED: Handle BOTH calling patterns
  if (typeof studentIdOrData === 'string') {
    // Called with: saveProgress(studentId, progressData)
    actualStudentId = studentIdOrData;
    actualProgressData = progressData;
  } else if (typeof studentIdOrData === 'object' && studentIdOrData !== null) {
    // Called with: saveProgress(progressData) - student already selected
    const studentIdFromContext = selectedStudent?.student?.id || selectedStudent?.id;
    if (!studentIdFromContext) {
      toast.error('No student selected');
      return { success: false, error: 'No student selected' };
    }
    actualStudentId = studentIdFromContext;
    actualProgressData = studentIdOrData;
  } else {
    toast.error('Invalid parameters passed to saveProgress');
    return { success: false, error: 'Invalid parameters' };
  }
  
  if (!actualStudentId) {
    toast.error('No student selected or invalid student data');
    return { success: false, error: 'No student selected' };
  }
  
  if (!actualProgressData || typeof actualProgressData !== 'object') {
    toast.error('Invalid progress data');
    return { success: false, error: 'Invalid progress data' };
  }

  setLoadingState('progress', true);
  setError(null);

  try {
    console.log('📤 Context - Saving progress:', {
      studentId: actualStudentId,
      progressData: actualProgressData,
      selectedStudent: selectedStudent
    });
    
    const result = await hifzServices.saveProgress(actualStudentId, actualProgressData);
    
    console.log('✅ Context - Save result:', result);
    
    // Check if result has success property
    if (!result.success) {
      throw new Error(result.error || 'Failed to save progress');
    }
    
    // Update local state if we have progress data
    if (result.progress) {
      setProgressRecords(prev => [result.progress, ...prev]);
    }
    
    // Show weekly performance warning if applicable
    if (result.weeklyPerformance?.hasPoorPerformance) {
      toast.error('⚠️ Poor performance detected this week', {
        duration: 5000
      });
    } else {
      toast.success('✅ Progress saved successfully');
    }

    // Refresh analytics and status
    await Promise.all([
      fetchAnalytics(actualStudentId),
      fetchStudentProgress(actualStudentId)
    ]);

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Context - Save error:', error);
    const errorMsg = handleError(error, 'Failed to save progress');
    return { 
      success: false, 
      error: errorMsg,
      details: error 
    };
  } finally {
    setLoadingState('progress', false);
  }
}, [selectedStudent, fetchAnalytics, fetchStudentProgress]);



  /**
   * Update existing progress record
   */
  const updateProgress = useCallback(async (progressId, updateData) => {
    if (!selectedStudent?.id) {
      toast.error('No student selected');
      return { success: false };
    }

    setLoadingState('progress', true);
    setError(null);

    try {
      const result = await hifzServices.updateProgress(
        selectedStudent.id,
        progressId,
        updateData
      );

      // Update local state
      setProgressRecords(prev =>
        prev.map(record => 
          record.id === progressId ? result.progress : record
        )
      );

      toast.success('Progress updated successfully');

      // Refresh analytics
      await fetchAnalytics(selectedStudent.id);

      return { success: true, data: result };
    } catch (error) {
      const errorMsg = handleError(error, 'Failed to update progress');
      return { success: false, error: errorMsg };
    } finally {
      setLoadingState('progress', false);
    }
  }, [selectedStudent]);

 

  /**
   * Initialize Hifz status for new student
   */
  const initializeHifzStatus = useCallback(async (studentId, statusData) => {
    setLoadingState('status', true);
    setError(null);

    try {
      const result = await hifzServices.initializeHifzStatus(studentId, statusData);
      setHifzStatus(result.hifzStatus);
      toast.success('Hifz status initialized successfully');
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = handleError(error, 'Failed to initialize Hifz status');
      return { success: false, error: errorMsg };
    } finally {
      setLoadingState('status', false);
    }
  }, []);

  /**
   * Update para completion
   */
 const updateParaCompletion = useCallback(async (completionData) => {
  const studentId = selectedStudent?.student?.id || selectedStudent?.id;
  
  if (!studentId) {
    toast.error('No student selected');
    return { success: false };
  }

  setLoadingState('status', true);
  setError(null);

  try {
    const result = await hifzServices.updateParaCompletion(
      studentId,
      completionData
    );

    setHifzStatus(result.hifzStatus);
    
    // Show celebration for para completion
    if (completionData.completedPara) {
      toast.success(`🎉 Congratulations! Para ${completionData.completedPara} completed!`, {
        duration: 5000,
        icon: '🎓'
      });
    }

    // Refresh analytics
    await fetchAnalytics(studentId);

    return { success: true, data: result };
  } catch (error) {
    const errorMsg = handleError(error, 'Failed to update para completion');
    return { success: false, error: errorMsg };
  } finally {
    setLoadingState('status', false);
  }
}, [selectedStudent]);

  // ============= Analytics =============

  

  /**
   * Fetch class analytics
   */
  const fetchClassAnalytics = useCallback(async (classId, days = 30) => {
    setLoadingState('classAnalytics', true);
    setError(null);

    try {
      const result = await hifzServices.getClassAnalytics(classId, days);
      setClassAnalytics(result.analytics);
      return { success: true, data: result };
    } catch (error) {
      handleError(error, 'Failed to fetch class analytics');
      return { success: false };
    } finally {
      setLoadingState('classAnalytics', false);
    }
  }, []);

  /**
   * Fetch poor performers
   */
  const fetchPoorPerformers = useCallback(async () => {
    setLoadingState('poorPerformers', true);
    setError(null);

    try {
      const result = await hifzServices.getPoorPerformers();
      setPoorPerformers(result.poorPerformers || []);
      return { success: true, data: result };
    } catch (error) {
      handleError(error, 'Failed to fetch poor performers');
      return { success: false };
    } finally {
      setLoadingState('poorPerformers', false);
    }
  }, []);

  // ============= Reports =============

  /**
   * Download PDF report
   */
  const downloadReport = useCallback(async (studentId, studentName, params = {}) => {
    const id = studentId || selectedStudent?.id;
    const name = studentName || selectedStudent?.name || 'student';

    if (!id) {
      toast.error('No student selected');
      return { success: false };
    }

    toast.loading('Generating PDF report...');
    
    try {
      await hifzServices.downloadPDFReport(id, name, params);
      toast.dismiss();
      toast.success('Report downloaded successfully');
      return { success: true };
    } catch (error) {
      toast.dismiss();
      handleError(error, 'Failed to download report');
      return { success: false };
    }
  }, [selectedStudent]);

  /**
   * Bulk generate reports for class
   */
  const bulkGenerateReports = useCallback(async (classId, days = 30) => {
    toast.loading('Generating reports for all students...');
    
    try {
      const result = await hifzServices.bulkGenerateReports(classId, days);
      toast.dismiss();
      toast.success(
        `Reports generated: ${result.successCount}/${result.totalStudents}`,
        { duration: 5000 }
      );
      return { success: true, data: result };
    } catch (error) {
      toast.dismiss();
      handleError(error, 'Failed to generate bulk reports');
      return { success: false };
    }
  }, []);

  // ============= Student Selection =============

  /**
   * Select student and load their data
   */
  const selectStudent = useCallback(async (student) => {
    setSelectedStudent(student);
    
    if (student?.id) {
      // Load student data in parallel
      await Promise.all([
        fetchStudentProgress(student.id),
        fetchAnalytics(student.id)
      ]);
    }
  }, [fetchStudentProgress, fetchAnalytics]);

  /**
   * Clear selected student
   */
  const clearStudent = useCallback(() => {
    setSelectedStudent(null);
    setProgressRecords([]);
    setAnalytics(null);
    setHifzStatus(null);
    setError(null);
  }, []);

  // ============= Pagination =============

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages)
    }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1)
    }));
  }, []);

  // ============= Effects =============

  // Fetch progress when pagination changes
  useEffect(() => {
    if (selectedStudent?.id) {
      fetchStudentProgress(selectedStudent.id);
    }
  }, [pagination.page]); // Only depend on page number

  // ============= Context Value =============

  const value = {
    // State
    selectedStudent,
    progressRecords,
    analytics,
    hifzStatus,
    poorPerformers,
    classAnalytics,
    loading,
    error,
    pagination,

    // Actions - Progress
    saveProgress,
    updateProgress,
    fetchStudentProgress,
    initializeHifzStatus,
    updateParaCompletion,

    // Actions - Analytics
    fetchAnalytics,
    fetchClassAnalytics,
    fetchPoorPerformers,

    // Actions - Reports
    downloadReport,
    bulkGenerateReports,

    // Actions - Student Selection
    selectStudent,
    clearStudent,

    // Actions - Pagination
    goToPage,
    nextPage,
    prevPage,

    // Utilities
    clearError: () => setError(null)
  };

  return (
    <HifzContext.Provider value={value}>
      {children}
    </HifzContext.Provider>
  );
};

export default HifzContext;