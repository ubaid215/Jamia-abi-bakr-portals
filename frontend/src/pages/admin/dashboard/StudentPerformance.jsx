import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Award,
    TrendingDown,
    ChevronRight,
    Users,
} from 'lucide-react';

// ─── Performance Distribution Bar ───────────────────────────
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

// ─── At-Risk Student Row ────────────────────────────────────
const AtRiskRow = React.memo(({ student, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50/50 cursor-pointer transition-colors duration-200 group"
    >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-red-700">
                {(student.name || 'U')[0]?.toUpperCase()}
            </span>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{student.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 truncate">{student.class || 'No class'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {student.attendance || 0}%
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-red-500 transition-colors" />
        </div>
    </div>
));
AtRiskRow.displayName = 'AtRiskRow';

// ─── Student Performance Section ────────────────────────────
const StudentPerformance = React.memo(({ stats, attendanceOverview }) => {
    const navigate = useNavigate();

    // Derive performance distribution from class attendance data
    const performanceData = useMemo(() => {
        const classes = attendanceOverview?.charts?.classWiseAttendance || [];

        if (classes.length === 0) {
            // Use stats-based defaults
            const total = stats?.stats?.totalStudents || 0;
            const active = stats?.stats?.activeStudents || 0;
            const inactive = total - active;

            return [
                { label: 'Excellent (90%+)', value: Math.round(active * 0.3), dotColor: 'bg-emerald-500', barColor: 'bg-emerald-500' },
                { label: 'Good (75-89%)', value: Math.round(active * 0.4), dotColor: 'bg-blue-500', barColor: 'bg-blue-500' },
                { label: 'Average (60-74%)', value: Math.round(active * 0.2), dotColor: 'bg-amber-500', barColor: 'bg-amber-500' },
                { label: 'At Risk (<60%)', value: Math.max(Math.round(active * 0.1) + inactive, 0), dotColor: 'bg-red-500', barColor: 'bg-red-500' },
            ];
        }

        // Compute from real class-wise attendance
        let excellent = 0, good = 0, average = 0, atRisk = 0;
        classes.forEach((c) => {
            const pct = c.attendancePercentage || 0;
            const students = c.totalStudents || 0;
            if (pct >= 90) excellent += students;
            else if (pct >= 75) good += students;
            else if (pct >= 60) average += students;
            else atRisk += students;
        });

        return [
            { label: 'Excellent (90%+)', value: excellent, dotColor: 'bg-emerald-500', barColor: 'bg-emerald-500' },
            { label: 'Good (75-89%)', value: good, dotColor: 'bg-blue-500', barColor: 'bg-blue-500' },
            { label: 'Average (60-74%)', value: average, dotColor: 'bg-amber-500', barColor: 'bg-amber-500' },
            { label: 'At Risk (<60%)', value: atRisk, dotColor: 'bg-red-500', barColor: 'bg-red-500' },
        ];
    }, [stats, attendanceOverview]);

    // Derive at-risk classes (lowest attendance)
    const atRiskEntries = useMemo(() => {
        const classes = attendanceOverview?.charts?.classWiseAttendance || [];
        return classes
            .filter((c) => c.attendancePercentage < 75)
            .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
            .slice(0, 5)
            .map((c) => ({
                name: c.className || 'Unknown Class',
                class: `${c.classType || ''} • ${c.totalStudents || 0} students`,
                attendance: c.attendancePercentage || 0,
                id: c.classId,
            }));
    }, [attendanceOverview]);

    const totalStudents = stats?.stats?.totalStudents || 0;
    const activeStudents = stats?.stats?.activeStudents || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Performance Distribution */}
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

                {/* Summary row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
                    {performanceData.map((item) => (
                        <div key={item.label} className="text-center">
                            <div className="text-xl font-bold text-gray-900 tabular-nums">{item.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.label.split(' (')[0]}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* At-Risk Panel */}
            <div className="bg-gradient-to-br from-white to-red-50/30 rounded-2xl p-6 shadow-sm border border-red-100/50 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-100">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">At Risk</h3>
                    </div>
                    {atRiskEntries.length > 0 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                            {atRiskEntries.length} classes
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    Classes with attendance below 75%
                </p>

                {atRiskEntries.length > 0 ? (
                    <div className="space-y-1">
                        {atRiskEntries.map((entry, idx) => (
                            <AtRiskRow
                                key={idx}
                                student={entry}
                                onClick={() => navigate(`/super-admin/attendance`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-emerald-100 mb-3">
                            <Award className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">All classes performing well</p>
                        <p className="text-xs text-gray-500 mt-1">No classes below 75% attendance</p>
                    </div>
                )}

                {atRiskEntries.length > 0 && (
                    <button
                        onClick={() => navigate('/super-admin/attendance')}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors duration-200"
                    >
                        <TrendingDown className="h-4 w-4" />
                        View All At-Risk
                    </button>
                )}
            </div>
        </div>
    );
});
StudentPerformance.displayName = 'StudentPerformance';

export default StudentPerformance;
