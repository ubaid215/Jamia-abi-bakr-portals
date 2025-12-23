import React, { createContext, useContext, useState, useCallback } from 'react';
import pdfService from '../services/pdfService';
import api from '../services/api'; // Add this import
import { toast } from 'react-hot-toast';

const PDFContext = createContext();

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

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Generic API call handler
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

  // ==================== PDF GENERATION METHODS ====================

  // Generate student progress report
  const generateStudentReport = useCallback(async (studentId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateStudentProgressReport(studentId, options),
      'Student report downloaded successfully!',
      'Generating student progress report...'
    );
  }, [handlePDFOperation]);

  // Generate exam mark sheet
  const generateMarkSheet = useCallback(async (classRoomId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateExamMarkSheet(classRoomId, options),
      'Mark sheet downloaded successfully!',
      'Generating exam mark sheet...'
    );
  }, [handlePDFOperation]);

  // Generate attendance sheet
  const generateAttendanceSheet = useCallback(async (classRoomId, options = {}) => {
    return handlePDFOperation(
      () => pdfService.generateAttendanceSheet(classRoomId, options),
      'Attendance sheet downloaded successfully!',
      'Generating attendance sheet...'
    );
  }, [handlePDFOperation]);

  // Generate custom PDF
  const generateCustomPDF = useCallback(async (pdfData) => {
    return handlePDFOperation(
      () => pdfService.generateCustomPDF(pdfData),
      'Custom PDF downloaded successfully!',
      'Generating custom PDF...'
    );
  }, [handlePDFOperation]);

  // Preview student report
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

  // Batch generate reports
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
        
        // Small delay between downloads
        if (i < studentIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
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

  // ==================== DATA FETCHING METHODS ====================

  // Get all students for dropdown
  const getAllStudents = useCallback(async () => {
    try {
      const response = await api.get('/pdf/students');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
      throw error;
    }
  }, []);

  // Get all classrooms for dropdown
  const getAllClassrooms = useCallback(async () => {
    try {
      const response = await api.get('/pdf/classrooms');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      toast.error('Failed to load classrooms');
      throw error;
    }
  }, []);

  // Get PDF generation stats
  const getStats = useCallback(async () => {
    try {
      const response = await api.get('/pdf/stats');
      return response.data.data || {
        totalStudents: 0,
        totalTeachers: 0,
        totalClassRooms: 0,
        totalActiveEnrollments: 0,
        reportsThisMonth: 0
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return default stats instead of throwing error
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalClassRooms: 0,
        totalActiveEnrollments: 0,
        reportsThisMonth: 0
      };
    }
  }, []);

  // Optional: Get students by search term
  const searchStudents = useCallback(async (searchTerm = '', classId = '') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (classId) params.append('classId', classId);
      
      const response = await api.get(`/pdf/students?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  }, []);

  // Optional: Get classrooms by search term
  const searchClassrooms = useCallback(async (searchTerm = '', type = '') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (type) params.append('type', type);
      
      const response = await api.get(`/pdf/classrooms?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching classrooms:', error);
      throw error;
    }
  }, []);

  const value = {
    // State
    loading,
    error,
    progress,
    
    // PDF Generation Actions
    generateStudentReport,
    generateMarkSheet,
    generateAttendanceSheet,
    generateCustomPDF,
    previewStudentReport,
    batchGenerateStudentReports,
    clearError,
    
    // Data Fetching Methods
    getAllStudents,
    getAllClassrooms,
    getStats,
    searchStudents,
    searchClassrooms
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
};

export default PDFContext;