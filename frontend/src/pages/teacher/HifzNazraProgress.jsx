/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import { useHifzReport } from '../../contexts/HifzReportContext';
import {
  Users,
  BookOpen,
  Download,
  BarChart3,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Award,
  TrendingUp,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Printer
} from 'lucide-react';

const HifzNazraProgress = () => {
  const {
    students,
    classes,
    loading,
    fetchMyStudents,
    fetchMyClasses
  } = useTeacher();

  const {
    generateHifzReport,
    loading: reportLoading
  } = useHifzReport();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressForm, setProgressForm] = useState({
    date: new Date().toISOString().split('T')[0],
    sabaqLines: '',
    sabqiLines: '',
    manzilPara: '',
    mistakes: '',
    currentPara: '',
    completedParas: [],
    remarks: ''
  });
  const [studentProgress, setStudentProgress] = useState([]);
  const [viewMode, setViewMode] = useState('input'); // 'input', 'analytics', 'reports'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure classes and students are always arrays
  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const studentList = Array.isArray(students) ? students : (students?.students || []);

  // Filter for HIFZ and NAZRA classes only
  const hifzNazraClasses = classList.filter(cls => 
    cls.type?.toUpperCase().includes('HIFZ') || 
    cls.type?.toUpperCase().includes('NAZRA')
  );

  const filteredStudents = studentList.filter(student => {
    const matchesSearch = student.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber?.toString().includes(searchTerm);
    const matchesClass = !selectedClass || student.classRoom?.id === selectedClass;
    return matchesSearch && matchesClass;
  });

  useEffect(() => {
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchMyStudents({ classRoomId: selectedClass });
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentProgress();
    }
  }, [selectedStudent]);

  const loadStudentProgress = async () => {
    // Mock progress data - replace with actual API call
    const mockProgress = [
      {
        id: 1,
        date: '2024-01-15',
        sabaqLines: 10,
        sabqiLines: 20,
        manzilPara: 'Para 1',
        mistakes: 2,
        currentPara: 2,
        remarks: 'Good progress'
      },
      {
        id: 2,
        date: '2024-01-14',
        sabaqLines: 8,
        sabqiLines: 15,
        manzilPara: 'Para 1',
        mistakes: 1,
        currentPara: 1,
        remarks: 'Excellent recitation'
      }
    ];
    setStudentProgress(mockProgress);
  };

  const handleInputChange = (field, value) => {
    setProgressForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitProgress = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      // Here you would call your API to save progress
      console.log('Submitting progress:', progressForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to local state
      const newProgress = {
        id: Date.now(),
        ...progressForm
      };
      setStudentProgress(prev => [newProgress, ...prev]);
      
      // Reset form
      setProgressForm({
        date: new Date().toISOString().split('T')[0],
        sabaqLines: '',
        sabqiLines: '',
        manzilPara: '',
        mistakes: '',
        currentPara: '',
        completedParas: [],
        remarks: ''
      });
      
      alert('Progress recorded successfully!');
    } catch (error) {
      alert('Error recording progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent) return;

    try {
      const report = await generateHifzReport({
        studentId: selectedStudent.student.id,
        startDate: '2024-01-01',
        endDate: new Date().toISOString().split('T')[0]
      });

      // Create blob and download
      const blob = new Blob([report], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hifz-report-${selectedStudent.student.admissionNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error generating report');
    }
  };

  const calculateProgressStats = () => {
    if (studentProgress.length === 0) return null;

    const totalSabaq = studentProgress.reduce((sum, p) => sum + (p.sabaqLines || 0), 0);
    const totalSabqi = studentProgress.reduce((sum, p) => sum + (p.sabqiLines || 0), 0);
    const totalMistakes = studentProgress.reduce((sum, p) => sum + (p.mistakes || 0), 0);
    const avgMistakesPerSession = totalMistakes / studentProgress.length;
    const currentPara = studentProgress[0]?.currentPara || 1;

    return {
      totalSessions: studentProgress.length,
      totalSabaq,
      totalSabqi,
      totalMistakes,
      avgMistakesPerSession: avgMistakesPerSession.toFixed(1),
      currentPara,
      avgLinesPerSession: ((totalSabaq + totalSabqi) / studentProgress.length).toFixed(1)
    };
  };

  const ProgressInputForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Plus className="h-5 w-5 mr-2 text-gold" />
        Record Progress
      </h2>

      <form onSubmit={handleSubmitProgress}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={progressForm.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>

          {/* Current Para */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Para *
            </label>
            <select
              required
              value={progressForm.currentPara}
              onChange={(e) => handleInputChange('currentPara', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Para</option>
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Para {i + 1}</option>
              ))}
            </select>
          </div>

          {/* Sabaq Lines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sabaq Lines (New)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={progressForm.sabaqLines}
              onChange={(e) => handleInputChange('sabaqLines', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder="Number of new lines memorized"
            />
          </div>

          {/* Sabqi Lines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sabqi Lines (Revision)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={progressForm.sabqiLines}
              onChange={(e) => handleInputChange('sabqiLines', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder="Number of revision lines"
            />
          </div>

          {/* Manzil Para */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manzil Para
            </label>
            <select
              value={progressForm.manzilPara}
              onChange={(e) => handleInputChange('manzilPara', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Manzil Para</option>
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={`Para ${i + 1}`}>Para {i + 1}</option>
              ))}
            </select>
          </div>

          {/* Mistakes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Mistakes
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={progressForm.mistakes}
              onChange={(e) => handleInputChange('mistakes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder="Number of mistakes"
            />
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remarks
          </label>
          <textarea
            rows={3}
            value={progressForm.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
            placeholder="Additional comments about student's performance..."
          />
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !selectedStudent}
            className={`px-6 py-2 rounded-md font-medium flex items-center ${
              isSubmitting || !selectedStudent
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gold text-black hover:bg-yellow-600'
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
        </div>
      </form>
    </div>
  );

  const StudentProgressAnalytics = () => {
    const stats = calculateProgressStats();

    if (!stats) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Progress Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No progress records found for this student.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Para</p>
                <p className="text-2xl font-bold text-gray-900">{stats.currentPara}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Lines/Session</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgLinesPerSession}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gold" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Mistakes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgMistakesPerSession}</p>
              </div>
              <Award className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {studentProgress.slice(0, 10).map((progress, index) => (
              <div key={progress.id} className="flex flex-col items-center flex-1">
                <div className="flex flex-col items-center space-y-1">
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ 
                      height: `${(progress.sabaqLines / 20) * 100}%`,
                      minHeight: '4px'
                    }}
                    title={`Sabaq: ${progress.sabaqLines} lines`}
                  ></div>
                  <div
                    className="w-full bg-blue-500 rounded-b"
                    style={{ 
                      height: `${(progress.sabqiLines / 50) * 100}%`,
                      minHeight: '4px'
                    }}
                    title={`Sabqi: ${progress.sabqiLines} lines`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(progress.date).getDate()}/{new Date(progress.date).getMonth() + 1}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Sabaq Lines</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Sabqi Lines</span>
            </div>
          </div>
        </div>

        {/* Recent Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Progress</h3>
          <div className="space-y-3">
            {studentProgress.slice(0, 5).map((progress) => (
              <div key={progress.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {new Date(progress.date).toLocaleDateString()}
                    </div>
                    <div className="text-gray-600">
                      Para {progress.currentPara} • {progress.remarks || 'No remarks'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Sabaq: {progress.sabaqLines} • Sabqi: {progress.sabqiLines}
                  </div>
                  <div className={`text-sm ${
                    progress.mistakes > 2 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Mistakes: {progress.mistakes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const StudentCard = ({ student }) => {
    const isSelected = selectedStudent?.id === student.id;

    return (
      <div
        className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'border-gold bg-gold bg-opacity-5' : 'border-gray-200 hover:border-gold'
        }`}
        onClick={() => setSelectedStudent(student)}
      >
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold">
            {student.student?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{student.student?.user?.name}</h3>
            <p className="text-sm text-gray-600">
              Roll No: {student.rollNumber} • {student.classRoom?.name}
            </p>
          </div>
          {isSelected && (
            <div className="bg-gold text-white p-1 rounded-full">
              <User className="h-4 w-4" />
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
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hifz & Nazra Progress</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track student progress and generate detailed reports
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedStudent && (
                <button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  className="flex items-center px-4 py-2 bg-gold text-black rounded-md hover:bg-yellow-600 transition-colors"
                >
                  {reportLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate PDF Report
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Student List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gold" />
                Students
              </h2>

              {/* Filters */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  >
                    <option value="">All HIFZ/NAZRA Classes</option>
                    {hifzNazraClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Grade {cls.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
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
              </div>

              {/* Student List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="mx-auto h-8 w-8 mb-2" />
                    No students found
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <StudentCard key={student.id} student={student} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {!selectedStudent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Student</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a student from the list to view and record their progress
                </p>
              </div>
            ) : (
              <>
                {/* Student Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 bg-gold rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedStudent.student?.user?.name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedStudent.student?.user?.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                          Roll No: {selectedStudent.rollNumber} • {selectedStudent.classRoom?.name}
                        </p>
                        <p className="text-sm text-gold font-medium">
                          Admission: {selectedStudent.student?.admissionNo}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                  <div className="flex border-b border-gray-200">
                    {[
                      { id: 'input', label: 'Record Progress', icon: Plus },
                      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                      { id: 'reports', label: 'Reports', icon: FileText }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setViewMode(tab.id)}
                          className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                            viewMode === tab.id
                              ? 'border-gold text-gold'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-6">
                    {viewMode === 'input' && <ProgressInputForm />}
                    {viewMode === 'analytics' && <StudentProgressAnalytics />}
                    {viewMode === 'reports' && (
                      <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Report Generation</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Use the "Generate PDF Report" button above to create detailed progress reports.
                        </p>
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