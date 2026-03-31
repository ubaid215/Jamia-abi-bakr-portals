/* eslint-disable no-unused-vars */
import React from 'react';
import { MoreVertical, Edit, Trash2, UserCheck, School, Clock, Save, X } from 'lucide-react';

const SubjectCard = React.memo(({
  subject,
  assignedClass,
  assignedTeacher,
  isEditing,
  editForm,
  setEditForm,
  actionMenu,
  actionMenuRef,
  availableClasses,
  teachersLoading,
  TeacherOptions,
  loading,
  onActionMenuClick,
  onOpenAssignModal,
  onOpenEditMode,
  onDeleteSubject,
  onSaveEdit,
  onCancelEdit
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200 relative">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
            {subject.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm font-semibold"
                  placeholder="Subject name"
                />
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm(p => ({ ...p, code: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-xs"
                  placeholder="Subject code (optional)"
                />
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{subject.name}</h3>
                {subject.code && (
                  <p className="text-gray-500 text-xs sm:text-sm">Code: {subject.code}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action menu */}
        {!isEditing && (
          <div className="relative flex-shrink-0 ml-2">
            <button
              onClick={(e) => onActionMenuClick(e, subject.id)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
            {actionMenu === subject.id && (
              <div
                ref={actionMenuRef}
                className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-36"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenAssignModal(subject); }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <UserCheck className="h-3 w-3 text-blue-600" />
                  <span>Assign Teacher</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenEditMode(subject); }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <Edit className="h-3 w-3 text-gray-600" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSubject(subject.id); }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class assignment */}
      <div className="mb-3">
        {isEditing ? (
          <select
            value={editForm.classRoomId}
            onChange={(e) => setEditForm(p => ({ ...p, classRoomId: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="">No class assigned</option>
            {availableClasses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.grade ? ` - Grade ${c.grade}` : ''}
              </option>
            ))}
          </select>
        ) : assignedClass ? (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <School className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium">{assignedClass.name}</span>
            {assignedClass.grade && (
              <span className="text-gray-500">(Grade {assignedClass.grade})</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">No class assigned</div>
        )}
      </div>

      {/* Teacher section */}
      <div className="border-t border-gray-100 pt-3">
        {isEditing ? (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Assigned Teacher</p>
            <select
              value={editForm.teacherId}
              onChange={(e) => setEditForm(p => ({ ...p, teacherId: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              disabled={teachersLoading}
            >
              <option value="">No teacher assigned</option>
              <TeacherOptions />
            </select>
          </div>
        ) : assignedTeacher ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                {assignedTeacher.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{assignedTeacher.name}</p>
                {assignedTeacher.specialization && (
                  <p className="text-xs text-gray-400 truncate">{assignedTeacher.specialization}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              <UserCheck className="h-3.5 w-3.5 text-green-500" />
              <button
                onClick={() => onOpenAssignModal(subject)}
                className="text-xs text-[#F59E0B] hover:text-[#D97706] font-medium transition-colors"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onOpenAssignModal(subject)}
            className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] border border-dashed border-[#F59E0B] hover:border-[#D97706] rounded-lg py-2 text-xs font-medium transition-all duration-200"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assign Teacher</span>
          </button>
        )}
      </div>

      {/* Edit actions */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
          <button
            onClick={onCancelEdit}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 flex items-center space-x-1"
          >
            <X className="h-3 w-3" /><span>Cancel</span>
          </button>
          <button
            onClick={() => onSaveEdit(subject.id)}
            disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg text-xs hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 flex items-center space-x-1"
          >
            <Save className="h-3 w-3" /><span>Save</span>
          </button>
        </div>
      )}

      {/* Created date */}
      {!isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-gray-400 text-xs">
            <Clock className="h-3 w-3" />
            <span>Created {new Date(subject.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default SubjectCard;