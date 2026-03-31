import React from 'react';
import { School } from 'lucide-react';

const EmptyState = ({ classesCount, searchTerm }) => (
  <div className="col-span-full text-center py-12">
    <School className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {classesCount === 0 ? 'No classes created yet' : 'No classes found'}
    </h3>
    <p className="text-gray-500 text-sm">
      {classesCount === 0 
        ? 'Create your first class to get started' 
        : searchTerm 
          ? 'Try adjusting your search criteria' 
          : 'No classes match your filters'}
    </p>
  </div>
);

export default React.memo(EmptyState);