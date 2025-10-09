// src/date-utils.ts
/**
 * Centralized date and timezone utilities using date-fns
 * All date operations should go through this module for consistency
 */

import {
  addSeconds,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  startOfISOWeek,
  startOfISOWeekYear,
  subSeconds,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Date components in a specific timezone
 */
export interface DateComponents {
  year: number;
  month: number; // 0-indexed (0 = January)
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
}

/**
 * Get date components in a specific timezone
 * This is the ONLY place where we should convert UTC to timezone-aware components
 */
export function getDateComponentsInTimezone(
  date: Date,
  timezone: string
): DateComponents {
  if (timezone === "UTC") {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      seconds: date.getUTCSeconds(),
      dayOfWeek: date.getUTCDay(),
    };
  }

  // Convert UTC date to the target timezone
  const zonedDate = toZonedTime(date, timezone);

  // Extract components from the zoned date
  // Important: Use getFullYear(), getMonth(), etc. (NOT getUTC*)
  // because toZonedTime returns a Date where local methods reflect the target timezone
  return {
    year: zonedDate.getFullYear(),
    month: zonedDate.getMonth(),
    day: zonedDate.getDate(),
    hours: zonedDate.getHours(),
    minutes: zonedDate.getMinutes(),
    seconds: zonedDate.getSeconds(),
    dayOfWeek: zonedDate.getDay(),
  };
}

/**
 * Create a UTC Date from components in a specific timezone
 * This is the ONLY place where we should convert timezone-aware components to UTC
 */
export function createDateFromComponents(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  timezone: string
): Date {
  if (timezone === "UTC") {
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds, 0));
  }

  // For non-UTC: create a Date with these components (interpreted as local system time)
  // Then use fromZonedTime to treat those components as if they're in the target timezone
  const localDate = new Date(year, month, day, hours, minutes, seconds, 0);

  // fromZonedTime interprets localDate's components as target timezone and returns UTC
  return fromZonedTime(localDate, timezone);
}

/**
 * Add seconds to a date
 */
export function addSecondsToDate(date: Date, seconds: number): Date {
  return addSeconds(date, seconds);
}

/**
 * Subtract seconds from a date
 */
export function subtractSecondsFromDate(date: Date, seconds: number): Date {
  return subSeconds(date, seconds);
}

/**
 * Get ISO week number (1-53)
 */
export function getISOWeekNumber(date: Date): number {
  return getISOWeek(date);
}

/**
 * Get ISO week year
 */
export function getISOWeekYearNumber(date: Date): number {
  return getISOWeekYear(date);
}

/**
 * Set ISO week for a date
 */
export function setISOWeekForDate(date: Date, week: number): Date {
  return setISOWeek(date, week);
}

/**
 * Get start of ISO week
 */
export function getStartOfISOWeek(date: Date): Date {
  return startOfISOWeek(date);
}

/**
 * Get start of ISO week year
 */
export function getStartOfISOWeekYear(date: Date): Date {
  return startOfISOWeekYear(date);
}

/**
 * Format date in a specific timezone
 */
export function formatDateInTimezone(
  date: Date,
  format: string,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, format);
}

/**
 * Helper: Get first day of week for a month in a timezone
 * Used for nthWeekDay calculations
 */
export function getFirstDayOfMonthWeekday(
  year: number,
  month: number,
  timezone: string
): number {
  const firstDay = createDateFromComponents(year, month, 1, 0, 0, 0, timezone);
  const components = getDateComponentsInTimezone(firstDay, timezone);
  return components.dayOfWeek;
}

/**
 * Helper: Get last day of month in a timezone
 */
export function getLastDayOfMonth(
  year: number,
  month: number,
  timezone: string
): number {
  // Create date for day 0 of next month (= last day of current month)
  const lastDay = createDateFromComponents(
    year,
    month + 1,
    0,
    23,
    59,
    59,
    timezone
  );
  const components = getDateComponentsInTimezone(lastDay, timezone);
  return components.day;
}

/**
 * Helper: Check if a date matches a specific day of week in a timezone
 */
export function isMatchingDayOfWeek(
  date: Date,
  targetDayOfWeek: number,
  timezone: string
): boolean {
  const components = getDateComponentsInTimezone(date, timezone);
  return components.dayOfWeek === targetDayOfWeek;
}

/**
 * Helper: Get the nth occurrence of a weekday in a month
 * Returns the day of month (1-31) or null if doesn't exist
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  nth: number,
  timezone: string
): number | null {
  const firstDayOfWeek = getFirstDayOfMonthWeekday(year, month, timezone);
  const daysToFirstOccurrence = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const firstOccurrenceDay = 1 + daysToFirstOccurrence;
  const nthOccurrenceDay = firstOccurrenceDay + (nth - 1) * 7;

  // Check if this day exists in the month
  const lastDay = getLastDayOfMonth(year, month, timezone);
  if (nthOccurrenceDay > lastDay) {
    return null;
  }

  return nthOccurrenceDay;
}

/**
 * Helper: Check if a date is the nth occurrence of a weekday in its month
 */
export function isNthWeekdayOfMonth(
  date: Date,
  dayOfWeek: number,
  nth: number,
  timezone: string
): boolean {
  const components = getDateComponentsInTimezone(date, timezone);

  // Check day of week matches
  if (components.dayOfWeek !== dayOfWeek) {
    return false;
  }

  // Calculate which occurrence this is
  const firstDayOfWeek = getFirstDayOfMonthWeekday(
    components.year,
    components.month,
    timezone
  );
  const daysToFirstOccurrence = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const firstOccurrenceDay = 1 + daysToFirstOccurrence;
  const occurrence = Math.floor((components.day - firstOccurrenceDay) / 7) + 1;

  return occurrence === nth;
}
