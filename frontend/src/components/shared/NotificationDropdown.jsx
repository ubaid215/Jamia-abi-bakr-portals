// FILE: src/components/shared/NotificationDropdown.jsx
// PATTERN FROM: src/pages/progress/ProgressDashboard.jsx (card UI pattern)
// BACKEND CONTRACT:
//   backend/modules/notifications/notifications.repository.js (notifSelect response shape)
//   backend/shared/websocket/socket.events.js (event names: notification:new, notification:count)
//
// FEATURES:
//   - Bell icon with animated badge showing unreadCount
//   - Dropdown panel listing recent notifications
//   - "Mark all as read" button
//   - Click notification → mark as read + follow actionUrl if present
//   - Uses useNotifications() hook from NotificationContext

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Info, AlertTriangle, Star, Loader } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

/* ── Priority color map ── */
const PRIORITY_STYLES = {
    URGENT: { dot: 'bg-red-500', label: 'bg-red-100 text-red-700' },
    HIGH: { dot: 'bg-orange-500', label: 'bg-orange-100 text-orange-700' },
    NORMAL: { dot: 'bg-indigo-500', label: 'bg-indigo-100 text-indigo-700' },
    LOW: { dot: 'bg-gray-400', label: 'bg-gray-100 text-gray-600' },
};

/* ── Notification type icon ── */
const NotifIcon = ({ type }) => {
    const icons = {
        ACHIEVEMENT: <Star size={14} className="text-amber-500" />,
        RISK_ALERT: <AlertTriangle size={14} className="text-red-500" />,
        GOAL_ACHIEVED: <Star size={14} className="text-emerald-500" />,
        GOAL_AT_RISK: <AlertTriangle size={14} className="text-orange-500" />,
    };
    return icons[type] || <Info size={14} className="text-indigo-500" />;
};

/* ── Single notification row ── */
const NotifRow = ({ notif, onRead }) => {
    const priority = PRIORITY_STYLES[notif.priority] || PRIORITY_STYLES.NORMAL;
    const isRead = notif.isRead;

    const handleClick = () => {
        if (!isRead) onRead(notif.id);
        if (notif.actionUrl) window.open(notif.actionUrl, '_blank', 'noopener');
    };

    return (
        <div
            onClick={handleClick}
            className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!isRead ? 'bg-indigo-50/40' : ''
                }`}
        >
            {/* Unread dot */}
            <div className="flex-shrink-0 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${!isRead ? priority.dot : 'bg-transparent'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <NotifIcon type={notif.notificationType} />
                        <p className={`text-sm leading-snug ${!isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notif.title}
                        </p>
                    </div>
                    {notif.actionUrl && <ExternalLink size={11} className="flex-shrink-0 text-gray-400 mt-0.5" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    {notif.priority && notif.priority !== 'NORMAL' && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priority.label}`}>
                            {notif.priority}
                        </span>
                    )}
                </div>
            </div>

            {/* Mark read icon */}
            {!isRead && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(notif.id); }}
                    className="flex-shrink-0 p-1 hover:bg-indigo-100 rounded transition-colors mt-0.5"
                    title="Mark as read"
                >
                    <Check size={13} className="text-indigo-500" />
                </button>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════ */
const NotificationDropdown = () => {
    const {
        notifications,
        unreadCount,
        loading,
        hasUnread,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
    } = useNotifications();

    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const onClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    // Fetch when panel opens
    const handleToggle = () => {
        if (!open) fetchNotifications(1, 15);
        setOpen(!open);
    };

    const handleMarkAll = useCallback(async () => {
        setMarkingAll(true);
        try {
            await markAllAsRead();
        } finally {
            setMarkingAll(false);
        }
    }, [markAllAsRead]);

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                className={`relative p-2 rounded-lg transition-colors ${open ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-[#FFFBEB] text-gray-600 hover:text-[#92400E]'
                    }`}
                title="Notifications"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell size={20} className={hasUnread ? 'animate-[wiggle_1s_ease-in-out_2]' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-indigo-600" />
                            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {hasUnread && (
                            <button
                                onClick={handleMarkAll}
                                disabled={markingAll}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                            >
                                {markingAll
                                    ? <Loader size={12} className="animate-spin" />
                                    : <CheckCheck size={12} />
                                }
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader size={24} className="animate-spin text-indigo-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <Bell size={32} className="text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                                <p className="text-xs text-gray-400 mt-0.5">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <NotifRow key={n.id} notif={n} onRead={markAsRead} />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => { fetchNotifications(1, 50); }}
                                className="text-xs text-indigo-600 hover:underline font-medium"
                            >
                                Load more
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
