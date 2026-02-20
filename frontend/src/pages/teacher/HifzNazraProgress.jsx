// src/components/hifz/HifzNazraProgress.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import { useHifz } from '../../contexts/HifzContext';
import { useAuth } from '../../contexts/AuthContext';

// Components
import HeaderSection from '../../components/hifz/HeaderSection';
import StudentSelector from '../../components/hifz/StudentSelector';
import ProgressInputForm from '../../components/hifz/ProgressInputForm';
import ParaProgressAnalytics from '../../components/hifz/ParaProgressAnalytics';
import StudentMonthlyReport from '../../components/hifz/StudentMonthlyReport';
import PageSkeleton from '../../components/ui/PageSkeleton';

// Utilities
import { calculateParaLogic } from '../../utils/paraCalculations';

const HifzNazraProgress = () => {
  const {
    students,
    classes,
    loading: teacherLoading,
    fetchMyStudents,
    fetchMyClasses,
  } = useTeacher();

  const {
    analytics,
    hifzStatus,
    loading: hifzLoading,
    saveProgress,
    updateParaCompletion,
    fetchAnalytics,
    fetchStudentProgress,
    selectStudent: hifzSelectStudent,
    clearStudent: hifzClearStudent,
    downloadReport,
  } = useHifz();

  const { user } = useAuth();

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewMode, setViewMode] = useState('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [completionData, setCompletionData] = useState({
    completedPara: null,
    currentPara: '',
    currentParaProgress: '',
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  /**
   * Extract the real Postgres UUID from whatever shape the student object has.
   * Enrollment: { studentId, student: { id, user }, rollNumber, classRoom }
   * Student:    { id, user }
   */
  const resolveStudentId = (s) =>
    s?.studentId || s?.student?.id || s?.id || null;

  const resolveStudentName = (s) =>
    s?.student?.user?.name || s?.user?.name || s?.name || 'student';

  // ── Para calculation ───────────────────────────────────────────────────────
  const calculatedCurrentPara = useMemo(() => {
    if (!hifzStatus) return 1;
    const { completedParas = [], alreadyMemorizedParas = [], currentPara } = hifzStatus;
    if (currentPara && currentPara >= 1 && currentPara <= 30) return currentPara;
    return calculateParaLogic.getNextPara(completedParas, alreadyMemorizedParas);
  }, [hifzStatus]);

  const progressStats = useMemo(
    () => calculateParaLogic.calculateProgressStats(analytics, hifzStatus, calculatedCurrentPara),
    [analytics, hifzStatus, calculatedCurrentPara]
  );

  const paraVisualization = useMemo(() => {
    const v = calculateParaLogic.getParaVisualization(hifzStatus, calculatedCurrentPara);
    return { ...v, currentPara: v.currentPara || calculatedCurrentPara || 1 };
  }, [hifzStatus, calculatedCurrentPara]);

  // ── Mount: fetch classes ───────────────────────────────────────────────────
  useEffect(() => {
    fetchMyClasses().catch(console.error);
  }, []);

  // ── Fetch students when class changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedClass) return;
    fetchMyStudents({ classRoomId: selectedClass }).catch(console.error);
  }, [selectedClass]);

  // ── Student selection ──────────────────────────────────────────────────────
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    await hifzSelectStudent(student);

    const id = resolveStudentId(student);
    if (id && typeof id === 'string' && id.length > 10) {
      try {
        await Promise.all([
          fetchStudentProgress(id),
          fetchAnalytics(id, 30),
        ]);
      } catch (err) {
        console.error('Failed to load student data:', err);
      }
    }
  };

  // ── Report download ────────────────────────────────────────────────────────
  /**
   * handleGenerateReport(type?)
   *
   * Called two ways:
   *   1. From HeaderSection — no type argument (or a SyntheticEvent from a button click)
   *   2. From StudentMonthlyReport's onDownload — type is 'hifz-only' or 'full'
   *
   * We normalise both cases so downloadReport always receives a clean string | undefined.
   */
  const handleGenerateReport = useCallback(async (typeOrEvent) => {
    if (!selectedStudent) {
      alert('Please select a student first.');
      return;
    }

    const id = resolveStudentId(selectedStudent);
    const name = resolveStudentName(selectedStudent);

    if (!id) {
      alert('Cannot resolve student ID. Please re-select the student.');
      return;
    }

    // If called from a DOM event (e.g. button onClick), ignore the event object
    const type = typeof typeOrEvent === 'string' ? typeOrEvent : undefined;

    const params = { days: reportDays };
    if (type) params.type = type;  // 'hifz-only' | 'full'

    try {
      await downloadReport(id, name, params);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  }, [selectedStudent, reportDays, downloadReport]);

  // ── Para completion ────────────────────────────────────────────────────────
  const handleUpdateParaCompletion = async () => {
    if (!selectedStudent) { alert('No student selected'); return; }
    if (!completionData.currentPara) { alert('Current Para is required'); return; }

    const validation = calculateParaLogic.validateParaCompletion(
      completionData.completedPara || completionData.currentPara,
      completionData.currentPara,
      hifzStatus?.completedParas || [],
      hifzStatus?.alreadyMemorizedParas || []
    );
    if (!validation.valid) { alert(validation.error); return; }

    const updateData = {
      currentPara: completionData.currentPara,
      currentParaProgress: completionData.currentParaProgress || 0,
    };
    if (completionData.completedPara) {
      updateData.completedPara = completionData.completedPara;
    }

    try {
      await updateParaCompletion(updateData);
      const id = resolveStudentId(selectedStudent);
      if (id) await fetchAnalytics(id, 30);
      setCompletionData({
        completedPara: null,
        currentPara: calculateParaLogic.getNextPara(
          hifzStatus?.completedParas || [],
          hifzStatus?.alreadyMemorizedParas || []
        ),
        currentParaProgress: 0,
      });
    } catch (err) {
      console.error('Failed to update para completion:', err);
    }
  };

  const handleMarkParaCompleted = async (paraNumber) => {
    if (!selectedStudent) { alert('No student selected'); return; }
    if (!paraNumber || paraNumber < 1 || paraNumber > 30) { alert('Invalid para number'); return; }

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
      const id = resolveStudentId(selectedStudent);
      if (id) await fetchAnalytics(id, 30);
    } catch (err) {
      console.error('Failed to mark para as completed:', err);
    }
  };

  const handleCompletionChange = (field, value) =>
    setCompletionData((prev) => ({ ...prev, [field]: value }));

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (teacherLoading) return <PageSkeleton />;

  // ── Render ─────────────────────────────────────────────────────────────────
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

          {/* ── Sidebar ── */}
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

          {/* ── Main content ── */}
          <div className="lg:col-span-3">
            {!selectedStudent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">👤</div>
                <h3 className="text-sm font-medium text-gray-900">Select a Student</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a student from the list to view and record their progress
                </p>
              </div>
            ) : (
              <>
                {/* Student header card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gold rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {resolveStudentName(selectedStudent)
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                          {resolveStudentName(selectedStudent)}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          Roll: {selectedStudent.rollNumber} &nbsp;•&nbsp;
                          {selectedStudent.classRoom?.name}
                        </p>
                        <p className="text-xs text-gold font-medium mt-0.5">
                          Adm: {selectedStudent.student?.admissionNo}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedStudent(null); hifzClearStudent(); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex overflow-x-auto border-b border-gray-200">
                    {[
                      { id: 'input', label: 'Record Progress', icon: '📝' },
                      { id: 'analytics', label: 'Analytics', icon: '📊' },
                      { id: 'reports', label: 'Reports', icon: '📄' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`flex items-center py-3 sm:py-4 px-4 sm:px-6 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${viewMode === tab.id
                          ? 'border-gold text-gold'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <span className="mr-1.5">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="inline sm:hidden">{tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 sm:p-5 lg:p-6">
                    {viewMode === 'input' && (
                      <ProgressInputForm
                        studentId={resolveStudentId(selectedStudent)} // <— Pass studentId here
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

                    {viewMode === 'analytics' && (
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

                    {viewMode === 'reports' && (
                      /*
                       * onDownload receives the type string ('hifz-only' | 'full')
                       * from StudentMonthlyReport's two Download buttons,
                       * and passes it straight to handleGenerateReport.
                       */
                      <StudentMonthlyReport
                        studentId={resolveStudentId(selectedStudent)}
                        studentName={resolveStudentName(selectedStudent)}
                        rollNumber={
                          // It's an Enrollment object returned from Teacher API
                          selectedStudent?.rollNumber ||
                          selectedStudent?.currentEnrollment?.rollNumber ||
                          'N/A'
                        }
                        teacherName={
                          // Try looking at classRoom inside Enrollment object
                          selectedStudent?.classRoom?.teacher?.user?.name ||
                          selectedStudent?.currentEnrollment?.classRoom?.teacher?.user?.name ||
                          user?.name ||
                          'N/A'
                        }
                        onDownload={handleGenerateReport}
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