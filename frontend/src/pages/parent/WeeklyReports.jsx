import { useEffect, useState } from 'react';
import { useWeeklyReport } from '../../contexts/WeeklyReportContext';

export default function WeeklyReports() {
  const { reports, pagination, loading, error, fetchWeeklyReports } = useWeeklyReport();
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    studentId: '',
    page: 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    if (filters.studentId) {
      fetchWeeklyReports(filters);
    }
  }, [filters, fetchWeeklyReports]);

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  if (!filters.studentId) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">Please select a student to view weekly reports</p>
        </div>
      </div>
    );
  }

  if (loading && reports.length === 0) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Weekly Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Academic and behavioral progress summaries</p>
        </div>

        <div className="flex gap-3">
          <select
            value={filters.year}
            onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value), page: 1 }))}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600">No weekly reports available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Week {report.weekNumber}, {report.year}
                      </h3>
                      {report.followUpRequired && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                          Follow-up Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-gray-400">
                    {selectedReport?.id === report.id ? '▼' : '▶'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-600">Attendance</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {report.attendancePercentage?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Avg. Score</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {report.overallAverageScore?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Behavior</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {report.averageBehaviorScore?.toFixed(1)}/5
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Homework</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {report.homeworkCompletionRate?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {selectedReport?.id === report.id && (
                  <div className="mt-6 pt-6 border-t space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Attendance Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Days Present</span>
                            <span className="font-medium">{report.totalDaysPresent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Days Absent</span>
                            <span className="font-medium">{report.totalDaysAbsent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Punctuality</span>
                            <span className="font-medium">{report.punctualityPercentage?.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Study Hours</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Hours</span>
                            <span className="font-medium">{report.totalHoursStudied?.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Average per Day</span>
                            <span className="font-medium">{report.averageHoursPerDay?.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Assessments</span>
                            <span className="font-medium">{report.totalAssessments}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {report.subjectWiseProgress && report.subjectWiseProgress.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Subject-wise Progress</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Subject</th>
                                <th className="text-center py-2">Avg Score</th>
                                <th className="text-center py-2">Participation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.subjectWiseProgress.map((subject, index) => (
                                <tr key={index} className="border-b">
                                  <td className="py-2">{subject.name}</td>
                                  <td className="text-center">{subject.averageScore?.toFixed(1)}%</td>
                                  <td className="text-center">{subject.participation?.toFixed(1)}/5</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {report.weeklyHighlights && (
                      <div className="bg-green-50 p-4 rounded">
                        <h4 className="font-semibold text-green-800 mb-2">Weekly Highlights</h4>
                        <p className="text-sm text-green-700">{report.weeklyHighlights}</p>
                      </div>
                    )}

                    {report.areasOfImprovement && (
                      <div className="bg-yellow-50 p-4 rounded">
                        <h4 className="font-semibold text-yellow-800 mb-2">Areas of Improvement</h4>
                        <p className="text-sm text-yellow-700">{report.areasOfImprovement}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.strengthSubjects && report.strengthSubjects.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded">
                          <h4 className="font-semibold text-blue-800 mb-2">Strong Subjects</h4>
                          <div className="flex flex-wrap gap-2">
                            {report.strengthSubjects.map((subject, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
                                {subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.weakSubjects && report.weakSubjects.length > 0 && (
                        <div className="bg-red-50 p-4 rounded">
                          <h4 className="font-semibold text-red-800 mb-2">Needs Focus</h4>
                          <div className="flex flex-wrap gap-2">
                            {report.weakSubjects.map((subject, i) => (
                              <span key={i} className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">
                                {subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {report.actionItems && report.actionItems.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Action Items</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {report.actionItems.map((item, i) => (
                            <li key={i} className="text-sm text-gray-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}