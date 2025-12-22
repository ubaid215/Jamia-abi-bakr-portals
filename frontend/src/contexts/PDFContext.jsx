// contexts/PDFContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import pdfService from '../services/pdfService';
import { toast } from 'react-hot-toast'; // Or your preferred toast library

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
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Generate student progress report
   */
  const generateStudentReport = useCallback(async (studentId, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Generating student progress report...');

    try {
      await pdfService.generateStudentProgressReport(studentId, options);
      toast.success('Student report downloaded successfully!');
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate student report';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate exam mark sheet
   */
  const generateMarkSheet = useCallback(async (classRoomId, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Generating exam mark sheet...');

    try {
      await pdfService.generateExamMarkSheet(classRoomId, options);
      toast.success('Mark sheet downloaded successfully!');
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate mark sheet';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate attendance sheet
   */
  const generateAttendanceSheet = useCallback(async (classRoomId, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Generating attendance sheet...');

    try {
      await pdfService.generateAttendanceSheet(classRoomId, options);
      toast.success('Attendance sheet downloaded successfully!');
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate attendance sheet';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate custom PDF
   */
  const generateCustomPDF = useCallback(async (pdfData) => {
    setLoading(true);
    setError(null);
    setProgress('Generating custom PDF...');

    try {
      await pdfService.generateCustomPDF(pdfData);
      toast.success('Custom PDF downloaded successfully!');
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate custom PDF';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Preview student report in new tab
   */
  const previewStudentReport = useCallback(async (studentId, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Loading preview...');

    try {
      const blob = await pdfService.getStudentProgressReportBlob(studentId, options);
      pdfService.previewPDF(blob);
      setProgress(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to preview report';
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Batch generate reports for multiple students
   */
  const batchGenerateStudentReports = useCallback(async (studentIds, options = {}) => {
    setLoading(true);
    setError(null);
    
    const results = {
      successful: [],
      failed: []
    };

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      setProgress(`Generating report ${i + 1} of ${studentIds.length}...`);

      try {
        await pdfService.generateStudentProgressReport(studentId, options);
        results.successful.push(studentId);
        
        // Add small delay between downloads
        if (i < studentIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Failed to generate report for student ${studentId}:`, err);
        results.failed.push({ studentId, error: err.message });
      }
    }

    setLoading(false);
    setProgress(null);

    if (results.failed.length === 0) {
      toast.success(`Successfully generated ${results.successful.length} reports!`);
    } else {
      toast.warning(
        `Generated ${results.successful.length} reports. ${results.failed.length} failed.`
      );
    }

    return results;
  }, []);

  const value = {
    // State
    loading,
    error,
    progress,
    
    // Actions
    generateStudentReport,
    generateMarkSheet,
    generateAttendanceSheet,
    generateCustomPDF,
    previewStudentReport,
    batchGenerateStudentReports,
    clearError
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
};

export default PDFContext;