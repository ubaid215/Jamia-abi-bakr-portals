import React, { useState, useEffect } from "react";
import { useStudent } from "../../contexts/StudentContext";
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
  ChevronUp,
} from "lucide-react";

const AttendanceHistory = () => {
  const { attendance, loading, error, fetchMyAttendance } = useStudent();

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMyAttendance(filters);
  }, [fetchMyAttendance, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && { page: 1 }), // Reset to first page when filters change
    }));
  };

  const handleDateFilter = () => {
    if (filters.startDate && filters.endDate) {
      fetchMyAttendance(filters);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      page: 1,
      limit: 20,
    });
    setSearchTerm("");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "ABSENT":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "LATE":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "EXCUSED":
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-50 text-green-700 border-green-200";
      case "ABSENT":
        return "bg-red-50 text-red-700 border-red-200";
      case "LATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "EXCUSED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredRecords =
    attendance?.attendance?.filter(
      (record) =>
        record.subject?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.classRoom?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.teacher?.user?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-black truncate">
                  Attendance
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  History & Statistics
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Quick stats badge for mobile */}
              <div className="hidden xs:block sm:hidden bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-medium">
                95%
              </div>
              <button className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs sm:text-sm whitespace-nowrap">
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Export</span>
                <span className="inline sm:hidden">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Statistics Cards */}
        {attendance?.statistics && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            {/* Total Records */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 text-center">
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                {attendance.statistics.total}
              </p>
              <p className="text-xs text-gray-500">Records</p>
            </div>

            {/* Present */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 text-center">
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Present
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                {attendance.statistics.present}
              </p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0
                  ? Math.round(
                      (attendance.statistics.present /
                        attendance.statistics.total) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>

            {/* Absent */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 text-center">
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-red-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Absent
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                {attendance.statistics.absent}
              </p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0
                  ? Math.round(
                      (attendance.statistics.absent /
                        attendance.statistics.total) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>

            {/* Late */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 text-center">
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-amber-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Late
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                {attendance.statistics.late}
              </p>
              <p className="text-xs text-gray-500">
                {attendance.statistics.total > 0
                  ? Math.round(
                      (attendance.statistics.late /
                        attendance.statistics.total) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>

            {/* Overall */}
            <div className="col-span-2 sm:col-span-1 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 text-center">
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Overall
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black truncate">
                {attendance.statistics.attendancePercentage}%
              </p>
              <p className="text-xs text-gray-500">Attendance Rate</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1.5 sm:space-x-2 bg-gray-100 text-gray-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Filters</span>
                {showFilters ? (
                  <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                )}
              </button>

              {(filters.startDate || filters.endDate || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by subject or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full text-sm"
              />
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleDateFilter}
                  disabled={!filters.startDate || !filters.endDate}
                  className="w-full bg-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Apply Date Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Subject
                  </th>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Class
                  </th>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Teacher
                  </th>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">
                        {formatDate(record.date)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-[120px]">
                        {record.subject?.name || "General"}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.classRoom?.name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {record.classRoom?.type?.toLowerCase() || ""}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-[120px]">
                        {record.teacher?.user?.name || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="text-sm text-gray-900 truncate max-w-[150px]">
                        {record.remarks || "-"}
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
                <div
                  key={index}
                  className="p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-1.5">
                      {getStatusIcon(record.status)}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-black">
                      {formatDate(record.date, "mobile")}
                    </div>
                  </div>

                  {/* Mobile Details */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600">Subject:</span>
                      <span className="text-xs sm:text-sm font-medium text-black text-right max-w-[60%] truncate">
                        {record.subject?.name || "General"}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600">Class:</span>
                      <span className="text-xs sm:text-sm font-medium text-black text-right max-w-[60%] truncate">
                        {record.classRoom?.name || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600">Teacher:</span>
                      <span className="text-xs sm:text-sm font-medium text-black text-right max-w-[60%] truncate">
                        {record.teacher?.user?.name || "N/A"}
                      </span>
                    </div>

                    {record.remarks && (
                      <div className="pt-1.5">
                        <span className="text-xs text-gray-600 block mb-0.5">
                          Remarks:
                        </span>
                        <p className="text-xs text-black line-clamp-2">
                          {record.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 sm:py-10 lg:py-12">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
                No attendance records found
              </h3>
              <p className="text-sm text-gray-600 px-4 max-w-md mx-auto">
                {searchTerm || filters.startDate || filters.endDate
                  ? "Try adjusting your filters or search terms"
                  : "No attendance records available for the selected period"}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 sm:py-10 lg:py-12">
              <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-500 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
                Error loading attendance
              </h3>
              <p className="text-sm text-gray-600 mb-3 sm:mb-4 px-4">{error}</p>
              <button
                onClick={() => fetchMyAttendance(filters)}
                className="bg-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {attendance?.pagination && attendance.pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 sm:mt-6">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              Showing {(filters.page - 1) * filters.limit + 1} to{" "}
              {Math.min(
                filters.page * filters.limit,
                attendance.pagination.total
              )}{" "}
              of {attendance.pagination.total} records
            </div>

            <div className="flex space-x-2 justify-center">
              <button
                onClick={() => handleFilterChange("page", filters.page - 1)}
                disabled={filters.page === 1}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => handleFilterChange("page", filters.page + 1)}
                disabled={filters.page >= attendance.pagination.pages}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
