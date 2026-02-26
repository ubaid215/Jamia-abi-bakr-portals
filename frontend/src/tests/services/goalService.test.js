// FILE: src/tests/services/goalService.test.js
// Tests for goalService.js
// Run: npx vitest run src/tests/services/goalService.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import goalService from '../../services/goalService';

vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('goalService', () => {
    beforeEach(() => vi.clearAllMocks());

    it('getByStudent() — GET /goals?studentId=:id (NOT /goals/student/:id)', async () => {
        api.get.mockResolvedValue({ data: { data: [], pagination: {} } });
        await goalService.getByStudent('stu-1', { page: 1 });
        expect(api.get).toHaveBeenCalledWith('/goals', {
            params: expect.objectContaining({ studentId: 'stu-1' })
        });
        // Ensure old wrong route is NOT used
        expect(api.get).not.toHaveBeenCalledWith('/goals/student/stu-1', expect.anything());
    });

    it('create() — POST /goals', async () => {
        api.post.mockResolvedValue({ data: {} });
        const payload = { studentId: 'stu-1', goalType: 'ATTENDANCE', targetValue: 95 };
        await goalService.create(payload);
        expect(api.post).toHaveBeenCalledWith('/goals', payload);
    });

    it('update() — PATCH /goals/:id (NOT PUT)', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await goalService.update('g-1', { currentValue: 80 });
        expect(api.patch).toHaveBeenCalledWith('/goals/g-1', { currentValue: 80 });
    });

    it('delete() — DELETE /goals/:id', async () => {
        api.delete.mockResolvedValue({ data: {} });
        await goalService.deleteGoal('g-1');
        expect(api.delete).toHaveBeenCalledWith('/goals/g-1');
    });

    it('getStats() is NOT defined (endpoint removed)', () => {
        expect(goalService.getStats).toBeUndefined();
    });
});
