// FILE: src/contexts/WeeklyReportContext.jsx
// PURPOSE: Provides weekly progress report data for parent portal
// REQUIRED BY: src/pages/parent/WeeklyReports.jsx
//   which uses: { reports, pagination, loading, error, fetchWeeklyReports }
// BACKEND CONTRACT: backend/modules/weekly-progress/weeklyProgress.routes.js
//   GET /api/weekly-progress?studentId=:id&year=:y&page=:p&limit=:l
//
// BACKEND RESPONSE SHAPE (from weeklyProgressSelect):
//   { id, studentId, classRoomId, weekNumber, year, weekStart, weekEnd,
//     daysPresent, daysAbsent, daysLate, attendanceRate, homeworkCompletionRate,
//     avgBehaviorRating, avgParticipation, avgDiscipline, totalHoursSpent,
//     subjectPerformance, riskLevel, followUpRequired,
//     teacherComments, weeklyHighlights, areasOfImprovement,
//     achievements, incidents, actionItems, ... }

import React, { createContext, useContext, useState, useCallback } from 'react';
import weeklyProgressService from '../services/weeklyProgressService';

const WeeklyReportContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useWeeklyReport = () => {
    const ctx = useContext(WeeklyReportContext);
    if (!ctx) throw new Error('useWeeklyReport must be used within WeeklyReportProvider');
    return ctx;
};

export const WeeklyReportProvider = ({ children }) => {
    const [reports, setReports] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        total: 0,
        hasPrev: false,
        hasNext: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Accepts { studentId, page, limit, year }
    const fetchWeeklyReports = useCallback(async (filters = {}) => {
        const { studentId, page = 1, limit = 10, year } = filters;
        if (!studentId) return;

        setLoading(true);
        setError(null);
        try {
            const res = await weeklyProgressService.getByStudent(studentId, {
                page,
                limit,
                ...(year && { year }),
            });

            setReports(res.data || []);

            // Normalize pagination to match what WeeklyReports.jsx expects
            // { currentPage, totalPages, hasPrev, hasNext }
            const raw = res.pagination || {};
            setPagination({
                currentPage: raw.page || page,
                totalPages: raw.totalPages || 1,
                hasPrev: raw.hasPrevPage ?? (page > 1),
                hasNext: raw.hasNextPage ?? false,
                total: raw.total || 0,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load weekly reports');
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        reports,
        pagination,
        loading,
        error,
        fetchWeeklyReports,
    };

    return (
        <WeeklyReportContext.Provider value={value}>
            {children}
        </WeeklyReportContext.Provider>
    );
};

export default WeeklyReportContext;
