import React, { useMemo } from 'react';
import {
    UserPlus,
    Clock,
    ChevronRight,
} from 'lucide-react';

// ─── Activity Item ──────────────────────────────────────────
const ActivityItem = React.memo(({ activity }) => {
    const timeAgo = useMemo(() => {
        if (!activity.timestamp) return '';
        const now = new Date();
        const then = new Date(activity.timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, [activity.timestamp]);

    const { icon, color, bgColor } = useMemo(() => {
        const type = activity.type || '';
        if (type.includes('USER_CREATED') || type.includes('REGISTER')) {
            return { icon: UserPlus, color: 'text-blue-600', bgColor: 'bg-blue-50' };
        }
        return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }, [activity.type]);

    const Icon = icon;

    // Parse role from description like "John (TEACHER) joined"
    const roleBadge = useMemo(() => {
        const match = activity.description?.match(/\((\w+)\)/);
        if (!match) return null;
        const role = match[1];
        const roleColors = {
            STUDENT: 'bg-blue-100 text-blue-700',
            TEACHER: 'bg-emerald-100 text-emerald-700',
            ADMIN: 'bg-amber-100 text-amber-700',
            SUPER_ADMIN: 'bg-red-100 text-red-700',
            PARENT: 'bg-purple-100 text-purple-700',
        };
        return (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${roleColors[role] || 'bg-gray-100 text-gray-600'}`}>
                {role}
            </span>
        );
    }, [activity.description]);

    // Clean description — remove the role in parens
    const cleanDescription = useMemo(() => {
        return activity.description?.replace(/\s*\(\w+\)\s*/, ' ') || 'Unknown activity';
    }, [activity.description]);

    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 group hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors duration-150">
            <div className={`p-2 rounded-xl ${bgColor} flex-shrink-0 mt-0.5`}>
                <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-900">{cleanDescription}</p>
                    {roleBadge}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
            </div>
        </div>
    );
});
ActivityItem.displayName = 'ActivityItem';

// ─── Activity Timeline ──────────────────────────────────────
const ActivityTimeline = React.memo(({ recentActivities }) => {
    const activities = useMemo(() => {
        if (!Array.isArray(recentActivities)) return [];
        return recentActivities.slice(0, 10);
    }, [recentActivities]);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50">
                        <Clock className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                </div>
                <span className="text-xs font-medium text-gray-400">
                    {activities.length} events
                </span>
            </div>

            {activities.length > 0 ? (
                <div className="space-y-0">
                    {activities.map((activity, idx) => (
                        <ActivityItem key={idx} activity={activity} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10">
                    <div className="p-3 rounded-full bg-gray-100 mb-3">
                        <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No recent activity</p>
                    <p className="text-xs text-gray-400 mt-1">System events will appear here</p>
                </div>
            )}
        </div>
    );
});
ActivityTimeline.displayName = 'ActivityTimeline';

export default ActivityTimeline;
