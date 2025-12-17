/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAttendance } from '../../contexts/AttendanceContext';
import {
  Search,
  Users,
  UserCheck,
  XCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Download,
  Printer,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  AlertCircle,
  Save,
  BookOpen,
  Filter,
  BookMarked,
  Book,
  ChevronRight,
  CheckSquare,
  Edit,
  RefreshCw,
  Zap,
  Users as UsersIcon,
} from 'lucide-react';

const MyClasses = () => {
  const {
    students,
    classes,
    loading,
    fetchMyStudents,
    fetchMyClasses,
    fetchMySubjects
  } = useTeacher();

  const {
    markAttendance,
    remarkAttendance,
    fetchAttendance,
    loading: attendanceLoading
  } = useAttendance();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('list');
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('PRESENT');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isWholeClassMode, setIsWholeClassMode] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Ensure classes is always an array
  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  
  // Get selected class data
  const selectedClassData = classList.find(cls => cls.id === selectedClass);

  // Check if class is HIFZ or NAZRA (case insensitive)
  const isSpecialClass = selectedClassData?.type?.toUpperCase().includes('HIFZ') || 
                        selectedClassData?.type?.toUpperCase().includes('NAZRA');
  
  // Check if subject selection is required
  const isSubjectRequired = selectedClassData?.type === 'REGULAR' && !isSpecialClass;

  useEffect(() => {
    fetchMyClasses();
    fetchMySubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchMyStudents({ classRoomId: selectedClass });
      if (!isSpecialClass) {
        loadClassSubjects();
      }
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && (isSpecialClass || selectedSubject || isWholeClassMode)) {
      loadExistingAttendance();
    }
  }, [selectedClass, selectedSubject, attendanceDate, isWholeClassMode]);

  const loadClassSubjects = async () => {
    if (!selectedClassData || isSpecialClass) return;

    try {
      const teacherSubjects = await fetchMySubjects();
      const classSubjects = teacherSubjects.subjects?.filter(subject => 
        subject.classRoom?.id === selectedClass
      ) || [];
      
      setSubjects(classSubjects);
      
      // Auto-select first subject if none selected and subject is required
      if (classSubjects.length > 0 && !selectedSubject && isSubjectRequired && !isWholeClassMode) {
        setSelectedSubject(classSubjects[0].id);
      }
    } catch (error) {
      console.error('Error loading class subjects:', error);
      setSubjects([]);
    }
  };

  const loadExistingAttendance = async () => {
  if (!selectedClass) return;

  try {
    const filters = {
      classRoomId: selectedClass,
      date: attendanceDate
    };

    // Add isWholeClass parameter
    if (isWholeClassMode && !isSpecialClass) {
      filters.isWholeClass = true;
    }

    // Only add subjectId if NOT in whole-class mode for REGULAR classes
    if (!isWholeClassMode && !isSpecialClass && selectedSubject) {
      filters.subjectId = selectedSubject;
    }

    const attendanceData = await fetchAttendance(filters);
    
    // Convert existing attendance to a more accessible format
    const attendanceMap = {};
    
    // Process marked attendance
    attendanceData.attendance?.forEach(record => {
      const key = isWholeClassMode ? 
        `${record.studentId}_${record.subjectId || 'general'}` : 
        `${record.studentId}_${selectedSubject || 'general'}`;
      
      attendanceMap[key] = {
        status: record.status,
        remarks: record.remarks || '',
        id: record.id,
        subjectId: record.subjectId,
        date: record.date
      };
    });
    
    // Process unmarked students
    attendanceData.unmarkedStudents?.forEach(student => {
      const key = isWholeClassMode ? 
        `${student.studentId}_general` : 
        `${student.studentId}_${selectedSubject || 'general'}`;
      
      if (!attendanceMap[key]) {
        attendanceMap[key] = {
          status: 'NOT_MARKED',
          remarks: '',
          id: null,
          subjectId: isWholeClassMode ? null : selectedSubject,
          date: attendanceDate
        };
      }
    });

    setExistingAttendance(attendanceMap);
  } catch (error) {
    console.error('Error loading existing attendance:', error);
    console.error('Error details:', error.response?.data);
    setExistingAttendance({});
  }
};

  // Ensure students is always an array
  const studentList = Array.isArray(students) ? students : (students?.students || []);

  const filteredStudents = studentList.filter(student => {
    const matchesSearch = student.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber?.toString().includes(searchTerm);
    const matchesClass = !selectedClass || student.classRoom?.id === selectedClass;
    return matchesSearch && matchesClass;
  });

  const handleAttendanceChange = (studentId, status, remarks = '') => {
    const key = isWholeClassMode ? 
      `${studentId}_general` : 
      `${studentId}_${selectedSubject || 'general'}`;
    
    setAttendanceStatus(prev => ({
      ...prev,
      [key]: { 
        studentId,
        status, 
        remarks, 
        timestamp: new Date(),
        studentName: studentList.find(s => s.student?.id === studentId)?.student?.user?.name || 'Unknown',
        existingRecordId: existingAttendance[key]?.id,
        subjectId: isWholeClassMode ? null : selectedSubject
      }
    }));
  };

  const applyBulkStatus = () => {
    if (bulkMode) {
      const newAttendanceStatus = {};
      selectedStudents.forEach(studentId => {
        const key = isWholeClassMode ? 
          `${studentId}_general` : 
          `${studentId}_${selectedSubject || 'general'}`;
        
        newAttendanceStatus[key] = {
          studentId,
          status: bulkStatus,
          remarks: '',
          timestamp: new Date(),
          studentName: studentList.find(s => s.student?.id === studentId)?.student?.user?.name || 'Unknown',
          existingRecordId: existingAttendance[key]?.id,
          subjectId: isWholeClassMode ? null : selectedSubject
        };
      });
      setAttendanceStatus(newAttendanceStatus);
    } else {
      filteredStudents.forEach(student => {
        const key = isWholeClassMode ? 
          `${student.student?.id}_general` : 
          `${student.student?.id}_${selectedSubject || 'general'}`;
        
        handleAttendanceChange(student.student?.id, bulkStatus);
      });
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.student?.id));
    }
  };

  const saveAttendance = async (studentId) => {
    const key = isWholeClassMode ? 
      `${studentId}_general` : 
      `${studentId}_${selectedSubject || 'general'}`;
    
    const attendance = attendanceStatus[key];
    if (!attendance) return;

   
    if (isSubjectRequired && !selectedSubject && !isWholeClassMode) {
      alert('Please select a subject for this REGULAR class or enable whole-class mode');
      return;
    }

    if (isWholeClassMode && !isSpecialClass) {
      const unauthorizedSubjects = subjects.filter(subject => 
        !teacherSubjects?.some(tSub => tSub.id === subject.id)
      );
      if (unauthorizedSubjects.length > 0) {
        alert(`You are not authorized to mark attendance for all subjects. Please contact admin.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const attendanceData = {
        classRoomId: selectedClass,
        date: attendanceDate,
        attendanceRecords: [
          {
            studentId: attendance.studentId,
            status: attendance.status,
            remarks: attendance.remarks || undefined
          }
        ],
        isWholeClass: isWholeClassMode
      };

      // Add subjectId for regular classes when not in whole-class mode
      if (!isWholeClassMode && selectedSubject) {
        attendanceData.subjectId = selectedSubject;
      }

      console.log('Saving attendance:', attendanceData);

      let result;
      if (attendance.existingRecordId) {
        // Update existing record
        result = await remarkAttendance(attendanceData);
      } else {
        // Mark new attendance
        result = await markAttendance(attendanceData);
      }
      
      // Remove from pending changes after successful save
      setAttendanceStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[key];
        return newStatus;
      });

      // Reload existing attendance
      await loadExistingAttendance();
      
      const subjectName = isWholeClassMode ? 
        'Whole Class' : 
        (isSpecialClass ? selectedClassData?.type : subjects.find(s => s.id === selectedSubject)?.name);
      
      alert(`Attendance saved for ${attendance.studentName} in ${subjectName}`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Error saving attendance: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllAttendance = async () => {
    const pendingRecords = Object.values(attendanceStatus);
    if (pendingRecords.length === 0) {
      alert('No attendance changes to save');
      return;
    }

    // Validation
    if (isSubjectRequired && !selectedSubject && !isWholeClassMode) {
      alert('Please select a subject for this REGULAR class or enable whole-class mode');
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData = {
        classRoomId: selectedClass,
        date: attendanceDate,
        attendanceRecords: pendingRecords.map(record => ({
          studentId: record.studentId,
          status: record.status,
          remarks: record.remarks || undefined
        })),
        isWholeClass: isWholeClassMode
      };

      // Add subjectId for regular classes when not in whole-class mode
      if (!isWholeClassMode && selectedSubject) {
        attendanceData.subjectId = selectedSubject;
      }

      console.log('Saving bulk attendance:', attendanceData);

      let result;
      const hasExistingRecords = pendingRecords.some(record => record.existingRecordId);
      
      if (hasExistingRecords) {
        // Update existing records (re-mark)
        result = await remarkAttendance(attendanceData);
      } else {
        // Mark new attendance
        result = await markAttendance(attendanceData);
      }
      
      setAttendanceStatus({});
      setSelectedStudents([]);
      await loadExistingAttendance();
      
      const subjectName = isWholeClassMode ? 
        'Whole Class' : 
        (isSpecialClass ? selectedClassData?.type : subjects.find(s => s.id === selectedSubject)?.name);
      
      alert(`Attendance saved for ${pendingRecords.length} students in ${subjectName}!`);
    }  catch (error) {
  console.error('Error saving bulk attendance:', error);
  console.error('Response data:', error.response?.data);
  console.error('Response status:', error.response?.status);
  
  const errorMessage = error.response?.data?.error || 
                      error.response?.data?.message || 
                      error.message || 
                      'Unknown error occurred';
  alert(`Error saving attendance: ${errorMessage}`);

    } finally {
      setIsSaving(false);
    }
  };

  const updateExistingAttendance = async () => {
    if (!confirm('This will update ALL attendance records for this class/date. Continue?')) {
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData = {
        classRoomId: selectedClass,
        date: attendanceDate,
        isWholeClass: isWholeClassMode
      };

      if (!isWholeClassMode && selectedSubject) {
        attendanceData.subjectId = selectedSubject;
      }

      const result = await remarkAttendance(attendanceData);
      await loadExistingAttendance();
      alert('Attendance updated successfully!');
    } catch (error) {
      console.error('Error updating attendance:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Error updating attendance: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAttendanceStatus = (studentId) => {
  const key = isWholeClassMode ? 
    `${studentId}_general` : 
    `${studentId}_${selectedSubject || 'general'}`;
  
  // Check for pending changes
  if (attendanceStatus[key]) {
    return attendanceStatus[key].status;
  }
  
  // Check existing records
  const existingRecord = existingAttendance[key];
  if (existingRecord) {
    // For whole-class mode, show any attendance record
    // For subject-wise mode, only show if it matches the selected subject
    if (isWholeClassMode || existingRecord.subjectId === selectedSubject || isSpecialClass) {
      return existingRecord.status;
    }
  }
  return 'NOT_MARKED';
};

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ABSENT':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'LATE':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HALF_DAY':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4" />;
      case 'ABSENT':
        return <XCircle className="h-4 w-4" />;
      case 'LATE':
        return <Clock className="h-4 w-4" />;
      case 'HALF_DAY':
        return <Clock className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const StudentCard = ({ student }) => {
    const isExpanded = expandedStudent === student.id;
    const studentId = student.student?.id;
    const currentStatus = getAttendanceStatus(studentId);
    const key = isWholeClassMode ? 
      `${studentId}_general` : 
      `${studentId}_${selectedSubject || 'general'}`;
    const existingRemarks = existingAttendance[key]?.remarks || '';
    const isSelected = selectedStudents.includes(studentId);

    return (
      <div className={`bg-white rounded-lg shadow-sm border ${isSelected ? 'border-gold ring-1 ring-gold' : 'border-gray-200'} hover:shadow-md transition-all`}>
  <div className="p-3 sm:p-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
        {bulkMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleStudentSelection(studentId)}
            className="h-5 w-5 text-gold focus:ring-gold rounded mt-1 sm:mt-0"
          />
        )}
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
          {student.student?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {student.student?.user?.name || 'Unknown Student'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            <span className="block sm:inline">Roll No: {student.rollNumber}</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">{student.classRoom?.name || 'Unknown Class'}</span>
          </p>
          {!isWholeClassMode && selectedSubject && (
            <p className="text-xs text-gold font-medium mt-1">
              Subject: {subjects.find(s => s.id === selectedSubject)?.name}
            </p>
          )}
          {isWholeClassMode && (
            <p className="text-xs text-purple-600 font-medium mt-1 flex items-center">
              <UsersIcon className="h-3 w-3 mr-1" />
              Whole Class Mode
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
        {/* Dropdown for attendance status */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={currentStatus}
            onChange={(e) => handleAttendanceChange(studentId, e.target.value)}
            className={`w-full sm:w-auto pl-3 pr-8 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-all appearance-none cursor-pointer ${getStatusColor(currentStatus)}`}
          >
            <option value="NOT_MARKED" className="bg-white">Not Marked</option>
            <option value="PRESENT" className="bg-green-50 text-green-700">Present</option>
            <option value="ABSENT" className="bg-red-50 text-red-700">Absent</option>
            <option value="LATE" className="bg-yellow-50 text-yellow-700">Late</option>
            <option value="HALF_DAY" className="bg-blue-50 text-blue-700">Half Day</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 pointer-events-none" />
        </div>
        
        <button
          onClick={() => {
            setExpandedStudent(isExpanded ? null : student.id);
          }}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </div>
    </div>
  </div>

  {isExpanded && (
    <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
      <div className="mb-3 sm:mb-4">
        <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Remarks</h4>
        <input
          type="text"
          placeholder="Add remarks (optional)..."
          value={attendanceStatus[key]?.remarks || existingRemarks}
          onChange={(e) => handleAttendanceChange(
            studentId, 
            currentStatus, 
            e.target.value
          )}
          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs sm:text-sm text-gray-600">
          Current Status: <span className={`font-medium ${getStatusColor(currentStatus)}`}>
            {currentStatus.replace('_', ' ')}
          </span>
        </div>
        
        <button
          onClick={() => saveAttendance(studentId)}
          disabled={!attendanceStatus[key] || isSaving}
          className={`w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md font-medium flex items-center justify-center text-sm sm:text-base ${
            attendanceStatus[key] && !isSaving
              ? 'bg-gold text-black hover:bg-yellow-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )}
</div>
    );
  };

  const StudentListItem = ({ student }) => {
    const studentId = student.student?.id;
    const currentStatus = getAttendanceStatus(studentId);
    const isExpanded = expandedStudent === student.id;
    const key = isWholeClassMode ? 
      `${studentId}_general` : 
      `${studentId}_${selectedSubject || 'general'}`;
    const existingRemarks = existingAttendance[key]?.remarks || '';
    const isSelected = selectedStudents.includes(studentId);

    return (
      <div className={`bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gold bg-opacity-10' : ''}`}>
  <div className="px-4 sm:px-6 py-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
        {bulkMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleStudentSelection(studentId)}
            className="h-5 w-5 text-gold focus:ring-gold rounded mt-1 sm:mt-0"
          />
        )}
        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
          {student.student?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
            {student.student?.user?.name || 'Unknown Student'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Roll No: {student.rollNumber}
          </p>
          {!isWholeClassMode && selectedSubject && (
            <p className="text-xs text-gold font-medium mt-0.5">
              {subjects.find(s => s.id === selectedSubject)?.name}
            </p>
          )}
          {isWholeClassMode && (
            <p className="text-xs text-purple-600 font-medium mt-0.5 flex items-center">
              <UsersIcon className="h-3 w-3 mr-1 flex-shrink-0" />
              Whole Class
            </p>
          )}
        </div>
        
        <div className="text-right flex-shrink-0 sm:block hidden">
          <p className="text-sm font-medium text-gray-900">
            {student.classRoom?.name || 'Unknown Class'}
          </p>
          <p className="text-sm text-gray-600">
            Grade {student.classRoom?.grade || 'N/A'}
          </p>
        </div>
      </div>

      {/* Mobile class info - shown below on small screens */}
      <div className="text-left sm:hidden pl-11 sm:pl-0">
        <p className="text-sm font-medium text-gray-900">
          {student.classRoom?.name || 'Unknown Class'}
        </p>
        <p className="text-sm text-gray-600">
          Grade {student.classRoom?.grade || 'N/A'}
        </p>
      </div>

      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 ml-0 sm:ml-6">
        {/* Dropdown for attendance status */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={currentStatus}
            onChange={(e) => handleAttendanceChange(studentId, e.target.value)}
            className={`w-full sm:w-auto pl-3 pr-8 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-all appearance-none cursor-pointer ${getStatusColor(currentStatus)}`}
          >
            <option value="NOT_MARKED" className="bg-white">Not Marked</option>
            <option value="PRESENT" className="bg-green-50 text-green-700">Present</option>
            <option value="ABSENT" className="bg-red-50 text-red-700">Absent</option>
            <option value="LATE" className="bg-yellow-50 text-yellow-700">Late</option>
            <option value="HALF_DAY" className="bg-blue-50 text-blue-700">Half Day</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 pointer-events-none" />
        </div>

        <button
          onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
          className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
        >
          <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
        </button>
      </div>
    </div>

    {isExpanded && (
      <div className="mt-4 pl-0 sm:pl-14">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Add remarks..."
              value={attendanceStatus[key]?.remarks || existingRemarks}
              onChange={(e) => handleAttendanceChange(
                studentId, 
                currentStatus, 
                e.target.value
              )}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
          <button
            onClick={() => saveAttendance(studentId)}
            disabled={isSaving}
            className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    )}
  </div>
</div>
    );
  };

  if (loading && !studentList.length) {
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 sm:py-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {isWholeClassMode ? 'Whole Class Attendance' : 'Subject-wise Attendance'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {isWholeClassMode 
              ? 'Mark attendance for all subjects at once' 
              : 'Mark attendance for specific subjects'}
          </p>
        </div>
        
        <div className="flex items-center justify-start sm:justify-end space-x-2 flex-wrap gap-2">
          <button className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Print
          </button>
          <button className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Export
          </button>
          <button
            onClick={saveAllAttendance}
            disabled={Object.keys(attendanceStatus).length === 0 || isSaving || !selectedClass || (isSubjectRequired && !selectedSubject && !isWholeClassMode)}
            className={`flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              Object.keys(attendanceStatus).length > 0 && !isSaving && selectedClass && (!isSubjectRequired || selectedSubject || isWholeClassMode)
                ? 'bg-gold text-black hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                <span className="hidden sm:inline">Saving...</span>
                <span className="inline sm:hidden">Saving</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Save All ({Object.keys(attendanceStatus).length})</span>
                <span className="inline sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Controls */}
  <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {/* Class Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Select Class *
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
              setAttendanceStatus({});
              setSubjects([]);
              setSelectedStudents([]);
            }}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          >
            <option value="">Select Class</option>
            {classList.map(cls => (
              <option key={cls.id} value={cls.id}>
                <span className="truncate">{cls.name} (Gr {cls.grade}) - {cls.type}</span>
                {cls.type?.toUpperCase().includes('HIFZ') || cls.type?.toUpperCase().includes('NAZRA') ? ' 🕌' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Attendance Date
          </label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>

        {/* Subject Filter - Only show for non-special classes and not in whole-class mode */}
        {!isSpecialClass && !isWholeClassMode && (
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Select Subject {isSubjectRequired && '*'}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              disabled={!selectedClass || subjects.length === 0}
              required={isSubjectRequired}
            >
              <option value="">{subjects.length === 0 ? 'No subjects' : 'Select Subject'}</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 && selectedClass && (
              <p className="text-xs text-red-600 mt-1">
                No subjects assigned
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className={`${!isSpecialClass && !isWholeClassMode ? 'lg:col-span-1' : 'sm:col-span-2 lg:col-span-1'}`}>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Search Students
          </label>
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* View Mode */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            View Mode
          </label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          >
            <option value="list">List View</option>
            <option value="grid">Grid View</option>
          </select>
        </div>

        {/* Attendance Mode */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Attendance Mode
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsWholeClassMode(false)}
              className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border text-xs sm:text-sm font-medium ${
                !isWholeClassMode
                  ? 'bg-gold text-black border-gold'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              <span className="hidden sm:inline">Subject</span>
              <span className="inline sm:hidden">Subj</span>
            </button>
            <button
              onClick={() => setIsWholeClassMode(true)}
              className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border text-xs sm:text-sm font-medium ${
                isWholeClassMode
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              <span className="hidden sm:inline">Whole Class</span>
              <span className="inline sm:hidden">All</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Bulk Actions
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border text-xs sm:text-sm font-medium ${
                bulkMode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              {bulkMode ? 'Selecting' : 'Select'}
            </button>
            {bulkMode && (
              <button
                onClick={selectAllStudents}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border border-gray-300 text-xs sm:text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
              >
                {selectedStudents.length === filteredStudents.length ? 'Clear' : 'All'}
              </button>
            )}
          </div>
        </div>

        {/* Bulk Status */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Bulk Status
          </label>
          <div className="flex space-x-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
            <button
              onClick={applyBulkStatus}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center text-xs sm:text-sm"
            >
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Date and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">
            {new Date(attendanceDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
            {new Date(attendanceDate).toDateString() !== new Date().toDateString() && (
              <span className="text-yellow-600 font-medium ml-1">(Past)</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
          {bulkMode && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
              {selectedStudents.length} selected
            </div>
          )}
          
          <div className="flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 whitespace-nowrap">
                <strong>{filteredStudents.length}</strong>
              </span>
            </div>
            
            {!isWholeClassMode && selectedSubject && (
              <div className="hidden sm:flex items-center space-x-2">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-gold flex-shrink-0" />
                <span className="text-gray-600 truncate max-w-[120px]">
                  {subjects.find(s => s.id === selectedSubject)?.name}
                </span>
              </div>
            )}

            {isWholeClassMode && (
              <div className="hidden sm:flex items-center space-x-2">
                <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                <span className="text-gray-600">
                  Whole Class
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={updateExistingAttendance}
            disabled={!selectedClass || isSaving}
            className={`flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md whitespace-nowrap ${
              selectedClass && !isSaving
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">Update All</span>
            <span className="inline sm:hidden">Update</span>
          </button>
        </div>
      </div>
    </div>

    {/* Students List/Grid */}
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
          {selectedClass && selectedClassData && `Class: ${selectedClassData.name}`}
          {!isWholeClassMode && selectedSubject && subjects.find(s => s.id === selectedSubject) && 
            ` - ${subjects.find(s => s.id === selectedSubject).name}`}
        </h2>
        <div className={`text-xs sm:text-sm font-medium ${
          isWholeClassMode ? 'text-purple-600' : 'text-gray-600'
        }`}>
          {isWholeClassMode ? (
            <span className="flex items-center">
              <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Whole Class
            </span>
          ) : isSpecialClass ? (
            <span className="flex items-center">
              <Book className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {selectedClassData?.type} Class
            </span>
          ) : (
            selectedClassData?.type === 'REGULAR' ? 'Regular' : selectedClassData?.type
          )}
        </div>
      </div>

      {!selectedClass ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <Filter className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Class</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Please select a class to start marking attendance
          </p>
        </div>
      ) : (isSubjectRequired && !selectedSubject && !isWholeClassMode) ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Subject</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Please select a subject or enable whole-class mode
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <GraduationCap className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            No students enrolled or no matches for your search.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredStudents.map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredStudents.map(student => (
            <StudentListItem key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>

    {/* Quick Actions Bar */}
    {selectedClass && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="font-medium">{filteredStudents.length}</span>
            <span>students</span>
            <span className="hidden sm:inline">•</span>
            <span className={`font-medium ${getStatusColor('PRESENT')}`}>
              P: {filteredStudents.filter(s => getAttendanceStatus(s.student?.id) === 'PRESENT').length}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className={`font-medium ${getStatusColor('ABSENT')}`}>
              A: {filteredStudents.filter(s => getAttendanceStatus(s.student?.id) === 'ABSENT').length}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className={`font-medium ${getStatusColor('LATE')}`}>
              L: {filteredStudents.filter(s => getAttendanceStatus(s.student?.id) === 'LATE').length}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setBulkStatus('PRESENT');
                applyBulkStatus();
              }}
              className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs sm:text-sm hover:bg-green-200 whitespace-nowrap"
            >
              All Present
            </button>
            <button
              onClick={() => {
                setBulkStatus('ABSENT');
                applyBulkStatus();
              }}
              className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs sm:text-sm hover:bg-red-200 whitespace-nowrap"
            >
              All Absent
            </button>
            <button
              onClick={saveAllAttendance}
              disabled={Object.keys(attendanceStatus).length === 0 || isSaving}
              className={`px-3 sm:px-4 py-1 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap ${
                Object.keys(attendanceStatus).length > 0 && !isSaving
                  ? 'bg-gold text-black hover:bg-yellow-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : `Save (${Object.keys(attendanceStatus).length})`}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
  );
};

export default MyClasses;