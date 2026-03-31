/* eslint-disable no-unused-vars */
// SuperAdminDashboard.js - Fixed version
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import debounce from 'lodash/debounce';

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

// Simple in-memory cache (optional - you can disable initially)
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const cache = new Map();

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached data for: ${key}`);
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`Cached data for: ${key}`);
};

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
    loading: contextLoading, // Use context loading state
  } = useAdmin();

  const [trendDays, setTrendDays] = useState(30);
  const [dataLoaded, setDataLoaded] = useState({
    stats: false,
    attendance: false,
    trends: false,
    comparison: false,
  });
  
  const initialLoadDone = useRef(false);
  const mounted = useRef(true);

  // Memoized date helpers
  const todayString = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const getDateDaysAgo = useCallback((days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }, []);

  // Load core data without caching first (let's get it working)
  const loadCoreData = useCallback(async () => {
    if (!mounted.current) return;
    
    console.log('Loading core data...');
    
    try {
      // Skip cache for now to ensure data loads
      const results = await Promise.allSettled([
        fetchSystemStats(),
        fetchAdmins(),
        fetchAttendanceOverview({
          startDate: getDateDaysAgo(30),
          endDate: todayString,
        }),
      ]);

      console.log('Core data results:', results.map(r => r.status));
      
      if (mounted.current) {
        setDataLoaded(prev => ({
          ...prev,
          stats: results[0].status === 'fulfilled',
          attendance: results[2].status === 'fulfilled',
        }));
      }
    } catch (err) {
      console.error('Dashboard core data load failed:', err);
    }
  }, [fetchSystemStats, fetchAdmins, fetchAttendanceOverview, getDateDaysAgo, todayString]);

  // Load chart data
  const loadChartData = useCallback(async () => {
    if (!mounted.current) return;
    
    console.log('Loading chart data for days:', trendDays);
    
    try {
      const results = await Promise.allSettled([
        fetchAttendanceTrends({ days: trendDays }),
        fetchClassAttendanceComparison({
          startDate: getDateDaysAgo(30),
          endDate: todayString,
        }),
      ]);

      console.log('Chart data results:', results.map(r => r.status));
      
      if (mounted.current) {
        setDataLoaded(prev => ({
          ...prev,
          trends: results[0].status === 'fulfilled',
          comparison: results[1].status === 'fulfilled',
        }));
      }
    } catch (err) {
      console.error('Dashboard chart data load failed:', err);
    }
  }, [fetchAttendanceTrends, fetchClassAttendanceComparison, getDateDaysAgo, todayString, trendDays]);

  // Load core data on mount
  useEffect(() => {
    if (!initialLoadDone.current) {
      loadCoreData();
      loadChartData(); // Also load chart data initially
      initialLoadDone.current = true;
    }
    
    return () => {
      mounted.current = false;
    };
  }, [loadCoreData, loadChartData]);

  // Reload chart data when trend days change
  useEffect(() => {
    if (initialLoadDone.current) {
      loadChartData();
    }
  }, [trendDays, loadChartData]);

  const handleDaysChange = useCallback((days) => {
    console.log('Trend days changed to:', days);
    setTrendDays(days);
  }, []);

  // Memoized recent activities
  const recentActivities = useMemo(
    () => stats?.recentActivities || [],
    [stats]
  );

  // Debug logging
  useEffect(() => {
    console.log('Stats data:', stats);
    console.log('Attendance overview:', attendanceOverview);
    console.log('Data loaded state:', dataLoaded);
  }, [stats, attendanceOverview, dataLoaded]);

  // Check if data is loading
  const isLoading = contextLoading || (!dataLoaded.stats && !stats);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Executive Summary KPI Bar */}
      {isLoading && !stats ? (
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

export default React.memo(SuperAdminDashboard);