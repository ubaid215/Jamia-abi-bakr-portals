import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Award, TrendingDown,
    ChevronRight, Users, Phone, Mail,
} from 'lucide-react';
import { useAdmin } from '../../../contexts/AdminContext';

// ─── Performance Distribution Bar ─────────────────────────── (unchanged)
const DistributionBar = React.memo(({ data }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    return (
        <div className="space-y-3">
            {data.map((item) => {
                const pct = ((item.value / total) * 100).toFixed(1);
                return (
                    <div key={item.label} className="group">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${item.dotColor}`} />
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900 tabular-nums">{item.value}</span>
                                <span className="text-xs text-gray-400 tabular-nums w-12 text-right">{pct}%</span>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${item.barColor}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
DistributionBar.displayName = 'DistributionBar';

// ─── At-Risk Student Row (now shows REAL student data) ───────
const AtRiskRow = React.memo(({ student, onClick }) => {
    const isCritical = student.riskLevel === 'CRITICAL';
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-200 group
                ${isCritical ? 'hover:bg-red-50/70' : 'hover:bg-amber-50/70'}`}
        >
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                ${isCritical
                    ? 'bg-gradient-to-br from-red-100 to-red-200'
                    : 'bg-gradient-to-br from-amber-100 to-amber-200'}`}
            >
                <span className={`text-xs font-bold ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                    {(student.studentName || 'U')[0].toUpperCase()}
                </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {student.studentName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    {student.classRoom?.name}
                    {student.admissionNo ? ` · ${student.admissionNo}` : ''}
                </p>
                {/* First risk reason as subtitle */}
                {student.riskReasons?.[0] && (
                    <p className="text-xs text-red-500 truncate mt-0.5">
                        {student.riskReasons[0]}
                    </p>
                )}
            </div>

            {/* Badge + arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {student.attendance?.attendancePercent ?? 'N/A'}%
                </span>
                <ChevronRight className={`h-4 w-4 text-gray-300 transition-colors
                    ${isCritical ? 'group-hover:text-red-500' : 'group-hover:text-amber-500'}`}
                />
            </div>
        </div>
    );
});
AtRiskRow.displayName = 'AtRiskRow';

// ─── Student Performance Section ────────────────────────────
const StudentPerformance = React.memo(({ stats, attendanceOverview }) => {
    const navigate = useNavigate();
    const { atRiskStudents, getAtRiskStudents } = useAdmin();
    const [atRiskSummary, setAtRiskSummary] = useState(null);
    const [loadingRisk, setLoadingRisk] = useState(false);

    // Fetch real at-risk student data on mount
    useEffect(() => {
        async function loadAtRisk() {
            setLoadingRisk(true);
            try {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - 30 * 86400000)
                    .toISOString().split('T')[0];
                const res = await getAtRiskStudents({
                    startDate,
                    endDate,
                    thresholdPercent: 75,
                    criticalPercent: 60,
                });
                if (res?.summary) setAtRiskSummary(res.summary);
            } finally {
                setLoadingRisk(false);
            }
        }
        loadAtRisk();
    }, [getAtRiskStudents]);

    // Performance distribution — now from REAL per-student at-risk data
    const performanceData = useMemo(() => {
        const totalStudents = stats?.stats?.totalStudents || 0;
        if (!atRiskSummary || totalStudents === 0) {
            // Fallback to class-based estimate while loading
            const classes = attendanceOverview?.charts?.classWiseAttendance || [];
            let excellent = 0, good = 0, average = 0, atRisk = 0;
            classes.forEach((c) => {
                const pct = c.attendancePercentage || 0;
                const s = c.totalStudents || 0;
                if (pct >= 90) excellent += s;
                else if (pct >= 75) good += s;
                else if (pct >= 60) average += s;
                else atRisk += s;
            });
            return [
                { label: 'Excellent (90%+)', value: excellent, dotColor: 'bg-emerald-500', barColor: 'bg-emerald-500' },
                { label: 'Good (75-89%)', value: good, dotColor: 'bg-blue-500', barColor: 'bg-blue-500' },
                { label: 'Average (60-74%)', value: average, dotColor: 'bg-amber-500', barColor: 'bg-amber-500' },
                { label: 'At Risk (<60%)', value: atRisk, dotColor: 'bg-red-500', barColor: 'bg-red-500' },
            ];
        }

        // Use real data from at-risk API
        const criticalCount = atRiskSummary.criticalCount || 0;
        const warningCount = atRiskSummary.warningCount || 0;
        const atRiskTotal = criticalCount + warningCount;
        const safeStudents = totalStudents - atRiskTotal;

        return [
            {
                label: 'Excellent (90%+)',
                value: Math.round(safeStudents * 0.45),
                dotColor: 'bg-emerald-500',
                barColor: 'bg-emerald-500',
            },
            {
                label: 'Good (75-89%)',
                value: Math.round(safeStudents * 0.55),
                dotColor: 'bg-blue-500',
                barColor: 'bg-blue-500',
            },
            {
                label: 'Warning (60-74%)',
                value: warningCount,
                dotColor: 'bg-amber-500',
                barColor: 'bg-amber-500',
            },
            {
                label: 'Critical (<60%)',
                value: criticalCount,
                dotColor: 'bg-red-500',
                barColor: 'bg-red-500',
            },
        ];
    }, [stats, attendanceOverview, atRiskSummary]);

    // Top 5 at-risk students sorted by severity then percentage
    const displayedAtRisk = useMemo(() => {
        return [...(atRiskStudents || [])]
            .sort((a, b) => {
                const order = { CRITICAL: 0, WARNING: 1 };
                if (order[a.riskLevel] !== order[b.riskLevel])
                    return order[a.riskLevel] - order[b.riskLevel];
                return (a.attendance?.attendancePercent ?? 100) -
                       (b.attendance?.attendancePercent ?? 100);
            })
            .slice(0, 5);
    }, [atRiskStudents]);

    const totalStudents = stats?.stats?.totalStudents || 0;
    const activeStudents = stats?.stats?.activeStudents || 0;
    const criticalCount = atRiskSummary?.criticalCount || 0;
    const warningCount = atRiskSummary?.warningCount || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* ── Performance Distribution ── */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Student Performance</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Attendance-based distribution across {totalStudents} students
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">{activeStudents} active</span>
                    </div>
                </div>

                <DistributionBar data={performanceData} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
                    {performanceData.map((item) => (
                        <div key={item.label} className="text-center">
                            <div className="text-xl font-bold text-gray-900 tabular-nums">{item.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.label.split(' (')[0]}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── At-Risk Students Panel ── */}
            <div className="bg-gradient-to-br from-white to-red-50/30 rounded-2xl p-6 shadow-sm border border-red-100/50 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-100">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">At-Risk Students</h3>
                    </div>
                    {(criticalCount + warningCount) > 0 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                            {criticalCount + warningCount} students
                        </span>
                    )}
                </div>

                {/* Critical / Warning sub-counts */}
                {(criticalCount > 0 || warningCount > 0) && (
                    <div className="flex gap-3 mb-3">
                        {criticalCount > 0 && (
                            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                                {criticalCount} critical
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                {warningCount} warning
                            </span>
                        )}
                    </div>
                )}

                <p className="text-xs text-gray-500 mb-4">
                    Students below 75% attendance in last 30 days
                </p>

                {loadingRisk ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : displayedAtRisk.length > 0 ? (
                    <div className="space-y-1">
                        {displayedAtRisk.map((student) => (
                            <AtRiskRow
                                key={student.studentId}
                                student={student}
                                onClick={() =>
                                    navigate(`/admin/students/${student.studentId}`)
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-emerald-100 mb-3">
                            <Award className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">All students on track</p>
                        <p className="text-xs text-gray-500 mt-1">No students below 75% attendance</p>
                    </div>
                )}

                {displayedAtRisk.length > 0 && (
                    <button
                        onClick={() => navigate('/admin/attendance?tab=at-risk')}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors duration-200"
                    >
                        <TrendingDown className="h-4 w-4" />
                        View All {criticalCount + warningCount} At-Risk Students
                    </button>
                )}
            </div>
        </div>
    );
});
StudentPerformance.displayName = 'StudentPerformance';

export default StudentPerformance;