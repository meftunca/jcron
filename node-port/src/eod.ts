// src/eod.ts - End-of-Duration (EoD) format support for JCRON

import { ParseError } from "./errors";

/**
 * Reference points for EoD calculations
 */
export enum ReferencePoint {
  START = "START",     // From the start time
  END = "END",         // Until the end time
  DAY = "DAY",         // End of day
  WEEK = "WEEK",       // End of week
  MONTH = "MONTH",     // End of month
  QUARTER = "QUARTER", // End of quarter
  YEAR = "YEAR"        // End of year
}

/**
 * End-of-Duration (EoD) format representation
 * Format: E[N_Units][R_Point]
 * Example: E1DT12H M (1 day 12 hours until end of month)
 */
export class EndOfDuration {
  public readonly years: number = 0;
  public readonly months: number = 0;
  public readonly weeks: number = 0;
  public readonly days: number = 0;
  public readonly hours: number = 0;
  public readonly minutes: number = 0;
  public readonly seconds: number = 0;
  public readonly referencePoint: ReferencePoint | null = null;
  public readonly eventIdentifier: string | null = null;

  constructor(
    years: number = 0,
    months: number = 0,
    weeks: number = 0,
    days: number = 0,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
    referencePoint: ReferencePoint | null = null,
    eventIdentifier: string | null = null
  ) {
    this.years = years;
    this.months = months;
    this.weeks = weeks;
    this.days = days;
    this.hours = hours;
    this.minutes = minutes;
    this.seconds = seconds;
    this.referencePoint = referencePoint;
    this.eventIdentifier = eventIdentifier;
  }

  /**
   * Convert EoD to standard EoD string format
   */
  toString(): string {
    // Simple format
    const isSimpleFormat = this.referencePoint === ReferencePoint.START || this.referencePoint === ReferencePoint.END;
    const unitCount = [this.years, this.months, this.weeks, this.days, this.hours, this.minutes, this.seconds].filter(v => v > 0).length;
    
    if (isSimpleFormat && unitCount === 1) {
      const prefix = this.referencePoint === ReferencePoint.START ? "S" : "E";
      
      if (this.years > 0) return `${prefix}${this.years}Y`;
      if (this.months > 0) return `${prefix}${this.months}M`;
      if (this.weeks > 0) return `${prefix}${this.weeks}W`;
      if (this.days > 0) return `${prefix}${this.days}D`;
      if (this.hours > 0) return `${prefix}${this.hours}h`;
      if (this.minutes > 0) return `${prefix}${this.minutes}m`; // lowercase m for minutes
      if (this.seconds > 0) return `${prefix}${this.seconds}S`;
    }
    
    // Complex format
    let result = "E";
    if (this.years > 0) result += `${this.years}Y`;
    if (this.months > 0) result += `${this.months}M`;
    if (this.weeks > 0) result += `${this.weeks}W`;
    if (this.days > 0) result += `${this.days}D`;
    
    const hasTimePart = this.hours > 0 || this.minutes > 0 || this.seconds > 0;
    if (hasTimePart) {
      result += "T";
      if (this.hours > 0) result += `${this.hours}H`;
      if (this.minutes > 0) result += `${this.minutes}M`;
      if (this.seconds > 0) result += `${this.seconds}S`;
    }
    
    return result;
  }

  /**
   * Calculate the end date based on a starting date
   */
  calculateEndDate(fromDate: Date): Date {
    const result = new Date(fromDate);
    
    // First, add the duration
    if (this.years > 0) result.setFullYear(result.getFullYear() + this.years);
    if (this.months > 0) result.setMonth(result.getMonth() + this.months);
    if (this.weeks > 0) result.setDate(result.getDate() + (this.weeks * 7));
    if (this.days > 0) result.setDate(result.getDate() + this.days);
    if (this.hours > 0) result.setHours(result.getHours() + this.hours);
    if (this.minutes > 0) result.setMinutes(result.getMinutes() + this.minutes);
    if (this.seconds > 0) result.setSeconds(result.getSeconds() + this.seconds);
    
    // Then, apply reference point if specified
    if (this.referencePoint) {
      switch (this.referencePoint) {
        case ReferencePoint.DAY:
          // Set to end of the day (23:59:59)
          result.setHours(23, 59, 59, 999);
          break;
        case ReferencePoint.WEEK:
          // Set to end of the week (Sunday 23:59:59)
          const daysUntilSunday = result.getDay() === 0 ? 0 : (7 - result.getDay());
          result.setDate(result.getDate() + daysUntilSunday);
          result.setHours(23, 59, 59, 999);
          break;
        case ReferencePoint.MONTH:
          // Set to end of the month (last day 23:59:59)
          result.setMonth(result.getMonth() + 1, 0);
          result.setHours(23, 59, 59, 999);
          break;
        case ReferencePoint.QUARTER:
          // Set to end of the quarter
          const currentQuarter = Math.floor(result.getMonth() / 3);
          const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
          result.setMonth(quarterEndMonth + 1, 0);
          result.setHours(23, 59, 59, 999);
          break;
        case ReferencePoint.YEAR:
          // Set to end of the year (Dec 31 23:59:59)
          result.setMonth(11, 31);
          result.setHours(23, 59, 59, 999);
          break;
        // For START and END, no additional processing needed
      }
    }
    
    return result;
  }

  /**
   * Get total duration in milliseconds (approximate)
   */
  getTotalMilliseconds(): number {
    const msPerSecond = 1000;
    const msPerMinute = msPerSecond * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const msPerWeek = msPerDay * 7;
    const msPerMonth = msPerDay * 30; // Approximate
    const msPerYear = msPerDay * 365; // Approximate
    
    return (
      this.years * msPerYear +
      this.months * msPerMonth +
      this.weeks * msPerWeek +
      this.days * msPerDay +
      this.hours * msPerHour +
      this.minutes * msPerMinute +
      this.seconds * msPerSecond
    );
  }
}

/**
 * Parse EoD string format to EndOfDuration object
 */
export function parseEoD(eodStr: string): EndOfDuration {
  if (!eodStr) {
    throw new ParseError("EOD string cannot be empty");
  }
  
  // Simple patterns: E1H, S30M, E15m, etc.
  const simpleMatch = eodStr.match(/^([SE])(\d+)([YMWDdHhmsS])$/);
  if (simpleMatch) {
    const [, startEnd, amount, unit] = simpleMatch;
    const value = parseInt(amount, 10);
    const referencePoint = startEnd.toUpperCase() === 'S' ? ReferencePoint.START : ReferencePoint.END;
    
    switch (unit) {
      case 'Y': case 'y': return new EndOfDuration(value, 0, 0, 0, 0, 0, 0, referencePoint);
      case 'M': return new EndOfDuration(0, value, 0, 0, 0, 0, 0, referencePoint); // uppercase M = months
      case 'W': case 'w': return new EndOfDuration(0, 0, value, 0, 0, 0, 0, referencePoint);
      case 'D': case 'd': return new EndOfDuration(0, 0, 0, value, 0, 0, 0, referencePoint);
      case 'H': case 'h': return new EndOfDuration(0, 0, 0, 0, value, 0, 0, referencePoint);
      case 'm': return new EndOfDuration(0, 0, 0, 0, 0, value, 0, referencePoint); // lowercase m = minutes
      case 'S': case 's': return new EndOfDuration(0, 0, 0, 0, 0, 0, value, referencePoint);
      default:
        throw new ParseError(`Unknown time unit: ${unit}`);
    }
  }
  
  // Complex EoD patterns: E1DT1H30M, E1Y2M3W4DT5H6M7S
  const complexMatch = eodStr.match(/^E(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (complexMatch) {
    const [, years, months, weeks, days, hours, minutes, seconds] = complexMatch;
    return new EndOfDuration(
      years ? parseInt(years, 10) : 0,
      months ? parseInt(months, 10) : 0,
      weeks ? parseInt(weeks, 10) : 0,
      days ? parseInt(days, 10) : 0,
      hours ? parseInt(hours, 10) : 0,
      minutes ? parseInt(minutes, 10) : 0,
      seconds ? parseInt(seconds, 10) : 0,
      ReferencePoint.END
    );
  }
  
  // ISO 8601 patterns: P1Y2M3DT4H5M6S
  const isoMatch = eodStr.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (isoMatch) {
    const [, years, months, weeks, days, hours, minutes, seconds] = isoMatch;
    return new EndOfDuration(
      years ? parseInt(years, 10) : 0,
      months ? parseInt(months, 10) : 0,
      weeks ? parseInt(weeks, 10) : 0,
      days ? parseInt(days, 10) : 0,
      hours ? parseInt(hours, 10) : 0,
      minutes ? parseInt(minutes, 10) : 0,
      seconds ? parseInt(seconds, 10) : 0,
      ReferencePoint.END
    );
  }
  
  throw new ParseError(`Invalid EOD format: ${eodStr}`);
}

/**
 * Validate EoD string format
 */
export function isValidEoD(eodString: string): boolean {
  try {
    parseEoD(eodString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create EoD from duration components
 */
export function createEoD(
  years: number = 0,
  months: number = 0, 
  weeks: number = 0,
  days: number = 0,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  referencePoint?: ReferencePoint,
  eventIdentifier?: string
): EndOfDuration {
  return new EndOfDuration(
    years, months, weeks, days, hours, minutes, seconds,
    referencePoint || null, eventIdentifier || null
  );
}

/**
 * Helper functions for common EoD patterns
 */
export const EoDHelpers = {
  endOfDay: (hours: number = 0, minutes: number = 0, seconds: number = 0) => 
    createEoD(0, 0, 0, 0, hours, minutes, seconds, ReferencePoint.DAY),
    
  endOfWeek: (days: number = 0, hours: number = 0, minutes: number = 0) =>
    createEoD(0, 0, 0, days, hours, minutes, 0, ReferencePoint.WEEK),
    
  endOfMonth: (days: number = 0, hours: number = 0, minutes: number = 0) =>
    createEoD(0, 0, 0, days, hours, minutes, 0, ReferencePoint.MONTH),
    
  endOfQuarter: (months: number = 0, days: number = 0, hours: number = 0) =>
    createEoD(0, months, 0, days, hours, 0, 0, ReferencePoint.QUARTER),
    
  endOfYear: (months: number = 0, days: number = 0, hours: number = 0) =>
    createEoD(0, months, 0, days, hours, 0, 0, ReferencePoint.YEAR),
    
  untilEvent: (eventId: string, hours: number = 0, minutes: number = 0, seconds: number = 0) =>
    createEoD(0, 0, 0, 0, hours, minutes, seconds, undefined, eventId)
};
