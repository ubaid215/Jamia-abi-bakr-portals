/* eslint-disable no-unused-vars */
// components/AttendanceOverview.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useClass } from '../../contexts/ClassContext';
import { toast } from 'react-hot-toast';

// Chart components (you can use Recharts, Chart.js, or any other chart library)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const AttendanceOverview = () => {
  const { 
    fetchAttendanceOverview, 
    fetchAttendanceTrends, 
    fetchClassAttendanceComparison,
    loading 
  } = useAdmin();
  
  const { classes, fetchClasses } = useClass();
  
  const [overviewData, setOverviewData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    classRoomId: '',
    days: 30
  });

  useEffect(() => {
    fetchClasses();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overview, trends, comparison] = await Promise.all([
        fetchAttendanceOverview(filters),
        fetchAttendanceTrends({ days: filters.days, classRoomId: filters.classRoomId }),
        fetchClassAttendanceComparison(filters)
      ]);
      
      setOverviewData(overview);
      setTrendsData(trends);
      setComparisonData(comparison);
    } catch (error) {
      toast.error('Failed to load attendance data');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadData();
  };

  const handleExportData = () => {
    // Implement export functionality
    toast.success('Export feature coming soon!');
  };

  // Status card component
  const StatusCard = ({ icon: Icon, title, value, percentage, color, trend }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value?.toLocaleString()}</p>
          {percentage && (
            <div className="flex items-center mt-2">
              <TrendingUp className={`h-4 w-4 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ml-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {percentage}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs previous period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading && !overviewData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Attendance Overview</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-2">
              Comprehensive view of attendance patterns and statistics
            </p>
          </div>
          <button
            onClick={handleExportData}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={filters.classRoomId}
                onChange={(e) => handleFilterChange('classRoomId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value="">All Classes</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} - {classItem.grade} {classItem.section}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trend Days</label>
              <select
                value={filters.days}
                onChange={(e) => handleFilterChange('days', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-[#F59E0B] text-white px-6 py-2 rounded-lg hover:bg-[#D97706] transition-all duration-200 disabled:opacity-50 font-semibold text-sm"
          >
            <Filter className="h-4 w-4" />
            <span>{loading ? 'Applying...' : 'Apply Filters'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard
            icon={Users}
            title="Total Students"
            value={overviewData.summary.enrolledStudents}
            color="bg-blue-500"
          />
          <StatusCard
            icon={CheckCircle}
            title="Overall Attendance"
            value={overviewData.summary.overallAttendancePercentage}
            percentage={overviewData.summary.overallAttendancePercentage}
            trend="up"
            color="bg-green-500"
          />
          <StatusCard
            icon={Calendar}
            title="Records Processed"
            value={overviewData.summary.totalRecords}
            color="bg-purple-500"
          />
          <StatusCard
            icon={TrendingUp}
            title="Present Today"
            value={overviewData.summary.presentCount}
            percentage={((overviewData.summary.presentCount / overviewData.summary.totalRecords) * 100).toFixed(1)}
            trend="up"
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        {overviewData?.charts?.statusDistribution && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Status Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewData.charts.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {overviewData.charts.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily Trends Line Chart */}
        {trendsData && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    formatter={(value, name) => {
                      if (name === 'percentage') return [`${value}%`, 'Attendance Rate'];
                      return [value, name === 'present' ? 'Present' : 'Total'];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="percentage"
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Class Comparison Table */}
      {comparisonData && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class-wise Attendance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Students</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Attendance %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Present Count</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.classes.map((classItem, index) => (
                  <tr key={classItem.classId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{classItem.className}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        classItem.classType === 'REGULAR' ? 'bg-blue-100 text-blue-800' :
                        classItem.classType === 'HIFZ' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {classItem.classType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{classItem.totalStudents}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              classItem.attendancePercentage >= 90 ? 'bg-green-500' :
                              classItem.attendancePercentage >= 75 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(classItem.attendancePercentage, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${
                          classItem.attendancePercentage >= 90 ? 'text-green-600' :
                          classItem.attendancePercentage >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {classItem.attendancePercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{classItem.presentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Present</p>
                <p className="text-2xl font-bold text-green-900">{overviewData.summary.presentCount}</p>
                <p className="text-sm text-green-600">
                  {((overviewData.summary.presentCount / overviewData.summary.totalRecords) * 100).toFixed(1)}% of records
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-linear-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Absent</p>
                <p className="text-2xl font-bold text-red-900">{overviewData.summary.absentCount}</p>
                <p className="text-sm text-red-600">
                  {((overviewData.summary.absentCount / overviewData.summary.totalRecords) * 100).toFixed(1)}% of records
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-linear-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Late & Excused</p>
                <p className="text-2xl font-bold text-orange-900">
                  {overviewData.summary.lateCount + overviewData.summary.excusedCount}
                </p>
                <p className="text-sm text-orange-600">
                  {(((overviewData.summary.lateCount + overviewData.summary.excusedCount) / overviewData.summary.totalRecords) * 100).toFixed(1)}% of records
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceOverview;