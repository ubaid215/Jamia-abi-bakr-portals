import React from 'react';

// eslint-disable-next-line no-unused-vars
const EmptyState = ({ itemsCount, searchTerm, icon: Icon, title, actionText }) => (
  <div className="col-span-full text-center py-12">
    <Icon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">
      {itemsCount === 0 
        ? actionText 
        : searchTerm 
          ? 'Try adjusting your search criteria' 
          : 'No items match your filters'}
    </p>
  </div>
);

export default React.memo(EmptyState);