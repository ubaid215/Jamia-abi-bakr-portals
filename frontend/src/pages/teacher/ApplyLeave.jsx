/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import {
  Calendar,
  Clock,
  FileText,
  Download,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock4,
  AlertCircle,
  BarChart3,
  User,
  Mail,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Trash2,
  Eye
} from 'lucide-react';

const ApplyLeave = () => {
  const {
    applyForLeave,
    getMyLeaveHistory,
    loading,
    teacher
  } = useTeacher();

  const [activeTab, setActiveTab] = useState('apply'); 
  const [leaveForm, setLeaveForm] = useState({
    fromDate: '',
    toDate: '',
    reason: '',
    supportingDocuments: []
  });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveStats, setLeaveStats] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [expandedLeave, setExpandedLeave] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLeaveHistory();
  }, []);

  useEffect(() => {
    calculateLeaveStats();
  }, [leaveHistory]);

  const loadLeaveHistory = async () => {
    try {
      const history = await getMyLeaveHistory();
      setLeaveHistory(history.leaveRequests || []);
    } catch (error) {
      console.error('Error loading leave history:', error);
    }
  };

  const calculateLeaveStats = () => {
    const stats = {
      total: leaveHistory.length,
      pending: leaveHistory.filter(leave => leave.status === 'PENDING').length,
      approved: leaveHistory.filter(leave => leave.status === 'APPROVED').length,
      rejected: leaveHistory.filter(leave => leave.status === 'REJECTED').length,
      totalDays: leaveHistory.reduce((total, leave) => {
        if (leave.status === 'APPROVED') {
          const from = new Date(leave.fromDate);
          const to = new Date(leave.toDate);
          const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
          return total + days;
        }
        return total;
      }, 0)
    };
    setLeaveStats(stats);
  };

  const handleInputChange = (field, value) => {
    setLeaveForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const calculateLeaveDays = () => {
    if (leaveForm.fromDate && leaveForm.toDate) {
      const from = new Date(leaveForm.fromDate);
      const to = new Date(leaveForm.toDate);
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const validateForm = () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      alert('Please fill in all required fields');
      return false;
    }

    const fromDate = new Date(leaveForm.fromDate);
    const toDate = new Date(leaveForm.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fromDate < today) {
      alert('Leave cannot start from a past date');
      return false;
    }

    if (toDate < fromDate) {
      alert('End date cannot be before start date');
      return false;
    }

    // Check for overlapping leaves
    const overlappingLeave = leaveHistory.find(leave => {
      if (leave.status === 'PENDING' || leave.status === 'APPROVED') {
        const existingFrom = new Date(leave.fromDate);
        const existingTo = new Date(leave.toDate);
        return (fromDate <= existingTo && toDate >= existingFrom);
      }
      return false;
    });

    if (overlappingLeave) {
      alert('You already have a pending or approved leave request for this period');
      return false;
    }

    return true;
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const leaveData = {
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: leaveForm.reason,
        supportingDocuments: selectedFile ? [selectedFile.name] : []
      };

      await applyForLeave(leaveData);
      
      // Reset form
      setLeaveForm({
        fromDate: '',
        toDate: '',
        reason: '',
        supportingDocuments: []
      });
      setSelectedFile(null);
      
      // Reload history
      await loadLeaveHistory();
      
      // Switch to history tab
      setActiveTab('history');
      
      alert('Leave application submitted successfully!');
    } catch (error) {
      console.error('Error submitting leave application:', error);
      alert(`Error submitting leave: ${error.response?.data?.error || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PENDING':
        return <Clock4 className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock4 className="h-4 w-4" />;
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

  const getLeaveDuration = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    return days === 1 ? '1 day' : `${days} days`;
  };

  const filteredLeaveHistory = leaveHistory.filter(leave => {
    if (filterStatus === 'all') return true;
    return leave.status === filterStatus;
  });

  const LeaveApplicationForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Plus className="h-5 w-5 mr-2 text-gold" />
          Apply for Leave
        </h2>
      </div>
      
      <form onSubmit={handleSubmitLeave} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date *
            </label>
            <input
              type="date"
              required
              value={leaveForm.fromDate}
              onChange={(e) => handleInputChange('fromDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date *
            </label>
            <input
              type="date"
              required
              value={leaveForm.toDate}
              onChange={(e) => handleInputChange('toDate', e.target.value)}
              min={leaveForm.fromDate || new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
        </div>

        {/* Leave Duration Display */}
        {leaveForm.fromDate && leaveForm.toDate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">
                Leave Duration:
              </span>
              <span className="text-sm text-blue-700">
                {getLeaveDuration(leaveForm.fromDate, leaveForm.toDate)}
                {calculateLeaveDays() > 1 && ` (${calculateLeaveDays()} days)`}
              </span>
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Leave *
          </label>
          <textarea
            required
            rows={4}
            value={leaveForm.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            placeholder="Please provide a detailed reason for your leave application..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
          />
        </div>

        {/* Supporting Documents */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supporting Documents (Optional)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent cursor-pointer hover:bg-gray-50 text-center">
                <Paperclip className="h-4 w-4 inline mr-2" />
                Choose File
              </div>
            </label>
            {selectedFile && (
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-md">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700 truncate max-w-xs">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, JPG, PNG, DOC, DOCX (Max: 5MB)
          </p>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex not-odd: justify-end border-amber-300">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 border-amber-300 rounded-md font-medium flex items-center ${
              isSubmitting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gold text-black  hover:bg-yellow-600'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full  h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Leave Application
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const LeaveHistory = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gold" />
            Leave History
          </h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredLeaveHistory.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave applications</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? "You haven't applied for any leave yet."
                : `No ${filterStatus.toLowerCase()} leave applications found.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeaveHistory.map((leave) => (
              <div key={leave.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                        {getStatusIcon(leave.status)}
                        <span className="ml-1">{leave.status}</span>
                      </span>
                      
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getLeaveDuration(leave.fromDate, leave.toDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Applied on {formatDate(leave.createdAt)}
                        </div>
                        {leave.appliedToAdmin && (
                          <div className="text-xs text-gray-500">
                            To: {leave.appliedToAdmin.name}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setExpandedLeave(expandedLeave === leave.id ? null : leave.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedLeave === leave.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedLeave === leave.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-md border">
                          {leave.reason}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Application Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Applied To:</span>
                            <span className="font-medium">
                              {leave.appliedToAdmin?.name || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Admin Email:</span>
                            <span className="font-medium">
                              {leave.appliedToAdmin?.email || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Application Date:</span>
                            <span className="font-medium">
                              {formatDate(leave.createdAt)}
                            </span>
                          </div>
                          {leave.updatedAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Updated:</span>
                              <span className="font-medium">
                                {formatDate(leave.updatedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supporting Documents */}
                    {leave.supportingDocuments && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Supporting Documents</h4>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {leave.supportingDocuments.length} document(s) attached
                          </span>
                          <button className="text-sm text-gold hover:text-yellow-600 font-medium">
                            View Documents
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin Remarks (if any) */}
                    {leave.adminRemarks && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="font-medium text-yellow-800 mb-1 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Admin Remarks
                        </h4>
                        <p className="text-sm text-yellow-700">{leave.adminRemarks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const LeaveSummary = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-gold" />
          Leave Summary
        </h2>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{leaveStats.total}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{leaveStats.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{leaveStats.approved}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{leaveStats.totalDays}</div>
            <div className="text-sm text-blue-600">Total Days</div>
          </div>
        </div>

        {/* Recent Leaves */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Leave Applications</h3>
          <div className="space-y-3">
            {leaveHistory.slice(0, 5).map((leave) => (
              <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                    {getStatusIcon(leave.status)}
                    <span className="ml-1">{leave.status}</span>
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {getLeaveDuration(leave.fromDate, leave.toDate)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {formatDate(leave.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Apply for leave and track your leave history
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{teacher?.name}</p>
                <p className="text-sm text-gray-600">{teacher?.email}</p>
              </div>
              <div className="h-10 w-10 bg-gold rounded-full flex items-center justify-center text-white font-semibold">
                {teacher?.name?.split(' ').map(n => n[0]).join('') || 'T'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'apply', label: 'Apply Leave', icon: Plus },
              { id: 'history', label: 'Leave History', icon: Clock },
              { id: 'summary', label: 'Summary', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-gold text-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'apply' && <LeaveApplicationForm />}
        {activeTab === 'history' && <LeaveHistory />}
        {activeTab === 'summary' && <LeaveSummary />}
      </div>
    </div>
  );
};

export default ApplyLeave;