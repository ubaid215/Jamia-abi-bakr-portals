// FILE: src/contexts/NotificationContext.jsx
// PATTERN FROM: src/contexts/ActivityContext.jsx (existing — useState + useCallback pattern)
// BACKEND CONTRACT:
//   backend/modules/notifications/notifications.routes.js
//   backend/modules/notifications/notifications.repository.js (response: notifSelect)
//   backend/modules/notifications/notifications.gateway.js (socket events)
//   backend/shared/websocket/socket.events.js (SOCKET_EVENTS constants)
//
// SOCKET EVENTS (exact string values from socket.events.js):
//   SERVER → CLIENT:
//     'notification:new'    — new notification pushed to this user's room
//     'notification:count'  — unread count update { unreadCount: number }
//   CLIENT → SERVER:
//     'notification:request_count' — request unread count on connect
//     'notification:read'          — mark single read { notificationId }
//     'notification:read_all'      — mark all read
//
// RULE: every socket.on must have socket.off cleanup

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import notificationService from '../services/notificationService';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

    // ── HTTP Methods ────────────────────────────────────────────────────────────

    const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const res = await notificationService.getAll({ page, limit });
            setNotifications(res.data || []);
            if (res.pagination) setPagination(res.pagination);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await notificationService.getUnreadCount();
            setUnreadCount(res.data?.unreadCount ?? 0);
        } catch (_) {
            // Silently fail — UI will show 0
        }
    }, [user]);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Also send via socket so server updates count in real-time
            if (socket) {
                socket.emit('notification:read', { notificationId: id });
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to mark notification as read');
        }
    }, [socket]);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
            // Also send via socket
            if (socket) {
                socket.emit('notification:read_all');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to mark all notifications as read');
        }
    }, [socket]);

    // ── Socket Event Listeners ──────────────────────────────────────────────────

    useEffect(() => {
        if (!socket || !isConnected) return;

        // Request fresh unread count on connect
        socket.emit('notification:request_count');

        // Handler: new notification pushed from server
        const handleNewNotification = (payload) => {
            setNotifications(prev => [payload, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Show toast for new notifications
            toast.success(payload.title || 'New notification', {
                duration: 4000,
                icon: '🔔',
            });
        };

        // Handler: unread count updated from server
        const handleCountUpdate = ({ unreadCount: count }) => {
            setUnreadCount(count ?? 0);
        };

        // Register listeners — exact string values from socket.events.js
        socket.on('notification:new', handleNewNotification);
        socket.on('notification:count', handleCountUpdate);

        // MANDATORY cleanup — every socket.on must have socket.off
        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('notification:count', handleCountUpdate);
        };
    }, [socket, isConnected]);

    // ── Initial HTTP Fetch ──────────────────────────────────────────────────────

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
        }
    }, [user, fetchUnreadCount]);

    const value = {
        // State
        notifications,
        unreadCount,
        loading,
        error,
        pagination,

        // Actions
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,

        // Convenience
        hasUnread: unreadCount > 0,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
