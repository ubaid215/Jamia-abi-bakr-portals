    /**
 * shared/utils/academicCalendar.utils.js
 * Holiday-aware working day calculations using AcademicConfiguration + Holiday models
 */

const prisma = require('../../db/prismaClient');
const { cacheGet, cacheSet } = require('../../db/redisClient');
const { countWorkingDays, getWorkingDates, toStartOfDay } = require('./date.utils');
const logger = require('../../utils/logger');

const CACHE_TTL = 3600; // 1 hour

/**
 * Fetch the current active AcademicConfiguration with its holidays
 * Cached in Redis for 1 hour
 * @returns {Promise<Object|null>}
 */
const getActiveAcademicConfig = async () => {
  const cacheKey = 'academic:config:active';

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const config = await prisma.academicConfiguration.findFirst({
      where: { isActive: true, isCurrent: true },
      include: {
        holidays: {
          where: { isActive: true, isCancelled: false },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (config) {
      await cacheSet(cacheKey, config, CACHE_TTL);
    }

    return config;
  } catch (err) {
    logger.error({ err }, 'academicCalendar: failed to fetch active config');
    return null;
  }
};

/**
 * Get all holiday dates (expanded) within a date range from active config
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Date[]>}
 */
const getHolidayDatesInRange = async (startDate, endDate) => {
  const config = await getActiveAcademicConfig();
  if (!config || !config.holidays) return [];

  const holidayDates = [];
  const rangeStart = toStartOfDay(startDate);
  const rangeEnd = toStartOfDay(endDate);

  for (const holiday of config.holidays) {
    const hStart = toStartOfDay(holiday.startDate);
    const hEnd = toStartOfDay(holiday.endDate);

    // Expand multi-day holidays into individual dates
    const current = new Date(Math.max(hStart.getTime(), rangeStart.getTime()));
    const end = new Date(Math.min(hEnd.getTime(), rangeEnd.getTime()));

    while (current <= end) {
      holidayDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  }

  return holidayDates;
};

/**
 * Check if a specific date is a holiday
 * @param {Date} date
 * @returns {Promise<boolean>}
 */
const isHoliday = async (date) => {
  const holidays = await getHolidayDatesInRange(date, date);
  return holidays.length > 0;
};

/**
 * Count working days between two dates — holiday + weekend aware
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countAcademicWorkingDays = async (startDate, endDate) => {
  const config = await getActiveAcademicConfig();
  const weekendDays = config?.weekendDays || ['SATURDAY', 'SUNDAY'];
  const holidayDates = await getHolidayDatesInRange(startDate, endDate);
  return countWorkingDays(startDate, endDate, holidayDates, weekendDays);
};

/**
 * Get working dates in range — holiday + weekend aware
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Date[]>}
 */
const getAcademicWorkingDates = async (startDate, endDate) => {
  const config = await getActiveAcademicConfig();
  const weekendDays = config?.weekendDays || ['SATURDAY', 'SUNDAY'];
  const holidayDates = await getHolidayDatesInRange(startDate, endDate);
  return getWorkingDates(startDate, endDate, holidayDates, weekendDays);
};

/**
 * Invalidate academic config cache (call after holiday/config updates)
 */
const invalidateAcademicConfigCache = async () => {
  const { cacheDel } = require('../../db/redisClient');
  await cacheDel('academic:config:active');
};

module.exports = {
  getActiveAcademicConfig,
  getHolidayDatesInRange,
  isHoliday,
  countAcademicWorkingDays,
  getAcademicWorkingDates,
  invalidateAcademicConfigCache,
};