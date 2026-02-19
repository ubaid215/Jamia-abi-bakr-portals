import React from 'react';

// ─── Individual Section Skeletons ────────────────────────────
const shimmer = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';

export const KPISkeleton = React.memo(() => (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-sm">
                <div className={`h-3 w-20 rounded-full ${shimmer} mb-3`} />
                <div className={`h-8 w-24 rounded-lg ${shimmer} mb-2`} />
                <div className={`h-3 w-16 rounded-full ${shimmer}`} />
                <div className={`h-10 w-full rounded-lg ${shimmer} mt-3`} />
            </div>
        ))}
    </div>
));
KPISkeleton.displayName = 'KPISkeleton';

export const ChartSkeleton = React.memo(({ height = 'h-72' }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <div className={`h-5 w-40 rounded-full ${shimmer} mb-2`} />
        <div className={`h-3 w-56 rounded-full ${shimmer} mb-6`} />
        <div className={`${height} w-full rounded-xl ${shimmer}`} />
    </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

export const TableSkeleton = React.memo(({ rows = 5 }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <div className={`h-5 w-48 rounded-full ${shimmer} mb-6`} />
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full ${shimmer} flex-shrink-0`} />
                    <div className="flex-1">
                        <div className={`h-4 w-3/4 rounded-full ${shimmer} mb-2`} />
                        <div className={`h-3 w-1/2 rounded-full ${shimmer}`} />
                    </div>
                    <div className={`h-6 w-16 rounded-full ${shimmer}`} />
                </div>
            ))}
        </div>
    </div>
));
TableSkeleton.displayName = 'TableSkeleton';

export const TimelineSkeleton = React.memo(() => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <div className={`h-5 w-36 rounded-full ${shimmer} mb-6`} />
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full ${shimmer} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                        <div className={`h-4 w-2/3 rounded-full ${shimmer} mb-2`} />
                        <div className={`h-3 w-1/3 rounded-full ${shimmer}`} />
                    </div>
                </div>
            ))}
        </div>
    </div>
));
TimelineSkeleton.displayName = 'TimelineSkeleton';
