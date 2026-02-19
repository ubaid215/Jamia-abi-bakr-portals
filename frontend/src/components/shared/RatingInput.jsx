import React, { useState } from 'react';
import { Star, StarHalf, X } from 'lucide-react';

const RatingInput = ({
  value = 0,
  onChange,
  label = "Rating",
  required = false,
  disabled = false,
  className = "",
  size = "md",
  showLabel = true,
  allowHalf = true,
  maxRating = 5,
  showClear = true
}) => {
  const [hoverValue, setHoverValue] = useState(0);
  const [tempValue, setTempValue] = useState(value);

  const sizes = {
    sm: {
      star: 'w-5 h-5',
      container: 'gap-1',
      text: 'text-sm'
    },
    md: {
      star: 'w-7 h-7',
      container: 'gap-2',
      text: 'text-base'
    },
    lg: {
      star: 'w-9 h-9',
      container: 'gap-3',
      text: 'text-lg'
    }
  };

  const { star, container, text } = sizes[size];

  const handleClick = (rating) => {
    if (disabled) return;
    
    if (allowHalf) {
      const newValue = rating === tempValue && rating % 1 === 0.5 ? 0 : rating;
      setTempValue(newValue);
      onChange(newValue);
    } else {
      const newValue = rating === tempValue ? 0 : Math.ceil(rating);
      setTempValue(newValue);
      onChange(newValue);
    }
  };

  const handleMouseMove = (e, index) => {
    if (disabled) return;
    
    const starRect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - starRect.left;
    const width = starRect.width;
    
    if (allowHalf) {
      const rating = offsetX < width / 2 ? index + 0.5 : index + 1;
      setHoverValue(rating);
    } else {
      setHoverValue(index + 1);
    }
  };

  const handleClear = () => {
    setTempValue(0);
    onChange(0);
    setHoverValue(0);
  };

  const displayValue = hoverValue || tempValue;
  const ratingLabels = [
    "Poor",
    "Below Average", 
    "Average",
    "Good",
    "Excellent"
  ];

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {showClear && value > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        {/* Stars */}
        <div className={`flex items-center ${container}`}>
          {[...Array(maxRating)].map((_, index) => {
            const starNumber = index + 1;
            const starHalf = starNumber - 0.5;
            
            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                onClick={() => handleClick(allowHalf ? starHalf : starNumber)}
                onMouseMove={(e) => handleMouseMove(e, index)}
                onMouseEnter={() => !disabled && setHoverValue(allowHalf ? starHalf : starNumber)}
                onMouseLeave={() => !disabled && setHoverValue(0)}
                className={`
                  relative ${star} transition-transform duration-200
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                `}
              >
                {/* Background Star */}
                <Star className="absolute inset-0 text-gray-300 fill-current" />
                
                {/* Filled Star */}
                {displayValue >= starNumber ? (
                  <Star className="absolute inset-0 text-yellow-500 fill-current" />
                ) : displayValue >= starHalf ? (
                  <div className="relative w-full h-full overflow-hidden">
                    <StarHalf className="absolute inset-0 text-yellow-500 fill-current" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Rating Value and Label */}
        <div className="mt-2 text-center">
          <div className={`font-bold ${text} text-gray-900`}>
            {displayValue.toFixed(1)} / {maxRating}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {displayValue > 0 
              ? ratingLabels[Math.min(Math.floor(displayValue), ratingLabels.length - 1)]
              : "Not rated"}
          </div>
        </div>

        {/* Value Display for Form */}
        {!disabled && (
          <input
            type="hidden"
            value={tempValue}
            required={required}
          />
        )}
      </div>

      {/* Quick Rating Buttons */}
      {!disabled && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${tempValue >= rating 
                  ? 'bg-yellow-100 text-yellow-800 font-medium' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {rating} {rating === 1 ? 'Star' : 'Stars'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingInput;