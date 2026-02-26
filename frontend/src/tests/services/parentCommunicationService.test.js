// FILE: src/tests/services/parentCommunicationService.test.js
// Tests for parentCommunication.service.js (named exports)
// Run: npx vitest run src/tests/services/parentCommunicationService.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getCommunications,
    respondToCommunication,
    createCommunication,
    updateCommunication,
} from '../../services/parentCommunication.service';

vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    }
}));

describe('parentCommunication.service (named exports)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('getCommunications() — GET /parent-communication with filters', async () => {
        api.get.mockResolvedValue({ data: { communications: [], pagination: {} } });
        await getCommunications({ studentId: 'stu-1', page: 1 });
        expect(api.get).toHaveBeenCalledWith('/parent-communication', {
            params: { studentId: 'stu-1', page: 1 }
        });
    });

    it('respondToCommunication() — PATCH /parent-communication/:id/acknowledge', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await respondToCommunication('comm-1', 'Thank you for the update');
        expect(api.patch).toHaveBeenCalledWith(
            '/parent-communication/comm-1/acknowledge',
            { parentResponse: 'Thank you for the update' }
        );
    });

    it('respondToCommunication() — omits parentResponse when empty', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await respondToCommunication('comm-1', '');
        expect(api.patch).toHaveBeenCalledWith(
            '/parent-communication/comm-1/acknowledge',
            {}
        );
    });

    it('createCommunication() — POST /parent-communication', async () => {
        const payload = { studentId: 'stu-1', subject: 'Test', message: 'Hello', communicationType: 'PROGRESS_UPDATE' };
        api.post.mockResolvedValue({ data: {} });
        await createCommunication(payload);
        expect(api.post).toHaveBeenCalledWith('/parent-communication', payload);
    });

    it('updateCommunication() — PATCH /parent-communication/:id', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await updateCommunication('comm-1', { meetingScheduled: '2026-03-01T10:00:00Z' });
        expect(api.patch).toHaveBeenCalledWith('/parent-communication/comm-1', {
            meetingScheduled: '2026-03-01T10:00:00Z'
        });
    });
});
