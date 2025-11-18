import React, { useState, useEffect } from 'react';
import { useStudent } from '../../contexts/StudentContext';
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
  Download
} from 'lucide-react';

const StudentProgress = () => {
  const {
    progress,
    loading,
    error,
    fetchMyProgress
  } = useStudent();

  const [selectedType, setSelectedType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
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
      'HIFZ': {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: BookOpen,
        title: 'Hifz Program Progress',
        description: 'Quran Memorization Tracking'
      },
      'NAZRA': {
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: BookOpen,
        title: 'Nazra Program Progress',
        description: 'Quran Recitation Tracking'
      },
      'REGULAR': {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Award,
        title: 'Regular Program Progress',
        description: 'Academic Performance Tracking'
      }
    };
    return config[type] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: TrendingUp };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateProgressPercentage = (completionStats) => {
    if (!completionStats) return 0;
    return completionStats.completionPercentage || completionStats.averagePercentage || 0;
  };

  const ProgressCard = ({ progressData }) => {
    const config = getProgressTypeConfig(progressData.progressType);
    const Icon = config.icon;
    const progressPercentage = calculateProgressPercentage(progressData.completionStats);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">{config.title}</h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
            {progressData.progressType}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-black">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-amber-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Progress Stats */}
        {progressData.completionStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {progressData.progressType === 'HIFZ' && (
              <>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Bookmark className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.totalLinesCompleted || 0}</p>
                  <p className="text-xs text-gray-600">Lines Completed</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.parasCompleted || 0}/30</p>
                  <p className="text-xs text-gray-600">Paras Completed</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.currentPara || 1}</p>
                  <p className="text-xs text-gray-600">Current Para</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.averageDailyLines || 0}</p>
                  <p className="text-xs text-gray-600">Daily Lines</p>
                </div>
              </>
            )}

            {progressData.progressType === 'NAZRA' && (
              <>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.totalLinesRecited || 0}</p>
                  <p className="text-xs text-gray-600">Lines Recited</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Target className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.completionPercentage?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-gray-600">Completion</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.averageDailyLines || 0}</p>
                  <p className="text-xs text-gray-600">Daily Lines</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">
                    {progressData.completionStats.isCompleted ? 'Completed' : 'In Progress'}
                  </p>
                  <p className="text-xs text-gray-600">Status</p>
                </div>
              </>
            )}

            {progressData.progressType === 'REGULAR' && (
              <>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.completionStats.averagePercentage || 0}%</p>
                  <p className="text-xs text-gray-600">Average Score</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{progressData.progress?.length || 0}</p>
                  <p className="text-xs text-gray-600">Assessments</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">
                    {progressData.completionStats.averagePercentage >= 80 ? 'Excellent' : 
                     progressData.completionStats.averagePercentage >= 60 ? 'Good' : 'Needs Improvement'}
                  </p>
                  <p className="text-xs text-gray-600">Performance</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">
                    {progressData.completionStats.averagePercentage >= 75 ? 'On Track' : 'Below Target'}
                  </p>
                  <p className="text-xs text-gray-600">Target</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Recent Progress Records */}
        {progressData.progress && progressData.progress.length > 0 && (
          <div>
            <h4 className="font-medium text-black mb-4 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Recent Progress Records</span>
            </h4>
            <div className="space-y-3">
              {progressData.progress.slice(0, 5).map((record, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleProgress(record.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {progressData.progressType === 'HIFZ' && (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Bookmark className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        {progressData.progressType === 'NAZRA' && (
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-amber-600" />
                          </div>
                        )}
                        {progressData.progressType === 'REGULAR' && (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Award className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-black">
                          {progressData.progressType === 'HIFZ' && `Sabaq: ${record.sabaqLines} lines`}
                          {progressData.progressType === 'NAZRA' && `Recited: ${record.recitedLines} lines`}
                          {progressData.progressType === 'REGULAR' && `${record.subject?.name || 'Assessment'}: ${record.percentage}%`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(record.date)} • {record.teacher?.user?.name || 'Teacher'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {progressData.progressType === 'HIFZ' && `Para ${record.currentPara}`}
                        {progressData.progressType === 'NAZRA' && `Page ${record.pageNumber || 'N/A'}`}
                        {progressData.progressType === 'REGULAR' && record.grade}
                      </span>
                      {expandedProgress === record.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedProgress === record.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {progressData.progressType === 'HIFZ' && (
                          <>
                            <div>
                              <span className="text-gray-600">Sabaq Lines:</span>
                              <span className="font-medium text-black ml-2">{record.sabaqLines}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Sabaqi Lines:</span>
                              <span className="font-medium text-black ml-2">{record.sabaqiLines || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Manzil Lines:</span>
                              <span className="font-medium text-black ml-2">{record.manzilLines || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Current Para:</span>
                              <span className="font-medium text-black ml-2">{record.currentPara}</span>
                            </div>
                            {record.remarks && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Remarks:</span>
                                <p className="font-medium text-black mt-1">{record.remarks}</p>
                              </div>
                            )}
                          </>
                        )}

                        {progressData.progressType === 'NAZRA' && (
                          <>
                            <div>
                              <span className="text-gray-600">Recited Lines:</span>
                              <span className="font-medium text-black ml-2">{record.recitedLines}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Page Number:</span>
                              <span className="font-medium text-black ml-2">{record.pageNumber || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Tajweed Score:</span>
                              <span className="font-medium text-black ml-2">{record.tajweedScore || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Fluency:</span>
                              <span className="font-medium text-black ml-2">{record.fluency || 'N/A'}</span>
                            </div>
                            {record.remarks && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Remarks:</span>
                                <p className="font-medium text-black mt-1">{record.remarks}</p>
                              </div>
                            )}
                          </>
                        )}

                        {progressData.progressType === 'REGULAR' && (
                          <>
                            <div>
                              <span className="text-gray-600">Subject:</span>
                              <span className="font-medium text-black ml-2">{record.subject?.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Percentage:</span>
                              <span className="font-medium text-black ml-2">{record.percentage}%</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Grade:</span>
                              <span className="font-medium text-black ml-2">{record.grade || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Assessment Type:</span>
                              <span className="font-medium text-black ml-2">{record.assessmentType || 'N/A'}</span>
                            </div>
                            {record.remarks && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Remarks:</span>
                                <p className="font-medium text-black mt-1">{record.remarks}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {progressData.progress.length > 5 && (
              <button className="w-full mt-4 text-center text-amber-600 hover:text-amber-700 font-medium py-2">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">My Progress</h1>
              <p className="text-gray-600 mt-1">
                Track your academic and Quranic learning progress
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
                <Download className="h-4 w-4" />
                <span>Export Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">All Program Types</option>
                <option value="HIFZ">Hifz Program</option>
                <option value="NAZRA">Nazra Program</option>
                <option value="REGULAR">Regular Program</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Start Date"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>

        {/* Progress Content */}
        {progress ? (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-black">{progress.student?.name}</h2>
                  <p className="text-gray-600">Admission No: {progress.student?.admissionNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Progress Type</p>
                  <p className="font-semibold text-black">{progress.progressType}</p>
                </div>
              </div>
            </div>

            {/* Progress Cards */}
            <ProgressCard progressData={progress} />

            {/* Empty State for No Progress Records */}
            {(!progress.progress || progress.progress.length === 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">No Progress Records Yet</h3>
                <p className="text-gray-600">
                  Your progress records will appear here once your teachers start tracking your performance.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">No Progress Data Available</h3>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to load progress information at this time.'}
            </p>
            <button
              onClick={fetchMyProgress}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Quick Stats */}
        {progress?.completionStats && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <BarChart3 className="h-8 w-8 text-amber-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-black">
                {calculateProgressPercentage(progress.completionStats).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Overall Progress</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <Clock className="h-8 w-8 text-amber-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-black">
                {progress.completionStats.estimatedDaysRemaining || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Estimated Days Remaining</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <Target className="h-8 w-8 text-amber-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-black">
                {progress.progress?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Total Records</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProgress;