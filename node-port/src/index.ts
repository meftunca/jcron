// src/index.ts

// Core imports
import { Engine } from "./engine";
import { fromCronSyntax, fromJCronString, Schedule, validateSchedule } from "./schedule";

// Core Engine and Schedule
export { Engine } from "./engine";
export { fromCronSyntax, fromJCronString, fromObject, Schedule, withWeekOfYear, fromCronWithWeekOfYear, WeekPatterns, validateSchedule, isValidScheduleObject } from "./schedule";

// EOD (End of Duration) functionality
export { 
  EndOfDuration, 
  ReferencePoint, 
  parseEoD, 
  isValidEoD, 
  createEoD, 
  EoDHelpers 
} from "./eod";

// Humanization API - Import and re-export from humanize module  
export { 
  toString,
  toResult, 
  fromSchedule,
  registerLocale,
  getSupportedLocales,
  isLocaleSupported,
  getDetectedLocale,
  setDefaultLocale
} from "./humanize/index";

// Humanization types
export type { HumanizeOptions, HumanizeResult, LocaleStrings } from "./humanize/types";

// Locale utilities
export { 
  AVAILABLE_LOCALES,
  getLocaleDisplayName,
  getAllLocaleCodes 
} from "./humanize/locales/index";

// Job Runner
export { Runner } from "./runner";

// Error types
export { ParseError, RuntimeError } from "./errors";

// Options and utilities
export { withRetries } from "./options";

// Types
export type { IJob, ILogger, JobFunc, JobOption, RetryOptions, ManagedJob } from "./types";

// Convenience functions for Engine methods
const defaultEngine = new Engine();

/**
 * Helper function to normalize input to Schedule
 */
function normalizeToSchedule(input: string | Schedule): Schedule {
  if (typeof input === 'string') {
    // Try to parse as JCRON string first (with WOY:, TZ:, or EOD: extensions)
    if (input.includes('WOY:') || input.includes('TZ:') || input.includes('EOD:')) {
      return fromJCronString(input);
    } else {
      // Parse as standard cron syntax
      return fromCronSyntax(input);
    }
  }
  return validateSchedule(input);
}

/**
 * Helper function to validate Schedule field values
 */
function validateScheduleFields(schedule: Schedule): boolean {
  // Helper function to validate a field with a range
  const validateField = (value: string | null, min: number, max: number, fieldType?: string): boolean => {
    if (!value || value === '*') return true;
    
    // Special characters validation based on field type
    if (fieldType === 'dayOfMonth' && (value === 'L' || value.includes('L'))) {
      // 'L' means last day of month, or '#L' patterns
      return true;
    }
    
    if (fieldType === 'dayOfWeek' && value.includes('#')) {
      // '#' for nth occurrence: "1#2" (second Monday)
      const parts = value.split('#');
      if (parts.length === 2) {
        const day = parseInt(parts[0]);
        const occurrence = parseInt(parts[1]);
        return day >= 0 && day <= 7 && occurrence >= 1 && occurrence <= 5;
      }
    }
    
    if (fieldType === 'dayOfWeek' && value.includes('L')) {
      // 'L' for last occurrence: "5L" (last Friday)
      const day = value.replace('L', '');
      if (day) {
        const dayNum = parseInt(day);
        return dayNum >= 0 && dayNum <= 7;
      }
      return true;
    }
    
    // Handle textual names (MON-FRI, JAN-DEC, etc.)
    if (/[A-Z]/i.test(value)) {
      // If contains letters, it's likely a textual name which should be valid
      // The actual validation will happen in the Engine
      return true;
    }
    
    // Handle ranges, lists, and steps
    const parts = value.split(',');
    for (const part of parts) {
      if (part.includes('/')) {
        // Step values: "*/5" or "1-10/2"
        const [range, step] = part.split('/');
        if (step && (parseInt(step) <= 0 || parseInt(step) > max)) return false;
        if (range !== '*' && !validateField(range, min, max, fieldType)) return false;
      } else if (part.includes('-')) {
        // Range values: "1-5"
        const [start, end] = part.split('-').map(n => parseInt(n));
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) return false;
      } else if (part !== '*') {
        // Single value
        const num = parseInt(part);
        if (isNaN(num) || num < min || num > max) return false;
      }
    }
    return true;
  };

  // Validate each field according to cron specification with special character support
  if (!validateField(schedule.s, 0, 59, 'seconds')) return false;  // seconds: 0-59
  if (!validateField(schedule.m, 0, 59, 'minutes')) return false;  // minutes: 0-59
  if (!validateField(schedule.h, 0, 23, 'hours')) return false;    // hours: 0-23
  if (!validateField(schedule.D, 1, 31, 'dayOfMonth')) return false; // day of month: 1-31 + L
  if (!validateField(schedule.M, 1, 12, 'month')) return false;    // month: 1-12
  if (!validateField(schedule.dow, 0, 7, 'dayOfWeek')) return false; // day of week: 0-7 + #, L
  if (!validateField(schedule.Y, 1970, 3000, 'year')) return false; // year: reasonable range
  if (!validateField(schedule.woy, 1, 53, 'weekOfYear')) return false; // week of year: 1-53

  return true;
}

/**
 * Get next execution time for a cron expression or Schedule
 */
export function getNext(cronExpression: string | Schedule, fromTime?: Date): Date {
  const schedule = normalizeToSchedule(cronExpression);
  return defaultEngine.next(schedule, fromTime || new Date());
}

/**
 * Get previous execution time for a cron expression or Schedule
 */
export function getPrev(cronExpression: string | Schedule, fromTime?: Date): Date {
  const schedule = normalizeToSchedule(cronExpression);
  return defaultEngine.prev(schedule, fromTime || new Date());
}

/**
 * Get multiple next execution times
 */
export function getNextN(cronExpression: string | Schedule, count: number, fromTime?: Date): Date[] {
  const schedule = normalizeToSchedule(cronExpression);
  const results: Date[] = [];
  let currentTime = fromTime || new Date();
  
  for (let i = 0; i < count; i++) {
    currentTime = defaultEngine.next(schedule, currentTime);
    results.push(new Date(currentTime));
  }
  
  return results;
}

/**
 * Check if a date matches a cron expression or Schedule
 */
export function match(cronExpression: string | Schedule, date?: Date): boolean {
  const schedule = normalizeToSchedule(cronExpression);
  return defaultEngine.isMatch(schedule, date || new Date());
}

/**
 * Validate if a cron expression or Schedule is valid
 */
export function isValid(cronExpression: string | Schedule): boolean {
  try {
    if (typeof cronExpression === 'string') {
      let schedule: Schedule;
      
      // Try to parse as JCRON string first (with WOY:, TZ:, or EOD: extensions)
      if (cronExpression.includes('WOY:') || cronExpression.includes('TZ:') || cronExpression.includes('EOD:')) {
        schedule = fromJCronString(cronExpression);
      } else {
        // Parse as standard cron syntax
        schedule = fromCronSyntax(cronExpression);
      }
      
      // Additional validation: try to use it with Engine to ensure it's actually usable
      const testDate = new Date();
      defaultEngine.next(schedule, testDate);
      
      return true;
    } else {
      // For Schedule objects, first validate field ranges
      const normalized = validateSchedule(cronExpression);
      if (!validateScheduleFields(normalized)) {
        return false;
      }
      
      // Then validate with Engine to ensure it's actually usable
      const testDate = new Date();
      defaultEngine.next(cronExpression, testDate);
      
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Check if it's time to execute (within tolerance)
 */
export function isTime(cronExpression: string | Schedule, date?: Date, toleranceMs: number = 1000): boolean {
  const checkDate = date || new Date();
  const schedule = normalizeToSchedule(cronExpression);
  
  // Check exact match first
  if (defaultEngine.isMatch(schedule, checkDate)) {
    return true;
  }
  
  // Check within tolerance
  const before = new Date(checkDate.getTime() - toleranceMs);
  const after = new Date(checkDate.getTime() + toleranceMs);
  
  try {
    const nextRun = defaultEngine.next(schedule, before);
    return nextRun >= before && nextRun <= after;
  } catch {
    return false;
  }
}

/**
 * Detailed validation with error messages
 */
export function validateCron(cronExpression: string | Schedule): { valid: boolean; errors: string[] } {
  try {
    normalizeToSchedule(cronExpression);
    return { valid: true, errors: [] };
  } catch (error) {
    return { 
      valid: false, 
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Get pattern type from cron expression
 */
export function getPattern(cronExpression: string): "daily" | "weekly" | "monthly" | "yearly" | "custom" {
  try {
    const schedule = fromCronSyntax(cronExpression);
    const D = schedule.D || "*";
    const M = schedule.M || "*";
    const dow = schedule.dow || "*";
    
    if (dow !== "*" && D === "*") return "weekly";
    if (D !== "*" && dow === "*") {
      if (M !== "*") return "yearly";
      return "monthly";
    }
    if (M !== "*") return "yearly";
    if (dow === "*" && D === "*") return "daily";
    return "custom";
  } catch {
    return "custom";
  }
}

/**
 * Check if cron expression matches a specific pattern
 */
export function matchPattern(cronExpression: string, pattern: "daily" | "weekly" | "monthly" | "yearly"): boolean {
  return getPattern(cronExpression) === pattern;
}

/**
 * Calculate end of duration for a schedule with EOD configuration
 * @param schedule Schedule object or cron expression string
 * @param fromDate Starting date for calculation (defaults to current time)
 * @returns Date when the schedule should end, or null if no EOD is configured
 */
export function endOfDuration(schedule: string | Schedule, fromDate: Date = new Date()): Date | null {
  const normalizedSchedule = normalizeToSchedule(schedule);
  return normalizedSchedule.endOf(fromDate);
}
