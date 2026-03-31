/* eslint-disable no-unused-vars */
import React from 'react';
import { X } from 'lucide-react';

const CreateClassModal = ({ isOpen, onClose, onSubmit, loading, TeacherOptions }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    grade: '',
    section: '',
    type: 'REGULAR',
    description: '',
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
          <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
          <p className="text-gray-600 text-sm mt-1">Add a new class to the system</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input
              type="text" required
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              placeholder="e.g., Class 5A, Hifz Batch 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <input type="text" value={formData.grade}
                onChange={(e) => setFormData(p => ({ ...p, grade: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                placeholder="e.g., 5, 6" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <input type="text" value={formData.section}
                onChange={(e) => setFormData(p => ({ ...p, section: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                placeholder="e.g., A, B" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Type *</label>
            <select required value={formData.type}
              onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm">
              <option value="REGULAR">Regular (Dars-e-Nizami)</option>
              <option value="HIFZ">Hifz</option>
              <option value="NAZRA">Nazra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Teacher <span className="text-gray-400 font-normal">(optional — can add more after)</span>
            </label>
            <select value={formData.teacherId}
              onChange={(e) => setFormData(p => ({ ...p, teacherId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm">
              <option value="">No teacher assigned</option>
              <TeacherOptions />
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
              placeholder="Optional class description…" />
          </div>
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium">
              {loading ? 'Creating…' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(CreateClassModal);