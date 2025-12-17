import React, { useState, useEffect } from "react";
import { useStudent } from "../../contexts/StudentContext";
import {
  TrendingUp,
  BookOpen,
  Target,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  BarChart3,
  Bookmark,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
} from "lucide-react";

const StudentProgress = () => {
  const { progress, loading, error, fetchMyProgress } = useStudent();

  const [selectedType, setSelectedType] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [expandedProgress, setExpandedProgress] = useState(null);

  useEffect(() => {
    fetchMyProgress();
  }, [fetchMyProgress]);

  const toggleProgress = (progressId) => {
    setExpandedProgress(expandedProgress === progressId ? null : progressId);
  };

  const getProgressTypeConfig = (type) => {
    const config = {
      HIFZ: {
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: BookOpen,
        title: "Hifz Program Progress",
        description: "Quran Memorization Tracking",
      },
      NAZRA: {
        color: "bg-amber-100 text-amber-800 border-amber-200",
        icon: BookOpen,
        title: "Nazra Program Progress",
        description: "Quran Recitation Tracking",
      },
      REGULAR: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Award,
        title: "Regular Program Progress",
        description: "Academic Performance Tracking",
      },
    };
    return (
      config[type] || {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: TrendingUp,
      }
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateProgressPercentage = (completionStats) => {
    if (!completionStats) return 0;
    return (
      completionStats.completionPercentage ||
      completionStats.averagePercentage ||
      0
    );
  };

  const ProgressCard = ({ progressData }) => {
    const config = getProgressTypeConfig(progressData.progressType);
    const Icon = config.icon;
    const progressPercentage = calculateProgressPercentage(
      progressData.completionStats
    );

    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div
              className={`p-1.5 sm:p-2 rounded-lg ${config.color} flex-shrink-0`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-black truncate">
                {config.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-1">
                {config.description}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${config.color} mt-2 sm:mt-0 self-start sm:self-center`}
          >
            {progressData.progressType}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 sm:mb-5 lg:mb-6">
          <div className="flex justify-between items-center mb-1.5 sm:mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-xs sm:text-sm font-bold text-black">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-amber-600 h-2 sm:h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Progress Stats */}
        {progressData.completionStats && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 lg:mb-6">
            {/* HIFZ Progress Stats */}
            {progressData.progressType === "HIFZ" && (
              <>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.totalLinesCompleted || 0}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Lines</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.parasCompleted || 0}/30
                  </p>
                  <p className="text-xs text-gray-600 truncate">Paras</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.currentPara || 1}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Current Para</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.averageDailyLines || 0}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Daily Avg</p>
                </div>
              </>
            )}

            {/* NAZRA Progress Stats */}
            {progressData.progressType === "NAZRA" && (
              <>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.totalLinesRecited || 0}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    Lines Recited
                  </p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.completionPercentage?.toFixed(
                      1
                    ) || 0}
                    %
                  </p>
                  <p className="text-xs text-gray-600 truncate">Complete</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.averageDailyLines || 0}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Daily Lines</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.isCompleted ? "✓" : "↻"}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {progressData.completionStats.isCompleted
                      ? "Done"
                      : "Active"}
                  </p>
                </div>
              </>
            )}

            {/* REGULAR Progress Stats */}
            {progressData.progressType === "REGULAR" && (
              <>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.averagePercentage || 0}%
                  </p>
                  <p className="text-xs text-gray-600 truncate">Avg Score</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.progress?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Assessments</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.averagePercentage >= 80
                      ? "A"
                      : progressData.completionStats.averagePercentage >= 60
                      ? "B"
                      : "C"}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {progressData.completionStats.averagePercentage >= 80
                      ? "Excel"
                      : progressData.completionStats.averagePercentage >= 60
                      ? "Good"
                      : "Improve"}
                  </p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <p className="text-base sm:text-lg font-bold text-black truncate">
                    {progressData.completionStats.averagePercentage >= 75
                      ? "✓"
                      : "!"}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {progressData.completionStats.averagePercentage >= 75
                      ? "On Track"
                      : "Below"}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Recent Progress Records */}
        {progressData.progress && progressData.progress.length > 0 && (
          <div>
            <h4 className="font-medium text-black mb-3 sm:mb-4 flex items-center space-x-1.5 sm:space-x-2 text-sm sm:text-base">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Recent Progress</span>
            </h4>
            <div className="space-y-2 sm:space-y-3">
              {progressData.progress.slice(0, 3).map((record, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleProgress(record.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {progressData.progressType === "HIFZ" && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-purple-600" />
                          </div>
                        )}
                        {progressData.progressType === "NAZRA" && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-amber-600" />
                          </div>
                        )}
                        {progressData.progressType === "REGULAR" && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black text-sm sm:text-base truncate">
                          {progressData.progressType === "HIFZ" &&
                            `Sabaq: ${record.sabaqLines} lines`}
                          {progressData.progressType === "NAZRA" &&
                            `Recited: ${record.recitedLines} lines`}
                          {progressData.progressType === "REGULAR" &&
                            `${
                              record.subject?.name?.split(" ")[0] || "Assess"
                            }: ${record.percentage}%`}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {formatDate(record.date, "mobile")} •{" "}
                          {record.teacher?.user?.name?.split(" ")[0] ||
                            "Teacher"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end ml-1.5">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {progressData.progressType === "HIFZ" &&
                          `P. ${record.currentPara}`}
                        {progressData.progressType === "NAZRA" &&
                          `Pg. ${record.pageNumber || "N/A"}`}
                        {progressData.progressType === "REGULAR" &&
                          record.grade}
                      </span>
                      {expandedProgress === record.id ? (
                        <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mt-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mt-1" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedProgress === record.id && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        {progressData.progressType === "HIFZ" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Sabaq Lines:
                              </span>
                              <span className="font-medium text-black">
                                {record.sabaqLines}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Sabaqi Lines:
                              </span>
                              <span className="font-medium text-black">
                                {record.sabaqiLines || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Manzil Lines:
                              </span>
                              <span className="font-medium text-black">
                                {record.manzilLines || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Current Para:
                              </span>
                              <span className="font-medium text-black">
                                {record.currentPara}
                              </span>
                            </div>
                            {record.remarks && (
                              <div className="col-span-2">
                                <span className="text-gray-600 block mb-1">
                                  Remarks:
                                </span>
                                <p className="font-medium text-black line-clamp-2">
                                  {record.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {progressData.progressType === "NAZRA" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Recited Lines:
                              </span>
                              <span className="font-medium text-black">
                                {record.recitedLines}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Page:</span>
                              <span className="font-medium text-black">
                                {record.pageNumber || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tajweed:</span>
                              <span className="font-medium text-black">
                                {record.tajweedScore || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fluency:</span>
                              <span className="font-medium text-black">
                                {record.fluency || "N/A"}
                              </span>
                            </div>
                            {record.remarks && (
                              <div className="col-span-2">
                                <span className="text-gray-600 block mb-1">
                                  Remarks:
                                </span>
                                <p className="font-medium text-black line-clamp-2">
                                  {record.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {progressData.progressType === "REGULAR" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subject:</span>
                              <span className="font-medium text-black truncate">
                                {record.subject?.name?.split(" ")[0] || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Percentage:</span>
                              <span className="font-medium text-black">
                                {record.percentage}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Grade:</span>
                              <span className="font-medium text-black">
                                {record.grade || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium text-black truncate">
                                {record.assessmentType?.split(" ")[0] || "N/A"}
                              </span>
                            </div>
                            {record.remarks && (
                              <div className="col-span-2">
                                <span className="text-gray-600 block mb-1">
                                  Remarks:
                                </span>
                                <p className="font-medium text-black line-clamp-2">
                                  {record.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {progressData.progress.length > 3 && (
              <button className="w-full mt-3 sm:mt-4 text-center text-amber-600 hover:text-amber-700 font-medium py-2 text-sm">
                View All {progressData.progress.length} Records
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && !progress) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gray-50">
  {/* Header */}
  <div className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
            My Progress
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
            Track your academic and Quranic learning progress
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center">
          <button className="flex items-center justify-center space-x-1 sm:space-x-2 bg-amber-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-amber-700 transition-colors text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
    {/* Filters */}
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6 sm:mb-8">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs sm:text-sm w-full"
          >
            <option value="">All Program Types</option>
            <option value="HIFZ">Hifz Program</option>
            <option value="NAZRA">Nazra Program</option>
            <option value="REGULAR">Regular Program</option>
          </select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              className="border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs sm:text-sm w-full"
              placeholder="Start Date"
            />
          </div>
          <span className="text-xs sm:text-sm text-gray-400 px-1">to</span>
          <div className="flex-1">
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs sm:text-sm w-full"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Progress Content */}
    {progress ? (
      <div className="space-y-4 sm:space-y-6">
        {/* Student Info */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black">
                {progress.student?.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Admission No: {progress.student?.admissionNo}
              </p>
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
              <p className="text-xs text-gray-600">Progress Type</p>
              <p className="text-sm sm:text-base font-semibold text-black">
                {progress.progressType}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Cards */}
        <ProgressCard progressData={progress} />

        {/* Empty State for No Progress Records */}
        {(!progress.progress || progress.progress.length === 0) && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-12 text-center">
            <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
              No Progress Records Yet
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 px-4 sm:px-0">
              Your progress records will appear here once your teachers start
              tracking your performance.
            </p>
          </div>
        )}
      </div>
    ) : (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-12 text-center">
        <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-black mb-1.5 sm:mb-2">
          No Progress Data Available
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2 sm:px-0">
          {error || "Unable to load progress information at this time."}
        </p>
        <button
          onClick={fetchMyProgress}
          className="bg-amber-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-amber-700 transition-colors text-xs sm:text-sm"
        >
          Try Again
        </button>
      </div>
    )}

    {/* Quick Stats */}
    {progress?.completionStats && (
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 text-center">
          <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-600 mx-auto mb-2 sm:mb-3" />
          <p className="text-xl sm:text-2xl font-bold text-black">
            {calculateProgressPercentage(progress.completionStats).toFixed(1)}%
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Overall Progress</p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 text-center">
          <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-600 mx-auto mb-2 sm:mb-3" />
          <p className="text-xl sm:text-2xl font-bold text-black">
            {progress.completionStats.estimatedDaysRemaining || "N/A"}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Days Remaining</p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 text-center">
          <Target className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-600 mx-auto mb-2 sm:mb-3" />
          <p className="text-xl sm:text-2xl font-bold text-black">
            {progress.progress?.length || 0}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Total Records</p>
        </div>
      </div>
    )}
  </div>
</div>
  );
};

export default StudentProgress;
