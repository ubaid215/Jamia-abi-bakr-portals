import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import weeklyProgressService from '../../services/weeklyProgressService';
import StudentClassPicker from '../../components/shared/StudentClassPicker';
import { Users } from 'lucide-react';
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
  // Determine border color based on attendance percentage
  const attendancePct = report.attendancePercentage || 0;
  const borderColor = attendancePct >= 80 ? 'border-l-emerald-500'
    : attendancePct >= 60 ? 'border-l-amber-500'
      : attendancePct >= 40 ? 'border-l-orange-500'
        : 'border-l-red-500';

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} overflow-hidden transition-shadow hover:shadow-lg`}>
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
            {new Date(report.startDate).toLocaleDateString()} – {new Date(report.endDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Attendance: <b className="text-gray-800">{report.attendancePercentage || 0}%</b></span>
            <span className="text-gray-500">HW: <b className="text-gray-800">{report.homeworkCompletionRate || 0}%</b></span>
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
                <p>Present: <b>{report.totalDaysPresent || 0}</b></p>
                <p>Absent: <b>{report.totalDaysAbsent || 0}</b></p>
                <p>Late: <b>{report.totalDaysLate || 0}</b></p>
                <p>Working Days: <b>{report.totalWorkingDays || 0}</b></p>
              </div>
            </div>

            {/* Behavior */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-700">Behavior</h4>
              </div>
              <div className="space-y-2">
                <div><span className="text-xs text-gray-500">Behavior</span><RatingStars value={Math.round(report.averageBehaviorScore || 0)} /></div>
                <div><span className="text-xs text-gray-500">Participation</span><RatingStars value={Math.round(report.averageParticipationScore || 0)} /></div>
                <div><span className="text-xs text-gray-500">Discipline</span><RatingStars value={Math.round(report.averageDisciplineScore || 0)} /></div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <h4 className="text-sm font-semibold text-gray-700">Performance</h4>
              </div>
              <div className="space-y-1 text-sm">
                {Array.isArray(report.subjectWiseProgress) && report.subjectWiseProgress.length > 0 ? (
                  report.subjectWiseProgress.slice(0, 5).map((s) => (
                    <div key={s.subjectId} className="flex justify-between">
                      <span className="text-gray-500 truncate mr-2">{s.subjectId}</span>
                      <b>{s.avgUnderstanding || 0}/5</b>
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

          {/* Follow-up Required Alert */}
          {report.followUpRequired && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-sm text-amber-700">Follow-up Required</span>
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
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  // Teacher/Admin: set via compact StudentClassPicker
  const [pickedStudentId, setPickedStudentId] = useState('');

  const isStudent = user?.role === 'STUDENT';

  const studentId = useMemo(() => {
    if (isStudent && user?.studentProfile?.id) return user.studentProfile.id;
    return pickedStudentId || null;
  }, [user, isStudent, pickedStudentId]);

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

  if (!studentId && !isStudent) {
    // Show compact picker for teacher/admin so they can select a student
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Progress Reports</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-amber-500" />
            <span className="font-semibold text-gray-800">Select a Student</span>
          </div>
          <StudentClassPicker compact onSelect={({ studentId: sid }) => sid && setPickedStudentId(sid)} />
          <p className="text-xs text-gray-400 mt-3">Choose a class, then pick a student to load their weekly reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header with year filter */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Progress Reports</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} report{pagination.total !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Compact class/student picker for teacher role */}
          {!isStudent && (
            <StudentClassPicker compact onSelect={({ studentId: sid }) => sid && setPickedStudentId(sid)} />
          )}
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