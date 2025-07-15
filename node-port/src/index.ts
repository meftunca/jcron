// src/index.ts

// Core imports
import { Engine } from "./engine";
import { fromCronSyntax, Schedule, withWeekOfYear, fromCronWithWeekOfYear, WeekPatterns } from "./schedule";

// Core Engine and Schedule
export { Engine } from "./engine";
export { fromCronSyntax, Schedule, withWeekOfYear, fromCronWithWeekOfYear, WeekPatterns } from "./schedule";

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
 * Get next execution time for a cron expression
 */
export function getNext(cronExpression: string, fromTime?: Date): Date {
  const schedule = fromCronSyntax(cronExpression);
  return defaultEngine.next(schedule, fromTime || new Date());
}

/**
 * Get previous execution time for a cron expression  
 */
export function getPrev(cronExpression: string, fromTime?: Date): Date {
  const schedule = fromCronSyntax(cronExpression);
  return defaultEngine.prev(schedule, fromTime || new Date());
}

/**
 * Get multiple next execution times
 */
export function getNextN(cronExpression: string, count: number, fromTime?: Date): Date[] {
  const schedule = fromCronSyntax(cronExpression);
  const results: Date[] = [];
  let currentTime = fromTime || new Date();
  
  for (let i = 0; i < count; i++) {
    currentTime = defaultEngine.next(schedule, currentTime);
    results.push(new Date(currentTime));
  }
  
  return results;
}

/**
 * Check if a date matches a cron expression
 */
export function match(cronExpression: string, date?: Date): boolean {
  const schedule = fromCronSyntax(cronExpression);
  return defaultEngine.isMatch(schedule, date || new Date());
}

/**
 * Validate if a cron expression is valid
 */
export function isValid(cronExpression: string): boolean {
  try {
    fromCronSyntax(cronExpression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if it's time to execute (within tolerance)
 */
export function isTime(cronExpression: string, date?: Date, toleranceMs: number = 1000): boolean {
  const checkDate = date || new Date();
  const schedule = fromCronSyntax(cronExpression);
  
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
export function validateCron(cronExpression: string): { valid: boolean; errors: string[] } {
  try {
    fromCronSyntax(cronExpression);
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
