import React from 'react';

const PageSkeleton = () => (
    <div className="animate-pulse p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
            ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-gray-200 rounded-xl h-64"></div>

        {/* Bottom section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 rounded-xl"></div>
            <div className="h-40 bg-gray-200 rounded-xl"></div>
        </div>
    </div>
);

export default React.memo(PageSkeleton);
