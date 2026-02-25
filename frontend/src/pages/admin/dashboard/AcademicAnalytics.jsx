import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis,
    Tooltip, CartesianGrid,
    Cell, ReferenceLine,
} from 'recharts';
import { ChartSkeleton } from './SkeletonWidgets';

// ─── Attendance Trend Line Chart ────────────────────────────
const TrendLineChart = React.memo(({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
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
            {/* 75% threshold reference line — at-risk boundary */}
            <ReferenceLine
                y={75}
                stroke="#EF4444"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{
                    value: '75% min',
                    fontSize: 10,
                    fill: '#EF4444',
                    position: 'insideTopRight',
                }}
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
                        weekday: 'short', month: 'long', day: 'numeric',
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
        </LineChart>
    </ResponsiveContainer>
));
TrendLineChart.displayName = 'TrendLineChart';

// ─── Class Comparison Bar Chart ─────────────────────────────
const ClassBarChart = React.memo(({ data, onClassClick }) => {
    const colors = useMemo(() =>
        data.map((d) => {
            const pct = d.attendancePercentage || 0;
            if (pct >= 90) return '#10B981';
            if (pct >= 75) return '#3B82F6';
            if (pct >= 60) return '#F59E0B';
            return '#EF4444';
        }),
        [data]
    );

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
                    width={90}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                />
                {/* 75% threshold line on bar chart too */}
                <ReferenceLine
                    x={75}
                    stroke="#EF4444"
                    strokeDasharray="4 3"
                    strokeOpacity={0.4}
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
                    formatter={(value, name, props) => [
                        `${value}% · ${props.payload.totalStudents || 0} students`,
                        'Attendance',
                    ]}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                />
                <Bar
                    dataKey="attendancePercentage"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={24}
                    // Click individual bar → go to that class
                    onClick={(barData) => onClassClick?.(barData.classId)}
                    style={{ cursor: onClassClick ? 'pointer' : 'default' }}
                >
                    {data.map((_, index) => (
                        <Cell key={index} fill={colors[index]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});
ClassBarChart.displayName = 'ClassBarChart';

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
                    onClick={(e) => {
                        e.stopPropagation(); // prevent card click-through
                        onChange(opt.value);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                        value === opt.value
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
    const [showWorst, setShowWorst] = useState(false);

    const trends = useMemo(() => attendanceTrends?.trends || [], [attendanceTrends]);

    // Show worst-performing classes when toggled (for principal focus)
    const classes = useMemo(() => {
        const raw = classComparison?.classes || [];
        const sorted = showWorst
            ? [...raw].sort((a, b) => a.attendancePercentage - b.attendancePercentage)
            : raw; // backend already sorts best-first
        return sorted.slice(0, 10);
    }, [classComparison, showWorst]);

    const belowThresholdCount = useMemo(() =>
        (classComparison?.classes || []).filter(c => c.attendancePercentage < 75).length,
        [classComparison]
    );

    // Exclude zero-attendance days (no records marked) from average
    const avgAttendance = useMemo(() => {
        const activeDays = trends.filter((t) => t.total > 0);
        if (activeDays.length === 0) return 0;
        const sum = activeDays.reduce((acc, t) => acc + (t.percentage || 0), 0);
        return (sum / activeDays.length).toFixed(1);
    }, [trends]);

    const handleClassClick = (classId) => {
        if (classId) navigate(`/admin/attendance?classId=${classId}`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* ── Attendance Trend Chart ── */}
            <div
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => navigate('/admin/attendance')}
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
                    Avg:{' '}
                    <span className={`font-semibold ${
                        Number(avgAttendance) < 75 ? 'text-red-600' : 'text-gray-700'
                    }`}>
                        {avgAttendance}%
                    </span>{' '}
                    over {trends.filter(t => t.total > 0).length} school days
                </p>

                <div className="h-64">
                    {trends.length > 0 ? (
                        <TrendLineChart data={trends} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            <Calendar className="h-5 w-5 mr-2" />
                            No trend data available
                        </div>
                    )}
                </div>
            </div>

            {/* ── Class Comparison Chart ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Class Comparison</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {belowThresholdCount > 0 && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                {belowThresholdCount} below 75%
                            </span>
                        )}
                        <span className="text-xs font-medium text-gray-400">
                            {classes.length} classes
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between mb-4 ml-9">
                    <p className="text-sm text-gray-500">
                        Click a bar to view class detail
                    </p>
                    <button
                        onClick={() => setShowWorst((v) => !v)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        {showWorst ? 'Show best first' : 'Show worst first'}
                    </button>
                </div>

                <div className="h-64">
                    {classes.length > 0 ? (
                        <ClassBarChart data={classes} onClassClick={handleClassClick} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            <BarChart3 className="h-5 w-5 mr-2" />
                            No class data available
                        </div>
                    )}
                </div>

                {/* Color legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    {[
                        { color: 'bg-emerald-500', label: '90%+' },
                        { color: 'bg-blue-500', label: '75–89%' },
                        { color: 'bg-amber-500', label: '60–74%' },
                        { color: 'bg-red-500', label: '<60%' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1">
                            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                            <span className="text-xs text-gray-500">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
AcademicAnalytics.displayName = 'AcademicAnalytics';

export default AcademicAnalytics;