import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, 
  // eslint-disable-next-line no-unused-vars
  isAfter, isBefore, isValid, parseISO } from 'date-fns';

const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  label = "Select Date Range",
  required = false,
  disabled = false,
  className = "",
  minDate = null,
  maxDate = null,
  showTime = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [hoverDate, setHoverDate] = useState(null);
  const pickerRef = useRef(null);

  // Format dates for display
  const formatDate = (date) => {
    if (!date) return '';
    if (showTime) {
      return format(date, 'MMM dd, yyyy HH:mm');
    }
    return format(date, 'MMM dd, yyyy');
  };

  const getDisplayValue = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `${formatDate(startDate)} - Select end date`;
    }
    return 'Select date range...';
  };

  // Generate calendar days
  const generateCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateOfWeek = startOfWeek(monthStart);
    const endDateOfWeek = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDateOfWeek;

    while (day <= endDateOfWeek) {
      for (let i = 0; i < 7; i++) {
        const formattedDay = format(day, 'd');
        const cloneDay = new Date(day);
        
        // Determine if day is in range
        const isStart = tempStart && isSameDay(cloneDay, tempStart);
        const isEnd = tempEnd && isSameDay(cloneDay, tempEnd);
        const isInRange = tempStart && tempEnd && 
          isAfter(cloneDay, tempStart) && isBefore(cloneDay, tempEnd);
        const isHoverRange = hoverDate && tempStart && 
          ((isAfter(cloneDay, tempStart) && isBefore(cloneDay, hoverDate)) ||
           (isAfter(cloneDay, hoverDate) && isBefore(cloneDay, tempStart)));

        // Check constraints
        const isDisabled = 
          (minDate && isBefore(cloneDay, minDate)) ||
          (maxDate && isAfter(cloneDay, maxDate));

        days.push({
          date: cloneDay,
          formattedDay,
          isCurrentMonth: isSameMonth(cloneDay, monthStart),
          isStart,
          isEnd,
          isInRange,
          isHoverRange,
          isDisabled,
          isToday: isSameDay(cloneDay, new Date())
        });
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }
    return rows;
  };

  const handleDateClick = (date) => {
    if (date.isDisabled) return;

    if (!tempStart) {
      setTempStart(date.date);
    } else if (!tempEnd && isAfter(date.date, tempStart)) {
      setTempEnd(date.date);
    } else {
      setTempStart(date.date);
      setTempEnd(null);
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange(tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange(null, null);
  };

  const handleCancel = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsOpen(false);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize temp dates
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const calendarRows = generateCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 text-left bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-yellow-500 border-yellow-500' : 'border-gray-300'}
          flex items-center justify-between
        `}
      >
        <div className="flex items-center space-x-3">
          <Calendar className="w-4 h-4 text-yellow-600" />
          <span className={`${!startDate ? 'text-gray-500' : 'text-gray-900'}`}>
            {getDisplayValue()}
          </span>
        </div>
        {startDate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full md:w-[500px] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-gray-900">Select Date Range</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-medium text-gray-900 min-w-[120px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Range Display */}
            {(tempStart || tempEnd) && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-gray-600">Selected Range:</div>
                <div className="font-medium text-gray-900">
                  {tempStart && formatDate(tempStart)}
                  {tempEnd && ` → ${formatDate(tempEnd)}`}
                  {!tempEnd && tempStart && ' (Select end date)'}
                </div>
              </div>
            )}

            {/* Calendar */}
            <div className="mb-4">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarRows.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((day, dayIndex) => {
                      const isToday = isSameDay(day.date, new Date());
                      return (
                        <button
                          key={dayIndex}
                          type="button"
                          onClick={() => handleDateClick(day)}
                          onMouseEnter={() => tempStart && !tempEnd && setHoverDate(day.date)}
                          onMouseLeave={() => setHoverDate(null)}
                          disabled={day.isDisabled}
                          className={`
                            h-10 rounded-md flex items-center justify-center text-sm
                            ${day.isDisabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}
                            ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                            ${isToday && !day.isInRange && !day.isStart && !day.isEnd ? 'ring-1 ring-yellow-500' : ''}
                            ${day.isStart || day.isEnd ? 'bg-yellow-600 text-white hover:bg-yellow-700' : ''}
                            ${(day.isInRange || day.isHoverRange) && !day.isStart && !day.isEnd ? 'bg-yellow-100' : ''}
                          `}
                        >
                          {day.formattedDay}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md
                  ${tempStart && tempEnd 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;