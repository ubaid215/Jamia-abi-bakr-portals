import React, { useState, useEffect } from 'react';
import { useTeacher } from '../../contexts/TeacherContext';
import {
  Search,
  Users,
  GraduationCap,
  User,
  MoreHorizontal,
  Mail,
  Phone,
  BookMarked,
  BarChart3,
  MapPin
} from 'lucide-react';

const MyStudents = () => {
  const {
    students,
    classes,
    loading,
    fetchMyStudents,
    fetchMyClasses
  } = useTeacher();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [studentStats, setStudentStats] = useState({ total: 0, byClass: {}, byGender: { male: 0, female: 0, unknown: 0 } });

  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const studentList = Array.isArray(students) ? students : (students?.students || []);

  useEffect(() => {
    fetchMyClasses();
    fetchMyStudents();
  }, [fetchMyClasses, fetchMyStudents]);

  useEffect(() => {
    if (studentList.length > 0) {
      const stats = { total: studentList.length, byClass: {}, byGender: { male: 0, female: 0, unknown: 0 } };
      studentList.forEach(student => {
        const className = student.classRoom?.name || 'Unknown';
        stats.byClass[className] = (stats.byClass[className] || 0) + 1;
        const gender = student.student?.gender?.toLowerCase() || 'unknown';
        if (gender === 'male') stats.byGender.male++;
        else if (gender === 'female') stats.byGender.female++;
        else stats.byGender.unknown++;
      });
      setStudentStats(stats);
    }
  }, [studentList]);

  const filteredStudents = studentList
    .filter(student => {
      const matchesSearch = student.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toString().includes(searchTerm) ||
        student.student?.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !selectedClass || student.classRoom?.id === selectedClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.student?.user?.name || '').localeCompare(b.student?.user?.name || '');
        case 'rollNumber': return (a.rollNumber || 0) - (b.rollNumber || 0);
        case 'class': return (a.classRoom?.name || '').localeCompare(b.classRoom?.name || '');
        default: return 0;
      }
    });

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  // Minimal Student Card
  const StudentCard = ({ student }) => {
    const profileImg = student.student?.user?.profileImage;
    const name = student.student?.user?.name || 'Unknown Student';

    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full p-1 bg-white shadow-sm ring-1 ring-gray-100">
              {profileImg ? (
                <img src={profileImg} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 font-bold text-xl border border-amber-200">
                  {getInitials(name)}
                </div>
              )}
            </div>
            {/* Status Dot */}
            <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${student.student?.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} title={student.student?.status || 'Active'} />
          </div>

          {/* Details */}
          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{name}</h3>
          <p className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mb-3 inline-block">
            {student.classRoom?.name} • Roll: {student.rollNumber}
          </p>

          <p className="text-sm text-gray-500 mb-5">
            Admin No: {student.student?.admissionNo || 'N/A'}
          </p>

        </div>
      </div>
    );
  };

  // Minimal List Item
  const StudentListItem = ({ student }) => {
    const profileImg = student.student?.user?.profileImage;
    const name = student.student?.user?.name || 'Unknown Student';

    return (
      <div className="bg-white p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 group">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-amber-50 flex items-center justify-center text-amber-600 font-bold border border-amber-100">
          {profileImg ? (
            <img src={profileImg} alt={name} className="w-full h-full object-cover" />
          ) : getInitials(name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 truncate">{name}</h3>
            <span className={`w-2 h-2 rounded-full ${student.student?.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {student.classRoom?.name} • Roll: {student.rollNumber} • Adm: {student.student?.admissionNo}
          </p>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {student.student?.user?.email && (
            <a href={`mailto:${student.student.user.email}`} className="p-2 text-gray-400 hover:text-amber-500">
              <Mail size={16} />
            </a>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-900">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    );
  };

  if (loading && !studentList.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Search Header */}
      <div className="bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Students</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and view all your students' information</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-shadow bg-gray-50/50"
                />
              </div>
              <button className="hidden sm:flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <BookMarked className="h-4 w-4 mr-2 text-gray-400" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {studentStats.total > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Users size={20} /></div>
              <div><p className="text-2xl font-bold text-gray-900">{studentStats.total}</p><p className="text-xs font-medium text-gray-500">Total Students</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><User size={20} /></div>
              <div><p className="text-2xl font-bold text-gray-900">{studentStats.byGender.male}</p><p className="text-xs font-medium text-gray-500">Boys</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><User size={20} /></div>
              <div><p className="text-2xl font-bold text-gray-900">{studentStats.byGender.female}</p><p className="text-xs font-medium text-gray-500">Girls</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><GraduationCap size={20} /></div>
              <div><p className="text-2xl font-bold text-gray-900">{Object.keys(studentStats.byClass).length}</p><p className="text-xs font-medium text-gray-500">Classes</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="">All Classes</option>
              {classList.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="name">Sort by Name</option>
              <option value="rollNumber">Sort by Roll No.</option>
              <option value="class">Sort by Class</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Students Area */}
        <div className="mt-6">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No students found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                {selectedClass ? "There are no students assigned to this class." : "We couldn't find any students matching your search criteria."}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStudents.map(student => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredStudents.map(student => (
                <StudentListItem key={student.id} student={student} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyStudents;