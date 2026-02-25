/* eslint-disable no-unused-vars */
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
  Minus,
} from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================
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

const THEME_LABELS = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  headerBg: "Header BG",
  border: "Border",
  rowAlt: "Row Alt",
};

// ============================================================
// REUSABLE REPORT SECTION ACCORDION
// ============================================================
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
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base truncate">{title}</h3>
            <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mt-0.5 hidden sm:block line-clamp-1">{description}</p>
          </div>
        </div>
        {expandedSection === type
          ? <ChevronUp className="h-4 w-4 text-gray-700 flex-shrink-0 ml-2" />
          : <ChevronDown className="h-4 w-4 text-gray-700 flex-shrink-0 ml-2" />
        }
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
                className="flex-1 min-w-[100px] md:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 rounded-lg border-2 border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activePreview === type && isGenerating
                  ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  : <Eye className="h-3 w-3 md:h-4 md:w-4" />
                }
                Preview
              </button>
            )}
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex-1 min-w-[100px] md:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!activePreview && isGenerating
                ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                : <Download className="h-3 w-3 md:h-4 md:w-4" />
              }
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
);

// ============================================================
// MAIN COMPONENT
// ============================================================
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
    getAllStudents,
    getAllClassrooms,
    getStats,
  } = usePDF();

  const [expandedSection, setExpandedSection] = useState(PDF_TYPES.STUDENT_REPORT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreview, setActivePreview] = useState(null);

  // ---------- Form states ----------
  const [studentReportData, setStudentReportData] = useState({ studentId: "", startDate: "", endDate: "" });
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
    theme: { ...DEFAULT_THEME },
  });

  // ---------- Data states ----------
  const [students, setStudents] = useState([]);
  const [classRooms, setClassRooms] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingClassRooms, setIsLoadingClassRooms] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [classRoomSearchMarkSheet, setClassRoomSearchMarkSheet] = useState("");
  const [classRoomSearchAttendance, setClassRoomSearchAttendance] = useState("");
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, reportsThisMonth: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // ---------- Load initial data ----------
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingStudents(true);
      setIsLoadingClassRooms(true);
      setIsLoadingStats(true);

      try {
        const [studentsResult, classroomsResult, statsResult] = await Promise.allSettled([
          getAllStudents(),
          getAllClassrooms(),
          getStats(),
        ]);

        if (studentsResult.status === "fulfilled") {
          setStudents(Array.isArray(studentsResult.value) ? studentsResult.value : []);
        } else {
          console.error("Students fetch error:", studentsResult.reason);
          setStudents([]);
        }

        if (classroomsResult.status === "fulfilled") {
          setClassRooms(Array.isArray(classroomsResult.value) ? classroomsResult.value : []);
        } else {
          console.error("Classrooms fetch error:", classroomsResult.reason);
          setClassRooms([]);
        }

        if (statsResult.status === "fulfilled") {
          // FIX: getStats() now returns normalized { students, teachers, classes, reportsThisMonth }
          setStats(statsResult.value || { students: 0, teachers: 0, classes: 0, reportsThisMonth: 0 });
        } else {
          console.error("Stats fetch error:", statsResult.reason);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setIsLoadingStudents(false);
        setIsLoadingClassRooms(false);
        setIsLoadingStats(false);
      }
    };

    fetchAll();
  }, [getAllStudents, getAllClassrooms, getStats]);

  const toggleSection = useCallback((section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  // ---------- Field change handlers ----------
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

  // ---------- PDF generation handlers ----------
  const handleGenerateStudentReport = useCallback(async (isPreview = false) => {
    if (!studentReportData.studentId) { toast.error("Please select a student"); return; }
    setIsGenerating(true);
    setActivePreview(isPreview ? PDF_TYPES.STUDENT_REPORT : null);
    clearError();
    try {
      const options = {};
      if (studentReportData.startDate) options.startDate = studentReportData.startDate;
      if (studentReportData.endDate) options.endDate = studentReportData.endDate;
      if (isPreview) {
        await previewStudentReport(studentReportData.studentId, options);
      } else {
        await generateStudentReport(studentReportData.studentId, options);
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
      setActivePreview(null);
    }
  }, [studentReportData, previewStudentReport, generateStudentReport, clearError]);

  const handleGenerateMarkSheet = useCallback(async () => {
    if (!markSheetData.classRoomId) { toast.error("Please select a classroom"); return; }
    if (!markSheetData.examName || !markSheetData.subjectName) { toast.error("Please fill in exam name and subject name"); return; }
    setIsGenerating(true);
    clearError();
    try {
      await generateMarkSheet(markSheetData.classRoomId, {
        examName: markSheetData.examName,
        examDate: markSheetData.examDate,
        subjectName: markSheetData.subjectName,
        ...(markSheetData.totalMarks ? { totalMarks: parseInt(markSheetData.totalMarks) } : {})
      });
    } catch (err) {
      toast.error(err.message || "Failed to generate mark sheet");
    } finally {
      setIsGenerating(false);
    }
  }, [markSheetData, generateMarkSheet, clearError]);

  const handleGenerateAttendanceSheet = useCallback(async () => {
    if (!attendanceSheetData.classRoomId) { toast.error("Please select a classroom"); return; }
    setIsGenerating(true);
    clearError();
    try {
      await generateAttendanceSheet(attendanceSheetData.classRoomId, { date: attendanceSheetData.date });
    } catch (err) {
      toast.error(err.message || "Failed to generate attendance sheet");
    } finally {
      setIsGenerating(false);
    }
  }, [attendanceSheetData, generateAttendanceSheet, clearError]);

  // ---------- Table management ----------
  const addTable = useCallback(() => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: [...prev.tables, {
        id: Date.now(),
        title: "",
        headers: ["Column 1", "Column 2", "Column 3"],
        rows: [["", "", ""]],
        headerColor: prev.theme.primary,
        headerBgColor: prev.theme.headerBg,
        borderColor: prev.theme.border,
        rowColors: ["#ffffff", prev.theme.rowAlt],
        columnWidths: [],
      }],
    }));
  }, []);

  const updateTable = useCallback((tableId, field, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => t.id === tableId ? { ...t, [field]: value } : t),
    }));
  }, []);

  const removeTable = useCallback((tableId) => {
    setCustomPDFData((prev) => ({ ...prev, tables: prev.tables.filter((t) => t.id !== tableId) }));
  }, []);

  const addTableRow = useCallback((tableId) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId ? { ...t, rows: [...t.rows, Array(t.headers.length).fill("")] } : t
      ),
    }));
  }, []);

  const removeTableRow = useCallback((tableId, rowIndex) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId ? { ...t, rows: t.rows.filter((_, i) => i !== rowIndex) } : t
      ),
    }));
  }, []);

  const addTableColumn = useCallback((tableId) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? { ...t, headers: [...t.headers, `Column ${t.headers.length + 1}`], rows: t.rows.map((r) => [...r, ""]) }
          : t
      ),
    }));
  }, []);

  const removeTableColumn = useCallback((tableId, colIndex) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? { ...t, headers: t.headers.filter((_, i) => i !== colIndex), rows: t.rows.map((r) => r.filter((_, i) => i !== colIndex)) }
          : t
      ),
    }));
  }, []);

  const updateTableCell = useCallback((tableId, rowIndex, colIndex, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? { ...t, rows: t.rows.map((r, rIdx) => rIdx === rowIndex ? r.map((c, cIdx) => cIdx === colIndex ? value : c) : r) }
          : t
      ),
    }));
  }, []);

  const updateTableHeader = useCallback((tableId, colIndex, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId ? { ...t, headers: t.headers.map((h, i) => i === colIndex ? value : h) } : t
      ),
    }));
  }, []);

  // ---------- Content management ----------
  const addContentSection = useCallback((type) => {
    setCustomPDFData((prev) => ({
      ...prev,
      content: [...prev.content, {
        id: Date.now(),
        type,
        text: "",
        items: type === "list" ? [""] : undefined,
        size: type === "heading" ? 14 : 10,
        color: type === "heading" ? prev.theme.primary : "#000000",
        align: "left",
      }],
    }));
  }, []);

  const updateContentSection = useCallback((id, field, value) => {
    setCustomPDFData((prev) => ({
      ...prev,
      content: prev.content.map((s) => s.id === id ? { ...s, [field]: value } : s),
    }));
  }, []);

  const removeContentSection = useCallback((id) => {
    setCustomPDFData((prev) => ({ ...prev, content: prev.content.filter((s) => s.id !== id) }));
  }, []);

  const updateTheme = useCallback((colorKey, value) => {
    setCustomPDFData((prev) => ({ ...prev, theme: { ...prev.theme, [colorKey]: value } }));
  }, []);

  // ---------- Custom PDF generate ----------
  const handleGenerateCustomPDF = useCallback(async () => {
    if (!customPDFData.title) { toast.error("Please enter a title"); return; }
    setIsGenerating(true);
    clearError();
    try {
      // FIX: columnWidths are sent as-is; backend will auto-compute if empty/mismatched
      const pdfData = {
        title: customPDFData.title,
        subtitle: customPDFData.subtitle || "",
        orientation: customPDFData.orientation,
        includeDate: customPDFData.includeDate,
        includeHeader: customPDFData.includeHeader,
        includeFooter: customPDFData.includeFooter,
        headerText: customPDFData.title,
        theme: customPDFData.theme,
        // FIX: content blocks are now fully sent and rendered by the backend
        content: customPDFData.content.map((section) => ({
          type: section.type,
          text: section.text || "",
          items: section.items || [],
          size: section.size || (section.type === "heading" ? 14 : 10),
          color: section.color || (section.type === "heading" ? customPDFData.theme.primary : "#000000"),
          align: section.align || "left",
        })),
        // FIX: columnWidths validated before sending — empty array signals backend to auto-compute
        tables: customPDFData.tables.map((table) => {
          const colCount = table.headers.length;
          const validWidths =
            Array.isArray(table.columnWidths) &&
            table.columnWidths.length === colCount &&
            table.columnWidths.every((w) => Number.isFinite(Number(w)) && Number(w) > 0);

          return {
            title: table.title,
            headers: table.headers,
            rows: table.rows.map((row) => {
              // Ensure row length matches headers
              const r = Array.isArray(row) ? row : [];
              while (r.length < colCount) r.push("");
              return r.slice(0, colCount);
            }),
            headerColor: table.headerColor,
            headerBgColor: table.headerBgColor,
            borderColor: table.borderColor,
            rowColors: table.rowColors,
            // Send empty array if invalid — backend auto-calculates
            columnWidths: validWidths ? table.columnWidths.map(Number) : [],
          };
        }),
      };
      await generateCustomPDF(pdfData);
    } catch (err) {
      toast.error(err.message || "Failed to generate custom PDF");
    } finally {
      setIsGenerating(false);
    }
  }, [customPDFData, generateCustomPDF, clearError]);

  // ---------- Filtered data ----------
  const filteredStudents = React.useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter((s) => {
      const name = s.user?.name || s.fullName || s.name || "";
      const adm = s.admissionNo || s.admissionNumber || "";
      const guardian = s.guardianName || s.parentName || "";
      const cls = s.currentEnrollment?.classRoom?.name || "";
      return name.toLowerCase().includes(q) || adm.toLowerCase().includes(q) ||
        guardian.toLowerCase().includes(q) || cls.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  const filteredClassRoomsMarkSheet = React.useMemo(() => {
    if (!classRoomSearchMarkSheet.trim()) return classRooms;
    const q = classRoomSearchMarkSheet.toLowerCase();
    return classRooms.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.grade || "").toLowerCase().includes(q) ||
      (c.type || "").toLowerCase().includes(q) ||
      (c.teacher?.user?.name || c.teacherName || "").toLowerCase().includes(q)
    );
  }, [classRooms, classRoomSearchMarkSheet]);

  const filteredClassRoomsAttendance = React.useMemo(() => {
    if (!classRoomSearchAttendance.trim()) return classRooms;
    const q = classRoomSearchAttendance.toLowerCase();
    return classRooms.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.grade || "").toLowerCase().includes(q) ||
      (c.type || "").toLowerCase().includes(q)
    );
  }, [classRooms, classRoomSearchAttendance]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderStudentReportContent = useCallback(() => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Select Student <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-amber-500">
          <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name, admission number..."
            className="w-full px-3 py-2 text-xs md:text-sm border-0 rounded-lg focus:ring-0"
          />
          {isLoadingStudents && <Loader2 className="h-4 w-4 animate-spin text-amber-600 mr-2" />}
        </div>

        <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          {isLoadingStudents ? (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              {studentSearch ? "No students found" : "No students available"}
            </div>
          ) : (
            filteredStudents.map((student) => {
              const name = student.user?.name || student.fullName || student.name || "Unknown";
              const admNo = student.admissionNo || student.admissionNumber || "N/A";
              const cls = student.currentEnrollment?.classRoom?.name || "N/A";
              const sid = student.id || student._id;
              return (
                <button
                  key={sid}
                  type="button"
                  onClick={() => { handleStudentReportChange("studentId", sid); setStudentSearch(name); }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors ${studentReportData.studentId === sid ? "bg-amber-50 border-l-4 border-amber-500" : ""}`}
                >
                  <div className="font-medium text-gray-900 text-xs md:text-sm truncate">{name}</div>
                  <div className="text-[10px] md:text-xs text-gray-600 mt-0.5">Adm: {admNo} | Class: {cls}</div>
                </button>
              );
            })
          )}
        </div>

        {studentReportData.studentId && (
          <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-green-800">Selected: </span>
              <span className="text-xs text-green-700">
                {(() => {
                  const s = students.find((s) => s.id === studentReportData.studentId || s._id === studentReportData.studentId);
                  return s?.user?.name || s?.fullName || s?.name || "";
                })()}
              </span>
            </div>
            <button onClick={() => { handleStudentReportChange("studentId", ""); setStudentSearch(""); }} className="text-xs text-red-600 hover:text-red-700 ml-2 flex-shrink-0">Clear</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date (Optional)</label>
          <input type="date" value={studentReportData.startDate}
            onChange={(e) => handleStudentReportChange("startDate", e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">End Date (Optional)</label>
          <input type="date" value={studentReportData.endDate}
            onChange={(e) => handleStudentReportChange("endDate", e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>
    </div>
  ), [studentReportData, studentSearch, students, filteredStudents, handleStudentReportChange, isLoadingStudents]);

  const renderClassroomSelector = useCallback(({ value, search, setSearch, onChange, filtered, isLoading, placeholder = "Search classroom..." }) => (
    <div>
      <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-amber-500">
        <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs md:text-sm border-0 rounded-lg focus:ring-0"
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-amber-600 mr-2" />}
      </div>

      <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
        {isLoading ? (
          <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" /><p className="text-xs text-gray-500 mt-2">Loading classrooms...</p></div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">{search ? "No classrooms found" : "No classrooms available"}</div>
        ) : (
          filtered.map((classroom) => {
            const cid = classroom.id || classroom._id;
            const teacherName = classroom.teacher?.user?.name || classroom.teacherName || "N/A";
            return (
              <button
                key={cid}
                type="button"
                onClick={() => { onChange(cid); setSearch(classroom.name || ""); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors ${value === cid ? "bg-amber-50 border-l-4 border-amber-500" : ""}`}
              >
                <div className="font-medium text-gray-900 text-xs md:text-sm">{classroom.name}</div>
                <div className="text-[10px] md:text-xs text-gray-600 mt-0.5">
                  Grade: {classroom.grade || "N/A"} | Type: {classroom.type || "N/A"} | Teacher: {teacherName}
                </div>
              </button>
            );
          })
        )}
      </div>

      {value && (
        <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-green-800">Selected: </span>
            <span className="text-xs text-green-700 truncate">
              {(classRooms.find((c) => c.id === value || c._id === value))?.name || ""}
            </span>
          </div>
          <button onClick={() => { onChange(""); setSearch(""); }} className="text-xs text-red-600 hover:text-red-700 ml-2 flex-shrink-0">Clear</button>
        </div>
      )}
    </div>
  ), [classRooms]);

  const renderMarkSheetContent = useCallback(() => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Select Classroom <span className="text-red-500">*</span></label>
        {renderClassroomSelector({
          value: markSheetData.classRoomId,
          search: classRoomSearchMarkSheet,
          setSearch: setClassRoomSearchMarkSheet,
          onChange: (id) => handleMarkSheetChange("classRoomId", id),
          filtered: filteredClassRoomsMarkSheet,
          isLoading: isLoadingClassRooms,
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Exam Name <span className="text-red-500">*</span></label>
          <input type="text" value={markSheetData.examName} onChange={(e) => handleMarkSheetChange("examName", e.target.value)}
            placeholder="e.g., Mid Term Exam" className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Subject Name <span className="text-red-500">*</span></label>
          <input type="text" value={markSheetData.subjectName} onChange={(e) => handleMarkSheetChange("subjectName", e.target.value)}
            placeholder="e.g., Mathematics" className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Total Marks (Optional)</label>
          <input type="number" value={markSheetData.totalMarks} onChange={(e) => handleMarkSheetChange("totalMarks", e.target.value)}
            placeholder="100" min="1" className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Exam Date</label>
          <input type="date" value={markSheetData.examDate} onChange={(e) => handleMarkSheetChange("examDate", e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>
    </div>
  ), [markSheetData, classRoomSearchMarkSheet, filteredClassRoomsMarkSheet, handleMarkSheetChange, isLoadingClassRooms, renderClassroomSelector]);

  const renderAttendanceSheetContent = useCallback(() => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Select Classroom <span className="text-red-500">*</span></label>
        {renderClassroomSelector({
          value: attendanceSheetData.classRoomId,
          search: classRoomSearchAttendance,
          setSearch: setClassRoomSearchAttendance,
          onChange: (id) => handleAttendanceSheetChange("classRoomId", id),
          filtered: filteredClassRoomsAttendance,
          isLoading: isLoadingClassRooms,
        })}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
        <input type="date" value={attendanceSheetData.date} onChange={(e) => handleAttendanceSheetChange("date", e.target.value)}
          className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
      </div>
    </div>
  ), [attendanceSheetData, classRoomSearchAttendance, filteredClassRoomsAttendance, handleAttendanceSheetChange, isLoadingClassRooms, renderClassroomSelector]);

  // ---- Custom PDF content section renderer ----
  const renderContentBlock = useCallback((section) => {
    const typeLabels = { heading: "Heading", paragraph: "Paragraph", list: "List", divider: "Divider" };
    return (
      <div key={section.id} className="p-3 border-2 border-gray-200 rounded-lg bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              {typeLabels[section.type] || section.type}
            </span>
            {section.type !== "divider" && (
              <>
                <select
                  value={section.align || "left"}
                  onChange={(e) => updateContentSection(section.id, "align", e.target.value)}
                  className="text-[10px] border border-gray-300 rounded px-1 py-0.5"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={section.color || "#000000"}
                    onChange={(e) => updateContentSection(section.id, "color", e.target.value)}
                    title="Text color"
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={section.size || 10}
                    onChange={(e) => updateContentSection(section.id, "size", parseInt(e.target.value))}
                    min="6"
                    max="36"
                    title="Font size"
                    className="w-12 text-[10px] border border-gray-300 rounded px-1 py-0.5"
                  />
                </div>
              </>
            )}
          </div>
          <button onClick={() => removeContentSection(section.id)} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {section.type === "divider" ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs"><Minus className="h-4 w-4" /><span>Horizontal line divider</span></div>
        ) : section.type === "list" ? (
          <div className="space-y-1">
            {(section.items || [""]).map((item, idx) => (
              <div key={idx} className="flex gap-1">
                <span className="text-gray-400 mt-1">•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...(section.items || [""])];
                    newItems[idx] = e.target.value;
                    updateContentSection(section.id, "items", newItems);
                  }}
                  placeholder={`List item ${idx + 1}`}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                />
                <button
                  onClick={() => {
                    const newItems = (section.items || [""]).filter((_, i) => i !== idx);
                    updateContentSection(section.id, "items", newItems.length ? newItems : [""]);
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateContentSection(section.id, "items", [...(section.items || [""]), ""])}
              className="text-xs text-amber-600 hover:text-amber-700 mt-1"
            >
              + Add item
            </button>
          </div>
        ) : (
          <textarea
            value={section.text || ""}
            onChange={(e) => updateContentSection(section.id, "text", e.target.value)}
            placeholder={section.type === "heading" ? "Heading text..." : "Paragraph text..."}
            rows={section.type === "heading" ? 1 : 3}
            className="w-full px-2 py-1.5 text-xs md:text-sm border border-gray-200 rounded resize-none focus:ring-2 focus:ring-amber-500"
          />
        )}
      </div>
    );
  }, [updateContentSection, removeContentSection]);

  const renderCustomPDFContent = useCallback(() => (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input type="text" value={customPDFData.title} onChange={(e) => handleCustomPDFChange("title", e.target.value)}
            placeholder="Document Title" className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
          <input type="text" value={customPDFData.subtitle} onChange={(e) => handleCustomPDFChange("subtitle", e.target.value)}
            placeholder="Optional subtitle" className="w-full px-3 py-2 text-xs md:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>

      {/* Options Row */}
      <div className="flex flex-wrap gap-4 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
        <select value={customPDFData.orientation} onChange={(e) => handleCustomPDFChange("orientation", e.target.value)}
          className="px-3 py-1.5 text-xs border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500">
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
        {[
          { key: "includeDate", label: "Include Date" },
          { key: "includeHeader", label: "Header" },
          { key: "includeFooter", label: "Footer" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={customPDFData[key]}
              onChange={(e) => handleCustomPDFChange(key, e.target.checked)}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {/* Theme Colors */}
      <div className="p-3 md:p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-amber-700" />
          <h4 className="text-xs md:text-sm font-semibold text-amber-900">Theme Colors</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(customPDFData.theme).map(([key, value]) => (
            <div key={key}>
              <label className="block text-[10px] text-gray-600 mb-1">{THEME_LABELS[key] || key}</label>
              <div className="flex items-center gap-1.5">
                <input type="color" value={value} onChange={(e) => updateTheme(key, e.target.value)}
                  className="w-8 h-7 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={value} onChange={(e) => updateTheme(key, e.target.value)}
                  className="flex-1 px-1.5 py-1 text-[10px] border border-gray-300 rounded font-mono" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-gray-700" />
            <span className="text-xs md:text-sm font-medium text-gray-700">Content Blocks</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { type: "heading", label: "Heading" },
              { type: "paragraph", label: "Text" },
              { type: "list", label: "List" },
              { type: "divider", label: "Divider" },
            ].map(({ type, label }) => (
              <button key={type} onClick={() => addContentSection(type)}
                className="px-2 py-1 text-[10px] md:text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 rounded transition-colors">
                + {label}
              </button>
            ))}
          </div>
        </div>

        {customPDFData.content.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {customPDFData.content.map((section) => renderContentBlock(section))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
            No content blocks yet. Add headings, paragraphs, or lists above.
          </div>
        )}
      </div>

      {/* Tables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-gray-700" />
            <span className="text-xs md:text-sm font-medium text-gray-700">Tables</span>
          </div>
          <button onClick={addTable}
            className="px-2.5 py-1 text-[10px] md:text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded flex items-center gap-1 transition-colors">
            <Plus className="h-3 w-3" /> Add Table
          </button>
        </div>

        {customPDFData.tables.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
            No tables yet. Click "Add Table" to create one.
          </div>
        )}

        {customPDFData.tables.map((table, tableIdx) => (
          <div key={table.id} className="p-3 md:p-4 border-2 border-gray-300 rounded-lg mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <input type="text" value={table.title} onChange={(e) => updateTable(table.id, "title", e.target.value)}
                placeholder={`Table ${tableIdx + 1} Title`}
                className="flex-1 px-2 py-1 text-xs md:text-sm border rounded focus:ring-2 focus:ring-amber-500" />
              <button onClick={() => removeTable(table.id)} className="ml-2 text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Table Color Controls */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { key: "headerColor", label: "Header Text" },
                { key: "headerBgColor", label: "Header BG" },
                { key: "borderColor", label: "Border" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-600 block mb-1">{label}</label>
                  <input type="color" value={table[key]} onChange={(e) => updateTable(table.id, key, e.target.value)}
                    className="w-full h-7 rounded border border-gray-300 cursor-pointer" />
                </div>
              ))}
            </div>

            {/* Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] md:text-xs border-collapse">
                <thead>
                  <tr>
                    {table.headers.map((header, colIdx) => (
                      <th key={colIdx} className="border border-gray-300 p-1 bg-gray-200">
                        <input type="text" value={header}
                          onChange={(e) => updateTableHeader(table.id, colIdx, e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] md:text-xs bg-transparent font-medium" />
                        {table.headers.length > 1 && (
                          <button onClick={() => removeTableColumn(table.id, colIdx)}
                            className="text-red-500 hover:text-red-700 text-[9px] block mx-auto mt-0.5">× col</button>
                        )}
                      </th>
                    ))}
                    <th className="border border-gray-300 p-1 bg-gray-200 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="border border-gray-300 p-1">
                          <input type="text" value={cell}
                            onChange={(e) => updateTableCell(table.id, rowIdx, colIdx, e.target.value)}
                            className="w-full px-1 py-0.5 text-[10px] md:text-xs" />
                        </td>
                      ))}
                      <td className="border border-gray-300 p-1 text-center">
                        {table.rows.length > 1 && (
                          <button onClick={() => removeTableRow(table.id, rowIdx)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={() => addTableRow(table.id)}
                className="px-2 py-1 text-[10px] md:text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors">
                + Row
              </button>
              <button onClick={() => addTableColumn(table.id)}
                className="px-2 py-1 text-[10px] md:text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors">
                + Column
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ), [
    customPDFData, handleCustomPDFChange, updateTheme,
    addContentSection, renderContentBlock,
    addTable, updateTable, removeTable,
    addTableRow, removeTableRow, addTableColumn, removeTableColumn,
    updateTableCell, updateTableHeader,
  ]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 p-2 sm:p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 md:p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg md:rounded-xl shadow-lg">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">PDF Reports Generator</h1>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5">Generate professional reports with advanced customization</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="mb-4 p-3 md:p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs md:text-sm font-medium">{progress}</span>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

          {/* Left: Reports */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-3 md:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">Available Reports</h2>
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
                description="Create documents with custom colors, content blocks & tables"
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

          {/* Right: Stats & Info */}
          <div className="space-y-4 md:space-y-6">

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-3 md:p-4 lg:p-6">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
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
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-gray-700" />
                      <span className="text-[10px] md:text-xs font-medium">{label}</span>
                    </div>
                    {isLoadingStats
                      ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-amber-600" />
                      : <span className="text-xs md:text-sm font-bold">{value}</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-200 p-3 md:p-4 lg:p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <BookmarkCheck className="h-4 w-4 md:h-5 md:w-5 text-amber-700" />
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm md:text-base">Tips</h4>
              </div>
              <ul className="space-y-2 text-[10px] sm:text-xs md:text-sm text-amber-800">
                {[
                  "Use date filters for specific periods in progress reports",
                  "Preview reports before downloading",
                  "Custom PDFs support headings, paragraphs, lists & tables",
                  "Column widths auto-calculated if left empty",
                  "Divider blocks add horizontal lines between sections",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 text-amber-600">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
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
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
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
              <Building2 className="h-4 w-4 text-amber-600" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">Jamia Abi Bakar (R.A) - School Management System</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4 text-amber-600" />
              <span className="text-[10px] sm:text-xs md:text-sm">support@jamia.edu.pk</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PDFGenerate;