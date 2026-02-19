/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import StudentSelector from '../../components/shared/StudentSelector';
import DateRangePicker from '../../components/shared/DateRangePicker';

const AttendanceSelectorModal = ({ isOpen, onClose, onSelect, currentAttendanceId = null }) => {
  const {
    selectedStudent,
    selectedClassroom,
    classroomStudents
  } = useActivity();

  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  // Mock attendance data - replace with actual API call
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Load attendance records
  useEffect(() => {
    if (selectedStudent?.id && isOpen) {
      // This should be replaced with actual API call
      const mockAttendance = [
        {
          id: 'att-1',
          date: new Date().toISOString(),
          status: 'PRESENT',
          studentId: selectedStudent.id,
          studentName: selectedStudent.user?.name,
          classRoomName: selectedClassroom?.name,
          subjectName: 'Mathematics',
          remarks: 'On time'
        },
        {
          id: 'att-2',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'LATE',
          studentId: selectedStudent.id,
          studentName: selectedStudent.user?.name,
          classRoomName: selectedClassroom?.name,
          subjectName: 'English',
          remarks: '15 minutes late'
        },
        {
          id: 'att-3',
          date: new Date(Date.now() - 172800000).toISOString(),
          status: 'ABSENT',
          studentId: selectedStudent.id,
          studentName: selectedStudent.user?.name,
          classRoomName: selectedClassroom?.name,
          subjectName: 'Science',
          remarks: 'Excused - sick'
        }
      ];

      setAttendanceRecords(mockAttendance);
    }
  }, [selectedStudent, selectedClassroom, isOpen]);

  // Filter attendance records
  const filteredAttendance = attendanceRecords.filter(record => {
    // Date filter
    const recordDate = new Date(record.date);
    if (dateRange.startDate && dateRange.endDate) {
      if (recordDate < dateRange.startDate || recordDate > dateRange.endDate) {
        return false;
      }
    }

    // Status filter
    if (filterStatus !== 'all' && record.status !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        record.subjectName?.toLowerCase().includes(term) ||
        record.remarks?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'EXCUSED': return 'bg-blue-100 text-blue-800';
      case 'HALF_DAY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelect = (attendance) => {
    setSelectedAttendance(attendance);
  };

  const handleConfirm = () => {
    if (selectedAttendance) {
      onSelect(selectedAttendance);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-yellow-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Attendance Record
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Link this activity to an existing attendance record
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Filters Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student
                  </label>
                  <StudentSelector
                    value={selectedStudent}
                    onChange={() => { }} // Read-only for modal
                    label=""
                    disabled={true}
                    className="w-full"
                  />
                </div>

                <div>
                  <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={setDateRange}
                    label="Attendance Date Range"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="all">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="EXCUSED">Excused</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Records
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by subject, remarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">
                  Available Attendance Records
                </h4>
                <span className="text-sm text-gray-500">
                  {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''}
                </span>
              </div>

              {filteredAttendance.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No attendance records found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your filters or date range
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAttendance.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => handleSelect(record)}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedAttendance?.id === record.id
                          ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                          : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                              {currentAttendanceId === record.id && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  Currently Linked
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-gray-600 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(record.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Subject</p>
                              <p className="font-medium text-gray-900">{record.subjectName}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">Classroom</p>
                              <p className="font-medium text-gray-900">{record.classRoomName}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">Remarks</p>
                              <p className="font-medium text-gray-900">{record.remarks || 'No remarks'}</p>
                            </div>
                          </div>
                        </div>

                        {selectedAttendance?.id === record.id && (
                          <CheckCircle className="w-5 h-5 text-green-500 ml-4 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Record Preview */}
            {selectedAttendance && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-blue-800 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Selected Record
                  </h5>
                  <button
                    onClick={() => setSelectedAttendance(null)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-blue-600">Date:</span>
                    <p className="font-medium">
                      {new Date(selectedAttendance.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-blue-600">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedAttendance.status)}`}>
                      {selectedAttendance.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-blue-600">Subject:</span>
                    <p className="font-medium">{selectedAttendance.subjectName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-blue-600">Remarks:</span>
                    <p className="font-medium">{selectedAttendance.remarks || 'None'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Don't Link to Attendance
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedAttendance}
                className={`
                  px-4 py-2.5 text-sm font-medium rounded-lg
                  ${selectedAttendance
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSelectorModal;