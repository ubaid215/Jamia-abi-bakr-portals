import React from 'react';

const StudentListSkeleton = () => {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StudentListSkeleton;
