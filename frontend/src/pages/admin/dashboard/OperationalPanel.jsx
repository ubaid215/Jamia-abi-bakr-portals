import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    ChevronRight,
    Shield,
    Activity,
    Database,
    Cpu,
} from 'lucide-react';

// ─── Health Badge ───────────────────────────────────────────
const HealthBadge = React.memo(({ status, label }) => {
    const colors = {
        healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        critical: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[status] || colors.healthy}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                } ${status === 'healthy' ? 'animate-pulse' : ''}`} />
            {label}
        </span>
    );
});
HealthBadge.displayName = 'HealthBadge';

// ─── Metric Row ─────────────────────────────────────────────
const MetricRow = React.memo(({ icon: Icon, label, value, status }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gray-50">
                <Icon className="h-4 w-4 text-gray-500" />
            </div>
            <span className="text-sm text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
            {status && <HealthBadge status={status} label={status} />}
        </div>
    </div>
));
MetricRow.displayName = 'MetricRow';

// ─── Leave Request Row ──────────────────────────────────────
const LeaveRow = React.memo(({ request, onClick }) => {
    const statusColors = {
        PENDING: 'bg-amber-100 text-amber-700',
        APPROVED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-700',
    };

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
        >
            <div className={`p-2 rounded-lg ${request.status === 'PENDING' ? 'bg-amber-50' :
                    request.status === 'APPROVED' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                {request.status === 'PENDING' ? <Clock className="h-4 w-4 text-amber-600" /> :
                    request.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                        <XCircle className="h-4 w-4 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {request.teacher?.user?.name || 'Unknown Teacher'}
                </p>
                <p className="text-xs text-gray-500">
                    {request.startDate ? new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    {request.endDate ? ` → ${new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[request.status] || 'bg-gray-100 text-gray-600'}`}>
                {request.status}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
    );
});
LeaveRow.displayName = 'LeaveRow';

// ─── Operational Panel ──────────────────────────────────────
const OperationalPanel = React.memo(({ leaveRequests, stats, attendanceOverview }) => {
    const navigate = useNavigate();

    const pendingLeaves = useMemo(() => {
        const requests = leaveRequests?.leaveRequests || leaveRequests || [];
        if (!Array.isArray(requests)) return [];
        return requests.filter((r) => r.status === 'PENDING').slice(0, 5);
    }, [leaveRequests]);

    const totalPending = useMemo(() => {
        const requests = leaveRequests?.leaveRequests || leaveRequests || [];
        if (!Array.isArray(requests)) return 0;
        return requests.filter((r) => r.status === 'PENDING').length;
    }, [leaveRequests]);

    // System metrics from real stats
    const systemMetrics = useMemo(() => {
        const s = stats?.stats || {};
        const overview = attendanceOverview?.summary || {};

        return [
            {
                icon: Database,
                label: 'Total Records',
                value: (overview.totalRecords || 0).toLocaleString(),
                status: 'healthy',
            },
            {
                icon: Activity,
                label: 'Active Students',
                value: `${s.activeStudents || 0} / ${s.totalStudents || 0}`,
                status: (s.activeStudents || 0) > (s.totalStudents || 0) * 0.8 ? 'healthy' : 'warning',
            },
            {
                icon: Cpu,
                label: 'Active Teachers',
                value: `${s.activeTeachers || 0} / ${s.totalTeachers || 0}`,
                status: (s.activeTeachers || 0) > (s.totalTeachers || 0) * 0.8 ? 'healthy' : 'warning',
            },
            {
                icon: Shield,
                label: 'Attendance Rate',
                value: `${s.weeklyAttendanceRate || overview.overallAttendancePercentage || 0}%`,
                status: (s.weeklyAttendanceRate || 0) >= 80 ? 'healthy' : (s.weeklyAttendanceRate || 0) >= 60 ? 'warning' : 'critical',
            },
        ];
    }, [stats, attendanceOverview]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* Leave Requests */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-50">
                            <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
                    </div>
                    {totalPending > 0 && (
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <AlertCircle className="h-3 w-3" />
                            {totalPending} pending
                        </span>
                    )}
                </div>

                {pendingLeaves.length > 0 ? (
                    <div className="space-y-1">
                        {pendingLeaves.map((req, idx) => (
                            <LeaveRow
                                key={req.id || idx}
                                request={req}
                                onClick={() => navigate('/admin/leave-requests')}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="p-3 rounded-full bg-emerald-50 mb-3">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No pending requests</p>
                        <p className="text-xs text-gray-500 mt-1">All leave requests have been processed</p>
                    </div>
                )}

                {totalPending > 5 && (
                    <button
                        onClick={() => navigate('/admin/leave-requests')}
                        className="mt-3 w-full py-2 text-center text-sm font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors duration-200"
                    >
                        View all {totalPending} pending requests →
                    </button>
                )}
            </div>

            {/* System Health */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50">
                            <Shield className="h-4 w-4 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">System Health</h3>
                    </div>
                    <HealthBadge status="healthy" label="Operational" />
                </div>

                <div className="space-y-0">
                    {systemMetrics.map((metric, idx) => (
                        <MetricRow key={idx} {...metric} />
                    ))}
                </div>

                {/* Class Type Distribution */}
                {stats?.stats?.classTypes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Class Distribution</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.stats.classTypes).map(([type, count]) => (
                                <span
                                    key={type}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${type === 'REGULAR' ? 'bg-blue-50 text-blue-700' :
                                            type === 'HIFZ' ? 'bg-purple-50 text-purple-700' :
                                                'bg-amber-50 text-amber-700'
                                        }`}
                                >
                                    {type}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
OperationalPanel.displayName = 'OperationalPanel';

export default OperationalPanel;
