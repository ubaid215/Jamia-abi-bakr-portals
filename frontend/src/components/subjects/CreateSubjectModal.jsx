/* eslint-disable no-unused-vars */
import React from 'react';
import { X, Loader2 } from 'lucide-react';

const CreateSubjectModal = ({ 
  isOpen, onClose, onSubmit, loading, 
  availableClasses, teachersLoading, TeacherOptions 
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    classRoomId: '',
    teacherId: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Subject</h2>
          <p className="text-gray-600 text-sm mt-1">Add a new subject to the system</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              placeholder="e.g., Quran, Arabic, Islamic Studies"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code (Optional)</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              placeholder="e.g., QUR-101, ARB-102"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Class (Optional)</label>
            <select
              value={formData.classRoomId}
              onChange={(e) => setFormData(p => ({ ...p, classRoomId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
            >
              <option value="">No class assigned</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.grade ? ` - Grade ${c.grade}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Assign Teacher (Optional)
              {teachersLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData(p => ({ ...p, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              disabled={teachersLoading}
            >
              <option value="">No teacher assigned</option>
              <TeacherOptions />
            </select>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Creating…' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(CreateSubjectModal);