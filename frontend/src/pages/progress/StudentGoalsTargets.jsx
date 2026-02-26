import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import goalService from '../../services/goalService';
import StudentClassPicker from '../../components/shared/StudentClassPicker';
import {
  Target, Plus, CheckCircle, Clock, AlertTriangle,
  BarChart3, TrendingUp, X, ArrowLeft, ArrowRight, Users
} from 'lucide-react';

/* ───────── Status Badge ───────── */
const StatusBadge = ({ status }) => {
  const styles = {
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    ACHIEVED: 'bg-emerald-100 text-emerald-700',
    AT_RISK: 'bg-orange-100 text-orange-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {(status || '').replace('_', ' ')}
    </span>
  );
};

/* ───────── Goal Card ───────── */
const GoalCard = ({ goal, onProgressUpdate }) => {
  const isOverdue = goal.status === 'IN_PROGRESS' && new Date(goal.targetDate) < new Date();
  const progressColor = goal.progress >= 80 ? 'bg-emerald-500' : goal.progress >= 40 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className={`bg-white rounded-xl border ${isOverdue ? 'border-red-200' : 'border-gray-100'} p-5 hover:shadow-lg transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <StatusBadge status={goal.status} />
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-sm font-bold text-gray-800">{goal.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${progressColor} transition-all duration-700`}
            style={{ width: `${goal.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Metric */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <BarChart3 size={12} />
          {goal.currentValue || 0} / {goal.targetValue} {goal.unit}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Due: {new Date(goal.targetDate).toLocaleDateString()}
        </span>
        {goal.teacher?.user?.name && (
          <span className="text-indigo-500">by {goal.teacher.user.name}</span>
        )}
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg text-xs text-red-600 mb-3">
          <AlertTriangle size={12} /> Overdue
        </div>
      )}

      {/* Milestones */}
      {Array.isArray(goal.milestones) && goal.milestones.length > 0 && (
        <div className="mt-2 space-y-1">
          {goal.milestones.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle size={12} className={m.completed ? 'text-emerald-500' : 'text-gray-300'} />
              <span className={m.completed ? 'line-through text-gray-400' : ''}>{m.title || m}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {goal.status === 'IN_PROGRESS' && onProgressUpdate && (
        <button
          onClick={() => onProgressUpdate(goal)}
          className="mt-3 w-full text-center py-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Update Progress
        </button>
      )}
    </div>
  );
};

/* ───────── Progress Update Modal ───────── */
const ProgressModal = ({ goal, onClose, onSave }) => {
  const [value, setValue] = useState(goal?.currentValue || 0);
  const [saving, setSaving] = useState(false);

  if (!goal) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(goal.id, value);
      onClose();
    } catch (err) {
      console.error('Update progress error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Update Progress</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{goal.title}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Value ({goal.unit})
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">Target: {goal.targetValue} {goal.unit}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
const StudentGoalsTargets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [progressGoal, setProgressGoal] = useState(null);
  const [pickedStudentId, setPickedStudentId] = useState('');

  const isStaff = ['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);

  const studentId = useMemo(() => {
    if (user?.role === 'STUDENT' && user?.studentProfile?.id) return user.studentProfile.id;
    if (pickedStudentId) return pickedStudentId;
    const params = new URLSearchParams(window.location.search);
    return params.get('studentId') || null;
  }, [user, pickedStudentId]);

  const handleStudentPick = ({ studentId: sid }) => {
    if (sid) setPickedStudentId(sid);
  };

  const fetchGoals = async (page = 1) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await goalService.getByStudent(studentId, { page, limit: 12, status: statusFilter || undefined });
      const goalsData = res.data || [];
      setGoals(goalsData);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      // Compute stats locally — no separate getStats endpoint exists
      const total = goalsData.length;
      const achieved = goalsData.filter(g => g.status === 'ACHIEVED').length;
      const inProgress = goalsData.filter(g => g.status === 'IN_PROGRESS').length;
      const overdue = goalsData.filter(g => g.status === 'IN_PROGRESS' && new Date(g.targetDate) < new Date()).length;
      setStats({
        total,
        achieved,
        inProgress,
        overdue,
        achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0,
      });
    } catch (err) {
      console.error('Fetch goals error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, [studentId, statusFilter]);

  const handleProgressUpdate = async (goalId, value) => {
    await goalService.updateProgress(goalId, value);
    fetchGoals(pagination.page);
  };

  if (!studentId) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals & Targets</h1>
          <p className="text-gray-500 text-sm mt-1">Select a student to view their goals</p>
        </div>
        {isStaff && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-amber-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Select a Student</h3>
            </div>
            <StudentClassPicker compact onSelect={handleStudentPick} />
          </div>
        )}
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <Target size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">No Student Selected</h2>
            <p className="text-gray-400 mt-1">
              {isStaff ? 'Use the picker above to select a student' : 'Your student profile could not be found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals & Targets</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} goal{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ACHIEVED">Achieved</option>
            <option value="AT_RISK">At Risk</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {isStaff && (
            <button
              onClick={() => navigate(user?.role === 'TEACHER' ? '/teacher/progress/goals/create' : '/admin/progress-module/goals/create')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={16} /> Create Goal
            </button>
          )}
        </div>
      </div>

      {/* Student picker for staff */}
      {isStaff && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Change Student</span>
          </div>
          <StudentClassPicker compact onSelect={handleStudentPick} />
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Target, color: 'text-gray-700 bg-gray-50' },
            { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Achieved', value: stats.achieved, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
            { label: 'Success Rate', value: `${stats.achievementRate}%`, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
          ].map((stat) => (
            <div key={stat.label} className={`flex items-center gap-3 p-3 rounded-xl ${stat.color}`}>
              <stat.icon size={20} />
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs opacity-70">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : goals.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onProgressUpdate={(g) => setProgressGoal(g)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No goals found</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fetchGoals(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
          <button
            onClick={() => fetchGoals(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Progress Update Modal */}
      {progressGoal && (
        <ProgressModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          onSave={handleProgressUpdate}
        />
      )}
    </div>
  );
};

export default StudentGoalsTargets;