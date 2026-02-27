import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
    stats,
    admins,
    attendanceOverview,
    attendanceTrends,
    classAttendanceComparison,
    // eslint-disable-next-line no-unused-vars
    loading,
  } = useAdmin();

  const [trendDays, setTrendDays] = useState(30);
  const [dataLoaded, setDataLoaded] = useState({
    stats: false,
    attendance: false,
    trends: false,
    comparison: false,
  });

  // ─── Data Fetching ──────────────────────────────────────
  const loadCoreData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchSystemStats(),
        fetchAdmins(),
        fetchAttendanceOverview({
          startDate: getDateDaysAgo(30),
          endDate: todayString(),
        }),
      ]);

      setDataLoaded((prev) => ({
        ...prev,
        stats: results[0].status === 'fulfilled',
        attendance: results[2].status === 'fulfilled',
      }));
    } catch (err) {
      console.error('Dashboard core data load failed:', err);
    }
  }, [fetchSystemStats, fetchAdmins, fetchAttendanceOverview]);

  const loadChartData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchAttendanceTrends({ days: trendDays }),
        fetchClassAttendanceComparison({
          startDate: getDateDaysAgo(30),
          endDate: todayString(),
        }),
      ]);

      setDataLoaded((prev) => ({
        ...prev,
        trends: results[0].status === 'fulfilled',
        comparison: results[1].status === 'fulfilled',
      }));
    } catch (err) {
      console.error('Dashboard chart data load failed:', err);
    }
  }, [fetchAttendanceTrends, fetchClassAttendanceComparison, trendDays]);

  // Load core data on mount
  useEffect(() => {
    loadCoreData();
  }, []);

  // Load chart data on mount and when trend days change
  useEffect(() => {
    loadChartData();
  }, [trendDays]);

  const handleDaysChange = useCallback((days) => {
    setTrendDays(days);
  }, []);

  // Extract recent activities from stats
  const recentActivities = useMemo(
    () => stats?.recentActivities || [],
    [stats]
  );

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      {/* 1. Executive Summary KPI Bar */}
      {!dataLoaded.stats && !stats ? (
        <KPISkeleton />
      ) : (
        <ExecutiveSummary
          stats={stats}
          attendanceOverview={attendanceOverview}
          admins={admins}
        />
      )}

      {/* 2. Student Performance Intelligence */}
      {!dataLoaded.attendance && !attendanceOverview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <TableSkeleton rows={5} />
        </div>
      ) : (
        <StudentPerformance
          stats={stats}
          attendanceOverview={attendanceOverview}
        />
      )}

      {/* 3. Academic Analytics (Charts) */}
      {!dataLoaded.trends && !attendanceTrends ? (
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

      {/* 4. Operational Intelligence + 5. Activity Timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2">
          {!dataLoaded.stats && !stats ? (
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
          {!dataLoaded.stats && !stats ? (
            <TimelineSkeleton />
          ) : (
            <ActivityTimeline recentActivities={recentActivities} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────
function todayString() {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export default SuperAdminDashboard;