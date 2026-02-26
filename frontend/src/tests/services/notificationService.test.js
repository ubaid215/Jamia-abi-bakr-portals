// FILE: src/tests/services/notificationService.test.js
// Tests for notificationService.js
// Run: npx vitest run src/tests/services/notificationService.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import notificationService from '../../services/notificationService';

vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
    }
}));

describe('notificationService', () => {
    beforeEach(() => vi.clearAllMocks());

    it('getAll() — GET /notifications with params', async () => {
        api.get.mockResolvedValue({ data: { data: [], pagination: {} } });
        await notificationService.getAll({ page: 1, limit: 15 });
        expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, limit: 15 } });
    });

    it('getUnreadCount() — GET /notifications/unread-count', async () => {
        api.get.mockResolvedValue({ data: { data: { count: 5 } } });
        await notificationService.getUnreadCount();
        expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
    });

    it('markAsRead() — PATCH /notifications/:id/read (NOT PUT)', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await notificationService.markAsRead('notif-1');
        expect(api.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
    });

    it('markAllAsRead() — PATCH /notifications/read-all (NOT PUT)', async () => {
        api.patch.mockResolvedValue({ data: {} });
        await notificationService.markAllAsRead();
        expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    });
});
