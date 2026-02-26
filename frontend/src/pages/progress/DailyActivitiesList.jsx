// FILE: src/pages/progress/DailyActivitiesList.jsx
// Enhanced Activity List with expandable detail rows, subject breakdown,
// teacher remarks, hours, and discipline info.

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import dailyActivityService from '../../services/dailyActivityService';
import {
  Activity, CalendarDays, User, Search, Filter,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Trash2, Eye, Loader, BookOpen, Clock,
  Star, Shield, MessageSquare, CheckCircle, XCircle
} from 'lucide-react';

/* ── Attendance badge ── */
const AttendanceBadge = ({ status }) => {
  const styles = {
    PRESENT: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-red-100 text-red-700',
    LATE: 'bg-amber-100 text-amber-700',
    EXCUSED: 'bg-blue-100 text-blue-700',
    HALF_DAY: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {(status || '').replace('_', ' ')}
    </span>
  );
};

/* ── Mini rating bar ── */
const RatingBar = ({ value, max = 5, color = 'bg-amber-400', label }) => (
  <div className="flex items-center gap-2">
    {label && <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>}
    <div className="flex gap-0.5 flex-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-full ${i < value ? color : 'bg-gray-200'}`}
        />
      ))}
    </div>
    <span className="text-xs font-semibold text-gray-600 w-7 text-right">{value}/{max}</span>
  </div>
);

/* ── Boolean indicator ── */
const BoolTag = ({ value, labelTrue, labelFalse }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
    {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
    {value ? labelTrue : labelFalse}
  </span>
);

/* ── Expandable activity card ── */
const ActivityRow = ({ act, isAdmin, onDelete, deletingId, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const subjects = Array.isArray(act.subjectsStudied) ? act.subjectsStudied : [];
  const date = new Date(act.date);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const studentName = act.student?.user?.name || '—';
  const initials = studentName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const teacherName = act.teacher?.user?.name || '—';
  const classroomName = act.classRoom ? (act.classRoom.name || act.classRoom.grade) : '—';

  return (
    <div className={`border border-gray-100 rounded-xl overflow-hidden transition-all ${expanded ? 'shadow-md bg-white' : 'bg-white hover:shadow-sm'}`}>
      {/* Main row — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {initials}
        </div>

        {/* Core info */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-y-1 gap-x-4 items-center">
          <div className="sm:col-span-2 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{studentName}</p>
            <p className="text-xs text-gray-400">{act.student?.admissionNo} · {classroomName}</p>
          </div>
          <div className="flex items-center gap-2 sm:col-span-1">
            <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600">{dateStr}</span>
          </div>
          <div className="sm:col-span-1">
            <AttendanceBadge status={act.attendanceStatus} />
          </div>
          <div className="hidden sm:flex items-center gap-3 sm:col-span-1">
            <div className="flex items-center gap-1 text-xs text-gray-500" title="Subjects">
              <BookOpen size={12} className="text-emerald-500" />
              <span>{subjects.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500" title="Hours">
              <Clock size={12} className="text-indigo-500" />
              <span>{act.totalHoursSpent || 0}h</span>
            </div>
            <div className="flex gap-0.5" title={`Behavior: ${act.behaviorRating}/5`}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= (act.behaviorRating || 0) ? 'bg-amber-400' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to={`${window.location.pathname.replace(/\/$/, '')}/${act.id}`}
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View full details"
          >
            <Eye size={15} />
          </Link>
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(act.id); }}
              disabled={deletingId === act.id}
              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete (Admin only)"
            >
              {deletingId === act.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
        </div>
      </button>

      {/* Expanded detail section */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/30">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock size={11} /> Hours Spent</p>
              <p className="text-lg font-bold text-gray-900">{act.totalHoursSpent || 0}<span className="text-xs font-normal text-gray-400 ml-1">hrs</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Star size={11} /> Behavior</p>
              <RatingBar value={act.behaviorRating || 0} color="bg-amber-400" />
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Activity size={11} /> Participation</p>
              <RatingBar value={act.participationLevel || 0} color="bg-indigo-400" />
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Shield size={11} /> Discipline</p>
              <RatingBar value={act.disciplineScore || 0} color="bg-emerald-400" />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <BoolTag value={act.punctuality} labelTrue="Punctual" labelFalse="Not Punctual" />
            <BoolTag value={act.uniformCompliance} labelTrue="Uniform OK" labelFalse="Uniform Issue" />
            <BoolTag value={act.isVerified} labelTrue="Verified" labelFalse="Unverified" />
          </div>

          {/* Subjects breakdown */}
          {subjects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <BookOpen size={12} /> Subjects Studied ({subjects.length})
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {subjects.map((sub, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">{sub.subjectName || sub.subject?.name || `Subject ${i + 1}`}</p>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Level {sub.understandingLevel || '—'}/5
                      </span>
                    </div>
                    {Array.isArray(sub.topicsCovered) && sub.topicsCovered.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sub.topicsCovered.map((topic, ti) => (
                          <span key={ti} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{topic}</span>
                        ))}
                      </div>
                    )}
                    {sub.notes && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">📝 {sub.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teacher observations */}
          {(act.strengths || act.improvements || act.concerns || act.teacherRemarks) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MessageSquare size={12} /> Teacher Observations
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {act.strengths && (
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Strengths</p>
                    <p className="text-sm text-emerald-600">{act.strengths}</p>
                  </div>
                )}
                {act.improvements && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Improvements</p>
                    <p className="text-sm text-amber-600">{act.improvements}</p>
                  </div>
                )}
                {act.concerns && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-xs font-semibold text-red-700 mb-1">Concerns</p>
                    <p className="text-sm text-red-600">{act.concerns}</p>
                  </div>
                )}
                {act.teacherRemarks && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Remarks</p>
                    <p className="text-sm text-indigo-600">{act.teacherRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recorded by */}
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
            <User size={12} />
            <span>Recorded by <strong className="text-gray-600">{teacherName}</strong></span>
            <span>·</span>
            <span>{new Date(act.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
const DailyActivitiesList = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Role-aware base path for links
  const basePath = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
    ? '/admin/progress-module'
    : '/teacher/progress';

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  // Filters
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchActivities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(attendanceFilter && { attendanceStatus: attendanceFilter }),
        ...(startDate && { startDate: new Date(startDate).toISOString() }),
        ...(endDate && { endDate: new Date(endDate).toISOString() }),
      };
      const res = await dailyActivityService.getAll(params);
      setActivities(res.data || []);
      if (res.pagination) setPagination(prev => ({ ...prev, ...res.pagination }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, attendanceFilter, startDate, endDate]);

  useEffect(() => { fetchActivities(1); }, [fetchActivities]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this activity record? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await dailyActivityService.delete(id);
      toast.success('Activity deleted');
      setActivities(prev => prev.filter(a => a.id !== id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete activity');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination.total} record{pagination.total !== 1 ? 's' : ''}
            {attendanceFilter && <span className="text-indigo-500 ml-1">· Filtered by {attendanceFilter.replace('_', ' ')}</span>}
          </p>
        </div>
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <Link
            to={user?.role === 'TEACHER' ? '/teacher/progress/record-activity' : '/teacher/activity/new'}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Activity size={16} /> Record Activity
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={attendanceFilter}
            onChange={e => setAttendanceFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Attendance</option>
            {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="From date"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Activity Cards */}
      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Activity size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No activities found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting the filters above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(act => (
            <ActivityRow
              key={act.id}
              act={act}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              deletingId={deletingId}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchActivities(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-600">
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
            <span className="text-gray-400 ml-2">({pagination.total} total)</span>
          </span>
          <button
            onClick={() => fetchActivities(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyActivitiesList;