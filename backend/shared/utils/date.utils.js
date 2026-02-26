/**
 * shared/utils/date.utils.js
 * Date helpers: week numbers, working days, academic calendar awareness
 */


const getWeekInfo = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
};


const getWeekDateRange = (weekNumber, year) => {
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay() || 7;
  const startDate = new Date(jan1);
  startDate.setDate(jan1.getDate() + (weekNumber - 1) * 7 - (jan1DayOfWeek - 1));

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  // Normalize to start of day / end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};


const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

/**
 * Get start of today (midnight)
 */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of today (23:59:59.999)
 */
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Normalize a date string or Date to start of that day
 * @param {string|Date} date
 * @returns {Date}
 */
const toStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Normalize a date string or Date to end of that day
 * @param {string|Date} date
 * @returns {Date}
 */
const toEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Check whether a given date falls on a weekend (Friday/Saturday for Islamic calendar,
 * or Saturday/Sunday — driven by academicConfig.weekendDays)
 * @param {Date} date
 * @param {string[]} weekendDays - e.g. ['SATURDAY','SUNDAY'] or ['FRIDAY','SATURDAY']
 * @returns {boolean}
 */
const isWeekend = (date, weekendDays = ['SATURDAY', 'SUNDAY']) => {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[new Date(date).getDay()];
  return weekendDays.includes(dayName);
};

/**
 * Count working days between two dates (excluding weekends and holidays)
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Date[]} holidayDates - array of holiday Date objects
 * @param {string[]} weekendDays - e.g. ['SATURDAY','SUNDAY']
 * @returns {number}
 */
const countWorkingDays = (startDate, endDate, holidayDates = [], weekendDays = ['SATURDAY', 'SUNDAY']) => {
  const holidayTimestamps = new Set(
    holidayDates.map(d => toStartOfDay(d).getTime())
  );

  let count = 0;
  const current = toStartOfDay(startDate);
  const end = toStartOfDay(endDate);

  while (current <= end) {
    if (!isWeekend(current, weekendDays) && !holidayTimestamps.has(current.getTime())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Get all working dates in a range
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Date[]} holidayDates
 * @param {string[]} weekendDays
 * @returns {Date[]}
 */
const getWorkingDates = (startDate, endDate, holidayDates = [], weekendDays = ['SATURDAY', 'SUNDAY']) => {
  const holidayTimestamps = new Set(
    holidayDates.map(d => toStartOfDay(d).getTime())
  );

  const dates = [];
  const current = toStartOfDay(startDate);
  const end = toStartOfDay(endDate);

  while (current <= end) {
    if (!isWeekend(current, weekendDays) && !holidayTimestamps.has(current.getTime())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Format a date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get the current academic year string e.g. "2024-2025"
 * Based on a July start for Islamic/Pakistani academic year
 * @param {Date} date
 * @returns {string}
 */
const getAcademicYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  // Academic year starts in April (adjust as needed)
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

/**
 * Calculate difference in days between two dates
 * @param {Date} dateA
 * @param {Date} dateB
 * @returns {number}
 */
const daysDiff = (dateA, dateB) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toStartOfDay(dateB) - toStartOfDay(dateA)) / msPerDay);
};

module.exports = {
  getWeekInfo,
  getWeekDateRange,
  getMonthDateRange,
  startOfToday,
  endOfToday,
  toStartOfDay,
  toEndOfDay,
  isWeekend,
  countWorkingDays,
  getWorkingDates,
  formatDate,
  getAcademicYear,
  daysDiff,
};