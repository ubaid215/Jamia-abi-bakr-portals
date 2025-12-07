/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  School, 
  User, 
  Clock,
  TrendingUp,
  FileText,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const StudentEnrollmentHistory = () => {
  const { id } = useParams(); // Changed from studentId to id
  const navigate = useNavigate();
  const { fetchStudentEnrollmentHistory, loading } = useAdmin();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  console.log('StudentEnrollmentHistory component - studentId:', id); // Debug log

  useEffect(() => {
    if (id) {
      loadHistory();
    } else {
      console.error('Student ID is undefined in URL params');
      setError('Student ID not found in URL');
      toast.error('Invalid student ID');
    }
  }, [id]);

  const loadHistory = async () => {
    try {
      console.log('Loading enrollment history for student:', id);
      const data = await fetchStudentEnrollmentHistory(id);
      console.log('Enrollment history data:', data);
      setHistory(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load enrollment history:', error);
      setError(error.message || 'Failed to load enrollment history');
      toast.error('Failed to load enrollment history');
    }
  };

  const getClassTypeColor = (type) => {
    switch (type) {
      case 'HIFZ': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'NAZRA': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'REGULAR': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900">Error Loading History</h3>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading || !history) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
        <p className="text-gray-600">Loading enrollment history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6 shadow-lg">
        <button
          onClick={() => navigate(`/admin/students/${id}`)}
          className="flex items-center text-[#92400E] hover:text-[#B45309] mb-4 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Student</span>
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#92400E]">
              Enrollment History
            </h1>
            <div className="flex items-center space-x-3 mt-2">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-[#B45309]" />
                <p className="text-[#B45309] font-medium">
                  {history.student?.name || 'Unknown Student'}
                </p>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 text-sm">
                Admission: {history.student?.admissionNo || 'N/A'}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Total Enrollments</div>
            <div className="text-2xl md:text-3xl font-bold text-[#F59E0B]">
              {history.summary?.totalEnrollments || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-blue-800">
            {history.summary?.totalEnrollments || 0}
          </div>
          <div className="text-sm text-blue-600 font-medium mt-1">Total Enrollments</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-green-800">
            {history.enrollments?.filter(e => e.isCurrent).length || 0}
          </div>
          <div className="text-sm text-green-600 font-medium mt-1">Current</div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-purple-800">
            {history.enrollments?.filter(e => !e.isCurrent).length || 0}
          </div>
          <div className="text-sm text-purple-600 font-medium mt-1">Completed</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Class History Timeline</h2>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>Sorted by most recent</span>
          </div>
        </div>
        
        {!history.enrollments || history.enrollments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Enrollment History</h3>
            <p className="text-gray-600">This student has no enrollment records.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.enrollments.map((enrollment, index) => {
              const startDate = new Date(enrollment.startDate);
              const endDate = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
              const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
              const durationMonths = Math.floor(durationDays / 30);
              
              return (
                <div key={enrollment.id || index} className="relative">
                  {/* Timeline Line */}
                  {index !== history.enrollments.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-[#F59E0B] via-[#F59E0B] to-[#F59E0B]/30"></div>
                  )}
                  
                  {/* Enrollment Card */}
                  <div className="flex items-start space-x-4">
                    {/* Timeline Dot */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                      enrollment.isCurrent 
                        ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] ring-2 ring-[#F59E0B]/20' 
                        : 'bg-gray-300 ring-2 ring-gray-300/20'
                    }`}>
                      <School className="h-6 w-6 text-white" />
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:border-[#FDE68A] transition-all duration-200 hover:shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {enrollment.classRoom?.name || 'Unknown Class'}
                            </h3>
                            {enrollment.isCurrent && (
                              <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-800 text-xs rounded-full font-semibold border border-green-200">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {enrollment.classRoom?.type && (
                              <span className={`px-2.5 py-1 text-xs rounded-full border font-medium ${getClassTypeColor(enrollment.classRoom.type)}`}>
                                {enrollment.classRoom.type}
                              </span>
                            )}
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs rounded-full border border-gray-200">
                              Roll No: {enrollment.rollNumber || 'N/A'}
                            </span>
                            {enrollment.classRoom?.grade && (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200">
                                Grade {enrollment.classRoom.grade}
                              </span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1.5 text-[#F59E0B]" />
                              <span className="font-medium">Started:</span>
                              <span className="ml-1.5">{startDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}</span>
                            </span>
                            {enrollment.endDate && (
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1.5 text-[#D97706]" />
                                <span className="font-medium">Ended:</span>
                                <span className="ml-1.5">{endDate.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {/* Duration */}
                          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <Clock className="h-4 w-4 mr-1.5 text-[#92400E]" />
                            <span className="font-medium text-[#92400E]">
                              {durationMonths > 0 
                                ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}`
                                : `${durationDays} day${durationDays > 1 ? 's' : ''}`
                              }
                            </span>
                          </div>
                          
                          {/* Teacher */}
                          {enrollment.classRoom?.teacher?.user?.name && (
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                              <User className="h-4 w-4 mr-1.5 text-[#B45309]" />
                              <span className="font-medium text-[#B45309]">
                                {enrollment.classRoom.teacher.user.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Promotion Info */}
                      {enrollment.promotedTo && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-start space-x-2 text-sm">
                            <TrendingUp className="h-4 w-4 mt-0.5 text-green-600" />
                            <div>
                              <span className="font-medium text-green-800">Promoted to: </span>
                              <span className="text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200 ml-1">
                                {enrollment.promotedTo}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentHistory;