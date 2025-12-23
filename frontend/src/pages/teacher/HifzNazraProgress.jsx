/* eslint-disable no-unused-vars */
// src/components/hifz/HifzNazraProgress.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTeacher } from "../../contexts/TeacherContext";
import { useHifz } from "../../contexts/HifzContext";
import hifzServices from "../../services/hifzServices";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Import components
import HeaderSection from "../../components/hifz/HeaderSection";
import StudentSelector from "../../components/hifz/StudentSelector";
import ProgressInputForm from "../../components/hifz/ProgressInputForm";
import ParaProgressAnalytics from "../../components/hifz/ParaProgressAnalytics";
import ReportGenerator from "../../components/hifz/ReportGenerator";

// Import utilities
import { calculateParaLogic } from "../../utils/paraCalculations";

const HifzNazraProgress = () => {
  const { students, classes, loading: teacherLoading, fetchMyStudents, fetchMyClasses } = useTeacher();
  const {
    selectedStudent: hifzSelectedStudent,
    analytics,
    progressRecords,
    hifzStatus,
    loading: hifzLoading,
    error: hifzError,
    saveProgress,
    updateParaCompletion,
    fetchAnalytics,
    fetchStudentProgress,
    selectStudent: hifzSelectStudent,
    clearStudent: hifzClearStudent,
    downloadReport,
  } = useHifz();

  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewMode, setViewMode] = useState("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [completionData, setCompletionData] = useState({
    completedPara: null,
    currentPara: "",
    currentParaProgress: "",
  });

  // Calculate current para based on completed paras
  const calculatedCurrentPara = useMemo(() => {
    if (!hifzStatus) return 1;
    
    const { completedParas = [], alreadyMemorizedParas = [], currentPara } = hifzStatus;
    
    // If currentPara exists in status, use it
    if (currentPara && currentPara >= 1 && currentPara <= 30) {
      return currentPara;
    }
    
    // Otherwise calculate the next para
    return calculateParaLogic.getNextPara(completedParas, alreadyMemorizedParas);
  }, [hifzStatus]);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        await fetchMyClasses();
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      }
    };
    
    fetchClasses();
  }, []);

  // Fetch students when class is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return;
      
      try {
        await fetchMyStudents({ classRoomId: selectedClass });
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };
    
    fetchStudents();
  }, [selectedClass]);

  // Handle student selection
  // Fix the handleSelectStudent function
const handleSelectStudent = async (student) => {
  console.log('👤 Selecting student:', {
    student,
    studentId: student.student?.id,
    name: student.student?.user?.name
  });
  
  setSelectedStudent(student);
  
  // Wait for context to update
  await hifzSelectStudent(student);
  
  const studentId = student.student?.id;
  if (studentId) {
    try {
      console.log('🔄 Loading student data for:', studentId);
      await Promise.all([
        fetchStudentProgress(studentId),
        fetchAnalytics(studentId, 30)
      ]);
      console.log('✅ Student data loaded');
    } catch (error) {
      console.error('❌ Failed to load student data:', error);
    }
  }
};

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!selectedStudent) {
      alert('Please select a student first.');
      return;
    }

    try {
      await downloadReport(selectedStudent.student.id, selectedStudent.student.user.name, {
        days: reportDays
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert("Error generating report. Please try again.");
    }
  };

  // Handle para completion update
  const handleUpdateParaCompletion = async () => {
    if (!selectedStudent) {
      alert('No student selected');
      return;
    }

    if (!completionData.currentPara) {
      alert('Current Para is required');
      return;
    }

    const validation = calculateParaLogic.validateParaCompletion(
      completionData.completedPara || completionData.currentPara,
      completionData.currentPara,
      hifzStatus?.completedParas || [],
      hifzStatus?.alreadyMemorizedParas || []
    );

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const updateData = {
      currentPara: completionData.currentPara,
      currentParaProgress: completionData.currentParaProgress || 0,
    };

    if (completionData.completedPara && (completionData.currentParaProgress === 100 || completionData.completedPara)) {
      updateData.completedPara = completionData.completedPara || completionData.currentPara;
    }
    
    try {
      await updateParaCompletion(updateData);
      alert("Para completion updated successfully!");
      
      await fetchAnalytics(selectedStudent.student.id, 30);
      
      setCompletionData({
        completedPara: null,
        currentPara: calculateParaLogic.getNextPara(
          hifzStatus?.completedParas || [],
          hifzStatus?.alreadyMemorizedParas || []
        ),
        currentParaProgress: 0,
      });
      
    } catch (error) {
      console.error('Failed to update para completion:', error);
      alert("Error updating para completion. Please try again.");
    }
  };

  // Handle mark para as completed
  const handleMarkParaCompleted = async (paraNumber) => {
    if (!selectedStudent) {
      alert('No student selected');
      return;
    }

    if (!paraNumber || paraNumber < 1 || paraNumber > 30) {
      alert('Invalid para number');
      return;
    }

    const updateData = {
      completedPara: paraNumber,
      currentPara: calculateParaLogic.getNextPara(
        [...(hifzStatus?.completedParas || []), paraNumber],
        hifzStatus?.alreadyMemorizedParas || []
      ),
      currentParaProgress: 0,
    };

    try {
      await updateParaCompletion(updateData);
      alert(`Para ${paraNumber} marked as completed!`);
      
      await fetchAnalytics(selectedStudent.student.id, 30);
    } catch (error) {
      console.error('Failed to mark para as completed:', error);
      alert("Error marking para as completed. Please try again.");
    }
  };

  // Handle completion data change
  const handleCompletionChange = (field, value) => {
    setCompletionData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Data flow calculation
  const progressStats = useMemo(() => 
    calculateParaLogic.calculateProgressStats(analytics, hifzStatus, calculatedCurrentPara),
    [analytics, hifzStatus, calculatedCurrentPara]
  );

  const paraVisualization = useMemo(() => {
  console.log('🎯 Creating paraVisualization:', {
    hifzStatus,
    calculatedCurrentPara
  });
  
  const visualization = calculateParaLogic.getParaVisualization(hifzStatus, calculatedCurrentPara);
  
  // Ensure it has currentPara
  return {
    ...visualization,
    currentPara: visualization.currentPara || calculatedCurrentPara || 1
  };
}, [hifzStatus, calculatedCurrentPara]);

  if (teacherLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderSection 
        reportDays={reportDays}
        setReportDays={setReportDays}
        handleGenerateReport={handleGenerateReport}
        hifzLoading={hifzLoading}
        selectedStudent={selectedStudent}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Sidebar - Student List */}
          <div className="lg:col-span-1">
            <StudentSelector 
              classes={classes}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              students={students}
              selectedStudent={selectedStudent}
              handleSelectStudent={handleSelectStudent}
            />
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {!selectedStudent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">👤</div>
                <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
                  Select a Student
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                  Choose a student from the list to view and record their progress
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
                      onClick={() => {
                        setSelectedStudent(null);
                        hifzClearStudent();
                      }}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <span className="sr-only">Close</span>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar">
                    {[
                      { id: "input", label: "Record Progress", mobileLabel: "Record" },
                      { id: "analytics", label: "Analytics", mobileLabel: "Analytics" },
                      { id: "reports", label: "Reports", mobileLabel: "Reports" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`flex items-center py-3 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                          viewMode === tab.id
                            ? "border-gold text-gold"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {tab.mobileLabel === "Record" && "📝"}
                        {tab.mobileLabel === "Analytics" && "📊"}
                        {tab.mobileLabel === "Reports" && "📄"}
                        <span className="hidden sm:inline ml-2">{tab.label}</span>
                        <span className="inline sm:hidden ml-1">
                          {tab.mobileLabel}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 sm:p-5 lg:p-6">
                    {viewMode === "input" && (
                      <ProgressInputForm 
                        selectedStudent={selectedStudent}
                        hifzStatus={hifzStatus}
                        calculatedCurrentPara={calculatedCurrentPara}
                        paraVisualization={paraVisualization}
                        handleMarkParaCompleted={handleMarkParaCompleted}
                        isSubmitting={isSubmitting}
                        hifzLoading={hifzLoading}
                         setSubmitting={setIsSubmitting}
                        saveProgress={saveProgress}
                        fetchAnalytics={fetchAnalytics}
                      />
                    )}
                    
                    {viewMode === "analytics" && (
                      <ParaProgressAnalytics 
                        analytics={analytics}
                        hifzStatus={hifzStatus}
                        progressStats={progressStats}
                        paraVisualization={paraVisualization}
                        completionData={completionData}
                        handleCompletionChange={handleCompletionChange}
                        handleUpdateParaCompletion={handleUpdateParaCompletion}
                        handleMarkParaCompleted={handleMarkParaCompleted}
                        hifzLoading={hifzLoading}
                      />
                    )}
                    
                    {viewMode === "reports" && (
                      <ReportGenerator 
                        handleGenerateReport={handleGenerateReport}
                        hifzLoading={hifzLoading}
                      />
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