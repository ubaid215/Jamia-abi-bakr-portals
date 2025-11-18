import React from 'react';

const Avatar = ({ 
  src, 
  alt = 'Avatar', 
  size = 'md', 
  className = '',
  fallback = null,
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderFallback = () => {
    if (fallback) {
      return (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center text-white font-semibold ${className}`}>
          {getInitials(fallback)}
        </div>
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center text-white font-semibold ${className}`}>
        <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    );
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-amber-500`}
        />
      ) : (
        renderFallback()
      )}
    </div>
  );
};

export default Avatar;