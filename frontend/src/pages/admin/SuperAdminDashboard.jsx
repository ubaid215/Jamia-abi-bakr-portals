// SuperAdminDashboard.js - Updated version
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
        loading, // Add loading from context
    } = useAdmin();

    const [trendDays, setTrendDays] = useState(30);
    
    // Track data availability separately from loading state
    const [dataStatus, setDataStatus] = useState({
        stats: false,
        attendanceOverview: false,
        attendanceTrends: false,
        classComparison: false,
        atRisk: false,
    });

    const [atRiskData, setAtRiskData] = useState({ summary: null, students: [] });
    const initialLoadDone = useRef(false);
    const mounted = useRef(true);

    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
    
    const getDateDaysAgo = useCallback((days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    }, []);

    // Monitor context data and update dataStatus
    useEffect(() => {
        if (stats) {
            setDataStatus(prev => ({ ...prev, stats: true }));
        }
    }, [stats]);

    useEffect(() => {
        if (attendanceOverview) {
            setDataStatus(prev => ({ ...prev, attendanceOverview: true }));
        }
    }, [attendanceOverview]);

    useEffect(() => {
        if (attendanceTrends) {
            setDataStatus(prev => ({ ...prev, attendanceTrends: true }));
        }
    }, [attendanceTrends]);

    useEffect(() => {
        if (classAttendanceComparison) {
            setDataStatus(prev => ({ ...prev, classComparison: true }));
        }
    }, [classAttendanceComparison]);

    // Load core data (stats, admins, overview, at-risk)
    const loadCoreData = useCallback(async () => {
        if (!mounted.current) return;

        const startDate = getDateDaysAgo(30);
        const endDate = todayString;

        try {
            // Don't wait for all to complete - use Promise.allSettled
            const results = await Promise.allSettled([
                fetchSystemStats(),
                fetchAdmins(),
                fetchAttendanceOverview({ startDate, endDate }),
                getAtRiskStudents({
                    startDate,
                    endDate,
                    thresholdPercent: 75,
                    criticalPercent: 60,
                }),
            ]);

            if (!mounted.current) return;

            // Store at-risk data
            if (results[3].status === 'fulfilled') {
                const res = results[3].value;
                setAtRiskData({
                    summary: res.summary || null,
                    students: res.atRiskStudents || [],
                });
                setDataStatus(prev => ({ ...prev, atRisk: true }));
            }
        } catch (error) {
            console.error('Error loading core data:', error);
        }
    }, [fetchSystemStats, fetchAdmins, fetchAttendanceOverview, getAtRiskStudents, getDateDaysAgo, todayString]);

    // Load chart data
    const loadChartData = useCallback(async () => {
        if (!mounted.current) return;

        try {
            await Promise.allSettled([
                fetchAttendanceTrends({ days: trendDays }),
                fetchClassAttendanceComparison({
                    startDate: getDateDaysAgo(30),
                    endDate: todayString,
                }),
            ]);
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }, [fetchAttendanceTrends, fetchClassAttendanceComparison, getDateDaysAgo, todayString, trendDays]);

    // Initial load
    useEffect(() => {
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            loadCoreData();
            loadChartData();
        }
        
        return () => {
            mounted.current = false;
        };
    }, [loadCoreData, loadChartData]);

    // Reload chart data when trend window changes
    useEffect(() => {
        if (initialLoadDone.current) {
            setDataStatus(prev => ({ ...prev, attendanceTrends: false, classComparison: false }));
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

    // Determine if sections are ready - check both loading state and data availability
    const isKPILoading = loading && !dataStatus.stats;
    const isPerformanceLoading = loading && !dataStatus.attendanceOverview && !dataStatus.atRisk;
    const isAnalyticsLoading = loading && !dataStatus.attendanceTrends && !dataStatus.classComparison;
    const isOperationalLoading = loading && !dataStatus.stats;

    return (
        <div className="space-y-6 pb-8">
            {/* 1. Executive Summary KPI Bar */}
            {isKPILoading ? (
                <KPISkeleton />
            ) : (
                <ExecutiveSummary
                    stats={stats}
                    attendanceOverview={attendanceOverview}
                    admins={admins}
                />
            )}

            {/* 2. Student Performance Intelligence */}
            {isPerformanceLoading ? (
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
            {isAnalyticsLoading ? (
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
                    {isOperationalLoading ? (
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
                    {isOperationalLoading ? (
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