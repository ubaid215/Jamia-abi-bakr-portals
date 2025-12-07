/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertCircle, CheckCircle, XCircle, Users, BookOpen, Loader2 } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const BatchPromotionModal = ({ isOpen, onClose, selectedStudents, onSuccess }) => {
  const { promoteStudents, fetchClasses, loading } = useAdmin();
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [formData, setFormData] = useState({
    newClassRoomId: '',
    reason: ''
  });
  const [result, setResult] = useState(null);
  const [promotionLoading, setPromotionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      setResult(null);
      setFormData({ newClassRoomId: '', reason: '' });
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      setClassesLoading(true);
      const data = await fetchClasses();
      
      // Handle different response structures
      let classesArray = [];
      
      if (Array.isArray(data)) {
        classesArray = data;
      } else if (data && typeof data === 'object') {
        if (data.classes && Array.isArray(data.classes)) {
          classesArray = data.classes;
        } else if (data.data && Array.isArray(data.data)) {
          classesArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          classesArray = data.items;
        } else {
          classesArray = Object.values(data);
        }
      }
      
      // Filter out non-array items and ensure we have valid data
      classesArray = classesArray.filter(item => 
        item && typeof item === 'object' && item.id !== undefined
      );
      
      setClasses(classesArray);
      
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.newClassRoomId) {
      toast.error('Please select a class');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    try {
      setPromotionLoading(true);
      
      // Extract student IDs from selected students
      // Get studentProfile.id first, then fall back to user.id
      const studentIds = selectedStudents.map(student => {
        console.log('Student data:', student); // Debug log
        
        // Try to get student ID from different possible locations
        if (student.studentProfile?.id) {
          return student.studentProfile.id;
        }
        if (student.id && student.user) {
          // This is likely a user ID, we need to convert it
          return student.id; // Let the backend handle user ID to student ID conversion
        }
        return student.id;
      });

      console.log('Promoting students with IDs:', studentIds);

      const promotionResult = await promoteStudents({
        studentIds: studentIds,
        newClassRoomId: formData.newClassRoomId,
        reason: formData.reason || undefined
      });
      
      setResult(promotionResult);
      
      if (promotionResult.summary?.successful > 0) {
        toast.success(`Successfully promoted ${promotionResult.summary.successful} student(s)`);
        if (onSuccess) onSuccess();
      }
      
      if (promotionResult.summary?.failed > 0) {
        toast.error(`Failed to promote ${promotionResult.summary.failed} student(s)`);
      }
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error(error.message || 'Failed to promote students');
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ newClassRoomId: '', reason: '' });
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  // Helper function to get student display name
  const getStudentName = (student) => {
    return student.user?.name || student.name || 'Unknown Student';
  };

  // Helper function to get current class
  const getCurrentClass = (student) => {
    return student.currentEnrollment?.classRoom?.name || 
           student.studentProfile?.currentEnrollment?.classRoom?.name || 
           'No class';
  };

  // Helper function to get roll number
  const getRollNumber = (student) => {
    return student.currentEnrollment?.rollNumber || 
           student.studentProfile?.currentEnrollment?.rollNumber || 
           'N/A';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#92400E]">Batch Student Promotion</h2>
                <p className="text-[#B45309] text-sm mt-0.5">
                  Promote {selectedStudents.length} selected student(s)
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-[#92400E]" />
            </button>
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Selected Students Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 mr-2 text-[#B45309]" />
                  Selected Students ({selectedStudents.length})
                </label>
                <span className="text-xs text-gray-500">Scroll to view all</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                {selectedStudents.map((student, index) => (
                  <div key={student.id || index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-[#FDE68A] transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {getStudentName(student).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {getStudentName(student)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.user?.email || student.email || 'No email'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {getCurrentClass(student)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Roll #{getRollNumber(student)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Class Selection */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <BookOpen className="h-4 w-4 mr-2 text-[#B45309]" />
                Promote to Class *
              </label>
              {classesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B] mr-2" />
                  <span className="text-gray-600">Loading classes...</span>
                </div>
              ) : (
                <>
                  <select
                    required
                    value={formData.newClassRoomId}
                    onChange={(e) => setFormData({ ...formData, newClassRoomId: e.target.value })}
                    disabled={classes.length === 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-gray-700 bg-white hover:border-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="text-gray-400">
                      {classes.length === 0 ? 'No classes available' : 'Select target class for promotion'}
                    </option>
                    {Array.isArray(classes) && classes.map(cls => (
                      <option key={cls.id} value={cls.id} className="text-gray-700">
                        {cls.name || 'Unnamed Class'} 
                        {cls.grade && ` - Grade ${cls.grade}`}
                        {cls.type && ` (${cls.type})`}
                      </option>
                    ))}
                  </select>
                  {classes.length === 0 && !classesLoading && (
                    <p className="text-sm text-red-600 mt-1">
                      No classes available. Please create classes first or check API response.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Students will be enrolled in the selected class with new roll numbers
                  </p>
                </>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <AlertCircle className="h-4 w-4 mr-2 text-[#B45309]" />
                Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows="3"
                placeholder="e.g., Annual Promotion - Academic Year 2025-2026, Semester Promotion, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-gray-700 bg-white hover:border-[#D97706] transition-colors resize-none"
              />
              <p className="text-xs text-gray-500">
                This will be recorded in the student's enrollment history
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={promotionLoading || classesLoading || classes.length === 0 || selectedStudents.length === 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center"
              >
                {promotionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Promote Students
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{result.summary?.total || 0}</div>
                <div className="text-sm text-gray-600 font-medium mt-1">Total</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-800">{result.summary?.successful || 0}</div>
                <div className="text-sm text-green-600 font-medium mt-1">Successful</div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-800">{result.summary?.failed || 0}</div>
                <div className="text-sm text-red-600 font-medium mt-1">Failed</div>
              </div>
            </div>

            {/* Successful Promotions */}
            {result.promoted && result.promoted.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Successfully Promoted ({result.promoted.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.promoted.map((student, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 hover:border-green-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-green-900">
                            {student.studentName || `Student ${index + 1}`}
                          </div>
                          <div className="text-green-700 text-sm mt-1">
                            {student.fromClass || 'Previous Class'} → {student.toClass || 'New Class'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-green-200 text-green-900 text-xs rounded-full font-medium">
                            Roll #{student.rollNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Promotions */}
            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  Failed Promotions ({result.errors.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4 hover:border-red-300 transition-colors">
                      <div className="font-medium text-red-900 mb-1">
                        {error.studentName || error.studentId || `Student ${index + 1}`}
                      </div>
                      <div className="text-red-700 text-sm">{error.error || 'Unknown error'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Close and Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchPromotionModal;