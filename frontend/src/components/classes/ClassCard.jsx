import React from 'react';
import { MoreVertical, Users, BookOpen, UserCheck, Clock, UserPlus } from 'lucide-react';

const ClassCard = React.memo(({
  classItem,
  getPrimaryTeacher,
  getClassTeacherCount,
  getStudentCount,
  getSubjectCount,
  getTypeColor,
  actionMenu,
  actionMenuRef,
  onActionMenuClick,
  onOpenTeachersModal,
  onOpenAssignModal,
  onOpenEditModal,
  onDeleteClass
}) => {
  const primaryTeacher = getPrimaryTeacher(classItem);
  const teacherCount = getClassTeacherCount(classItem);
  const studentCount = getStudentCount(classItem);
  const subjectCount = getSubjectCount(classItem);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:border-[#F59E0B] hover:shadow-xl transition-all duration-200">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
            {classItem.name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{classItem.name}</h3>
            <p className="text-gray-500 text-xs sm:text-sm">
              {classItem.grade}{classItem.section && ` • ${classItem.section}`}
            </p>
          </div>
        </div>

        {/* Action menu */}
        <div className="relative">
          <button
            onClick={(e) => onActionMenuClick(e, classItem.id)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
          {actionMenu === classItem.id && (
            <div ref={actionMenuRef} className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40">
              <button
                onClick={() => onOpenTeachersModal(classItem)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <Users className="h-3 w-3 text-[#F59E0B]" />
                <span>Manage Teachers</span>
              </button>
              <button
                onClick={() => onOpenAssignModal(classItem)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <UserCheck className="h-3 w-3 text-blue-600" />
                <span>Primary Teacher</span>
              </button>
              <button
                onClick={() => onOpenEditModal(classItem)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Class</span>
              </button>
              <button
                onClick={() => onDeleteClass(classItem.id)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Type badge */}
      <div className="mb-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(classItem.type)}`}>
          {classItem.type}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs sm:text-sm text-gray-600">
        {classItem.description && (
          <p className="col-span-2 text-gray-600 text-xs line-clamp-2 mb-1">{classItem.description}</p>
        )}
        <div className="flex items-center space-x-1">
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{studentCount} Students</span>
        </div>
        <div className="flex items-center space-x-1">
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{subjectCount} Subjects</span>
        </div>
      </div>

      {/* Teachers section */}
      <div className="border-t border-gray-100 pt-3">
        {teacherCount > 0 ? (
          <div className="space-y-1">
            {primaryTeacher && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-6 h-6 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-semibold">
                    {primaryTeacher.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{primaryTeacher.name}</p>
                    <span className="text-xs text-purple-600 font-medium">Class Teacher</span>
                  </div>
                </div>
                <UserCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
              </div>
            )}

            {teacherCount > 1 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">
                  +{teacherCount - 1} more teacher{teacherCount - 1 > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => onOpenTeachersModal(classItem)}
                  className="text-xs text-[#F59E0B] hover:text-[#D97706] font-medium"
                >
                  View all
                </button>
              </div>
            )}

            <button
              onClick={() => onOpenTeachersModal(classItem)}
              className="mt-2 w-full flex items-center justify-center space-x-1 text-xs text-[#F59E0B] hover:text-[#D97706] font-medium py-1.5 border border-dashed border-gray-200 rounded-lg hover:border-[#F59E0B] transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              <span>Manage Teachers</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenTeachersModal(classItem)}
            className="w-full flex items-center justify-center space-x-2 text-[#F59E0B] hover:text-[#D97706] text-xs font-medium transition-colors py-2 border border-dashed border-gray-300 rounded-lg hover:border-[#F59E0B]"
          >
            <UserPlus className="h-3 w-3" />
            <span>Assign Teachers</span>
          </button>
        )}
      </div>

      {/* Created date */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-1 text-gray-500 text-xs">
        <Clock className="h-3 w-3" />
        <span>Created {new Date(classItem.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
});

export default ClassCard;