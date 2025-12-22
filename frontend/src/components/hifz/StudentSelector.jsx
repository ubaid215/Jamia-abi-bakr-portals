// src/components/hifz/components/StudentSelector.jsx
import React, { useMemo } from "react";
import { Users, Search, User } from "lucide-react";

const StudentCard = ({ student, isSelected, onClick }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "border-gold bg-gold bg-opacity-5"
          : "border-gray-200 hover:border-gold"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gold rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
          {student.student?.user?.name
            ?.split(" ")
            .map((n) => n[0])
            .join("") || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
            {student.student?.user?.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
            <span className="block sm:inline">
              Roll: {student.rollNumber}
            </span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">{student.classRoom?.name}</span>
          </p>
        </div>
        {isSelected && (
          <div className="bg-gold text-white p-1 rounded-full flex-shrink-0">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
        )}
      </div>
    </div>
  );
};

const StudentSelector = ({
  classes,
  selectedClass,
  setSelectedClass,
  searchTerm,
  setSearchTerm,
  students,
  selectedStudent,
  handleSelectStudent
}) => {
  // Filter classes for HIFZ and NAZRA only
  const hifzNazraClasses = useMemo(() => {
    try {
      const classList = Array.isArray(classes) ? classes : classes?.classes || [];
      return classList.filter(
        (cls) =>
          cls.type?.toUpperCase().includes("HIFZ") ||
          cls.type?.toUpperCase().includes("NAZRA")
      );
    } catch (error) {
      console.error('Error filtering classes:', error);
      return [];
    }
  }, [classes]);

  // Filter students
  const filteredStudents = useMemo(() => {
    try {
      const studentList = Array.isArray(students) ? students : students?.students || [];
      return studentList.filter((student) => {
        const matchesSearch =
          student.student?.user?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          student.rollNumber?.toString().includes(searchTerm);
        const matchesClass =
          !selectedClass || student.classRoom?.id === selectedClass;
        return matchesSearch && matchesClass;
      });
    } catch (error) {
      console.error('Error filtering students:', error);
      return [];
    }
  }, [students, searchTerm, selectedClass]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
        <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-gold flex-shrink-0" />
        Students
      </h2>

      {/* Filters */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          >
            <option value="">All HIFZ/NAZRA Classes</option>
            {hifzNazraClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Gr {cls.grade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            Search Students
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <User className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              isSelected={selectedStudent?.id === student.id}
              onClick={() => handleSelectStudent(student)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default StudentSelector;