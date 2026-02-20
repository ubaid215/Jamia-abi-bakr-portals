// src/components/hifz/components/StudentSelector.jsx
import React, { useMemo } from "react";
import { Users, Search, User } from "lucide-react";

const StudentCard = ({ student, isSelected, onClick }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${isSelected
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
  handleSelectStudent,
  loading
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-gold" />
          Students
        </h2>

        <div className="space-y-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-gray-50"
          >
            <option value="">All Classes</option>
            {hifzNazraClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Gr {cls.grade})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center p-2 rounded-lg border border-gray-100">
                <div className="h-8 w-8 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => {
                console.log('👆 Student clicked in selector:', {
                  id: student.id,
                  studentId: student.studentId,
                  nestedId: student.student?.id,
                  name: student.student?.user?.name,
                  fullObject: student
                });
                handleSelectStudent(student);
              }}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedStudent?.id === student.id
                ? "bg-gold/10 border-gold border"
                : "hover:bg-gray-50 border border-transparent"
                }`}
            >
              <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mr-3 ${selectedStudent?.id === student.id ? 'bg-gold' : 'bg-gray-400'
                }`}>
                {student.student?.user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium truncate ${selectedStudent?.id === student.id ? "text-gray-900" : "text-gray-700"
                  }`}>
                  {student.student?.user?.name}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  Roll: {student.rollNumber} • {student.classRoom?.name}
                </p>
              </div>
              {selectedStudent?.id === student.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-gold ml-2"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentSelector;