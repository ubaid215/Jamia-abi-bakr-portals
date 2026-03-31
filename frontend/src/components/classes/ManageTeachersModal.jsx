/* eslint-disable no-unused-vars */
import React from 'react';
import { X, Users, Mail, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';
import { ROLE_OPTIONS, getRoleConfig } from '../../pages/admin/ClassManagement';

const ManageTeachersModal = ({
  isOpen, onClose, classData, classTeachers, teachersLoading,
  addTeacherForm, setAddTeacherForm, addingTeacher, removingTeacherId,
  onAddTeacher, onChangeRole, onRemoveTeacher, TeacherOptions, availableTeachers
}) => {
  if (!isOpen) return null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAddTeacher(addTeacherForm.teacherId, addTeacherForm.role);
  };

  const selectedTeacherPreview = addTeacherForm.teacherId
    ? availableTeachers.find(t => t.teacherId === addTeacherForm.teacherId)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Teachers</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              <span className="font-medium text-gray-700">{classData?.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current teachers list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Assigned Teachers ({classTeachers.length})
            </h3>

            {teachersLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : classTeachers.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No teachers assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classTeachers.map((ct) => {
                  const roleConfig = getRoleConfig(ct.role);
                  const name = ct.teacher?.user?.name || 'Unknown';
                  const email = ct.teacher?.user?.email || '';
                  const spec = ct.teacher?.specialization || '';
                  const isPrimary = ct.teacherId === classData?.teacherId;

                  return (
                    <div key={ct.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-sm ${
                        ct.role === 'CLASS_TEACHER'
                          ? 'bg-purple-100 text-purple-700'
                          : ct.role === 'CO_TEACHER'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                          {isPrimary && (
                            <ShieldCheck className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" title="Primary teacher" />
                          )}
                        </div>
                        {(spec || email) && (
                          <p className="text-xs text-gray-400 truncate">{spec || email}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <select
                          value={ct.role}
                          onChange={(e) => onChangeRole(ct.teacherId, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#F59E0B] bg-white"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => onRemoveTeacher(ct.teacherId, name)}
                          disabled={removingTeacherId === ct.teacherId}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Remove teacher"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add teacher form */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Teacher</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Teacher</label>
                <select
                  required
                  value={addTeacherForm.teacherId}
                  onChange={(e) => setAddTeacherForm(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                >
                  <option value="">Choose a teacher…</option>
                  <TeacherOptions exclude={classTeachers.map(ct => ct.teacherId)} />
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={addTeacherForm.role}
                  onChange={(e) => setAddTeacherForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {selectedTeacherPreview && (
                <div className="flex items-center space-x-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
                  <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {selectedTeacherPreview.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedTeacherPreview.name}</p>
                    {selectedTeacherPreview.specialization && (
                      <p className="text-xs text-gray-500">{selectedTeacherPreview.specialization}</p>
                    )}
                    {selectedTeacherPreview.email && (
                      <p className="flex items-center space-x-1 text-xs text-gray-400">
                        <Mail className="h-3 w-3" />
                        <span>{selectedTeacherPreview.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!addTeacherForm.teacherId || addingTeacher}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] disabled:opacity-50 text-sm font-medium transition-all"
              >
                <UserPlus className="h-4 w-4" />
                <span>{addingTeacher ? 'Adding…' : 'Add Teacher'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ManageTeachersModal);