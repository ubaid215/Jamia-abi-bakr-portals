// FILE: src/tests/contexts/WeeklyReportContext.test.jsx
// Tests for WeeklyReportContext.jsx
// Run: npx vitest run src/tests/contexts/WeeklyReportContext.test.jsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WeeklyReportProvider, useWeeklyReport } from '../../contexts/WeeklyReportContext';
import weeklyProgressService from '../../services/weeklyProgressService';

// Mock weeklyProgressService
vi.mock('../../services/weeklyProgressService', () => ({
    default: {
        getByStudent: vi.fn(),
    }
}));

// Helper consumer component
const Consumer = ({ studentId, year }) => {
    const { reports, pagination, loading, error, fetchWeeklyReports } = useWeeklyReport();

    // Trigger fetch on mount
    import('react').then(({ useEffect }) => {
        // The hook is already triggered by the test
    });

    return (
        <div>
            <span data-testid="loading">{loading ? 'true' : 'false'}</span>
            <span data-testid="count">{reports.length}</span>
            <span data-testid="error">{error || ''}</span>
            <span data-testid="totalPages">{pagination.totalPages}</span>
            <button onClick={() => fetchWeeklyReports({ studentId, year })}>fetch</button>
        </div>
    );
};

describe('WeeklyReportContext', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws if used outside provider', () => {
        // Suppress expected error
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        expect(() => render(<Consumer />)).toThrow('useWeeklyReport must be used within WeeklyReportProvider');
        spy.mockRestore();
    });

    it('fetchWeeklyReports() — calls getByStudent with correct params', async () => {
        weeklyProgressService.getByStudent.mockResolvedValue({
            data: [{ id: 'wp-1', weekNumber: 1, year: 2026 }],
            pagination: { page: 1, totalPages: 2, hasPrevPage: false, hasNextPage: true, total: 12 }
        });

        const { getByText, getByTestId } = render(
            <WeeklyReportProvider>
                <Consumer studentId="stu-1" year={2026} />
            </WeeklyReportProvider>
        );

        await act(async () => {
            getByText('fetch').click();
        });

        await waitFor(() => {
            expect(getByTestId('count').textContent).toBe('1');
            expect(getByTestId('totalPages').textContent).toBe('2');
            expect(getByTestId('error').textContent).toBe('');
        });

        expect(weeklyProgressService.getByStudent).toHaveBeenCalledWith('stu-1', {
            page: 1, limit: 10, year: 2026
        });
    });

    it('fetchWeeklyReports() — sets error on API failure', async () => {
        weeklyProgressService.getByStudent.mockRejectedValue({
            response: { data: { error: 'Unauthorized' } }
        });

        const { getByText, getByTestId } = render(
            <WeeklyReportProvider>
                <Consumer studentId="stu-1" />
            </WeeklyReportProvider>
        );

        await act(async () => {
            getByText('fetch').click();
        });

        await waitFor(() => {
            expect(getByTestId('error').textContent).toBe('Unauthorized');
        });
    });

    it('fetchWeeklyReports() — skips fetch when studentId is empty', async () => {
        const { getByText } = render(
            <WeeklyReportProvider>
                <Consumer studentId="" />
            </WeeklyReportProvider>
        );

        await act(async () => {
            getByText('fetch').click();
        });

        expect(weeklyProgressService.getByStudent).not.toHaveBeenCalled();
    });
});
