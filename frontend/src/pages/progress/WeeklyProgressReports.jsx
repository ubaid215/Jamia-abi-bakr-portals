import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import weeklyProgressService from '../../services/weeklyProgressService';
import {
  Calendar, ChevronDown, ChevronRight, Clock, Star,
  TrendingUp, AlertTriangle, BookOpen, Award, FileText,
  ArrowLeft, ArrowRight
} from 'lucide-react';

/* ───────── Rating Stars ───────── */
const RatingStars = ({ value = 0, max = 5 }) => (
  <div className="flex gap-0.5">
    {[...Array(max)].map((_, i) => (
      <Star key={i} size={14} className={i < value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
    ))}
  </div>
);

/* ───────── Report Card ───────── */
const ReportCard = ({ report, expanded, onToggle }) => {
  const riskColor = {
    LOW: 'border-l-emerald-500',
    MEDIUM: 'border-l-amber-500',
    HIGH: 'border-l-orange-500',
    CRITICAL: 'border-l-red-500',
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${riskColor[report.riskLevel] || 'border-l-gray-300'} overflow-hidden transition-shadow hover:shadow-lg`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Calendar size={16} />
            <span className="text-sm font-semibold">Week {report.weekNumber}</span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(report.weekStart).toLocaleDateString()} – {new Date(report.weekEnd).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Attendance: <b className="text-gray-800">{report.attendanceRate}%</b></span>
            <span className="text-gray-500">HW: <b className="text-gray-800">{report.homeworkCompletionRate}%</b></span>
          </div>
          {expanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* Attendance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-indigo-500" />
                <h4 className="text-sm font-semibold text-gray-700">Attendance</h4>
              </div>
              <div className="space-y-1 text-sm">
                <p>Present: <b>{report.daysPresent}</b></p>
                <p>Absent: <b>{report.daysAbsent}</b></p>
                <p>Late: <b>{report.daysLate || 0}</b></p>
                <p>Total Hours: <b>{report.totalHoursSpent || 0}</b></p>
              </div>
            </div>

            {/* Behavior */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-700">Behavior</h4>
              </div>
              <div className="space-y-2">
                <div><span className="text-xs text-gray-500">Behavior</span><RatingStars value={report.avgBehaviorRating} /></div>
                <div><span className="text-xs text-gray-500">Participation</span><RatingStars value={report.avgParticipation} /></div>
                <div><span className="text-xs text-gray-500">Discipline</span><RatingStars value={report.avgDiscipline} /></div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <h4 className="text-sm font-semibold text-gray-700">Performance</h4>
              </div>
              <div className="space-y-1 text-sm">
                {report.subjectPerformance && typeof report.subjectPerformance === 'object' ? (
                  Object.entries(report.subjectPerformance).slice(0, 5).map(([subj, pct]) => (
                    <div key={subj} className="flex justify-between">
                      <span className="text-gray-500 truncate mr-2">{subj}</span>
                      <b>{typeof pct === 'number' ? `${pct}%` : pct}</b>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs">No subject data</p>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Comments */}
          {(report.teacherComments || report.weeklyHighlights || report.areasOfImprovement) && (
            <div className="mt-4 bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-indigo-600" />
                <h4 className="text-sm font-semibold text-indigo-800">Teacher Notes</h4>
              </div>
              {report.teacherComments && <p className="text-sm text-gray-700 mb-2">{report.teacherComments}</p>}
              {report.weeklyHighlights && <p className="text-sm text-emerald-700"><b>Highlights:</b> {report.weeklyHighlights}</p>}
              {report.areasOfImprovement && <p className="text-sm text-amber-700"><b>Areas to improve:</b> {report.areasOfImprovement}</p>}
            </div>
          )}

          {/* Risk Alert */}
          {report.riskLevel && report.riskLevel !== 'LOW' && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-sm text-amber-700">Risk Level: <b>{report.riskLevel}</b></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
const WeeklyProgressReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const studentId = useMemo(() => {
    if (user?.role === 'STUDENT' && user?.studentProfile?.id) return user.studentProfile.id;
    const params = new URLSearchParams(window.location.search);
    return params.get('studentId') || null;
  }, [user]);

  const fetchReports = async (page = 1) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await weeklyProgressService.getByStudent(studentId, { page, limit: 10, year });
      setReports(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      if (res.data?.length > 0 && !expandedId) setExpandedId(res.data[0].id);
    } catch (err) {
      console.error('Fetch weekly reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [studentId, year]);

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">No Student Selected</h2>
          <p className="text-gray-400 mt-1">Select a student to view weekly reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header with year filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Progress Reports</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} report{pagination.total !== 1 ? 's' : ''} found</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Reports */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No weekly reports found for {year}</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fetchReports(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
          <button
            onClick={() => fetchReports(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyProgressReports;