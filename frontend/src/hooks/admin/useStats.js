import { useQuery } from '@tanstack/react-query';
import adminService from '../../services/adminService';

const QUERY_KEYS = {
    stats: 'systemStats',
    attendanceOverview: 'attendanceOverview',
    attendanceTrends: 'attendanceTrends',
    classComparison: 'classAttendanceComparison',
    trackingStats: 'trackingStats',
    atRiskStudents: 'atRiskStudents',
};

/**
 * Fetch system stats.
 * Replaces AdminContext.fetchStats
 */
export function useSystemStats() {
    return useQuery({
        queryKey: [QUERY_KEYS.stats],
        queryFn: () => adminService.getStats(),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Fetch attendance overview.
 * Replaces AdminContext.fetchAttendanceOverview
 */
export function useAttendanceOverview(params = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.attendanceOverview, params],
        queryFn: () => adminService.getAttendanceOverview(params),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Fetch attendance trends.
 * Replaces AdminContext.fetchAttendanceTrends
 */
export function useAttendanceTrends(params = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.attendanceTrends, params],
        queryFn: () => adminService.getAttendanceTrends(params),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Fetch class attendance comparison.
 * Replaces AdminContext.fetchClassAttendanceComparison
 */
export function useClassAttendanceComparison(params = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.classComparison, params],
        queryFn: () => adminService.getClassAttendanceComparison(params),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Fetch at-risk students.
 * Replaces AdminContext.getAtRiskStudents
 */
export function useAtRiskStudents(params = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.atRiskStudents, params],
        queryFn: () => adminService.getAtRiskStudents(params),
        staleTime: 5 * 60 * 1000,
    });
}
