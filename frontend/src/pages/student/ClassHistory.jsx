/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useStudent } from "../../contexts/StudentContext";
import {
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  Award,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  User,
  Mail,
  Phone,
  Home,
} from "lucide-react";

const ClassHistory = () => {
  const {
    classHistory,
    currentClass,
    loading,
    error,
    fetchMyClassHistory,
    fetchMyCurrentClass,
  } = useStudent();

  const [activeTab, setActiveTab] = useState("current");
  const [expandedEnrollment, setExpandedEnrollment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchMyClassHistory();
    fetchMyCurrentClass();
  }, [fetchMyClassHistory, fetchMyCurrentClass]);

  const toggleEnrollment = (enrollmentId) => {
    setExpandedEnrollment(
      expandedEnrollment === enrollmentId ? null : enrollmentId
    );
  };

  const getStatusBadge = (enrollment) => {
    if (enrollment.isCurrent) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
          Current
        </span>
      );
    } else if (
      enrollment.endDate &&
      new Date(enrollment.endDate) < new Date()
    ) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full border border-gray-200">
          Completed
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
          Transferred
        </span>
      );
    }
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      HIFZ: { color: "bg-purple-100 text-purple-800 border-purple-200" },
      NAZRA: { color: "bg-amber-100 text-amber-800 border-amber-200" },
      REGULAR: { color: "bg-blue-100 text-blue-800 border-blue-200" },
    };

    const config = typeConfig[type] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}
      >
        {type}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Present";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredHistory =
    classHistory?.classHistory?.filter((enrollment) => {
      const matchesSearch =
        enrollment.classRoom.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        enrollment.classRoom.grade
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        enrollment.classRoom.classTeacher
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterType === "all" ||
        (filterType === "current" && enrollment.isCurrent) ||
        (filterType === "completed" &&
          !enrollment.isCurrent &&
          enrollment.endDate &&
          new Date(enrollment.endDate) < new Date()) ||
        (filterType === "transferred" &&
          !enrollment.isCurrent &&
          (!enrollment.endDate || new Date(enrollment.endDate) >= new Date()));

      return matchesSearch && matchesFilter;
    }) || [];

  if (loading && !classHistory && !currentClass) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            {/* Left side with title and student info */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="hidden sm:block w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                  My Classes
                </h1>
                <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">
                  Academic journey •{" "}
                  {classHistory?.student?.name?.split(" ")[0] || "Student"}
                </p>
              </div>
            </div>

            {/* Right side with admission info */}
            {classHistory?.student && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-gray-600">Admission Number</p>
                  <p className="font-semibold text-black text-base bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    {classHistory.student.admissionNo}
                  </p>
                </div>
                <div className="text-right sm:hidden">
                  <p className="text-xs text-gray-600">Adm No</p>
                  <p className="font-semibold text-black text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {classHistory.student.admissionNo}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 lg:mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto hide-scrollbar">
              {[
                {
                  id: "current",
                  name: "Current Class",
                  mobileName: "Current",
                  count: currentClass ? 1 : 0,
                },
                {
                  id: "history",
                  name: "Class History",
                  mobileName: "History",
                  count: classHistory?.classHistory?.length || 0,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-amber-600 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="inline sm:hidden">{tab.mobileName}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs ${
                        activeTab === tab.id
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by class name, grade, or teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full text-sm"
                />
              </div>

              {activeTab === "history" && (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm w-full sm:w-auto"
                  >
                    <option value="all">All Classes</option>
                    <option value="current">Current</option>
                    <option value="completed">Completed</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add CSS for hiding scrollbar */}
        <style jsx>{`
          .hide-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
          }
        `}</style>

        {/* Current Class Tab */}
        {activeTab === "current" && (
          <div className="space-y-4 sm:space-y-6">
            {currentClass ? (
              <>
                {/* Current Class Card */}
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                  {/* Header */}
                  <div className="bg-amber-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 flex-shrink-0" />
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-black truncate">
                          Current Class
                        </h2>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {getStatusBadge({ isCurrent: true })}
                        {getTypeBadge(currentClass.currentClass.type)}
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="p-4 sm:p-5 lg:p-6">
                    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                      {/* Class Information - Full width on mobile, 2/3 on desktop */}
                      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-black truncate">
                          {currentClass.currentClass.name}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          {/* Class Details */}
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <Award className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600">
                                  Grade & Section
                                </p>
                                <p className="font-medium text-black text-sm sm:text-base">
                                  Gr {currentClass.currentClass.grade} • Sec{" "}
                                  {currentClass.currentClass.section}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <BookOpen className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600">
                                  Program Type
                                </p>
                                <p className="font-medium text-black text-sm sm:text-base capitalize">
                                  {currentClass.currentClass.type.toLowerCase()}
                                </p>
                              </div>
                            </div>

                            {currentClass.currentClass.description && (
                              <div className="flex items-start space-x-2 sm:space-x-3">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    Description
                                  </p>
                                  <p className="font-medium text-black text-sm sm:text-base line-clamp-2">
                                    {currentClass.currentClass.description}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Class Teacher */}
                          {currentClass.currentClass.classTeacher && (
                            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                              <h4 className="font-medium text-black mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2 text-sm sm:text-base">
                                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>Class Teacher</span>
                              </h4>
                              <div className="space-y-1.5 sm:space-y-2">
                                <p className="font-medium text-black text-sm sm:text-base truncate">
                                  {currentClass.currentClass.classTeacher.name}
                                </p>
                                <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-gray-600">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {
                                      currentClass.currentClass.classTeacher
                                        .email
                                    }
                                  </span>
                                </div>
                                {currentClass.currentClass.classTeacher
                                  .phone && (
                                  <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-gray-600">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                      {
                                        currentClass.currentClass.classTeacher
                                          .phone
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Info - Full width on mobile, 1/3 on desktop */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-5 lg:p-6">
                        <h4 className="font-medium text-black mb-3 sm:mb-4 text-sm sm:text-base">
                          Your Information
                        </h4>
                        <div className="space-y-2.5 sm:space-y-3">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Roll Number
                            </p>
                            <p className="font-medium text-black text-sm sm:text-base">
                              {currentClass.student.rollNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Admission Number
                            </p>
                            <p className="font-medium text-black text-sm sm:text-base truncate">
                              {currentClass.student.admissionNo}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Student Name
                            </p>
                            <p className="font-medium text-black text-sm sm:text-base truncate">
                              {currentClass.student.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subjects */}
                    {currentClass.currentClass.subjects &&
                      currentClass.currentClass.subjects.length > 0 && (
                        <div className="mt-6 sm:mt-8">
                          <h4 className="font-medium text-black mb-3 sm:mb-4 text-sm sm:text-base">
                            Subjects (
                            {currentClass.currentClass.subjects.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {currentClass.currentClass.subjects.map(
                              (subject, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-50 rounded-lg p-3 sm:p-4"
                                >
                                  <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                                    <span className="font-medium text-black text-sm sm:text-base truncate flex-1 pr-2">
                                      {subject.name}
                                    </span>
                                    {subject.code && (
                                      <span className="text-xs text-gray-500 bg-white px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                                        {subject.code}
                                      </span>
                                    )}
                                  </div>
                                  {subject.teacher && (
                                    <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-gray-600">
                                      <User className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {subject.teacher.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
                  No Current Class
                </h3>
                <p className="text-gray-600 text-sm sm:text-base px-4 max-w-md mx-auto">
                  You are not currently enrolled in any class. Please contact
                  administration.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Class History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4 sm:space-y-6">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((enrollment, index) => (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Clickable Header */}
                  <div
                    className="p-4 sm:p-5 lg:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleEnrollment(enrollment.id)}
                  >
                    <div className="flex items-start justify-between">
                      {/* Left side - Class Info */}
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-black truncate">
                            {enrollment.classRoom.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm text-gray-600">
                            <span>Gr {enrollment.classRoom.grade}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>Sec {enrollment.classRoom.section}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>Roll: {enrollment.rollNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Status & Toggle */}
                      <div className="flex flex-col items-end space-y-1.5 sm:space-y-2 ml-2">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          {getStatusBadge(enrollment)}
                          {getTypeBadge(enrollment.classRoom.type)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 text-right whitespace-nowrap">
                          {formatDate(enrollment.startDate, "mobile")} -{" "}
                          {formatDate(enrollment.endDate, "mobile")}
                        </div>
                        {expandedEnrollment === enrollment.id ? (
                          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedEnrollment === enrollment.id && (
                    <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 border-t border-gray-200">
                      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-5 lg:pt-6">
                        {/* Class Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-black text-sm sm:text-base">
                            Class Information
                          </h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Class Name:</span>
                              <span className="font-medium text-black text-right truncate max-w-[60%]">
                                {enrollment.classRoom.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Grade & Section:
                              </span>
                              <span className="font-medium text-black">
                                Gr {enrollment.classRoom.grade} • Sec{" "}
                                {enrollment.classRoom.section}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Program Type:
                              </span>
                              <span className="font-medium text-black truncate max-w-[60%]">
                                {enrollment.classRoom.type}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Class Teacher:
                              </span>
                              <span className="font-medium text-black truncate max-w-[60%]">
                                {enrollment.classRoom.classTeacher ||
                                  "Not assigned"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Enrollment Details */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-black text-sm sm:text-base">
                            Enrollment Details
                          </h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Roll Number:
                              </span>
                              <span className="font-medium text-black">
                                {enrollment.rollNumber}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Start Date:</span>
                              <span className="font-medium text-black">
                                {formatDate(enrollment.startDate)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">End Date:</span>
                              <span className="font-medium text-black">
                                {formatDate(enrollment.endDate)}
                              </span>
                            </div>
                            {enrollment.promotedTo && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Promoted To:
                                </span>
                                <span className="font-medium text-black truncate max-w-[60%]">
                                  {enrollment.promotedTo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
                  No Class History Found
                </h3>
                <p className="text-gray-600 text-sm sm:text-base px-4 max-w-md mx-auto">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your search or filters"
                    : "No class history records available"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-10 xl:p-12 text-center">
            <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg lg:text-xl font-medium text-black mb-2">
              Error Loading Classes
            </h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base px-2 sm:px-0">
              {error}
            </p>
            <button
              onClick={() => {
                fetchMyClassHistory();
                fetchMyCurrentClass();
              }}
              className="bg-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassHistory;
