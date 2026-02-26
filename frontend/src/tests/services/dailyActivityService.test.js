// FILE: src/tests/services/dailyActivityService.test.js
// Tests for dailyActivityService.js
// Run: npx vitest run src/tests/services/dailyActivityService.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import dailyActivityService from '../../services/dailyActivityService';

// Mock the api module
vi.mock('../../services/api', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
}));

const MOCK_ACTIVITY = {
    id: 'act-1',
    studentId: 'stu-1',
    classRoomId: 'cls-1',
    date: '2026-02-26',
    attendanceStatus: 'PRESENT',
    behaviorRating: 4,
    participationLevel: 3,
};

const MOCK_LIST = {
    data: { data: [MOCK_ACTIVITY], pagination: { page: 1, pages: 1 } }
};

describe('dailyActivityService', () => {
    beforeEach(() => vi.clearAllMocks());

    it('create() — POST /activities with correct payload', async () => {
        api.post.mockResolvedValue({ data: { data: MOCK_ACTIVITY } });
        const result = await dailyActivityService.create(MOCK_ACTIVITY);
        expect(api.post).toHaveBeenCalledWith('/activities', MOCK_ACTIVITY);
        expect(result.data).toEqual(MOCK_ACTIVITY);
    });

    it('getAll() — GET /activities with query params', async () => {
        api.get.mockResolvedValue(MOCK_LIST);
        const filters = { studentId: 'stu-1', page: 1 };
        await dailyActivityService.getAll(filters);
        expect(api.get).toHaveBeenCalledWith('/activities', { params: filters });
    });

    it('getByStudent() — GET /activities?studentId=:id', async () => {
        api.get.mockResolvedValue(MOCK_LIST);
        await dailyActivityService.getByStudent('stu-1', { page: 1 });
        expect(api.get).toHaveBeenCalledWith('/activities', {
            params: { studentId: 'stu-1', page: 1 }
        });
    });

    it('getById() — GET /activities/:id', async () => {
        api.get.mockResolvedValue({ data: { data: MOCK_ACTIVITY } });
        await dailyActivityService.getById('act-1');
        expect(api.get).toHaveBeenCalledWith('/activities/act-1');
    });

    it('update() — PATCH /activities/:id (NOT PUT)', async () => {
        api.patch.mockResolvedValue({ data: { data: MOCK_ACTIVITY } });
        await dailyActivityService.update('act-1', { behaviorRating: 5 });
        expect(api.patch).toHaveBeenCalledWith('/activities/act-1', { behaviorRating: 5 });
        // Ensure PUT is NOT used
        expect(api.put).toBeUndefined();
    });

    it('delete() — DELETE /activities/:id', async () => {
        api.delete.mockResolvedValue({ data: { success: true } });
        await dailyActivityService.delete('act-1');
        expect(api.delete).toHaveBeenCalledWith('/activities/act-1');
    });

    it('create() — throws on 409 conflict', async () => {
        const err = { response: { status: 409, data: { error: 'Activity already exists' } } };
        api.post.mockRejectedValue(err);
        await expect(dailyActivityService.create(MOCK_ACTIVITY)).rejects.toEqual(err);
    });
});
