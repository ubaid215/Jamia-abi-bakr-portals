/* eslint-disable no-unused-vars */
import React from 'react';
import { X, Mail } from 'lucide-react';

const AssignTeacherModal = ({ 
  isOpen, onClose, onSubmit, classData, assignmentData, 
  setAssignmentData, loading, TeacherOptions, availableTeachers 
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(assignmentData.classId, assignmentData.teacherId);
  };

  const selectedTeacher = assignmentData.teacherId 
    ? availableTeachers.find(t => t.teacherId === assignmentData.teacherId)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Set Primary Teacher</h2>
          <p className="text-gray-600 text-sm mt-1">
            Assign the class teacher for <span className="font-semibold">{classData?.name}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher *</label>
            <select 
              required 
              value={assignmentData.teacherId}
              onChange={(e) => setAssignmentData(p => ({ ...p, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
            >
              <option value="">Choose a teacher</option>
              <TeacherOptions />
            </select>
          </div>

          {selectedTeacher && (
            <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                {selectedTeacher.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{selectedTeacher.name}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {selectedTeacher.specialization && <span>{selectedTeacher.specialization}</span>}
                  {selectedTeacher.email && (
                    <>
                      {selectedTeacher.specialization && <span>•</span>}
                      <span className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{selectedTeacher.email}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading || !assignmentData.teacherId}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium">
              {loading ? 'Assigning…' : 'Set as Primary Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(AssignTeacherModal);