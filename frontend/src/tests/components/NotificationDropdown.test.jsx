// FILE: src/tests/components/NotificationDropdown.test.jsx
// Tests for NotificationDropdown.jsx
// Run: npx vitest run src/tests/components/NotificationDropdown.test.jsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';

// Mock useNotifications hook
const mockNotifications = vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    hasUnread: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    fetchNotifications: vi.fn(),
}));

vi.mock('../../contexts/NotificationContext', () => ({
    useNotifications: () => mockNotifications(),
}));

describe('NotificationDropdown', () => {
    beforeEach(() => {
        mockNotifications.mockReturnValue({
            notifications: [],
            unreadCount: 0,
            loading: false,
            hasUnread: false,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            fetchNotifications: vi.fn(),
        });
    });

    it('renders bell button', () => {
        render(<NotificationDropdown />);
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
    });

    it('shows unread badge when unreadCount > 0', () => {
        mockNotifications.mockReturnValue({
            notifications: [],
            unreadCount: 5,
            loading: false,
            hasUnread: true,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            fetchNotifications: vi.fn(),
        });

        render(<NotificationDropdown />);
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 99+ for count over 99', () => {
        mockNotifications.mockReturnValue({
            notifications: [],
            unreadCount: 150,
            loading: false,
            hasUnread: true,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            fetchNotifications: vi.fn(),
        });

        render(<NotificationDropdown />);
        expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('dropdown is closed by default', () => {
        render(<NotificationDropdown />);
        // Bell button is present (identified by title)
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
        // Dropdown panel NOT visible until clicked
        expect(screen.queryByText('All caught up!')).not.toBeInTheDocument();
    });

    it('opens dropdown on bell click and shows empty state', async () => {
        const fetchNotifications = vi.fn();
        mockNotifications.mockReturnValue({
            notifications: [],
            unreadCount: 0,
            loading: false,
            hasUnread: false,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            fetchNotifications,
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTitle('Notifications'));

        await waitFor(() => {
            expect(screen.getByText('All caught up!')).toBeInTheDocument();
        });
        expect(fetchNotifications).toHaveBeenCalledWith(1, 15);
    });

    it('renders notification rows when data exists', () => {
        mockNotifications.mockReturnValue({
            notifications: [
                {
                    id: 'n1',
                    title: 'Test Notification',
                    message: 'You have a new activity',
                    priority: 'HIGH',
                    notificationType: 'PROGRESS_UPDATE',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    actionUrl: null,
                }
            ],
            unreadCount: 1,
            loading: false,
            hasUnread: true,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
            fetchNotifications: vi.fn(),
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTitle('Notifications'));

        expect(screen.getByText('Test Notification')).toBeInTheDocument();
        expect(screen.getByText('You have a new activity')).toBeInTheDocument();
    });

    it('"Mark all read" calls markAllAsRead()', async () => {
        const markAllAsRead = vi.fn().mockResolvedValue();
        mockNotifications.mockReturnValue({
            notifications: [{ id: 'n1', title: 'X', message: 'Y', priority: 'NORMAL', notificationType: 'INFO', isRead: false, createdAt: new Date().toISOString(), actionUrl: null }],
            unreadCount: 1,
            loading: false,
            hasUnread: true,
            markAsRead: vi.fn(),
            markAllAsRead,
            fetchNotifications: vi.fn(),
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTitle('Notifications'));
        fireEvent.click(screen.getByText('Mark all read'));

        await waitFor(() => {
            expect(markAllAsRead).toHaveBeenCalled();
        });
    });
});
