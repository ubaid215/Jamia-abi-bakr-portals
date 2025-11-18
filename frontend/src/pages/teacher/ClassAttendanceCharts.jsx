/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAttendance } from '../../contexts/AttendanceContext';
import {
  BarChart3,
  PieChart,
  Calendar,
  Users,
  UserCheck,
  XCircle,
  Clock,
  Download,
  Filter,
  TrendingUp,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ClassAttendanceCharts = () => {
  const {
    classes,
    loading,
    fetchMyClasses
  } = useTeacher();

  const {
    fetchClassAttendanceSummary,
    fetchAttendance,
    loading: attendanceLoading
  } = useAttendance();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateRange, setDateRange] = useState('week'); // 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [studentRankings, setStudentRankings] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [expandedSection, setExpandedSection] = useState('overview');

  // Ensure classes is always an array
  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const selectedClassData = classList.find(cls => cls.id === selectedClass);

  // Check if class is HIFZ or NAZRA
  const isSpecialClass = selectedClassData?.type?.toUpperCase().includes('HIFZ') || 
                        selectedClassData?.type?.toUpperCase().includes('NAZRA');

  useEffect(() => {
    fetchMyClasses();
    // Set default date range to current week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    setStartDate(weekStart.toISOString().split('T')[0]);
    setEndDate(weekEnd.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && startDate && endDate) {
      loadAttendanceData();
      loadDailyAttendanceData();
    }
  }, [selectedClass, selectedSubject, startDate, endDate]);

  const loadClassSubjects = async () => {
    if (!selectedClassData) return;

    try {
      // For special classes, no subjects needed
      if (isSpecialClass) {
        setSubjects([]);
        setSelectedSubject('');
        return;
      }

      // Load subjects for the class (you might need to implement this in your context)
      // For now, we'll use a mock implementation
      const mockSubjects = [
        { id: 'math', name: 'Mathematics' },
        { id: 'science', name: 'Science' },
        { id: 'english', name: 'English' },
        { id: 'urdu', name: 'Urdu' }
      ];
      setSubjects(mockSubjects);
      
      if (mockSubjects.length > 0 && !selectedSubject) {
        setSelectedSubject(mockSubjects[0].id);
      }
    } catch (error) {
      console.error('Error loading class subjects:', error);
      setSubjects([]);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedClass || !startDate || !endDate) return;

    try {
      const filters = {
        startDate,
        endDate
      };

      if (!isSpecialClass && selectedSubject) {
        filters.subjectId = selectedSubject;
      }

      const summary = await fetchClassAttendanceSummary(selectedClass, filters);
      setAttendanceData(summary);

      // Calculate student rankings
      if (summary.studentSummary) {
        const rankings = summary.studentSummary
          .filter(student => student.totalDays > 0)
          .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
          .slice(0, 10);
        setStudentRankings(rankings);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const loadDailyAttendanceData = async () => {
    if (!selectedClass || !startDate || !endDate) return;

    try {
      // Generate mock daily data for demonstration
      const days = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const present = Math.floor(Math.random() * 20) + 10; // Random between 10-30
        const absent = Math.floor(Math.random() * 5) + 1; // Random between 1-6
        const late = Math.floor(Math.random() * 3); // Random between 0-2
        
        days.push({
          date: dateStr,
          present,
          absent,
          late,
          total: present + absent + late,
          percentage: Math.round((present / (present + absent + late)) * 100)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setDailyData(days);
    } catch (error) {
      console.error('Error loading daily attendance data:', error);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case 'week':
        { const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(weekEnd.toISOString().split('T')[0]);
        break; }
      case 'month':
        { const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(monthEnd.toISOString().split('T')[0]);
        break; }
      case 'custom':
        // Keep current dates for custom selection
        break;
    }
  };

  // Chart components
  const AttendancePieChart = ({ data }) => {
    if (!data) return null;

    const total = data.presentDays + data.absentDays + data.lateDays + data.excusedDays;
    const presentPercentage = (data.presentDays / total) * 100;
    const absentPercentage = (data.absentDays / total) * 100;
    const latePercentage = (data.lateDays / total) * 100;
    const excusedPercentage = (data.excusedDays / total) * 100;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="h-5 w-5 mr-2 text-gold" />
          Attendance Distribution
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            {/* Pie Chart Visualization */}
            <svg width="192" height="192" viewBox="0 0 192 192" className="transform -rotate-90">
              {/* Present - Green */}
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="32"
                fill="none"
                strokeLinecap="round"
                className="text-green-500"
                strokeDasharray={`${presentPercentage * 2.513} 251.3`}
              />
              {/* Late - Yellow */}
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="32"
                fill="none"
                strokeLinecap="round"
                className="text-yellow-500"
                strokeDasharray={`${latePercentage * 2.513} 251.3`}
                strokeDashoffset={-presentPercentage * 2.513}
              />
              {/* Absent - Red */}
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="32"
                fill="none"
                strokeLinecap="round"
                className="text-red-500"
                strokeDasharray={`${absentPercentage * 2.513} 251.3`}
                strokeDashoffset={-(presentPercentage + latePercentage) * 2.513}
              />
              {/* Excused - Blue */}
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="32"
                fill="none"
                strokeLinecap="round"
                className="text-blue-500"
                strokeDasharray={`${excusedPercentage * 2.513} 251.3`}
                strokeDashoffset={-(presentPercentage + latePercentage + absentPercentage) * 2.513}
              />
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.attendancePercentage || 0}%
                </div>
                <div className="text-sm text-gray-600">Overall</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Present</span>
            <span className="text-sm font-medium text-gray-900">{data.presentDays}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Late</span>
            <span className="text-sm font-medium text-gray-900">{data.lateDays}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Absent</span>
            <span className="text-sm font-medium text-gray-900">{data.absentDays}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Excused</span>
            <span className="text-sm font-medium text-gray-900">{data.excusedDays}</span>
          </div>
        </div>
      </div>
    );
  };

  const DailyAttendanceChart = () => {
    const maxAttendance = Math.max(...dailyData.map(day => day.total));

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-gold" />
          Daily Attendance Trend
        </h3>
        <div className="h-64">
          <div className="flex items-end justify-between h-48 space-x-1">
            {dailyData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="flex flex-col items-center space-y-1">
                  {/* Present Bar */}
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ 
                      height: `${(day.present / maxAttendance) * 80}%`,
                      minHeight: '4px'
                    }}
                    title={`Present: ${day.present}`}
                  ></div>
                  {/* Late Bar */}
                  <div
                    className="w-full bg-yellow-500"
                    style={{ 
                      height: `${(day.late / maxAttendance) * 80}%`,
                      minHeight: '2px'
                    }}
                    title={`Late: ${day.late}`}
                  ></div>
                  {/* Absent Bar */}
                  <div
                    className="w-full bg-red-500 rounded-b"
                    style={{ 
                      height: `${(day.absent / maxAttendance) * 80}%`,
                      minHeight: '2px'
                    }}
                    title={`Absent: ${day.absent}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>Start: {new Date(startDate).toLocaleDateString()}</span>
          <span>End: {new Date(endDate).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  const StudentRankingTable = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-gold" />
          Top Performing Students
        </h3>
        <div className="space-y-3">
          {studentRankings.map((student, index) => (
            <div key={student.studentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' : 
                  index === 2 ? 'bg-orange-500' : 'bg-gold'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{student.studentName}</div>
                  <div className="text-sm text-gray-600">Roll No: {student.rollNumber}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{student.attendancePercentage}%</div>
                <div className="text-sm text-gray-600">{student.presentDays}/{student.totalDays} days</div>
              </div>
            </div>
          ))}
          
          {studentRankings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No attendance data available for ranking
            </div>
          )}
        </div>
      </div>
    );
  };

  const AttendanceSummaryCards = () => {
    if (!attendanceData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.summary?.totalStudents || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Class Average</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.summary?.classAttendancePercentage || 0}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Best Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {studentRankings[0]?.attendancePercentage || 0}%
              </p>
            </div>
            <Award className="h-8 w-8 text-gold" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Days</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.summary?.totalAttendanceDays || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
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
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">
                Visualize and analyze class attendance patterns
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export Report
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
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">Select Class</option>
                {classList.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Grade {cls.grade})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter - Only for non-special classes */}
            {!isSpecialClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  disabled={!selectedClass || subjects.length === 0}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {!selectedClass ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Class</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please select a class to view attendance analytics
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <AttendanceSummaryCards />

            {/* Expandable Sections */}
            <div className="space-y-6 mt-6">
              {/* Overview Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'overview' ? '' : 'overview')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
                  {expandedSection === 'overview' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                
                {expandedSection === 'overview' && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                      <AttendancePieChart data={attendanceData?.summary} />
                      <StudentRankingTable />
                    </div>
                  </div>
                )}
              </div>

              {/* Trends Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'trends' ? '' : 'trends')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900">Attendance Trends</h2>
                  {expandedSection === 'trends' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                
                {expandedSection === 'trends' && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <div className="mt-4">
                      <DailyAttendanceChart />
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Report Section */}
              {attendanceData?.studentSummary && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'details' ? '' : 'details')}
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                  >
                    <h2 className="text-lg font-semibold text-gray-900">Detailed Student Report</h2>
                    {expandedSection === 'details' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  
                  {expandedSection === 'details' && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Roll No
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Present
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Absent
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Late
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Attendance %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceData.studentSummary.map((student) => (
                              <tr key={student.studentId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {student.studentName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.rollNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.presentDays}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.absentDays}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.lateDays}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <span className={`${
                                    student.attendancePercentage >= 90 ? 'text-green-600' :
                                    student.attendancePercentage >= 75 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {student.attendancePercentage}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassAttendanceCharts;