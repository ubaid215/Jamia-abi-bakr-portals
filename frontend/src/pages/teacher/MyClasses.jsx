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
    fetchAttendance,
    loading: attendanceLoading
  } = useAttendance();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('list');
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState({});

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
    if (selectedClass) {
      if (isSpecialClass || selectedSubject) {
        loadExistingAttendance();
      }
    }
  }, [selectedClass, selectedSubject, currentDate]);

  const loadClassSubjects = async () => {
    if (!selectedClassData || isSpecialClass) return;

    try {
      // Get subjects for the selected class from teacher's subjects
      const teacherSubjects = await fetchMySubjects();
      const classSubjects = teacherSubjects.subjects?.filter(subject => 
        subject.classRoom?.id === selectedClass
      ) || [];
      
      setSubjects(classSubjects);
      
      // Auto-select first subject if none selected and subject is required
      if (classSubjects.length > 0 && !selectedSubject && isSubjectRequired) {
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
        date: currentDate
      };

      // Only add subjectId for non-special classes
      if (!isSpecialClass && selectedSubject) {
        filters.subjectId = selectedSubject;
      }

      const attendanceData = await fetchAttendance(filters);
      
      // Convert existing attendance to a more accessible format
      const attendanceMap = {};
      
      // Process marked attendance
      attendanceData.attendance?.forEach(record => {
        attendanceMap[record.studentId] = {
          status: record.status,
          remarks: record.remarks || '',
          id: record.id,
          subjectId: record.subjectId
        };
      });
      
      // Process unmarked students
      attendanceData.unmarkedStudents?.forEach(student => {
        if (!attendanceMap[student.studentId]) {
          attendanceMap[student.studentId] = {
            status: 'NOT_MARKED',
            remarks: '',
            id: null,
            subjectId: isSpecialClass ? null : selectedSubject
          };
        }
      });

      setExistingAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
      setExistingAttendance({});
    }
  };

  const loadAttendanceHistory = async (studentId) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      
      const history = await fetchAttendance(studentId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: currentDate,
        classRoomId: selectedClass
      });
      
      setAttendanceHistory(prev => ({
        ...prev,
        [studentId]: history
      }));
    } catch (error) {
      console.error('Error loading attendance history:', error);
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
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: { 
        status, 
        remarks, 
        timestamp: new Date(),
        studentName: studentList.find(s => s.student?.id === studentId)?.student?.user?.name || 'Unknown',
        existingRecordId: existingAttendance[studentId]?.id,
        subjectId: isSpecialClass ? null : selectedSubject
      }
    }));
  };

  const saveAttendance = async (studentId) => {
    const attendance = attendanceStatus[studentId];
    if (!attendance) return;

    // Validate required fields for REGULAR classes
    if (isSubjectRequired && !selectedSubject) {
      alert('Please select a subject for this REGULAR class');
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData = {
        classRoomId: selectedClass,
        date: currentDate,
        attendanceRecords: [
          {
            studentId: studentId,
            status: attendance.status,
            remarks: attendance.remarks || undefined
          }
        ]
      };

      // Add subjectId only for REGULAR classes (not for HIFZ/NAZRA)
      if (!isSpecialClass && selectedSubject) {
        attendanceData.subjectId = selectedSubject;
      }

      console.log('Saving attendance:', attendanceData);

      const result = await markAttendance(attendanceData);
      
      // Remove from pending changes after successful save
      setAttendanceStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[studentId];
        return newStatus;
      });

      // Reload existing attendance
      await loadExistingAttendance();
      
      const subjectName = isSpecialClass ? 
        selectedClassData?.type : 
        subjects.find(s => s.id === selectedSubject)?.name;
      
      alert(`Attendance saved for ${attendance.studentName}${subjectName ? ` in ${subjectName}` : ''}`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Error saving attendance: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllAttendance = async () => {
    const pendingStudents = Object.keys(attendanceStatus);
    if (pendingStudents.length === 0) {
      alert('No attendance changes to save');
      return;
    }

    // Validate required fields for REGULAR classes
    if (isSubjectRequired && !selectedSubject) {
      alert('Please select a subject for this REGULAR class');
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData = {
        classRoomId: selectedClass,
        date: currentDate,
        attendanceRecords: pendingStudents.map(studentId => ({
          studentId: studentId,
          status: attendanceStatus[studentId].status,
          remarks: attendanceStatus[studentId].remarks || undefined
        }))
      };

      // Add subjectId only for REGULAR classes (not for HIFZ/NAZRA)
      if (!isSpecialClass && selectedSubject) {
        attendanceData.subjectId = selectedSubject;
      }

      console.log('Saving bulk attendance:', attendanceData);

      const result = await markAttendance(attendanceData);
      
      setAttendanceStatus({});
      await loadExistingAttendance();
      
      const subjectName = isSpecialClass ? 
        selectedClassData?.type : 
        subjects.find(s => s.id === selectedSubject)?.name;
      
      alert(`Attendance saved for ${pendingStudents.length} students${subjectName ? ` in ${subjectName}` : ''}!`);
    } catch (error) {
      console.error('Error saving bulk attendance:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Error saving attendance: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAttendanceStatus = (studentId) => {
    // First check for pending changes
    if (attendanceStatus[studentId]) {
      return attendanceStatus[studentId].status;
    }
    // Then check existing records
    const existingRecord = existingAttendance[studentId];
    if (existingRecord) {
      // For special classes, show any attendance record
      // For regular classes, only show if it matches the selected subject
      if (isSpecialClass || existingRecord.subjectId === selectedSubject) {
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

  const AttendanceButton = ({ status, studentId, onChange }) => (
    <button
      onClick={() => onChange(studentId, status)}
      className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
        getAttendanceStatus(studentId) === status 
          ? getStatusColor(status) + ' border-current'
          : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-2">
        {getStatusIcon(status)}
        <span>
          {status === 'HALF_DAY' ? 'Half Day' : status}
        </span>
      </div>
    </button>
  );

  const StudentCard = ({ student }) => {
    const isExpanded = expandedStudent === student.id;
    const currentStatus = getAttendanceStatus(student.student?.id);
    const existingRemarks = existingAttendance[student.student?.id]?.remarks || '';
    const studentHistory = attendanceHistory[student.student?.id];

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold">
                {student.student?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {student.student?.user?.name || 'Unknown Student'}
                </h3>
                <p className="text-sm text-gray-600">
                  Roll No: {student.rollNumber} • {student.classRoom?.name || 'Unknown Class'}
                </p>
                {!isSpecialClass && selectedSubject && (
                  <p className="text-xs text-gold font-medium mt-1">
                    Subject: {subjects.find(s => s.id === selectedSubject)?.name}
                  </p>
                )}
                {isSpecialClass && (
                  <p className="text-xs text-purple-600 font-medium mt-1 flex items-center">
                    <Book className="h-3 w-3 mr-1" />
                    {selectedClassData?.type}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                {getStatusIcon(currentStatus)}
                <span className="ml-1">{currentStatus.replace('_', ' ')}</span>
              </span>
              
              <button
                onClick={() => {
                  setExpandedStudent(isExpanded ? null : student.id);
                  if (!isExpanded) {
                    loadAttendanceHistory(student.student?.id);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Attendance History */}
            {studentHistory && (
              <div className="mb-4 p-3 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <BookMarked className="h-4 w-4 mr-2" />
                  Recent Attendance
                </h4>
                <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                  {studentHistory.attendance?.slice(0, 5).map((record, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 rounded ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Mark Attendance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AttendanceButton
                  status="PRESENT"
                  studentId={student.student?.id}
                  onChange={handleAttendanceChange}
                />
                <AttendanceButton
                  status="ABSENT"
                  studentId={student.student?.id}
                  onChange={handleAttendanceChange}
                />
                <AttendanceButton
                  status="LATE"
                  studentId={student.student?.id}
                  onChange={handleAttendanceChange}
                />
                <AttendanceButton
                  status="HALF_DAY"
                  studentId={student.student?.id}
                  onChange={handleAttendanceChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Add remarks..."
                  value={attendanceStatus[student.student?.id]?.remarks || existingRemarks}
                  onChange={(e) => handleAttendanceChange(
                    student.student?.id, 
                    attendanceStatus[student.student?.id]?.status || currentStatus, 
                    e.target.value
                  )}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => saveAttendance(student.student?.id)}
                disabled={!attendanceStatus[student.student?.id] || isSaving}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  attendanceStatus[student.student?.id] && !isSaving
                    ? 'bg-gold text-black hover:bg-yellow-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // StudentListItem component (similar structure but for list view)
  const StudentListItem = ({ student }) => {
    const currentStatus = getAttendanceStatus(student.student?.id);
    const isExpanded = expandedStudent === student.id;
    const existingRemarks = existingAttendance[student.student?.id]?.remarks || '';

    return (
      <div className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="h-10 w-10 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {student.student?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {student.student?.user?.name || 'Unknown Student'}
                </h3>
                <p className="text-sm text-gray-600">Roll No: {student.rollNumber}</p>
                {!isSpecialClass && selectedSubject && (
                  <p className="text-xs text-gold font-medium">
                    {subjects.find(s => s.id === selectedSubject)?.name}
                  </p>
                )}
                {isSpecialClass && (
                  <p className="text-xs text-purple-600 font-medium flex items-center">
                    <Book className="h-3 w-3 mr-1" />
                    {selectedClassData?.type}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {student.classRoom?.name || 'Unknown Class'}
                </p>
                <p className="text-sm text-gray-600">
                  Grade {student.classRoom?.grade || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                {getStatusIcon(currentStatus)}
                <span className="ml-1">{currentStatus.replace('_', ' ')}</span>
              </span>

              <div className="flex space-x-2">
                {['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleAttendanceChange(student.student?.id, status)}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentStatus === status
                        ? getStatusColor(status).replace('text-', 'border-').split(' ')[0] + ' bg-opacity-20'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                    title={status === 'HALF_DAY' ? 'Half Day' : status}
                  >
                    {getStatusIcon(status)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pl-14">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Add remarks..."
                    value={attendanceStatus[student.student?.id]?.remarks || existingRemarks}
                    onChange={(e) => handleAttendanceChange(
                      student.student?.id, 
                      currentStatus, 
                      e.target.value
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => saveAttendance(student.student?.id)}
                  disabled={isSaving}
                  className="bg-gold text-black px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors flex items-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isSpecialClass ? 'Book Class Attendance' : 'Subject-wise Attendance'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isSpecialClass 
                  ? 'Mark attendance for Book memorization and recitation classes' 
                  : 'Mark attendance for specific subjects and classes'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={saveAllAttendance}
                disabled={Object.keys(attendanceStatus).length === 0 || isSaving || !selectedClass || (isSubjectRequired && !selectedSubject)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  Object.keys(attendanceStatus).length > 0 && !isSaving && selectedClass && (!isSubjectRequired || selectedSubject)
                    ? 'bg-gold text-black hover:bg-yellow-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Save All Attendance
                    {Object.keys(attendanceStatus).length > 0 && (
                      <span className="ml-2 bg-black bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        {Object.keys(attendanceStatus).length}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSubject('');
                  setAttendanceStatus({});
                  setSubjects([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                required
              >
                <option value="">Select Class</option>
                {classList.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Grade {cls.grade}) - {cls.type}
                    {cls.type?.toUpperCase().includes('HIFZ') || cls.type?.toUpperCase().includes('NAZRA') ? ' 🕌' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter - Only show for non-special classes */}
            {!isSpecialClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject {isSubjectRequired && '*'}
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  disabled={!selectedClass || subjects.length === 0}
                  required={isSubjectRequired}
                >
                  <option value="">{subjects.length === 0 ? 'No subjects available' : 'Select Subject'}</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {subjects.length === 0 && selectedClass && (
                  <p className="text-xs text-red-600 mt-1">
                    No subjects assigned for this class
                  </p>
                )}
              </div>
            )}

            {/* Search */}
            <div className={isSpecialClass ? 'md:col-span-2' : 'md:col-span-1'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
            </div>

            {/* View Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="list">List View</option>
                <option value="grid">Grid View</option>
              </select>
            </div>
          </div>

          {/* Date and Summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{new Date(currentDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Total Students: <strong>{filteredStudents.length}</strong>
                </span>
              </div>
              
              {!isSpecialClass && (
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-gold" />
                  <span className="text-gray-600">
                    Subject: <strong>
                      {subjects.find(s => s.id === selectedSubject)?.name || 'Not selected'}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">
                  Present: <strong>
                    {filteredStudents.filter(s => getAttendanceStatus(s.student?.id) === 'PRESENT').length}
                  </strong>
                </span>
              </div>

              {Object.keys(attendanceStatus).length > 0 && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">
                    {Object.keys(attendanceStatus).length} pending changes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {selectedClass && (
            <div className={`mt-4 p-3 rounded-md ${
              isSpecialClass ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center">
                {isSpecialClass ? (
                  <Book className="h-4 w-4 text-purple-600 mr-2" />
                ) : (
                  <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                )}
                <span className={`text-sm ${isSpecialClass ? 'text-purple-700' : 'text-blue-700'}`}>
                  {isSpecialClass 
                    ? `Marking attendance for ${selectedClassData?.type} class: ${selectedClassData?.name}`
                    : `Marking attendance for ${selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : 'subject'} in ${selectedClassData?.name}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Students List/Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedClass && selectedClassData && `Class: ${selectedClassData.name}`}
              {!isSpecialClass && selectedSubject && subjects.find(s => s.id === selectedSubject) && 
                ` - Subject: ${subjects.find(s => s.id === selectedSubject).name}`}
            </h2>
            <div className={`text-sm font-medium ${
              isSpecialClass ? 'text-purple-600' : 'text-gray-600'
            }`}>
              {isSpecialClass ? (
                <span className="flex items-center">
                  <Book className="h-4 w-4 mr-1" />
                  {selectedClassData?.type} Class
                </span>
              ) : (
                selectedClassData?.type === 'REGULAR' ? 'Regular Class' : selectedClassData?.type
              )}
            </div>
          </div>

          {!selectedClass ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Class</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please select a class to start marking attendance
              </p>
            </div>
          ) : (isSubjectRequired && !selectedSubject) ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Subject</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please select a subject for this REGULAR class
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No students enrolled in this class or no matches for your search.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Attendance Legend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Attendance Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { status: 'PRESENT', description: 'Student is present' },
              { status: 'ABSENT', description: 'Student is absent' },
              { status: 'LATE', description: 'Student arrived late' },
              { status: 'HALF_DAY', description: 'Student present for half day' }
            ].map(item => (
              <div key={item.status} className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.status === 'HALF_DAY' ? 'Half Day' : item.status}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyClasses;