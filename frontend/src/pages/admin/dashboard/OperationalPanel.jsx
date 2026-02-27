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
import dailyActivityService from '../../../services/dailyActivityService';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

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


// ─── Operational Panel ──────────────────────────────────────
const OperationalPanel = React.memo(({ stats, attendanceOverview }) => {
    const navigate = useNavigate();
    const [weeklyActivities, setWeeklyActivities] = React.useState([]);

    React.useEffect(() => {
        const fetchActivities = async () => {
            try {
                const today = new Date().toISOString().split("T")[0];
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const startDate7Days = weekAgo.toISOString().split("T")[0];

                const res = await dailyActivityService.getAll({
                    startDate: startDate7Days,
                    endDate: today,
                    limit: 1000
                });

                const activities = res?.data || res?.items || [];

                const grouped = activities.reduce((acc, curr) => {
                    const d = curr.date?.split("T")[0];
                    if (d) {
                        acc[d] = (acc[d] || 0) + 1;
                    }
                    return acc;
                }, {});

                const chartData = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().split("T")[0];
                    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                    chartData.push({
                        date: dateStr,
                        day: dayName,
                        activities: grouped[dateStr] || 0,
                    });
                }
                setWeeklyActivities(chartData);
            } catch (err) {
                console.error("Failed to fetch daily activities:", err);
            }
        };

        fetchActivities();
    }, []);

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

            {/* Weekly Activity Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-50">
                            <Activity className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Weekly Activity Overview</h3>
                    </div>
                </div>

                <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyActivities} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="activities" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
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
