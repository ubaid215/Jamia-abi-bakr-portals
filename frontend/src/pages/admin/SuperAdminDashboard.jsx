// SuperAdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAdmin } from '../../contexts/AdminContext';

// Dashboard sections
import ExecutiveSummary from './dashboard/ExecutiveSummary';
import StudentPerformance from './dashboard/StudentPerformance';
import AcademicAnalytics from './dashboard/AcademicAnalytics';
import OperationalPanel from './dashboard/OperationalPanel';
import ActivityTimeline from './dashboard/ActivityTimeline';
import {
    KPISkeleton,
    ChartSkeleton,
    TableSkeleton,
    TimelineSkeleton,
} from './dashboard/SkeletonWidgets';

const SuperAdminDashboard = () => {
    const {
        fetchSystemStats,
        fetchAdmins,
        fetchAttendanceOverview,
        fetchAttendanceTrends,
        fetchClassAttendanceComparison,
        getAtRiskStudents,
        stats,
        admins,
        attendanceOverview,
        attendanceTrends,
        classAttendanceComparison,
    } = useAdmin();

    const [trendDays, setTrendDays] = useState(30);

    // Per-section ready flags — panels render as soon as their own data arrives,
    // not gated behind a single global loading boolean.
    const [sectionReady, setSectionReady] = useState({
        kpi: false,
        performance: false,
        analytics: false,
        operational: false,
    });

    // At-risk data hoisted here so StudentPerformance never fetches independently
    const [atRiskData, setAtRiskData] = useState({ summary: null, students: [] });

    const initialLoadDone = useRef(false);
    const mounted = useRef(true);

    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const getDateDaysAgo = useCallback((days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    }, []);

    // Load KPI + performance data in one parallel batch
    const loadCoreData = useCallback(async () => {
        if (!mounted.current) return;

        const startDate = getDateDaysAgo(30);
        const endDate = todayString;

        const results = await Promise.allSettled([
            fetchSystemStats(),                                          // 0
            fetchAdmins(),                                               // 1
            fetchAttendanceOverview({ startDate, endDate }),             // 2
            getAtRiskStudents({                                          // 3
                startDate,
                endDate,
                thresholdPercent: 75,
                criticalPercent: 60,
            }),
        ]);

        if (!mounted.current) return;

        // KPI bar — needs stats (0)
        if (results[0].status === 'fulfilled') {
            setSectionReady(prev => ({ ...prev, kpi: true, operational: true }));
        }

        // Student performance — needs overview (2) or at-risk (3), whichever arrives
        if (results[2].status === 'fulfilled' || results[3].status === 'fulfilled') {
            setSectionReady(prev => ({ ...prev, performance: true }));
        }

        // Store at-risk data to pass down as props
        if (results[3].status === 'fulfilled') {
            const res = results[3].value;
            setAtRiskData({
                summary: res.summary || null,
                students: res.atRiskStudents || [],
            });
        }
    }, [fetchSystemStats, fetchAdmins, fetchAttendanceOverview, getAtRiskStudents, getDateDaysAgo, todayString]);

    // Load chart data (trends + comparison) — separate so it doesn't delay KPI/performance render
    const loadChartData = useCallback(async () => {
        if (!mounted.current) return;

        const results = await Promise.allSettled([
            fetchAttendanceTrends({ days: trendDays }),
            fetchClassAttendanceComparison({
                startDate: getDateDaysAgo(30),
                endDate: todayString,
            }),
        ]);

        if (!mounted.current) return;

        if (results[0].status === 'fulfilled' || results[1].status === 'fulfilled') {
            setSectionReady(prev => ({ ...prev, analytics: true }));
        }
    }, [fetchAttendanceTrends, fetchClassAttendanceComparison, getDateDaysAgo, todayString, trendDays]);

    // Initial load — fire both batches concurrently so charts don't wait for core
    useEffect(() => {
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            loadCoreData();
            loadChartData();
        }
        return () => {
            mounted.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload chart data when trend window changes
    useEffect(() => {
        if (initialLoadDone.current) {
            setSectionReady(prev => ({ ...prev, analytics: false }));
            loadChartData();
        }
    }, [trendDays, loadChartData]);

    const handleDaysChange = useCallback((days) => {
        setTrendDays(days);
    }, []);

    const recentActivities = useMemo(
        () => stats?.recentActivities || [],
        [stats]
    );

    return (
        <div className="space-y-6 pb-8">
            {/* 1. Executive Summary KPI Bar */}
            {!sectionReady.kpi && !stats ? (
                <KPISkeleton />
            ) : (
                <ExecutiveSummary
                    stats={stats}
                    attendanceOverview={attendanceOverview}
                    admins={admins}
                />
            )}

            {/* 2. Student Performance Intelligence */}
            {!sectionReady.performance && !attendanceOverview ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2"><ChartSkeleton /></div>
                    <TableSkeleton rows={5} />
                </div>
            ) : (
                <StudentPerformance
                    stats={stats}
                    attendanceOverview={attendanceOverview}
                    atRiskStudents={atRiskData.students}
                    atRiskSummary={atRiskData.summary}
                />
            )}

            {/* 3. Academic Analytics (Charts) */}
            {!sectionReady.analytics && !attendanceTrends ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
            ) : (
                <AcademicAnalytics
                    attendanceTrends={attendanceTrends}
                    classComparison={classAttendanceComparison}
                    trendDays={trendDays}
                    onDaysChange={handleDaysChange}
                />
            )}

            {/* 4. Operational Panel + 5. Activity Timeline */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                <div className="xl:col-span-2">
                    {!sectionReady.operational && !stats ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TableSkeleton rows={4} />
                            <TableSkeleton rows={4} />
                        </div>
                    ) : (
                        <OperationalPanel
                            stats={stats}
                            attendanceOverview={attendanceOverview}
                        />
                    )}
                </div>

                <div>
                    {!sectionReady.kpi && !stats ? (
                        <TimelineSkeleton />
                    ) : (
                        <ActivityTimeline recentActivities={recentActivities} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(SuperAdminDashboard);