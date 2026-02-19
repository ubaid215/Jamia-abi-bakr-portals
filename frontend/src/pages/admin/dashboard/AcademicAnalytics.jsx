import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { ChartSkeleton } from './SkeletonWidgets';

// Lazy load Recharts for perf
const LazyLineChart = lazy(() =>
    import('recharts').then((m) => ({
        default: ({ children, ...props }) => {
            const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } = m;
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart {...props}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(d) => {
                                const date = new Date(d);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(255,255,255,0.95)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                padding: '10px 14px',
                            }}
                            labelFormatter={(d) =>
                                new Date(d).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'long',
                                    day: 'numeric',
                                })
                            }
                            formatter={(value) => [`${value}%`, 'Attendance Rate']}
                        />
                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#F59E0B"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
                        />
                        {children}
                    </LineChart>
                </ResponsiveContainer>
            );
        },
    }))
);

const LazyBarChart = lazy(() =>
    import('recharts').then((m) => ({
        default: ({ data }) => {
            const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } = m;

            const colors = data?.map((d) => {
                const pct = d.attendancePercentage || 0;
                if (pct >= 90) return '#10B981';
                if (pct >= 75) return '#3B82F6';
                if (pct >= 60) return '#F59E0B';
                return '#EF4444';
            }) || [];

            return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="className"
                            width={100}
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(255,255,255,0.95)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                padding: '10px 14px',
                            }}
                            formatter={(value) => [`${value}%`, 'Attendance']}
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        />
                        <Bar dataKey="attendancePercentage" radius={[0, 6, 6, 0]} maxBarSize={24}>
                            {data?.map((_, index) => (
                                <Cell key={index} fill={colors[index]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        },
    }))
);

// ─── Time Range Toggle ──────────────────────────────────────
const TimeToggle = React.memo(({ value, onChange }) => {
    const options = [
        { value: 7, label: '7d' },
        { value: 30, label: '30d' },
        { value: 90, label: '90d' },
    ];

    return (
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${value === opt.value
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
});
TimeToggle.displayName = 'TimeToggle';

// ─── Academic Analytics Section ─────────────────────────────
const AcademicAnalytics = React.memo(({
    attendanceTrends,
    classComparison,
    onDaysChange,
    trendDays = 30,
}) => {
    const navigate = useNavigate();

    const trends = useMemo(() => attendanceTrends?.trends || [], [attendanceTrends]);
    const classes = useMemo(() => {
        const raw = classComparison?.classes || [];
        return raw.slice(0, 10); // Top 10
    }, [classComparison]);

    const avgAttendance = useMemo(() => {
        if (trends.length === 0) return 0;
        const sum = trends.reduce((acc, t) => acc + (t.percentage || 0), 0);
        return (sum / trends.length).toFixed(1);
    }, [trends]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Attendance Trend Chart */}
            <div
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => navigate('/super-admin/attendance')}
            >
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-50">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Attendance Trend</h3>
                    </div>
                    <TimeToggle value={trendDays} onChange={onDaysChange} />
                </div>
                <p className="text-sm text-gray-500 mb-4 ml-9">
                    Avg: <span className="font-semibold text-gray-700">{avgAttendance}%</span> over {trendDays} days
                </p>

                <div className="h-64">
                    <Suspense fallback={<ChartSkeleton height="h-56" />}>
                        {trends.length > 0 ? (
                            <LazyLineChart data={trends} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                <Calendar className="h-5 w-5 mr-2" />
                                No trend data available
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>

            {/* Class Comparison Chart */}
            <div
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => navigate('/super-admin/attendance')}
            >
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Class Comparison</h3>
                    </div>
                    <span className="text-xs font-medium text-gray-400">{classes.length} classes</span>
                </div>
                <p className="text-sm text-gray-500 mb-4 ml-9">
                    Attendance % per class • sorted best to worst
                </p>

                <div className="h-64">
                    <Suspense fallback={<ChartSkeleton height="h-56" />}>
                        {classes.length > 0 ? (
                            <LazyBarChart data={classes} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                <BarChart3 className="h-5 w-5 mr-2" />
                                No class data available
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>
        </div>
    );
});
AcademicAnalytics.displayName = 'AcademicAnalytics';

export default AcademicAnalytics;
