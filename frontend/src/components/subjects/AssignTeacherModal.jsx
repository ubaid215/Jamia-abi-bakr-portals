/* eslint-disable no-unused-vars */
import React from 'react';
import { X, UserCheck, Loader2 } from 'lucide-react';

const AssignTeacherModal = ({ 
  isOpen, onClose, onSubmit, subject, assignmentData, setAssignmentData,
  assignedTeacher, loading, teachersLoading, teachers, onRetryFetch, TeacherOptions 
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(assignmentData.subjectId, assignmentData.teacherId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Assign Teacher</h2>
          <p className="text-gray-600 text-sm mt-1">
            Assign a teacher to{' '}
            <span className="font-semibold text-gray-800">{subject?.name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Currently assigned banner */}
          {assignedTeacher && (
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <UserCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Currently assigned:{' '}
                <span className="font-semibold">{assignedTeacher.name}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Select Teacher *
              {teachersLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </label>
            <select
              required
              value={assignmentData.teacherId}
              onChange={(e) => setAssignmentData(p => ({ ...p, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              disabled={teachersLoading}
            >
              <option value="">Choose a teacher</option>
              <TeacherOptions />
            </select>

            {/* Empty state with retry */}
            {!teachersLoading && teachers.length === 0 && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-red-500">No teachers found.</p>
                <button
                  type="button"
                  onClick={onRetryFetch}
                  className="text-xs text-[#F59E0B] underline hover:text-[#D97706]"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !assignmentData.teacherId || teachersLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Assigning…' : 'Assign Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(AssignTeacherModal);