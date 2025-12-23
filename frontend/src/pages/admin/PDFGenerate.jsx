import React, { useState, useEffect, useCallback, memo } from "react";
import { usePDF } from "../../contexts/PDFContext";
import toast from "react-hot-toast";
import {
  Download,
  FileText,
  Users,
  Calendar,
  UserCheck,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  Printer,
  Filter,
  CalendarDays,
  GraduationCap,
  BookOpen,
  BookmarkCheck,
  Building2,
  Mail,
  ClipboardList,
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  Palette,
  Type,
  Table,
  AlertCircle,
} from "lucide-react";

// Constants for better maintainability
const PDF_TYPES = {
  STUDENT_REPORT: "student-report",
  MARK_SHEET: "mark-sheet",
  ATTENDANCE_SHEET: "attendance-sheet",
  CUSTOM_PDF: "custom-pdf",
};

const DEFAULT_THEME = {
  primary: "#1e3a8a",
  secondary: "#6b7280",
  accent: "#3b82f6",
  headerBg: "#e0e7ff",
  border: "#d1d5db",
  rowAlt: "#f9fafb",
};

const ReportSection = memo(
  ({
    title,
    description,
    type,
    icon: Icon,
    renderContent,
    onGenerate,
    onPreview,
    showPreview = true,
    expandedSection,
    toggleSection,
    isGenerating,
    activePreview,
  }) => (
    <div className="bg-white rounded-lg shadow-md border-2 border-amber-100 overflow-hidden mb-4 hover:border-amber-300 transition-colors">
      <button
        onClick={() => toggleSection(type)}
        className="w-full p-3 md:p-4 flex items-center justify-between hover:bg-amber-50 transition-colors"
        aria-expanded={expandedSection === type}
      >
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-sm flex-shrink-0">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" aria-hidden="true" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base truncate">
              {title}
            </h3>
            <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mt-0.5 md:mt-1 hidden sm:block line-clamp-1">
              {description}
            </p>
          </div>
        </div>
        {expandedSection === type ? (
          <ChevronUp className="h-4 w-4 text-gray-700 flex-shrink-0 ml-2" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-700 flex-shrink-0 ml-2" aria-hidden="true" />
        )}
      </button>

      {expandedSection === type && (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          {renderContent && (
            <div className="mb-3 md:mb-4 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
              {renderContent()}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {showPreview && onPreview && (
              <button
                onClick={onPreview}
                disabled={isGenerating}
                className="flex-1 min-w-[100px] md:min-w-0 inline-flex items-center justify-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 rounded-lg border-2 border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Preview ${title}`}
              >
                {activePreview === type && isGenerating ? (
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Eye className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                )}
                <span className="hidden xs:inline">Preview</span>
                <span className="xs:hidden">View</span>
              </button>
            )}

            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex-1 min-w-[100px] md:min-w-0 inline-flex items-center justify-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Download ${title}`}
            >
              {!activePreview && isGenerating ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              )}
              <span className="hidden xs:inline">Download</span>
              <span className="xs:hidden">Get</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
);

const PDFGenerate = () => {
  const {
    generateStudentReport,
    generateMarkSheet,
    generateAttendanceSheet,
    generateCustomPDF,
    previewStudentReport,
    loading: pdfLoading,
    error,
    progress,
    clearError,
    // Add these methods to your PDFContext
    getAllStudents,
    getAllClassrooms,
    getStats,
  } = usePDF();

  const [expandedSection, setExpandedSection] = useState(PDF_TYPES.STUDENT_REPORT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreview, setActivePreview] = useState(null);

  // Form states
  const [studentReportData, setStudentReportData] = useState({
    studentId: "",
    startDate: "",
    endDate: "",
  });

  const [markSheetData, setMarkSheetData] = useState({
    classRoomId: "",
    examName: "",
    examDate: new Date().toISOString().split("T")[0],
    subjectName: "",
    totalMarks: "",
  });

  const [attendanceSheetData, setAttendanceSheetData] = useState({
    classRoomId: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [customPDFData, setCustomPDFData] = useState({
    title: "",
    subtitle: "",
    orientation: "portrait",
    includeDate: true,
    includeHeader: true,
    includeFooter: true,
    content: [],
    tables: [],
    theme: DEFAULT_THEME,
  });

  // Data fetching states
  const [students, setStudents] = useState([]);
  const [classRooms, setClassRooms] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingClassRooms, setIsLoadingClassRooms] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [classRoomSearchMarkSheet, setClassRoomSearchMarkSheet] = useState("");
  const [classRoomSearchAttendance, setClassRoomSearchAttendance] = useState("");

  // Stats from backend
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    reportsThisMonth: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch all initial data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingStudents(true);
        setIsLoadingClassRooms(true);
        setIsLoadingStats(true);

        // Use the methods from PDFContext instead of direct fetch
        // First, check if these methods exist in your context
        if (getAllStudents && getAllClassrooms && getStats) {
          const [studentsData, classroomsData, statsData] = await Promise.allSettled([
            getAllStudents(),
            getAllClassrooms(),
            getStats(),
          ]);

          // Handle students response
          if (studentsData.status === 'fulfilled') {
            setStudents(Array.isArray(studentsData.value) ? studentsData.value : []);
          } else {
            toast.error('Failed to load students');
            console.error('Students fetch error:', studentsData.reason);
            setStudents([]);
          }

          // Handle classrooms response
          if (classroomsData.status === 'fulfilled') {
            setClassRooms(Array.isArray(classroomsData.value) ? classroomsData.value : []);
          } else {
            toast.error('Failed to load classrooms');
            console.error('Classrooms fetch error:', classroomsData.reason);
            setClassRooms([]);
          }

          // Handle stats response
          if (statsData.status === 'fulfilled') {
            setStats(statsData.value || {
              students: 0,
              teachers: 0,
              classes: 0,
              reportsThisMonth: 0,
            });
          } else {
            console.error('Stats fetch error:', statsData.reason);
            setStats({
              students: 0,
              teachers: 0,
              classes: 0,
              reportsThisMonth: 0,
            });
          }
        } else {
          // If context methods don't exist, show a message
          toast.error('Data fetching methods not available');
          console.error('PDF Context methods missing');
        }

      } catch (error) {
        toast.error('Failed to load initial data');
        console.error('Error fetching initial data:', error);
        setStudents([]);
        setClassRooms([]);
      } finally {
        setIsLoadingStudents(false);
        setIsLoadingClassRooms(false);
        setIsLoadingStats(false);
      }
    };

    fetchAllData();
  }, [getAllStudents, getAllClassrooms, getStats]);

  const toggleSection = useCallback((section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  // State update handlers
  const handleStudentReportChange = useCallback((field, value) => {
    setStudentReportData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMarkSheetChange = useCallback((field, value) => {
    setMarkSheetData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAttendanceSheetChange = useCallback((field, value) => {
    setAttendanceSheetData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCustomPDFChange = useCallback((field, value) => {
    setCustomPDFData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle Student Progress Report
  const handleGenerateStudentReport = useCallback(
    async (isPreview = false) => {
      if (!studentReportData.studentId) {
        toast.error("Please select a student");
        return;
      }

      setIsGenerating(true);
      setActivePreview(isPreview ? PDF_TYPES.STUDENT_REPORT : null);
      clearError();

      try {
        const options = {};
        if (studentReportData.startDate) options.startDate = studentReportData.startDate;
        if (studentReportData.endDate) options.endDate = studentReportData.endDate;

        if (isPreview) {
          await previewStudentReport(studentReportData.studentId, options);
          toast.success("Preview opened in new tab!");
        } else {
          await generateStudentReport(studentReportData.studentId, options);
        }
      } catch (err) {
        toast.error(err.message || "Failed to generate report");
      } finally {
        setIsGenerating(false);
        setActivePreview(null);
      }
    },
    [studentReportData, previewStudentReport, generateStudentReport, clearError]
  );

  // Handle Exam Mark Sheet
  const handleGenerateMarkSheet = useCallback(async () => {
    if (!markSheetData.classRoomId) {
      toast.error("Please select a classroom");
      return;
    }
    if (!markSheetData.examName || !markSheetData.subjectName) {
      toast.error("Please fill in exam name and subject name");
      return;
    }

    setIsGenerating(true);
    clearError();

    try {
      const options = {
        examName: markSheetData.examName,
        examDate: markSheetData.examDate,
        subjectName: markSheetData.subjectName,
      };
      if (markSheetData.totalMarks) {
        options.totalMarks = parseInt(markSheetData.totalMarks);
      }

      await generateMarkSheet(markSheetData.classRoomId, options);
      toast.success("Mark sheet generated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to generate mark sheet");
    } finally {
      setIsGenerating(false);
    }
  }, [markSheetData, generateMarkSheet, clearError]);

  // Handle Attendance Sheet
  const handleGenerateAttendanceSheet = useCallback(async () => {
    if (!attendanceSheetData.classRoomId) {
      toast.error("Please select a classroom");
      return;
    }

    setIsGenerating(true);
    clearError();

    try {
      await generateAttendanceSheet(attendanceSheetData.classRoomId, {
        date: attendanceSheetData.date,
      });
    } catch (err) {
      toast.error(err.message || "Failed to generate attendance sheet");
    } finally {
      setIsGenerating(false);
    }
  }, [attendanceSheetData, generateAttendanceSheet, clearError]);

  // Table management for custom PDF
  const addTable = useCallback(() => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: [
        ...prev.tables,
        {
          id: Date.now(),
          title: "",
          headers: ["Column 1", "Column 2", "Column 3"],
          rows: [["", "", ""]],
          headerColor: prev.theme.primary,
          headerBgColor: prev.theme.headerBg,
          borderColor: prev.theme.border,
          rowColors: ["#ffffff", prev.theme.rowAlt],
          columnWidths: [],
        },
      ],
    }));
  }, []);

  const updateTable = useCallback((tableId, field, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId ? { ...table, [field]: value } : table
      ),
    }));
  }, []);

  const addTableRow = useCallback((tableId) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              rows: [...table.rows, Array(table.headers.length).fill("")],
            }
          : table
      ),
    }));
  }, []);

  const addTableColumn = useCallback((tableId) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              headers: [...table.headers, `Column ${table.headers.length + 1}`],
              rows: table.rows.map((row) => [...row, ""]),
            }
          : table
      ),
    }));
  }, []);

  const updateTableCell = useCallback((tableId, rowIndex, colIndex, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              rows: table.rows.map((row, rIdx) =>
                rIdx === rowIndex
                  ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
                  : row
              ),
            }
          : table
      ),
    }));
  }, []);

  const updateTableHeader = useCallback((tableId, colIndex, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              headers: table.headers.map((header, idx) =>
                idx === colIndex ? value : header
              ),
            }
          : table
      ),
    }));
  }, []);

  const removeTable = useCallback((tableId) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.filter((table) => table.id !== tableId),
    }));
  }, []);

  const removeTableRow = useCallback((tableId, rowIndex) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? { ...table, rows: table.rows.filter((_, idx) => idx !== rowIndex) }
          : table
      ),
    }));
  }, []);

  const removeTableColumn = useCallback((tableId, colIndex) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              headers: table.headers.filter((_, idx) => idx !== colIndex),
              rows: table.rows.map((row) =>
                row.filter((_, idx) => idx !== colIndex)
              ),
            }
          : table
      ),
    }));
  }, []);

  // Content management
  const addContentSection = useCallback((type) => {
    setCustomPDFData((prev) => ({
      ...prev,
      content: [
        ...prev.content,
        {
          id: Date.now(),
          type,
          text: "",
          items: type === "list" ? [""] : undefined,
          size: type === "heading" ? 14 : 10,
          color: type === "heading" ? prev.theme.primary : "#000000",
          align: "left",
        },
      ],
    }));
  }, []);

  const updateContentSection = useCallback((id, field, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      content: prev.content.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      ),
    }));
  }, []);

  const removeContentSection = useCallback((id) => {
    setCustomPDFData((prev) => ({
      ...prev,
      content: prev.content.filter((section) => section.id !== id),
    }));
  }, []);

  const updateTheme = useCallback((colorKey, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      theme: { ...prev.theme, [colorKey]: value },
    }));
  }, []);

  // Handle Custom PDF
  const handleGenerateCustomPDF = useCallback(async () => {
    if (!customPDFData.title) {
      toast.error("Please enter a title");
      return;
    }

    setIsGenerating(true);
    clearError();

    try {
      const pdfData = {
        title: customPDFData.title,
        subtitle: customPDFData.subtitle || "",
        orientation: customPDFData.orientation,
        includeDate: customPDFData.includeDate,
        includeHeader: customPDFData.includeHeader,
        includeFooter: customPDFData.includeFooter,
        headerText: customPDFData.title,
        theme: customPDFData.theme,
        content: customPDFData.content.map((section) => ({
          type: section.type,
          text: section.text || "",
          items: section.items || [],
          size: section.size || (section.type === "heading" ? 14 : 10),
          color:
            section.color ||
            (section.type === "heading"
              ? customPDFData.theme.primary
              : "#000000"),
          align: section.align || "left",
        })),
        tables: customPDFData.tables.map((table) => ({
          title: table.title,
          headers: table.headers,
          rows: table.rows,
          headerColor: table.headerColor,
          headerBgColor: table.headerBgColor,
          borderColor: table.borderColor,
          rowColors: table.rowColors,
          columnWidths: table.columnWidths,
        })),
      };

      await generateCustomPDF(pdfData);
    } catch (err) {
      toast.error(err.message || "Failed to generate custom PDF");
    } finally {
      setIsGenerating(false);
    }
  }, [customPDFData, generateCustomPDF, clearError]);

  // Filtered data calculations
  const filteredStudents = React.useMemo(() => {
    const studentArray = Array.isArray(students) ? students : [];
    if (!studentSearch.trim()) return studentArray;

    const searchTerm = studentSearch.toLowerCase();
    return studentArray.filter((student) => {
      const studentName =
        student.user?.name || student.fullName || student.name || "";
      const admissionNo = student.admissionNo || student.admissionNumber || "";
      const guardianName = student.guardianName || student.parentName || "";

      return (
        studentName.toLowerCase().includes(searchTerm) ||
        admissionNo.toLowerCase().includes(searchTerm) ||
        guardianName.toLowerCase().includes(searchTerm) ||
        (student.currentEnrollment?.classRoom?.name || "")
          .toLowerCase()
          .includes(searchTerm)
      );
    });
  }, [students, studentSearch]);

  const filteredClassRoomsMarkSheet = React.useMemo(() => {
    const classArray = Array.isArray(classRooms) ? classRooms : [];
    if (!classRoomSearchMarkSheet.trim()) return classArray;

    const searchTerm = classRoomSearchMarkSheet.toLowerCase();
    return classArray.filter((classroom) => {
      const className = classroom.name || "";
      const grade = classroom.grade || classroom.gradeLevel || "";
      const type = classroom.type || classroom.classType || "";
      const teacherName =
        classroom.teacher?.user?.name || classroom.teacherName || "";

      return (
        className.toLowerCase().includes(searchTerm) ||
        grade.toLowerCase().includes(searchTerm) ||
        type.toLowerCase().includes(searchTerm) ||
        teacherName.toLowerCase().includes(searchTerm)
      );
    });
  }, [classRooms, classRoomSearchMarkSheet]);

  const filteredClassRoomsAttendance = React.useMemo(() => {
    const classArray = Array.isArray(classRooms) ? classRooms : [];
    if (!classRoomSearchAttendance.trim()) return classArray;

    const searchTerm = classRoomSearchAttendance.toLowerCase();
    return classArray.filter((classroom) => {
      const className = classroom.name || "";
      const grade = classroom.grade || classroom.gradeLevel || "";
      const type = classroom.type || classroom.classType || "";

      return (
        className.toLowerCase().includes(searchTerm) ||
        grade.toLowerCase().includes(searchTerm) ||
        type.toLowerCase().includes(searchTerm)
      );
    });
  }, [classRooms, classRoomSearchAttendance]);

  // Render functions for each section
  const renderStudentReportContent = useCallback(
    () => (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Student <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500">
              <Search className="h-4 w-4 text-gray-400 ml-2 md:ml-3 flex-shrink-0" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name, admission number..."
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-0 rounded-lg focus:ring-0"
              />
              {isLoadingStudents && (
                <Loader2 className="h-4 w-4 animate-spin text-amber-600 mr-2" />
              )}
            </div>

            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {isLoadingStudents ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">
                    Loading students...
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-3 md:p-4 text-center text-gray-500 text-xs">
                  {studentSearch
                    ? "No students found"
                    : "No students available"}
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const studentName =
                    student.user?.name ||
                    student.fullName ||
                    student.name ||
                    "Unknown";
                  const admissionNo =
                    student.admissionNo || student.admissionNumber || "N/A";
                  const className =
                    student.currentEnrollment?.classRoom?.name || "N/A";

                  return (
                    <button
                      key={student.id || student._id}
                      type="button"
                      onClick={() => {
                        handleStudentReportChange(
                          "studentId",
                          student.id || student._id
                        );
                        setStudentSearch(studentName);
                      }}
                      className={`w-full text-left px-3 md:px-4 py-2 md:py-3 hover:bg-amber-50 transition-colors ${
                        studentReportData.studentId ===
                        (student.id || student._id)
                          ? "bg-amber-50 border-l-4 border-amber-500"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-xs md:text-sm truncate">
                        {studentName}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600 mt-1 truncate">
                        Adm: {admissionNo} | Class: {className}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {studentReportData.studentId && (
            <div className="mt-2 p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-green-800">
                    Selected:
                  </span>
                  <p className="text-xs text-green-700 truncate">
                    {(() => {
                      const student = students.find(
                        (s) =>
                          s.id === studentReportData.studentId ||
                          s._id === studentReportData.studentId
                      );
                      return (
                        student?.user?.name ||
                        student?.fullName ||
                        student?.name ||
                        ""
                      );
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleStudentReportChange("studentId", "");
                    setStudentSearch("");
                  }}
                  className="text-xs text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={studentReportData.startDate}
              onChange={(e) =>
                handleStudentReportChange("startDate", e.target.value)
              }
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={studentReportData.endDate}
              onChange={(e) =>
                handleStudentReportChange("endDate", e.target.value)
              }
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
      </div>
    ),
    [
      studentReportData,
      studentSearch,
      students,
      filteredStudents,
      handleStudentReportChange,
      isLoadingStudents,
    ]
  );

  const renderMarkSheetContent = useCallback(
    () => (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Classroom <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-amber-500">
              <Search className="h-4 w-4 text-gray-400 ml-2 md:ml-3 flex-shrink-0" />
              <input
                type="text"
                value={classRoomSearchMarkSheet}
                onChange={(e) => setClassRoomSearchMarkSheet(e.target.value)}
                placeholder="Search classroom by name, grade..."
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-0 rounded-lg focus:ring-0"
              />
              {isLoadingClassRooms && (
                <Loader2 className="h-4 w-4 animate-spin text-amber-600 mr-2" />
              )}
            </div>

            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {isLoadingClassRooms ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">
                    Loading classrooms...
                  </p>
                </div>
              ) : filteredClassRoomsMarkSheet.length === 0 ? (
                <div className="p-3 md:p-4 text-center text-gray-500 text-xs">
                  {classRoomSearchMarkSheet
                    ? "No classrooms found"
                    : "No classrooms available"}
                </div>
              ) : (
                filteredClassRoomsMarkSheet.map((classroom) => {
                  const className = classroom.name || "";
                  const grade = classroom.grade || classroom.gradeLevel || "";
                  const type = classroom.type || classroom.classType || "";
                  const teacherName =
                    classroom.teacher?.user?.name ||
                    classroom.teacherName ||
                    "N/A";

                  return (
                    <button
                      key={classroom.id || classroom._id}
                      type="button"
                      onClick={() => {
                        handleMarkSheetChange(
                          "classRoomId",
                          classroom.id || classroom._id
                        );
                        setClassRoomSearchMarkSheet(className);
                      }}
                      className={`w-full text-left px-3 md:px-4 py-2 md:py-3 hover:bg-amber-50 transition-colors ${
                        markSheetData.classRoomId ===
                        (classroom.id || classroom._id)
                          ? "bg-amber-50 border-l-4 border-amber-500"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-xs md:text-sm">
                        {className}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600 mt-1">
                        Grade: {grade} | Type: {type} | Teacher: {teacherName}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {markSheetData.classRoomId && (
            <div className="mt-2 p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-green-800">
                    Selected:
                  </span>
                  <p className="text-xs text-green-700 truncate">
                    {(() => {
                      const classroom = classRooms.find(
                        (c) =>
                          c.id === markSheetData.classRoomId ||
                          c._id === markSheetData.classRoomId
                      );
                      return classroom?.name || "";
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleMarkSheetChange("classRoomId", "");
                    setClassRoomSearchMarkSheet("");
                  }}
                  className="text-xs text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Exam Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={markSheetData.examName}
              onChange={(e) =>
                handleMarkSheetChange("examName", e.target.value)
              }
              placeholder="e.g., Mid Term Exam"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={markSheetData.subjectName}
              onChange={(e) =>
                handleMarkSheetChange("subjectName", e.target.value)
              }
              placeholder="e.g., Mathematics"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Total Marks (Optional)
            </label>
            <input
              type="number"
              value={markSheetData.totalMarks}
              onChange={(e) =>
                handleMarkSheetChange("totalMarks", e.target.value)
              }
              placeholder="100"
              min="1"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Exam Date
            </label>
            <input
              type="date"
              value={markSheetData.examDate}
              onChange={(e) =>
                handleMarkSheetChange("examDate", e.target.value)
              }
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>
    ),
    [
      markSheetData,
      classRoomSearchMarkSheet,
      classRooms,
      filteredClassRoomsMarkSheet,
      handleMarkSheetChange,
      isLoadingClassRooms,
    ]
  );

  const renderAttendanceSheetContent = useCallback(
    () => (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Classroom <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-amber-500">
              <Search className="h-4 w-4 text-gray-400 ml-2 md:ml-3 flex-shrink-0" />
              <input
                type="text"
                value={classRoomSearchAttendance}
                onChange={(e) => setClassRoomSearchAttendance(e.target.value)}
                placeholder="Search classroom by name, grade..."
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-0 rounded-lg focus:ring-0"
              />
              {isLoadingClassRooms && (
                <Loader2 className="h-4 w-4 animate-spin text-amber-600 mr-2" />
              )}
            </div>

            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {isLoadingClassRooms ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">
                    Loading classrooms...
                  </p>
                </div>
              ) : filteredClassRoomsAttendance.length === 0 ? (
                <div className="p-3 md:p-4 text-center text-gray-500 text-xs">
                  {classRoomSearchAttendance
                    ? "No classrooms found"
                    : "No classrooms available"}
                </div>
              ) : (
                filteredClassRoomsAttendance.map((classroom) => {
                  const className = classroom.name || "";
                  const grade = classroom.grade || classroom.gradeLevel || "";
                  const type = classroom.type || classroom.classType || "";

                  return (
                    <button
                      key={classroom.id || classroom._id}
                      type="button"
                      onClick={() => {
                        handleAttendanceSheetChange(
                          "classRoomId",
                          classroom.id || classroom._id
                        );
                        setClassRoomSearchAttendance(className);
                      }}
                      className={`w-full text-left px-3 md:px-4 py-2 md:py-3 hover:bg-amber-50 transition-colors ${
                        attendanceSheetData.classRoomId ===
                        (classroom.id || classroom._id)
                          ? "bg-amber-50 border-l-4 border-amber-500"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-xs md:text-sm">
                        {className}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600 mt-1">
                        Grade: {grade} | Type: {type}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {attendanceSheetData.classRoomId && (
            <div className="mt-2 p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-green-800">
                    Selected:
                  </span>
                  <p className="text-xs text-green-700 truncate">
                    {(() => {
                      const classroom = classRooms.find(
                        (c) =>
                          c.id === attendanceSheetData.classRoomId ||
                          c._id === attendanceSheetData.classRoomId
                      );
                      return classroom?.name || "";
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleAttendanceSheetChange("classRoomId", "");
                    setClassRoomSearchAttendance("");
                  }}
                  className="text-xs text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={attendanceSheetData.date}
            onChange={(e) =>
              handleAttendanceSheetChange("date", e.target.value)
            }
            className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>
    ),
    [
      attendanceSheetData,
      classRoomSearchAttendance,
      classRooms,
      filteredClassRoomsAttendance,
      handleAttendanceSheetChange,
      isLoadingClassRooms,
    ]
  );

  const renderCustomPDFContent = useCallback(
    () => (
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customPDFData.title}
              onChange={(e) => handleCustomPDFChange("title", e.target.value)}
              placeholder="Document Title"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={customPDFData.subtitle}
              onChange={(e) =>
                handleCustomPDFChange("subtitle", e.target.value)
              }
              placeholder="Subtitle"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Theme Colors */}
        <div className="p-3 md:p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-amber-700" />
            <h4 className="text-xs md:text-sm font-semibold text-amber-900">
              Theme Colors
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(customPDFData.theme).map(([key, value]) => (
              <div key={key}>
                <label className="block text-[10px] md:text-xs text-gray-700 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
                <div className="flex items-center gap-1 md:gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => updateTheme(key, e.target.value)}
                    className="w-8 h-6 md:w-10 md:h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateTheme(key, e.target.value)}
                    className="flex-1 px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs border border-gray-300 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Type className="h-3 w-3 md:h-4 md:w-4 text-gray-700" />
              <label className="text-xs md:text-sm font-medium text-gray-700">
                Content
              </label>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => addContentSection("heading")}
                className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-amber-100 hover:bg-amber-200 rounded"
              >
                + Heading
              </button>
              <button
                onClick={() => addContentSection("paragraph")}
                className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-amber-100 hover:bg-amber-200 rounded"
              >
                + Text
              </button>
              <button
                onClick={() => addContentSection("list")}
                className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-amber-100 hover:bg-amber-200 rounded"
              >
                + List
              </button>
            </div>
          </div>

          {customPDFData.content.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customPDFData.content.map((section) => (
                <div
                  key={section.id}
                  className="p-2 md:p-3 border-2 border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] md:text-xs font-medium uppercase">
                      {section.type}
                    </span>
                    <button
                      onClick={() => removeContentSection(section.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <textarea
                    value={
                      section.type === "list"
                        ? section.items?.join("\n")
                        : section.text
                    }
                    onChange={(e) =>
                      updateContentSection(
                        section.id,
                        section.type === "list" ? "items" : "text",
                        section.type === "list"
                          ? e.target.value.split("\n")
                          : e.target.value
                      )
                    }
                    className="w-full px-2 py-1 text-xs md:text-sm border rounded"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Table className="h-3 w-3 md:h-4 md:w-4 text-gray-700" />
              <label className="text-xs md:text-sm font-medium text-gray-700">
                Tables
              </label>
            </div>
            <button
              onClick={addTable}
              className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-green-100 hover:bg-green-200 rounded flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Table
            </button>
          </div>

          {customPDFData.tables.map((table) => (
            <div
              key={table.id}
              className="p-3 md:p-4 border-2 border-gray-300 rounded-lg mb-3 bg-gray-50"
            >
              <div className="flex justify-between items-center mb-3">
                <input
                  type="text"
                  value={table.title}
                  onChange={(e) =>
                    updateTable(table.id, "title", e.target.value)
                  }
                  placeholder="Table Title"
                  className="flex-1 px-2 py-1 text-xs md:text-sm border rounded"
                />
                <button
                  onClick={() => removeTable(table.id)}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Color Controls */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] md:text-xs text-gray-600">
                    Header Color
                  </label>
                  <input
                    type="color"
                    value={table.headerColor}
                    onChange={(e) =>
                      updateTable(table.id, "headerColor", e.target.value)
                    }
                    className="w-full h-6 md:h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="text-[10px] md:text-xs text-gray-600">
                    Header BG
                  </label>
                  <input
                    type="color"
                    value={table.headerBgColor}
                    onChange={(e) =>
                      updateTable(table.id, "headerBgColor", e.target.value)
                    }
                    className="w-full h-6 md:h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="text-[10px] md:text-xs text-gray-600">
                    Border
                  </label>
                  <input
                    type="color"
                    value={table.borderColor}
                    onChange={(e) =>
                      updateTable(table.id, "borderColor", e.target.value)
                    }
                    className="w-full h-6 md:h-8 rounded border"
                  />
                </div>
              </div>

              {/* Table Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr>
                      {table.headers.map((header, colIdx) => (
                        <th key={colIdx} className="border p-1 bg-gray-200">
                          <input
                            type="text"
                            value={header}
                            onChange={(e) =>
                              updateTableHeader(
                                table.id,
                                colIdx,
                                e.target.value
                              )
                            }
                            className="w-full px-1 py-0.5 text-[10px] md:text-xs"
                          />
                          <button
                            onClick={() => removeTableColumn(table.id, colIdx)}
                            className="text-red-500 text-xs"
                          >
                            ×
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} className="border p-1">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) =>
                                updateTableCell(
                                  table.id,
                                  rowIdx,
                                  colIdx,
                                  e.target.value
                                )
                              }
                              className="w-full px-1 py-0.5 text-[10px] md:text-xs"
                            />
                          </td>
                        ))}
                        <td className="border p-1">
                          <button
                            onClick={() => removeTableRow(table.id, rowIdx)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => addTableRow(table.id)}
                  className="px-2 py-1 text-[10px] md:text-xs bg-blue-100 hover:bg-blue-200 rounded"
                >
                  + Row
                </button>
                <button
                  onClick={() => addTableColumn(table.id)}
                  className="px-2 py-1 text-[10px] md:text-xs bg-blue-100 hover:bg-blue-200 rounded"
                >
                  + Column
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-3 md:gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={customPDFData.includeDate}
              onChange={(e) =>
                handleCustomPDFChange("includeDate", e.target.checked)
              }
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-xs font-medium">Include Date</span>
          </label>

          <select
            value={customPDFData.orientation}
            onChange={(e) =>
              handleCustomPDFChange("orientation", e.target.value)
            }
            className="px-2 md:px-3 py-1 text-xs border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
    ),
    [
      customPDFData,
      addContentSection,
      removeContentSection,
      updateContentSection,
      addTable,
      updateTable,
      addTableRow,
      addTableColumn,
      updateTableCell,
      updateTableHeader,
      removeTable,
      removeTableRow,
      removeTableColumn,
      updateTheme,
      handleCustomPDFChange,
    ]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 p-2 sm:p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3 mb-3">
            <div className="p-2 md:p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg md:rounded-xl shadow-lg">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-9 lg:w-9 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                PDF Reports Generator
              </h1>
              <p className="text-gray-600 text-[10px] xs:text-xs sm:text-sm md:text-base mt-0.5 md:mt-1">
                Generate professional reports with advanced customization
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-3 md:mb-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-xs md:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {progress && (
          <div className="mb-3 md:mb-4 p-3 md:p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span className="text-xs md:text-sm font-medium">{progress}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Reports */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-3 md:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-amber-600" aria-hidden="true" />
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
                  Available Reports
                </h2>
              </div>

              <ReportSection
                title="Student Progress Report"
                description="Comprehensive student report with attendance and progress"
                type={PDF_TYPES.STUDENT_REPORT}
                icon={GraduationCap}
                showPreview={true}
                onGenerate={() => handleGenerateStudentReport(false)}
                onPreview={() => handleGenerateStudentReport(true)}
                renderContent={renderStudentReportContent}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
                isGenerating={isGenerating || pdfLoading}
                activePreview={activePreview}
              />

              <ReportSection
                title="Exam Mark Sheet"
                description="Generate blank mark sheets for manual marking"
                type={PDF_TYPES.MARK_SHEET}
                icon={FileSpreadsheet}
                showPreview={false}
                onGenerate={handleGenerateMarkSheet}
                renderContent={renderMarkSheetContent}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
                isGenerating={isGenerating || pdfLoading}
                activePreview={activePreview}
              />

              <ReportSection
                title="Attendance Sheet"
                description="Generate attendance sheets for manual marking"
                type={PDF_TYPES.ATTENDANCE_SHEET}
                icon={ClipboardList}
                showPreview={false}
                onGenerate={handleGenerateAttendanceSheet}
                renderContent={renderAttendanceSheetContent}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
                isGenerating={isGenerating || pdfLoading}
                activePreview={activePreview}
              />

              <ReportSection
                title="Custom PDF with Tables"
                description="Create documents with custom colors, tables & formatting"
                type={PDF_TYPES.CUSTOM_PDF}
                icon={FileEdit}
                showPreview={false}
                onGenerate={handleGenerateCustomPDF}
                renderContent={renderCustomPDFContent}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
                isGenerating={isGenerating || pdfLoading}
                activePreview={activePreview}
              />
            </div>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-4 md:space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-3 md:p-4 lg:p-6">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-amber-600" aria-hidden="true" />
                Statistics
              </h3>
              <div className="space-y-2 md:space-y-3">
                {[
                  { label: "Students", value: stats.students, icon: Users },
                  { label: "Teachers", value: stats.teachers, icon: UserCheck },
                  { label: "Classes", value: stats.classes, icon: Building2 },
                  { label: "Reports This Month", value: stats.reportsThisMonth, icon: CalendarDays },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-2 md:p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-gray-700" aria-hidden="true" />
                      <span className="text-[10px] md:text-xs font-medium">{label}</span>
                    </div>
                    {isLoadingStats ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-amber-600" aria-hidden="true" />
                    ) : (
                      <span className="text-xs md:text-sm font-bold">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-200 p-3 md:p-4 lg:p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <BookmarkCheck className="h-4 w-4 md:h-5 md:w-5 text-amber-700" aria-hidden="true" />
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm md:text-base">Tips</h4>
              </div>
              <ul className="space-y-2 text-[10px] sm:text-xs md:text-sm text-amber-800">
                {[
                  "Use date filters for specific periods in progress reports",
                  "Preview reports before downloading",
                  "Mark sheets auto-calculate totals",
                  "Custom PDFs support tables & colors",
                ].map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features Card */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-3 md:p-4 lg:p-6">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-base mb-3 md:mb-4">Features</h3>
              <div className="space-y-2 md:space-y-3">
                {[
                  { title: "Live Preview", description: "View before download", icon: Eye },
                  { title: "Instant Download", description: "Direct PDF download", icon: Download },
                  { title: "Print Ready", description: "Optimized for printing", icon: Printer },
                  { title: "Flexible Filters", description: "Customize data", icon: Filter },
                ].map(({ title, description, icon: Icon }) => (
                  <div key={title} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="p-1.5 md:p-2 bg-amber-100 rounded-lg">
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-amber-600" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs font-medium">{title}</div>
                      <div className="text-[10px] md:text-xs text-gray-600">{description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-amber-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Building2 className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">
                Jamia Abi Bakar (R.A) - School Management System
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs md:text-sm">support@jamia.edu.pk</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFGenerate;