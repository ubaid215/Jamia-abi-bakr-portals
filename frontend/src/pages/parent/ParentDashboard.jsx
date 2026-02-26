// FILE: src/pages/parent/ParentDashboard.jsx
// PURPOSE: Parent portal landing page — shows child progress snapshot
// BACKEND CONTRACT:
//   backend/modules/progress-snapshot/snapshot.routes.js
//   GET /api/dashboard/student/:studentId — returns full StudentProgressSnapshot
// RESPONSE SHAPE (from snapshotSelect):
//   { id, studentId, attendanceRate, currentStreak, longestStreak, needsAttention,
//     riskLevel, overallScore, homeworkCompletionRate, behaviorAvg,
//     student: { id, admissionNo, user: { name }, classRoom: { name, grade } } }

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import snapshotService from '../../services/snapshotService';
import {
    TrendingUp, Star, Calendar, BookOpen,
    AlertTriangle, Award, Loader, CheckCircle
} from 'lucide-react';

const RiskBadge = ({ level }) => {
    const styles = {
        LOW: 'bg-emerald-100 text-emerald-700',
        MEDIUM: 'bg-amber-100 text-amber-700',
        HIGH: 'bg-orange-100 text-orange-700',
        CRITICAL: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[level] || 'bg-gray-100 text-gray-600'}`}>
            {level || 'Unknown'}
        </span>
    );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon size={20} className="text-white" />
        </div>
        <div>
            <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    </div>
);

const ParentDashboard = () => {
    const { user } = useAuth();
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Parent sees their student's data
    // user.parentProfile.students[0].id is the student ID
    const studentId = user?.parentProfile?.students?.[0]?.id;

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        const load = async () => {
            try {
                const res = await snapshotService.getSnapshot(studentId);
                setSnapshot(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load progress snapshot');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [studentId]);

    if (!studentId) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">No student linked to your account</h2>
                    <p className="text-gray-500 mt-2 text-sm">Please contact the administrator to link your child's account.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader size={32} className="animate-spin text-amber-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
            </div>
        );
    }

    const s = snapshot || {};
    const student = s.student || {};

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            {/* Child info header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-700 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{student.user?.name || '—'}</h1>
                        <p className="text-amber-100 text-sm mt-1">
                            {student.classRoom?.name || student.classRoom?.grade || 'Class —'} · {student.admissionNo || '—'}
                        </p>
                    </div>
                    <RiskBadge level={s.riskLevel} />
                </div>

                {/* Needs attention banner */}
                {s.needsAttention && (
                    <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-medium">Your child needs extra attention this week</span>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={CheckCircle} label="Attendance Rate" value={s.attendanceRate != null ? `${s.attendanceRate}%` : '—'} color="bg-emerald-500" />
                <StatCard icon={TrendingUp} label="Current Streak" value={s.currentStreak != null ? `${s.currentStreak} days` : '—'} color="bg-indigo-500" />
                <StatCard icon={BookOpen} label="Homework Done" value={s.homeworkCompletionRate != null ? `${s.homeworkCompletionRate}%` : '—'} color="bg-amber-500" />
                <StatCard icon={Star} label="Behavior Avg" value={s.behaviorAvg != null ? `${s.behaviorAvg}/5` : '—'} color="bg-purple-500" />
            </div>

            {/* Progress Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award size={18} className="text-amber-500" /> Overall Progress
                </h2>
                {s.overallScore != null ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Overall Score</span>
                            <span className="text-sm font-bold text-gray-800">{s.overallScore}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all duration-700 ${s.overallScore >= 75 ? 'bg-emerald-500' :
                                        s.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                    }`}
                                style={{ width: `${Math.min(100, s.overallScore || 0)}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                            <Calendar size={12} />
                            Longest streak: {s.longestStreak || 0} days
                        </div>
                    </>
                ) : (
                    <p className="text-gray-400 text-sm">No progress data available yet</p>
                )}
            </div>
        </div>
    );
};

export default ParentDashboard;
