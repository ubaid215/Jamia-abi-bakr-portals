/**
 * modules/daily-activity/dailyActivity.constants.js
 * All constants used across the daily activity module
 */

const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  HALF_DAY: 'HALF_DAY',
};

// Statuses that count as "attended" for metrics
const ATTENDED_STATUSES = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.LATE,
  ATTENDANCE_STATUS.HALF_DAY,
];

const HOMEWORK_STATUS = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  NOT_DONE: 'NOT_DONE',
};

const ASSESSMENT_TYPES = {
  QUIZ: 'QUIZ',
  TEST: 'TEST',
  ORAL: 'ORAL',
};

// Rating scale labels (1–5)
const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

// Understanding level labels (1–5)
const UNDERSTANDING_LABELS = {
  1: 'No Understanding',
  2: 'Weak',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
};

// Student types eligible for daily activity tracking
const ELIGIBLE_STUDENT_TYPES = ['REGULAR', 'REGULAR_HIFZ'];

// Cache TTLs (seconds)
const CACHE_TTL = {
  SINGLE_ACTIVITY: 300,     // 5 min
  LIST: 120,                // 2 min
  STUDENT_DAY: 300,         // 5 min
};

// Max items per page
const MAX_PAGE_SIZE = 100;

// Default working hours per day
const DEFAULT_SCHOOL_HOURS = 6;

module.exports = {
  ATTENDANCE_STATUS,
  ATTENDED_STATUSES,
  HOMEWORK_STATUS,
  ASSESSMENT_TYPES,
  RATING_LABELS,
  UNDERSTANDING_LABELS,
  ELIGIBLE_STUDENT_TYPES,
  CACHE_TTL,
  MAX_PAGE_SIZE,
  DEFAULT_SCHOOL_HOURS,
};