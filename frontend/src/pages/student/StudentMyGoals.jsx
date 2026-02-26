import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import goalService from '../../services/goalService';
import {
    Target, CheckCircle, Clock, AlertTriangle,
    BarChart3, TrendingUp, Calendar, Award
} from 'lucide-react';

/* ───── Status Badge ───── */
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
            {status?.replace('_', ' ')}
        </span>
    );
};

/* ───── Progress Bar ───── */
const ProgressBar = ({ value }) => {
    const pct = Math.min(Math.max(value || 0, 0), 100);
    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
};

/* ═══════════════════════════════════════════════ */
const StudentMyGoals = () => {
    const { user } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const studentId = user?.studentProfile?.id;

    const fetchGoals = async (page = 1) => {
        if (!studentId) return;
        setLoading(true);
        try {
            const params = { studentId, page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await goalService.getAll(params);
            setGoals(res.data || []);
            setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            console.error('Failed to fetch goals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGoals(); }, [studentId, statusFilter]);

    /* ── Stats ── */
    const stats = useMemo(() => {
        const total = goals.length;
        const inProgress = goals.filter(g => g.status === 'IN_PROGRESS').length;
        const achieved = goals.filter(g => g.status === 'ACHIEVED').length;
        const atRisk = goals.filter(g => g.status === 'AT_RISK').length;
        return { total, inProgress, achieved, atRisk };
    }, [goals]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    const daysLeft = (targetDate) => {
        if (!targetDate) return null;
        const diff = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    if (!studentId) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Target size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-600">Student profile not found</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Goals</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your academic and personal targets</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Goals', value: stats.total, icon: Target, color: 'text-indigo-600 bg-indigo-50' },
                        { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-600 bg-blue-50' },
                        { label: 'Achieved', value: stats.achieved, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                            <s.icon size={20} className={`mx-auto mb-2 ${s.color.split(' ')[0]}`} />
                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter */}
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
                    </select>
                    <span className="text-sm text-gray-400">{pagination.total} goals</span>
                </div>

                {/* Goal Cards */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
                    </div>
                ) : goals.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                        <Award size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">No goals yet</h3>
                        <p className="text-sm text-gray-400 mt-1">Your teacher will set goals for you</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {goals.map(goal => {
                            const remaining = daysLeft(goal.targetDate);
                            return (
                                <div key={goal.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    {goal.goalType?.replace('_', ' ')}
                                                </span>
                                                <StatusBadge status={goal.status} />
                                            </div>
                                            <h3 className="font-semibold text-gray-900 text-base">{goal.title}</h3>
                                            {goal.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{goal.description}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-2xl font-bold text-indigo-600">{Math.round(goal.progress || 0)}%</p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <ProgressBar value={goal.progress} />

                                    {/* Details row */}
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <BarChart3 size={12} /> {goal.currentValue || 0} / {goal.targetValue} {goal.unit}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {formatDate(goal.startDate)} → {formatDate(goal.targetDate)}
                                        </span>
                                        {remaining !== null && (
                                            <span className={`flex items-center gap-1 font-medium ${remaining < 0 ? 'text-red-500' : remaining < 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                                                <Clock size={12} /> {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
                                            </span>
                                        )}
                                    </div>

                                    {/* Milestones */}
                                    {goal.milestones && goal.milestones.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-50">
                                            <p className="text-xs font-medium text-gray-600 mb-1.5">Milestones</p>
                                            <div className="flex flex-wrap gap-2">
                                                {goal.milestones.map((ms, i) => (
                                                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${(goal.currentValue || 0) >= (ms.targetValue || 0) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                        {ms.title} ({ms.targetValue})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Teacher */}
                                    {goal.teacher && (
                                        <p className="text-xs text-gray-400 mt-2">Set by {goal.teacher.user?.name}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                            onClick={() => fetchGoals(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                        >Previous</button>
                        <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                        <button
                            onClick={() => fetchGoals(pagination.page + 1)}
                            disabled={pagination.page >= pagination.pages}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                        >Next</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentMyGoals;
