import { useState } from 'react';
import adminService from '../../services/adminService';

export default function ReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState({
    reportType: 'DAILY_ACTIVITIES',
    format: 'PDF',
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    filters: {
      classIds: [],
      studentIds: [],
      teacherIds: [],
      includeVerifiedOnly: false,
    },
    options: {
      includeCharts: true,
      includeSummary: true,
      includeDetails: true,
      groupBy: 'STUDENT',
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await adminService.generateCustomReport(config);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = config.format === 'PDF' ? 'pdf' : config.format === 'CSV' ? 'csv' : 'xlsx';
      link.setAttribute('download', `custom_report_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Report Generator</h1>
        <p className="text-sm text-gray-600 mt-1">Create custom reports with advanced filters</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Report generated successfully! Download should start automatically.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">Report Configuration</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={config.reportType}
                    onChange={(e) => setConfig(prev => ({ ...prev, reportType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="DAILY_ACTIVITIES">Daily Activities</option>
                    <option value="WEEKLY_PROGRESS">Weekly Progress</option>
                    <option value="STUDENT_PERFORMANCE">Student Performance</option>
                    <option value="CLASS_ANALYTICS">Class Analytics</option>
                    <option value="ATTENDANCE_SUMMARY">Attendance Summary</option>
                    <option value="BEHAVIORAL_TRENDS">Behavioral Trends</option>
                    <option value="HOMEWORK_ANALYSIS">Homework Analysis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
                  <select
                    value={config.format}
                    onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="EXCEL">Excel Workbook</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={config.dateRange.startDate}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, startDate: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={config.dateRange.endDate}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, endDate: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Results By</label>
                <select
                  value={config.options.groupBy}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    options: { ...prev.options, groupBy: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="STUDENT">By Student</option>
                  <option value="CLASS">By Class</option>
                  <option value="TEACHER">By Teacher</option>
                  <option value="DATE">By Date</option>
                  <option value="SUBJECT">By Subject</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">Filters</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Classes</label>
                <select
                  multiple
                  value={config.filters.classIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, classIds: selected }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                >
                  <option value="class-1">Class 5A</option>
                  <option value="class-2">Class 5B</option>
                  <option value="class-3">Class 6A</option>
                  <option value="class-4">Class 6B</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student IDs (comma-separated)</label>
                <input
                  type="text"
                  placeholder="student-uuid-1, student-uuid-2, ..."
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                    setConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, studentIds: ids }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verifiedOnly"
                  checked={config.filters.includeVerifiedOnly}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    filters: { ...prev.filters, includeVerifiedOnly: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="verifiedOnly" className="text-sm text-gray-700">
                  Include verified activities only
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">Report Options</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={config.options.includeCharts}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    options: { ...prev.options, includeCharts: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="includeCharts" className="text-sm text-gray-700">
                  Include charts and graphs
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeSummary"
                  checked={config.options.includeSummary}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    options: { ...prev.options, includeSummary: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="includeSummary" className="text-sm text-gray-700">
                  Include executive summary
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeDetails"
                  checked={config.options.includeDetails}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    options: { ...prev.options, includeDetails: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="includeDetails" className="text-sm text-gray-700">
                  Include detailed records
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg sticky top-6">
            <h3 className="font-semibold text-blue-800 mb-4">Report Preview</h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Type:</p>
                <p className="text-blue-900">{config.reportType.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <p className="text-blue-600 font-medium">Format:</p>
                <p className="text-blue-900">{config.format}</p>
              </div>

              <div>
                <p className="text-blue-600 font-medium">Date Range:</p>
                <p className="text-blue-900">
                  {new Date(config.dateRange.startDate).toLocaleDateString()} - {new Date(config.dateRange.endDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-blue-600 font-medium">Filters:</p>
                <ul className="text-blue-900 list-disc list-inside">
                  {config.filters.classIds.length > 0 && (
                    <li>{config.filters.classIds.length} class(es) selected</li>
                  )}
                  {config.filters.studentIds.length > 0 && (
                    <li>{config.filters.studentIds.length} student(s) selected</li>
                  )}
                  {config.filters.includeVerifiedOnly && (
                    <li>Verified activities only</li>
                  )}
                  {config.filters.classIds.length === 0 && config.filters.studentIds.length === 0 && (
                    <li>All students</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-blue-600 font-medium">Grouped By:</p>
                <p className="text-blue-900">{config.options.groupBy}</p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {generating ? 'Generating Report...' : 'Generate Report'}
            </button>

            <p className="text-xs text-blue-600 mt-3 text-center">
              Report will be downloaded automatically when ready
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Templates</h3>
            <div className="space-y-2">
              <button
                onClick={() => setConfig({
                  ...config,
                  reportType: 'ATTENDANCE_SUMMARY',
                  options: { ...config.options, includeCharts: true }
                })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-left hover:bg-gray-50"
              >
                📅 Monthly Attendance Report
              </button>
              <button
                onClick={() => setConfig({
                  ...config,
                  reportType: 'CLASS_ANALYTICS',
                  options: { ...config.options, groupBy: 'CLASS' }
                })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-left hover:bg-gray-50"
              >
                📊 Class Performance Report
              </button>
              <button
                onClick={() => setConfig({
                  ...config,
                  reportType: 'BEHAVIORAL_TRENDS',
                  options: { ...config.options, includeCharts: true }
                })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-left hover:bg-gray-50"
              >
                ⭐ Behavioral Analysis Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}