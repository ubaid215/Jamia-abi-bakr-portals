import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import snapshotService from '../../services/snapshotService';
import goalService from '../../services/goalService';
import {
  Activity, TrendingUp, AlertTriangle, Target, BookOpen,
  Award, Clock, BarChart3, Users, RefreshCw, ChevronRight,
  Star, Flame, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

/* ───────── Metric Card ───────── */
const MetricCard = ({ icon: Icon, label, value, subtitle, color, trend }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
);

/* ───────── Risk Badge ───────── */
const RiskBadge = ({ level }) => {
  const styles = {
    LOW: 'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[level] || styles.LOW}`}>
      {level}
    </span>
  );
};

/* ───────── Subject Card ───────── */
const SubjectCard = ({ subject }) => {
  const pct = subject.percentage || 0;
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{subject.name}</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1.5">
          <div className={`h-2 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{pct}%</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
const ProgressDashboard = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [goalStats, setGoalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Resolve student ID (for student portal, use own; otherwise from prop/query)
  const studentId = useMemo(() => {
    if (user?.role === 'STUDENT' && user?.studentProfile?.id) return user.studentProfile.id;
    const params = new URLSearchParams(window.location.search);
    return params.get('studentId') || null;
  }, [user]);

  const fetchData = async () => {
    if (!studentId) return;
    try {
      const [snap, stats] = await Promise.allSettled([
        snapshotService.getSnapshot(studentId),
        goalService.getStats({ studentId }),
      ]);
      if (snap.status === 'fulfilled') setSnapshot(snap.value.data);
      if (stats.status === 'fulfilled') setGoalStats(stats.value.data);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [studentId]);

  const handleRefresh = async () => {
    if (!studentId) return;
    setRefreshing(true);
    try {
      await snapshotService.recalculate(studentId);
      await fetchData();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">No Student Selected</h2>
          <p className="text-gray-400 mt-1">Select a student to view their progress dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const s = snapshot || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last updated: {s.lastCalculatedAt ? new Date(s.lastCalculatedAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={s.riskLevel || 'LOW'} />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Activity} label="Attendance Rate" value={`${s.overallAttendanceRate || 0}%`} subtitle={`${s.totalDaysAttended || 0} days present`} color="bg-indigo-500" />
        <MetricCard icon={BookOpen} label="Homework Rate" value={`${s.overallHomeworkCompletionRate || 0}%`} subtitle={`${s.pendingHomeworkCount || 0} pending`} color="bg-emerald-500" />
        <MetricCard icon={Star} label="Behavior" value={`${s.averageBehaviorRating || 0}/5`} subtitle={`Discipline: ${s.averageDiscipline || 0}/5`} color="bg-amber-500" />
        <MetricCard icon={Flame} label="Streak" value={`${s.currentAttendanceStreak || 0} days`} subtitle={`Best: ${s.longestAttendanceStreak || 0} days`} color="bg-rose-500" />
      </div>

      {/* Attention Reasons */}
      {s.needsAttention && s.attentionReasons?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">Attention Required</h3>
          </div>
          <ul className="space-y-1">
            {s.attentionReasons.map((reason, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                <ChevronRight size={14} /> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Subject Performance + Goals */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Subject Performance</h3>
          </div>
          {Array.isArray(s.subjectWisePerformance) && s.subjectWisePerformance.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {s.subjectWisePerformance.map((subj, i) => (
                <SubjectCard key={i} subject={subj} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No subject data available</p>
          )}

          {/* Strengths / Weaknesses */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Strongest</p>
              {s.strongestSubjects?.length > 0 ? (
                s.strongestSubjects.map((name, i) => <p key={i} className="text-xs text-emerald-600">{name}</p>)
              ) : <p className="text-xs text-gray-400">—</p>}
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Needs Work</p>
              {s.weakestSubjects?.length > 0 ? (
                s.weakestSubjects.map((name, i) => <p key={i} className="text-xs text-red-600">{name}</p>)
              ) : <p className="text-xs text-gray-400">—</p>}
            </div>
          </div>
        </div>

        {/* Goals Summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-800">Goals Overview</h3>
          </div>
          {goalStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{goalStats.total}</p>
                  <p className="text-xs text-gray-500">Total Goals</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-3xl font-bold text-emerald-600">{goalStats.achieved}</p>
                  <p className="text-xs text-gray-500">Achieved</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-3xl font-bold text-indigo-600">{goalStats.inProgress}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{goalStats.overdue}</p>
                  <p className="text-xs text-gray-500">Overdue</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Achievement Rate</p>
                  <p className="text-sm font-bold text-gray-800">{goalStats.achievementRate}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${goalStats.achievementRate}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No goals data available</p>
          )}
        </div>
      </div>

      {/* Skills Overview */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-purple-600" />
          <h3 className="font-semibold text-gray-800">Skills Assessment</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Reading', value: s.currentReadingLevel, color: 'indigo' },
            { label: 'Writing', value: s.currentWritingLevel, color: 'emerald' },
            { label: 'Listening', value: s.currentListeningLevel, color: 'amber' },
            { label: 'Speaking', value: s.currentSpeakingLevel, color: 'rose' },
            { label: 'Critical Thinking', value: s.currentCriticalThinking, color: 'purple' },
          ].map((skill) => (
            <div key={skill.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold text-${skill.color}-600`}>{skill.value || '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{skill.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Clock} label="Study Hours" value={s.totalHoursStudied || 0} subtitle="Total hours" color="bg-cyan-500" />
        <MetricCard icon={TrendingUp} label="Participation" value={`${s.averageParticipation || 0}/5`} color="bg-violet-500" />
        <MetricCard icon={Activity} label="Punctuality" value={`${s.punctualityRate || 0}%`} color="bg-teal-500" />
        <MetricCard icon={BookOpen} label="HW Quality" value={`${s.averageHomeworkQuality || 0}/5`} subtitle={`${s.overdueHomeworkCount || 0} overdue`} color="bg-pink-500" />
      </div>
    </div>
  );
};

export default ProgressDashboard;