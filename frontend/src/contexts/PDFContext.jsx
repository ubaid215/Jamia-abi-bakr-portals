import React, { createContext, useContext, useState, useCallback } from 'react';
import pdfService from '../services/pdfService';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const PDFContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePDF = () => {
  const context = useContext(PDFContext);
  if (!context) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
};

export const PDFProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const handlePDFOperation = useCallback(async (operation, successMessage, progressMessage) => {
    setLoading(true);
    setError(null);
    setProgress(progressMessage);
    try {
      await operation();
      toast.success(successMessage);
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Operation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== PDF GENERATION ====================

  const generateStudentReport = useCallback(async (studentId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateStudentProgressReport(studentId, options),
      'Student report downloaded successfully!',
      'Generating student progress report...'
    );
  }, [handlePDFOperation]);

  const generateMarkSheet = useCallback(async (classRoomId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateExamMarkSheet(classRoomId, options),
      'Mark sheet downloaded successfully!',
      'Generating exam mark sheet...'
    );
  }, [handlePDFOperation]);

  const generateAttendanceSheet = useCallback(async (classRoomId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateAttendanceSheet(classRoomId, options),
      'Attendance sheet downloaded successfully!',
      'Generating attendance sheet...'
    );
  }, [handlePDFOperation]);

  const generateCustomPDF = useCallback(async (pdfData) => {
    return handlePDFOperation(
      () => pdfService.generateCustomPDF(pdfData),
      'Custom PDF downloaded successfully!',
      'Generating custom PDF...'
    );
  }, [handlePDFOperation]);

  const previewStudentReport = useCallback(async (studentId, options = {}) => {
    return handlePDFOperation(
      async () => {
        const blob = await pdfService.getStudentProgressReportBlob(studentId, options);
        pdfService.previewPDF(blob);
      },
      'Preview opened in new tab!',
      'Loading preview...'
    );
  }, [handlePDFOperation]);

  const batchGenerateStudentReports = useCallback(async (studentIds, options = {}) => {
    setLoading(true);
    setError(null);
    const results = { successful: [], failed: [] };

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      setProgress(`Generating report ${i + 1} of ${studentIds.length}...`);
      try {
        await pdfService.generateStudentProgressReport(studentId, options);
        results.successful.push(studentId);
        if (i < studentIds.length - 1) await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        results.failed.push({ studentId, error: err.message });
      }
    }

    setLoading(false);
    setProgress(null);
    if (results.failed.length === 0) {
      toast.success(`Successfully generated ${results.successful.length} reports!`);
    } else {
      toast.warning(`Generated ${results.successful.length} reports. ${results.failed.length} failed.`);
    }
    return results;
  }, []);

  // ==================== DATA FETCHING ====================

  /**
   * FIX: Return the array directly — frontend stores result in setStudents([])
   *      Old bug: returned response.data.data but backend pagination wraps data in { success, data[], pagination }
   */
  const getAllStudents = useCallback(async () => {
    try {
      const response = await api.get('/pdf/students?limit=100');
      // Handle both { data: [...] } and { data: { data: [...] } } shapes
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
      throw error;
    }
  }, []);

  const getAllClassrooms = useCallback(async () => {
    try {
      const response = await api.get('/pdf/classrooms?limit=100');
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      toast.error('Failed to load classrooms');
      throw error;
    }
  }, []);

  /**
   * FIX: Backend now returns { students, teachers, classes, reportsThisMonth }
   *      matching the field names PDFGenerate component uses in its stats state.
   *      Previously backend returned { totalStudents, totalTeachers, totalClassRooms }
   *      which caused the UI stats to always show 0.
   */
  const getStats = useCallback(async () => {
    try {
      const response = await api.get('/pdf/stats');
      const raw = response.data;
      const data = raw.data || raw;

      // Normalize: support both old and new field names from backend
      return {
        students: data.students ?? data.totalStudents ?? 0,
        teachers: data.teachers ?? data.totalTeachers ?? 0,
        classes: data.classes ?? data.totalClassRooms ?? 0,
        reportsThisMonth: data.reportsThisMonth ?? 0,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { students: 0, teachers: 0, classes: 0, reportsThisMonth: 0 };
    }
  }, []);

  const searchStudents = useCallback(async (searchTerm = '', classId = '') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (classId) params.append('classId', classId);
      const response = await api.get(`/pdf/students?${params.toString()}`);
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  }, []);

  const searchClassrooms = useCallback(async (searchTerm = '', type = '') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (type) params.append('type', type);
      const response = await api.get(`/pdf/classrooms?${params.toString()}`);
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (error) {
      console.error('Error searching classrooms:', error);
      throw error;
    }
  }, []);

  const value = {
    loading,
    error,
    progress,
    generateStudentReport,
    generateMarkSheet,
    generateAttendanceSheet,
    generateCustomPDF,
    previewStudentReport,
    batchGenerateStudentReports,
    clearError,
    getAllStudents,
    getAllClassrooms,
    getStats,
    searchStudents,
    searchClassrooms,
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
};

export default PDFContext;