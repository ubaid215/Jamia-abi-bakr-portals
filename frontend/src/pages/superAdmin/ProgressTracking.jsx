/* eslint-disable no-unused-vars */
// components/ProgressTracking.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  Users, 
  Calendar,
  Target,
  Clock,
  Award,
  BarChart3,
  Filter,
  Plus,
  Download,
  BookMarked,
  GraduationCap
} from 'lucide-react';
import { useProgress } from '../../contexts/ProgressContext';
import { useClass } from '../../contexts/ClassContext';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

// Chart components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ProgressTracking = () => {
  const { 
    classProgress,
    classSummary,
    fetchClassProgress,
    fetchClassProgressSummary,
    loading 
  } = useProgress();
  
  const { classes, fetchClasses } = useClass();
  const { students, fetchStudents } = useAdmin();
  
  const [selectedClass, setSelectedClass] = useState('');
  const [progressType, setProgressType] = useState('HIFZ'); // HIFZ, NAZRA, REGULAR
  const [timeRange, setTimeRange] = useState('month'); // week, month, quarter, year
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed, comparison

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, [fetchClasses, fetchStudents]);

  useEffect(() => {
    if (selectedClass) {
      loadClassProgress();
    }
  }, [selectedClass, progressType, timeRange]);

  const loadClassProgress = async () => {
    try {
      if (progressType === 'REGULAR') {
        await fetchClassProgressSummary(selectedClass, { timeRange });
      } else {
        await fetchClassProgress(selectedClass, progressType, { timeRange });
      }
    } catch (error) {
      toast.error('Failed to load class progress');
    }
  };

  // Progress card component
  const ProgressCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className={`h-4 w-4 ${trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ml-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  // Render different progress views based on class type
  const renderProgressView = () => {
    if (!selectedClass) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Class</h3>
          <p className="text-gray-500">Choose a class to view progress tracking</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
        </div>
      );
    }

    if (progressType === 'REGULAR') {
      return renderRegularProgress();
    } else {
      return renderQuranicProgress();
    }
  };

  // Render Quranic progress (HIFZ/NAZRA)
  const renderQuranicProgress = () => {
    if (!classProgress) return null;

    const { progressData, summary } = classProgress;

    // Prepare chart data
    const completionChartData = progressData.map(student => ({
      name: student.student.user.name,
      completion: student.completionStats.completionPercentage,
      paras: student.completionStats.parasCompleted,
      averageLines: student.completionStats.averageDailyLines
    }));

    const statusDistribution = [
      { name: 'Excellent (90-100%)', value: progressData.filter(s => s.completionStats.completionPercentage >= 90).length, color: '#10B981' },
      { name: 'Good (75-89%)', value: progressData.filter(s => s.completionStats.completionPercentage >= 75 && s.completionStats.completionPercentage < 90).length, color: '#3B82F6' },
      { name: 'Average (50-74%)', value: progressData.filter(s => s.completionStats.completionPercentage >= 50 && s.completionStats.completionPercentage < 75).length, color: '#F59E0B' },
      { name: 'Needs Improvement (<50%)', value: progressData.filter(s => s.completionStats.completionPercentage < 50).length, color: '#EF4444' }
    ];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressCard
            icon={Users}
            title="Total Students"
            value={summary.totalStudents}
            color="bg-blue-500"
          />
          <ProgressCard
            icon={Target}
            title="Average Completion"
            value={`${summary.averageCompletion.toFixed(1)}%`}
            color="bg-green-500"
          />
          <ProgressCard
            icon={Award}
            title="Top Performer"
            value={progressData[0]?.student.user.name.split(' ')[0] || 'N/A'}
            subtitle={`${progressData[0]?.completionStats.completionPercentage.toFixed(1)}%`}
            color="bg-purple-500"
          />
          <ProgressCard
            icon={TrendingUp}
            title="Avg Daily Lines"
            value={progressData.reduce((sum, s) => sum + s.completionStats.averageDailyLines, 0) / progressData.length}
            subtitle="lines per day"
            color="bg-orange-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Progress Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Progress</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'completion') return [`${value}%`, 'Completion %'];
                      if (name === 'paras') return [value, 'Paras Completed'];
                      return [value, 'Avg Daily Lines'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completion" name="Completion %" fill="#3B82F6" />
                  <Bar dataKey="paras" name="Paras Completed" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Students']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Student Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Progress Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Roll No</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Completion %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Paras Completed</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Current Para</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Avg Daily Lines</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Est. Completion</th>
                </tr>
              </thead>
              <tbody>
                {progressData.map((student, index) => (
                  <tr key={student.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{student.student.user.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.rollNumber}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              student.completionStats.completionPercentage >= 90 ? 'bg-green-500' :
                              student.completionStats.completionPercentage >= 75 ? 'bg-blue-500' :
                              student.completionStats.completionPercentage >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(student.completionStats.completionPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="font-medium">{student.completionStats.completionPercentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.completionStats.parasCompleted}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      Para {student.completionStats.currentPara} ({student.completionStats.currentParaProgress.toFixed(1)}%)
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.completionStats.averageDailyLines.toFixed(1)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {student.completionStats.estimatedDaysRemaining 
                        ? `${student.completionStats.estimatedDaysRemaining} days`
                        : 'N/A'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Regular class progress
  const renderRegularProgress = () => {
    if (!classSummary) return null;

    const { summary, studentProgress } = classSummary;

    // Prepare chart data
    const gradeDistributionData = Object.entries(summary.gradeDistribution).map(([grade, count]) => ({
      grade: grade.replace('_', '+'),
      students: count
    }));

    const performanceTrendData = studentProgress.map(progress => ({
      month: `${progress.month}/${progress.year}`,
      percentage: progress.overallPercentage,
      student: progress.student.user.name
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressCard
            icon={Users}
            title="Total Students"
            value={summary.totalStudents}
            color="bg-blue-500"
          />
          <ProgressCard
            icon={BarChart3}
            title="Average Percentage"
            value={`${summary.averagePercentage.toFixed(1)}%`}
            color="bg-green-500"
          />
          <ProgressCard
            icon={GraduationCap}
            title="With Progress Reports"
            value={summary.studentsWithProgress}
            subtitle={`of ${summary.totalStudents}`}
            color="bg-purple-500"
          />
          <ProgressCard
            icon={Award}
            title="Top Grade"
            value={Object.entries(summary.gradeDistribution).reduce((a, b) => a[1] > b[1] ? a : b)[0].replace('_', '+')}
            color="bg-orange-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="students" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Trend */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Student Progress Table */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Progress Reports</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Month/Year</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Overall %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Attendance</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Behavior</th>
                </tr>
              </thead>
              <tbody>
                {studentProgress.map((progress, index) => (
                  <tr key={progress.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{progress.student.user.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{progress.month}/{progress.year}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`font-medium ${
                        progress.overallPercentage >= 90 ? 'text-green-600' :
                        progress.overallPercentage >= 75 ? 'text-blue-600' :
                        progress.overallPercentage >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {progress.overallPercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        progress.overallGrade === 'A_PLUS' ? 'bg-green-100 text-green-800' :
                        progress.overallGrade === 'A' ? 'bg-blue-100 text-blue-800' :
                        progress.overallGrade === 'B_PLUS' ? 'bg-yellow-100 text-yellow-800' :
                        progress.overallGrade === 'B' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {progress.overallGrade?.replace('_', '+')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {progress.attendance?.percentage || 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                      {progress.behavior || 'Good'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Progress Tracking</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-2">
              Monitor and track student progress across all class types
            </p>
          </div>
          <button
            onClick={() => {/* Implement export */}}
            className="mt-4 sm:mt-0 flex items-center space-x-2 bg-white text-[#F59E0B] border border-[#F59E0B] px-4 py-2 rounded-xl hover:bg-[#FFFBEB] transition-all duration-200 font-semibold text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-end space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value="">Choose a class</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} - {classItem.grade} ({classItem.type})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress Type</label>
              <select
                value={progressType}
                onChange={(e) => setProgressType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value="HIFZ">Hifz Progress</option>
                <option value="NAZRA">Nazra Progress</option>
                <option value="REGULAR">Regular Progress</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value="overview">Overview</option>
                <option value="detailed">Detailed</option>
                <option value="comparison">Comparison</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={loadClassProgress}
            disabled={loading || !selectedClass}
            className="flex items-center justify-center space-x-2 bg-[#F59E0B] text-white px-6 py-2 rounded-lg hover:bg-[#D97706] transition-all duration-200 disabled:opacity-50 font-semibold text-sm"
          >
            <Filter className="h-4 w-4" />
            <span>{loading ? 'Loading...' : 'Apply Filters'}</span>
          </button>
        </div>
      </div>

      {/* Progress Content */}
      {renderProgressView()}
    </div>
  );
};

export default ProgressTracking;