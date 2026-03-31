import React from 'react';

const LoadingSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  </div>
);

export default React.memo(LoadingSkeleton);