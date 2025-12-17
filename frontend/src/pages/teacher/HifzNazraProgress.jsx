/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { useTeacher } from "../../contexts/TeacherContext";
import { useHifzReport } from "../../contexts/HifzReportContext";
import {
  Users,
  BookOpen,
  Download,
  BarChart3,
  Plus,
  Search,
  User,
  Calendar,
  Award,
  TrendingUp,
  FileText,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

const HifzNazraProgress = () => {
  const { students, classes, loading: teacherLoading,loading, fetchMyStudents, fetchMyClasses } =
    useTeacher();

  const {
    analytics,
    alerts,
    loading: reportLoading,
    getStudentAnalytics,
    getStudentAlerts,
    updateParaCompletion,
    generateAndDownloadReport,
  } = useHifzReport();

  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressForm, setProgressForm] = useState({
    date: new Date().toISOString().split("T")[0],
    sabaqLines: "",
    sabqiLines: "",
    manzilPara: "",
    mistakes: "",
    currentPara: "",
    paraProgress: "",
    completedParas: [],
    remarks: "",
  });
  const [studentProgress, setStudentProgress] = useState([]);
  const [viewMode, setViewMode] = useState("input"); // 'input', 'analytics', 'reports'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionData, setCompletionData] = useState({
    completedParas: [],
    currentPara: "",
    paraProgress: "",
  });

  // Add logging utility at the top of your component
const log = {
  info: (context, message, data = null) => {
    console.info(`[${new Date().toISOString()}] [${context}] ${message}`, data || '');
  },
  error: (context, message, error) => {
    console.error(`[${new Date().toISOString()}] [${context}] ${message}`, error);
  },
  warn: (context, message, data = null) => {
    console.warn(`[${new Date().toISOString()}] [${context}] ${message}`, data || '');
  },
  debug: (context, message, data = null) => {
    if (import.meta.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [${context}] ${message}`, data || '');
    }
  }
};

// Add error boundary state
const [errors, setErrors] = useState({
  classes: null,
  students: null,
  analytics: null,
  alerts: null,
  progress: null,
  report: null,
  submission: null
});

// Add loading states - RENAMED to avoid conflict with context loading
const [loadingStates, setLoadingStates] = useState({
  classes: false,
  students: false,
  analytics: false,
  alerts: false,
  progress: false,
  report: false
});

// Ensure classes and students are always arrays with logging
const classList = (() => {
  try {
    const result = Array.isArray(classes) ? classes : classes?.classes || [];
    log.debug('ClassList', `Processed ${result.length} classes`, { 
      rawInput: classes,
      processedCount: result.length 
    });
    
    if (result.length === 0) {
      log.warn('ClassList', 'No classes available');
    }
    
    return result;
  } catch (error) {
    const errorMsg = 'Error processing class list';
    log.error('ClassList', errorMsg, error);
    setErrors(prev => ({ ...prev, classes: errorMsg }));
    return [];
  }
})();

const studentList = (() => {
  try {
    const result = Array.isArray(students) ? students : students?.students || [];
    log.debug('StudentList', `Processed ${result.length} students`, { 
      rawInput: students,
      processedCount: result.length 
    });
    
    if (result.length === 0) {
      log.warn('StudentList', 'No students available');
    }
    
    return result;
  } catch (error) {
    const errorMsg = 'Error processing student list';
    log.error('StudentList', errorMsg, error);
    setErrors(prev => ({ ...prev, students: errorMsg }));
    return [];
  }
})();

// Filter for HIFZ and NAZRA classes only with logging
const hifzNazraClasses = useMemo(() => {
  try {
    const filtered = classList.filter(
      (cls) =>
        cls.type?.toUpperCase().includes("HIFZ") ||
        cls.type?.toUpperCase().includes("NAZRA")
    );
    
    log.debug('HifzNazraFilter', `Found ${filtered.length} HIFZ/NAZRA classes`, {
      totalClasses: classList.length,
      hifzNazraCount: filtered.length,
      classTypes: filtered.map(c => ({ id: c.id, name: c.name, type: c.type }))
    });
    
    if (filtered.length === 0 && classList.length > 0) {
      log.warn('HifzNazraFilter', 'No HIFZ/NAZRA classes found in class list', {
        availableTypes: [...new Set(classList.map(c => c.type))],
        totalClasses: classList.length
      });
    }
    
    return filtered;
  } catch (error) {
    const errorMsg = 'Error filtering HIFZ/NAZRA classes';
    log.error('HifzNazraFilter', errorMsg, error);
    return [];
  }
}, [classList]);

const filteredStudents = useMemo(() => {
  try {
    const result = studentList.filter((student) => {
      const matchesSearch =
        student.student?.user?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toString().includes(searchTerm);
      const matchesClass =
        !selectedClass || student.classRoom?.id === selectedClass;
      return matchesSearch && matchesClass;
    });
    
    log.debug('StudentFilter', `Filtered to ${result.length} students`, {
      totalStudents: studentList.length,
      searchTerm,
      selectedClass,
      filterCriteria: {
        searchTerm,
        selectedClassName: hifzNazraClasses.find(c => c.id === selectedClass)?.name || 'None'
      }
    });
    
    return result;
  } catch (error) {
    const errorMsg = 'Error filtering students';
    log.error('StudentFilter', errorMsg, error);
    return [];
  }
}, [studentList, searchTerm, selectedClass, hifzNazraClasses]);

useEffect(() => {
  const fetchClasses = async () => {
    log.info('ClassesFetch', 'Fetching classes...');
    setLoadingStates(prev => ({ ...prev, classes: true }));
    setErrors(prev => ({ ...prev, classes: null }));
    
    try {
      await fetchMyClasses();
      log.info('ClassesFetch', 'Classes fetched successfully', {
        count: classes?.length || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMsg = 'Failed to fetch classes';
      log.error('ClassesFetch', errorMsg, error);
      setErrors(prev => ({ ...prev, classes: errorMsg }));
      
      // Show user-friendly error
      alert('Unable to load classes. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, classes: false }));
    }
  };
  
  fetchClasses();
}, []);

useEffect(() => {
  const fetchStudents = async () => {
    if (!selectedClass) {
      log.debug('StudentsFetch', 'No class selected, skipping fetch');
      return;
    }
    
    const selectedClassName = hifzNazraClasses.find(c => c.id === selectedClass)?.name;
    log.info('StudentsFetch', `Fetching students for class: ${selectedClassName}`, {
      classId: selectedClass,
      className: selectedClassName
    });
    
    setLoadingStates(prev => ({ ...prev, students: true }));
    setErrors(prev => ({ ...prev, students: null }));
    
    try {
      await fetchMyStudents({ classRoomId: selectedClass });
      log.info('StudentsFetch', 'Students fetched successfully', {
        classId: selectedClass,
        studentCount: students?.length || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMsg = `Failed to fetch students for class ${selectedClass}`;
      log.error('StudentsFetch', errorMsg, error);
      setErrors(prev => ({ ...prev, students: errorMsg }));
      
      // Show user-friendly error
      alert(`Unable to load students for ${selectedClassName || 'selected class'}. Please try again.`);
    } finally {
      setLoadingStates(prev => ({ ...prev, students: false }));
    }
  };
  
  fetchStudents();
}, [selectedClass]);

useEffect(() => {
  if (selectedStudent) {
    log.info('StudentSelection', 'Student selected, loading data...', {
      studentId: selectedStudent.id,
      studentName: selectedStudent.student?.user?.name,
      rollNumber: selectedStudent.rollNumber,
      timestamp: new Date().toISOString()
    });
    
    loadStudentData();
  } else {
    log.debug('StudentSelection', 'No student selected, clearing data');
    // Clear any previous student data
    setStudentProgress([]);
    // Note: analytics and alerts are from context, you might not want to clear them
    // or you can call a reset function if available in your context
  }
}, [selectedStudent]);

const loadStudentData = async () => {
  if (!selectedStudent) {
    log.warn('StudentDataLoad', 'loadStudentData called without selected student');
    return;
  }

  const studentInfo = {
    id: selectedStudent.student.id,
    name: selectedStudent.student?.user?.name,
    rollNumber: selectedStudent.rollNumber
  };
  
  log.info('StudentDataLoad', `Loading data for student: ${studentInfo.name}`, studentInfo);
  
  try {
    // Load analytics
    log.debug('StudentDataLoad', 'Fetching analytics data');
    setLoadingStates(prev => ({ ...prev, analytics: true }));
    setErrors(prev => ({ ...prev, analytics: null }));
    
    await getStudentAnalytics(studentInfo.id, 30);
    log.debug('StudentDataLoad', 'Analytics data loaded successfully');
    
    // Load alerts
    log.debug('StudentDataLoad', 'Fetching alerts data');
    setLoadingStates(prev => ({ ...prev, alerts: true }));
    setErrors(prev => ({ ...prev, alerts: null }));
    
    await getStudentAlerts(studentInfo.id);
    log.debug('StudentDataLoad', 'Alerts data loaded successfully');
    
    // Load progress history
    log.debug('StudentDataLoad', 'Fetching progress history');
    setLoadingStates(prev => ({ ...prev, progress: true }));
    setErrors(prev => ({ ...prev, progress: null }));
    
    await loadStudentProgress(studentInfo.id);
    log.info('StudentDataLoad', 'All student data loaded successfully', {
      studentId: studentInfo.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const errorMsg = `Failed to load data for student ${studentInfo.name}`;
    log.error('StudentDataLoad', errorMsg, error);
    
    // Set appropriate error based on what failed
    if (!analytics) setErrors(prev => ({ ...prev, analytics: errorMsg }));
    if (!alerts) setErrors(prev => ({ ...prev, alerts: errorMsg }));
    if (studentProgress.length === 0) setErrors(prev => ({ ...prev, progress: errorMsg }));
    
    alert(`Unable to load some data for ${studentInfo.name}. Please try refreshing.`);
  } finally {
    // Reset all loading states
    setLoadingStates(prev => ({
      ...prev,
      analytics: false,
      alerts: false,
      progress: false
    }));
  }
};

const loadStudentProgress = async (studentId) => {
  log.info('ProgressLoad', `Loading progress for student: ${studentId}`);
  
  try {
    // In production, replace with actual API call
    // const response = await fetch(`/api/students/${studentId}/progress`);
    // const data = await response.json();
    
    // Mock progress data
    const mockProgress = [
      {
        id: 1,
        date: "2024-01-15",
        sabaqLines: 10,
        sabqiLines: 20,
        manzilPara: "Para 1",
        mistakes: 2,
        currentPara: 2,
        remarks: "Good progress",
      },
      {
        id: 2,
        date: "2024-01-14",
        sabaqLines: 8,
        sabqiLines: 15,
        manzilPara: "Para 1",
        mistakes: 1,
        currentPara: 1,
        remarks: "Excellent recitation",
      },
    ];
    
    setStudentProgress(mockProgress);
    log.debug('ProgressLoad', `Loaded ${mockProgress.length} progress records`, {
      studentId,
      recordCount: mockProgress.length,
      dateRange: {
        earliest: mockProgress[mockProgress.length - 1]?.date,
        latest: mockProgress[0]?.date
      }
    });
    
    return mockProgress;
  } catch (error) {
    const errorMsg = `Failed to load progress for student ${studentId}`;
    log.error('ProgressLoad', errorMsg, error);
    setErrors(prev => ({ ...prev, progress: errorMsg }));
    throw error;
  }
};

const handleInputChange = (field, value) => {
  log.debug('FormInput', `Field changed: ${field}`, {
    field,
    oldValue: progressForm[field],
    newValue: value,
    formState: progressForm
  });
  
  setProgressForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};

const handleCompletionChange = (field, value) => {
  log.debug('CompletionInput', `Field changed: ${field}`, {
    field,
    oldValue: completionData[field],
    newValue: value,
    completionState: completionData
  });
  
  setCompletionData((prev) => ({
    ...prev,
    [field]: value,
  }));
};

const handleSubmitProgress = async (e) => {
  e.preventDefault();
  
  if (!selectedStudent) {
    log.warn('ProgressSubmit', 'Submission attempted without selected student');
    alert('Please select a student first.');
    return;
  }

  const submissionData = {
    ...progressForm,
    studentId: selectedStudent.student.id,
    studentName: selectedStudent.student?.user?.name,
    timestamp: new Date().toISOString()
  };
  
  log.info('ProgressSubmit', 'Submitting progress data', submissionData);
  
  setIsSubmitting(true);
  setErrors(prev => ({ ...prev, submission: null }));
  
  try {
    // Validate required fields
    if (!progressForm.date) {
      throw new Error('Date is required');
    }
    if (!progressForm.currentPara) {
      throw new Error('Current Para is required');
    }
    
    // Here you would call your API to save progress
    // const response = await saveStudentProgress(submissionData);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    log.debug('ProgressSubmit', 'API call simulated successfully');
    
    // Add to local state
    const newProgress = {
      id: Date.now(),
      ...progressForm,
    };
    
    setStudentProgress((prev) => [newProgress, ...prev]);
    
    // Reset form
    setProgressForm({
      date: new Date().toISOString().split("T")[0],
      sabaqLines: "",
      sabqiLines: "",
      manzilPara: "",
      mistakes: "",
      currentPara: "",
      paraProgress: "",
      completedParas: [],
      remarks: "",
    });
    
    log.info('ProgressSubmit', 'Progress recorded successfully', {
      studentId: selectedStudent.student.id,
      recordId: newProgress.id,
      timestamp: new Date().toISOString()
    });
    
    // Show success message
    alert("Progress recorded successfully!");
    
    // Refresh analytics to reflect new data
    await getStudentAnalytics(selectedStudent.student.id, 30);
    
  } catch (error) {
    const errorMsg = error.message || 'Error recording progress';
    log.error('ProgressSubmit', errorMsg, error);
    setErrors(prev => ({ ...prev, submission: errorMsg }));
    
    alert(`Error: ${errorMsg}`);
  } finally {
    setIsSubmitting(false);
  }
};

const handleUpdateParaCompletion = async () => {
  if (!selectedStudent || !completionData.currentPara) {
    const errorMsg = !selectedStudent ? 'No student selected' : 'Current Para is required';
    log.warn('ParaCompletion', `Update failed: ${errorMsg}`);
    alert(errorMsg);
    return;
  }

  const updateData = {
    ...completionData,
    studentId: selectedStudent.student.id,
    studentName: selectedStudent.student?.user?.name,
    timestamp: new Date().toISOString()
  };
  
  log.info('ParaCompletion', 'Updating para completion', updateData);
  
  try {
    await updateParaCompletion(selectedStudent.student.id, completionData);
    
    log.info('ParaCompletion', 'Para completion updated successfully', {
      studentId: selectedStudent.student.id,
      para: completionData.currentPara,
      progress: completionData.paraProgress,
      timestamp: new Date().toISOString()
    });
    
    alert("Para completion updated successfully!");
    
    // Refresh analytics
    await getStudentAnalytics(selectedStudent.student.id, 30);
    
  } catch (error) {
    const errorMsg = `Failed to update para completion: ${error.message}`;
    log.error('ParaCompletion', errorMsg, error);
    
    alert("Error updating para completion. Please try again.");
  }
};

const handleGenerateReport = async () => {
  if (!selectedStudent) {
    log.warn('ReportGeneration', 'Report generation attempted without selected student');
    alert('Please select a student first.');
    return;
  }

  const reportConfig = {
    studentId: selectedStudent.student.id,
    studentName: selectedStudent.student?.user?.name,
    startDate: "2024-01-01",
    endDate: new Date().toISOString().split("T")[0],
    timestamp: new Date().toISOString()
  };
  
  log.info('ReportGeneration', 'Generating report', reportConfig);
  
  setLoadingStates(prev => ({ ...prev, report: true }));
  setErrors(prev => ({ ...prev, report: null }));
  
  try {
    await generateAndDownloadReport(reportConfig);
    
    log.info('ReportGeneration', 'Report generated and downloaded successfully', {
      studentId: reportConfig.studentId,
      reportDateRange: `${reportConfig.startDate} to ${reportConfig.endDate}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const errorMsg = `Failed to generate report: ${error.message}`;
    log.error('ReportGeneration', errorMsg, error);
    setErrors(prev => ({ ...prev, report: errorMsg }));
    
    alert("Error generating report. Please try again.");
  } finally {
    setLoadingStates(prev => ({ ...prev, report: false }));
  }
};

const calculateProgressStats = () => {
  if (studentProgress.length === 0) {
    log.debug('ProgressStats', 'No progress data available for calculations');
    return null;
  }

  try {
    const totalSabaq = studentProgress.reduce(
      (sum, p) => sum + (p.sabaqLines || 0),
      0
    );
    const totalSabqi = studentProgress.reduce(
      (sum, p) => sum + (p.sabqiLines || 0),
      0
    );
    const totalMistakes = studentProgress.reduce(
      (sum, p) => sum + (p.mistakes || 0),
      0
    );
    const avgMistakesPerSession = totalMistakes / studentProgress.length;
    const currentPara = studentProgress[0]?.currentPara || 1;

    const stats = {
      totalSessions: studentProgress.length,
      totalSabaq,
      totalSabqi,
      totalMistakes,
      avgMistakesPerSession: avgMistakesPerSession.toFixed(1),
      currentPara,
      avgLinesPerSession: (
        (totalSabaq + totalSabqi) /
        studentProgress.length
      ).toFixed(1),
    };
    
    log.debug('ProgressStats', 'Calculated student progress statistics', {
      recordCount: studentProgress.length,
      stats,
      dateRange: {
        earliest: studentProgress[studentProgress.length - 1]?.date,
        latest: studentProgress[0]?.date
      }
    });
    
    return stats;
  } catch (error) {
    log.error('ProgressStats', 'Error calculating progress statistics', error);
    return null;
  }
};

// Add a function to clear all errors
const clearErrors = () => {
  log.info('ErrorClear', 'Clearing all errors');
  setErrors({
    classes: null,
    students: null,
    analytics: null,
    alerts: null,
    progress: null,
    report: null,
    submission: null
  });
};

// Add a function to retry failed operations
const retryOperation = (operationType) => {
  log.info('Retry', `Retrying operation: ${operationType}`);
  
  switch (operationType) {
    case 'classes':
      fetchMyClasses();
      break;
    case 'students':
      if (selectedClass) {
        fetchMyStudents({ classRoomId: selectedClass });
      }
      break;
    case 'analytics':
      if (selectedStudent) {
        getStudentAnalytics(selectedStudent.student.id, 30);
      }
      break;
    case 'alerts':
      if (selectedStudent) {
        getStudentAlerts(selectedStudent.student.id);
      }
      break;
    case 'progress':
      if (selectedStudent) {
        loadStudentProgress(selectedStudent.student.id);
      }
      break;
    case 'report':
      handleGenerateReport();
      break;
    default:
      log.warn('Retry', `Unknown operation type: ${operationType}`);
  }
  
  clearErrors();
};

// Calculate display data from stats
const displayData = calculateProgressStats() || {
  totalSessions: 0,
  currentPara: 1,
  avgLinesPerDay: 0,
  completedParas: 0,
};

  const ProgressInputForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gold" />
    Record Progress
  </h2>

  <form onSubmit={handleSubmitProgress} className="space-y-4">
    {/* Form grid - single column on mobile, two columns on sm+ */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Date */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Date *
        </label>
        <input
          type="date"
          required
          value={progressForm.date}
          onChange={(e) => handleInputChange("date", e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
        />
      </div>

      {/* Current Para */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Current Para *
        </label>
        <select
          required
          value={progressForm.currentPara}
          onChange={(e) => handleInputChange("currentPara", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
        >
          <option value="">Select Para</option>
          {Array.from({ length: 30 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Para {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Sabaq Lines */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Sabaq (New Lines)
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="20"
            value={progressForm.sabaqLines}
            onChange={(e) => handleInputChange("sabaqLines", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            placeholder="0-20"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            max 20
          </span>
        </div>
      </div>

      {/* Sabqi Lines */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Sabqi (Revision)
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="50"
            value={progressForm.sabqiLines}
            onChange={(e) => handleInputChange("sabqiLines", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            placeholder="0-50"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            max 50
          </span>
        </div>
      </div>

      {/* Manzil Para - full width on mobile, half on sm+ */}
      <div className="sm:col-span-2 space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Manzil Para
        </label>
        <select
          value={progressForm.manzilPara}
          onChange={(e) => handleInputChange("manzilPara", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
        >
          <option value="">Select Manzil Para (Optional)</option>
          {Array.from({ length: 30 }, (_, i) => (
            <option key={i + 1} value={`Para ${i + 1}`}>
              Para {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Mistakes */}
      <div className="sm:col-span-2 space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Mistakes
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="20"
            value={progressForm.mistakes}
            onChange={(e) => handleInputChange("mistakes", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            placeholder="0-20"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            max 20
          </span>
        </div>
      </div>
    </div>

    {/* Remarks */}
    <div className="space-y-1 pt-2">
      <label className="text-xs font-medium text-gray-700">
        Remarks (Optional)
      </label>
      <textarea
        rows={2}
        value={progressForm.remarks}
        onChange={(e) => handleInputChange("remarks", e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
        placeholder="Additional comments about today's performance..."
      />
    </div>

    {/* Buttons */}
    <div className="flex flex-col sm:flex-row gap-2 pt-4">
      <button
        type="submit"
        disabled={isSubmitting || !selectedStudent}
        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-md font-medium text-sm flex items-center justify-center ${
          isSubmitting || !selectedStudent
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 shadow-sm"
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </>
        )}
      </button>
      
      <button
        type="button"
        onClick={handleResetForm}
        className="flex-1 sm:flex-none px-4 py-2.5 rounded-md font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
      >
        Clear Form
      </button>
    </div>
  </form>
</div>
  );

  const StudentProgressAnalytics = () => {
    const stats = calculateProgressStats();

    if (!analytics && !stats) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No Analytics Data
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No analytics data available for this student.
          </p>
        </div>
      );
    }

    const displayData = analytics || stats;

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total Sessions
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {displayData.totalSessions || displayData.totalDays}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Current Para
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {displayData.currentPara}
                </p>
              </div>
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Avg Lines/Day
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {displayData.avgLinesPerDay || displayData.avgLinesPerSession}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gold flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Completed
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {displayData.completedParas || 0}/30
                </p>
              </div>
              <Award className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts?.alerts && alerts.alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-yellow-500 flex-shrink-0" />
              Performance Alerts
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {alerts.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-lg border ${
                    alert.severity === "critical"
                      ? "bg-red-50 border-red-200"
                      : alert.severity === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : alert.severity === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alert.message}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {alert.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Progress Overview
          </h3>
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    Performance Trend
                  </label>
                  <div className="flex items-center mt-1">
                    <div
                      className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${
                        analytics.performanceTrend === "Improving"
                          ? "bg-green-100 text-green-800"
                          : analytics.performanceTrend === "Declining"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {analytics.performanceTrend}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    Consistency Score
                  </label>
                  <p className="text-lg sm:text-xl font-semibold">
                    {analytics.consistencyScore}%
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    Mistake Rate
                  </label>
                  <p className="text-lg sm:text-xl font-semibold">
                    {analytics.mistakeRate}%
                  </p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    Est. Completion
                  </label>
                  <p className="text-lg sm:text-xl font-semibold">
                    {analytics.estimatedDaysToComplete
                      ? `${analytics.estimatedDaysToComplete} days`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Lines
                  </label>
                  <p className="text-lg sm:text-xl font-semibold">
                    {analytics.totalLines}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">
                    High Mistake Days
                  </label>
                  <p className="text-lg sm:text-xl font-semibold">
                    {analytics.highMistakeDays}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 sm:h-56 md:h-64 flex items-end justify-between space-x-1 sm:space-x-2 overflow-x-auto">
              {studentProgress.slice(0, 10).map((progress, index) => (
                <div
                  key={progress.id}
                  className="flex flex-col items-center flex-1 min-w-[24px] sm:min-w-[28px] md:min-w-[32px]"
                >
                  <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 w-full">
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{
                        height: `${(progress.sabaqLines / 20) * 100}%`,
                        minHeight: "4px",
                      }}
                      title={`Sabaq: ${progress.sabaqLines} lines`}
                    ></div>
                    <div
                      className="w-full bg-blue-500 rounded-b"
                      style={{
                        height: `${(progress.sabqiLines / 50) * 100}%`,
                        minHeight: "4px",
                      }}
                      title={`Sabqi: ${progress.sabqiLines} lines`}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 sm:mt-2 text-center">
                    <span className="hidden sm:block">
                      {new Date(progress.date).getDate()}/
                      {new Date(progress.date).getMonth() + 1}
                    </span>
                    <span className="block sm:hidden">
                      {new Date(progress.date).getDate()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Para Completion Update */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Update Para Completion
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Current Para
                </label>
                <select
                  value={completionData.currentPara}
                  onChange={(e) =>
                    handleCompletionChange(
                      "currentPara",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  <option value="">Select Para</option>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Para {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={completionData.paraProgress}
                  onChange={(e) =>
                    handleCompletionChange(
                      "paraProgress",
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  placeholder="0-100"
                />
              </div>
              <div className="sm:flex items-end">
                <button
                  onClick={handleUpdateParaCompletion}
                  disabled={!completionData.currentPara}
                  className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base ${
                    !completionData.currentPara
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  Update
                </button>
              </div>
            </div>

            {/* Progress bar for visual feedback */}
            {completionData.paraProgress > 0 && (
              <div className="pt-2 sm:pt-3">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{completionData.paraProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${completionData.paraProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const StudentCard = ({ student }) => {
    const isSelected = selectedStudent?.id === student.id;

    return (
      <div
        className={`bg-white rounded-lg shadow-sm border-2 p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
          isSelected
            ? "border-gold bg-gold bg-opacity-5"
            : "border-gray-200 hover:border-gold"
        }`}
        onClick={() => setSelectedStudent(student)}
      >
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
            {student.student?.user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
              {student.student?.user?.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
              <span className="block sm:inline">
                Roll: {student.rollNumber}
              </span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline">{student.classRoom?.name}</span>
            </p>
          </div>
          {isSelected && (
            <div className="bg-gold text-white p-1 rounded-full flex-shrink-0">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 sm:py-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Hifz & Nazra Progress
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Track student progress and generate detailed reports
              </p>
            </div>

            <div className="flex items-center justify-start sm:justify-end">
              {selectedStudent && (
                <button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gold text-black rounded-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                >
                  {reportLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2 flex-shrink-0"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">
                        Generate PDF Report
                      </span>
                      <span className="inline sm:hidden">PDF Report</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Sidebar - Student List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-gold flex-shrink-0" />
                Students
              </h2>

              {/* Filters */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  >
                    <option value="">All HIFZ/NAZRA Classes</option>
                    {hifzNazraClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Gr {cls.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Search Students
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search by name or roll..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <User className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2" />
                    <p className="text-sm">No students found</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <StudentCard key={student.id} student={student} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {!selectedStudent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
                <User className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
                  Select a Student
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                  Choose a student from the list to view and record their
                  progress
                </p>
              </div>
            ) : (
              <>
                {/* Student Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-gold rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base lg:text-lg flex-shrink-0">
                        {selectedStudent.student?.user?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                          {selectedStudent.student?.user?.name}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          <span className="block sm:inline">
                            Roll: {selectedStudent.rollNumber}
                          </span>
                          <span className="hidden sm:inline"> • </span>
                          <span className="block sm:inline">
                            {selectedStudent.classRoom?.name}
                          </span>
                        </p>
                        <p className="text-xs sm:text-sm text-gold font-medium mt-0.5">
                          Adm: {selectedStudent.student?.admissionNo}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar">
                    {[
                      {
                        id: "input",
                        label: "Record Progress",
                        icon: Plus,
                        mobileLabel: "Record",
                      },
                      {
                        id: "analytics",
                        label: "Analytics",
                        icon: BarChart3,
                        mobileLabel: "Analytics",
                      },
                      {
                        id: "reports",
                        label: "Reports",
                        icon: FileText,
                        mobileLabel: "Reports",
                      },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setViewMode(tab.id)}
                          className={`flex items-center py-3 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                            viewMode === tab.id
                              ? "border-gold text-gold"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="inline sm:hidden">
                            {tab.mobileLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 sm:p-5 lg:p-6">
                    {viewMode === "input" && <ProgressInputForm />}
                    {viewMode === "analytics" && <StudentProgressAnalytics />}
                    {viewMode === "reports" && (
                      <div className="text-center py-6 sm:py-8 lg:py-12">
                        <FileText className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
                          Report Generation
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                          Use the button above to create detailed progress
                          reports.
                        </p>
                        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                          <button
                            onClick={handleGenerateReport}
                            disabled={reportLoading}
                            className="flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gold text-black rounded-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                          >
                            {reportLoading ? (
                              <>
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                                <span className="hidden sm:inline">
                                  Download PDF Report
                                </span>
                                <span className="inline sm:hidden">
                                  Download PDF
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HifzNazraProgress;
