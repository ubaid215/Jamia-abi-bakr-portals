import React, { useState, useEffect } from 'react';
import { useStudent } from '../../contexts/StudentContext';
import {
  Calendar,
  Filter,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AttendanceHistory = () => {
  const {
    attendance,
    loading,
    error,
    fetchMyAttendance
  } = useStudent();

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMyAttendance(filters);
  }, [fetchMyAttendance, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }) // Reset to first page when filters change
    }));
  };

  const handleDateFilter = () => {
    if (filters.startDate && filters.endDate) {
      fetchMyAttendance(filters);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
    setSearchTerm('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'LATE':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'EXCUSED':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'ABSENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'LATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXCUSED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRecords = attendance?.attendance?.filter(record => 
    record.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.classRoom?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.teacher?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading && !attendance) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">Attendance History</h1>
              <p className="text-gray-600 mt-1">
                Track your attendance records and statistics
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {attendance?.statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total</span>
              </div>
              <p className="text-2xl font-bold text-black">{attendance.statistics.total}</p>
              <p className="text-xs text-gray-500">Records</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Present</span>
              </div>
              <p className="text-2xl font-bold text-black">{attendance.statistics.present}</p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0 
                  ? Math.round((attendance.statistics.present / attendance.statistics.total) * 100) 
                  : 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-600">Absent</span>
              </div>
              <p className="text-2xl font-bold text-black">{attendance.statistics.absent}</p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0 
                  ? Math.round((attendance.statistics.absent / attendance.statistics.total) * 100) 
                  : 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-600">Late</span>
              </div>
              <p className="text-2xl font-bold text-black">{attendance.statistics.late}</p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0 
                  ? Math.round((attendance.statistics.late / attendance.statistics.total) * 100) 
                  : 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Overall</span>
              </div>
              <p className="text-2xl font-bold text-black">{attendance.statistics.attendancePercentage}%</p>
              <p className="text-xs text-gray-500">Attendance Rate</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {(filters.startDate || filters.endDate || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by subject, class, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleDateFilter}
                  disabled={!filters.startDate || !filters.endDate}
                  className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Date Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">
                        {formatDate(record.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.subject?.name || 'General'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.classRoom?.name || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {record.classRoom?.type?.toLowerCase() || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.teacher?.user?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {record.remarks || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <div className="divide-y divide-gray-200">
              {filteredRecords.map((record, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-black">
                      {formatDate(record.date)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subject:</span>
                      <span className="text-sm font-medium text-black">
                        {record.subject?.name || 'General'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Class:</span>
                      <span className="text-sm font-medium text-black">
                        {record.classRoom?.name || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Teacher:</span>
                      <span className="text-sm font-medium text-black">
                        {record.teacher?.user?.name || 'N/A'}
                      </span>
                    </div>
                    
                    {record.remarks && (
                      <div>
                        <span className="text-sm text-gray-600">Remarks:</span>
                        <p className="text-sm text-black mt-1">{record.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">No attendance records found</h3>
              <p className="text-gray-600">
                {searchTerm || filters.startDate || filters.endDate 
                  ? 'Try adjusting your filters or search terms'
                  : 'No attendance records available for the selected period'
                }
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">Error loading attendance</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => fetchMyAttendance(filters)}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {attendance?.pagination && attendance.pagination.total > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
              {Math.min(filters.page * filters.limit, attendance.pagination.total)} of{' '}
              {attendance.pagination.total} records
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page >= attendance.pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;