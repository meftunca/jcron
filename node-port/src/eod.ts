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
 * Format: E[N_Units][R_Point] or S[N_Units][R_Point]
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
  public readonly isSOD: boolean = false; // Start of Duration flag

  constructor(
    years: number = 0,
    months: number = 0,
    weeks: number = 0,
    days: number = 0,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
    referencePoint: ReferencePoint | null = null,
    eventIdentifier: string | null = null,
    isSOD: boolean = false
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
    this.isSOD = isSOD;
  }

  /**
   * Convert EoD to standard EoD string format
   * Preserves JCRON semantics: E0W, E0D, S0W are meaningful patterns
   */
  toString(): string {
    // Use the isSOD flag to determine prefix
    const prefix = this.isSOD ? "S" : "E";
    
    // Check if this is a zero-based reference pattern (E0W, E0D, S0W, etc.)
    // These patterns are special in JCRON and should be preserved even with 0 values
    const nonZeroValues = [this.years, this.months, this.weeks, this.days, this.hours, this.minutes, this.seconds].filter(v => v > 0);
    const hasOnlyZeroValues = nonZeroValues.length === 0;
    
    // For zero-value patterns, use referencePoint to reconstruct correct format
    if (hasOnlyZeroValues && this.referencePoint) {
      switch (this.referencePoint) {
        case "YEAR": return `${prefix}0Y`;
        case "MONTH": return `${prefix}0M`;
        case "WEEK": return `${prefix}0W`;
        case "DAY": return `${prefix}0D`;
        default: return prefix; // Fallback for unknown reference points
      }
    }
    
    // Simple format for single-unit expressions
    const unitCount = nonZeroValues.length;
    
    if (unitCount === 1) {
      if (this.years > 0) return `${prefix}${this.years}Y`;
      if (this.months > 0) return `${prefix}${this.months}M`;
      if (this.weeks > 0) return `${prefix}${this.weeks}W`;
      if (this.days > 0) return `${prefix}${this.days}D`;
      if (this.hours > 0) return `${prefix}${this.hours}H`;
      if (this.minutes > 0) return `${prefix}${this.minutes}m`; // lowercase m for minutes
      if (this.seconds > 0) return `${prefix}${this.seconds}S`;
    }
    
    // Complex format
    let result = prefix;
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
   * JCRON EOD format: 0-based indexing system
   * E0W = this week end, E1W = next week end, E2W = 2 weeks from now end, etc.
   */
  calculateEndDate(fromDate: Date): Date {
    return this._calculateDate(fromDate, true); // true = end of period
  }

  /**
   * Calculate the start date based on a starting date
   * JCRON SOD format: 0-based indexing system
   * S0W = this week start, S1W = next week start, etc.
   */
  calculateStartDate(fromDate: Date): Date {
    return this._calculateDate(fromDate, false); // false = start of period
  }

  /**
   * Internal method to calculate either start or end date
   * Implements JCRON sequential processing: E1M2W3D = Base → +1 Month End → +2 Week End → +3 Day End
   */
  private _calculateDate(fromDate: Date, isEndOfPeriod: boolean): Date {
    let result = new Date(fromDate);
    
    // Handle simple duration additions for START/END reference points
    if (this.referencePoint === ReferencePoint.START || this.referencePoint === ReferencePoint.END || !this.referencePoint) {
      // Traditional duration addition
      if (this.years > 0) result.setFullYear(result.getFullYear() + this.years);
      if (this.months > 0) result.setMonth(result.getMonth() + this.months);
      if (this.weeks > 0) result.setDate(result.getDate() + (this.weeks * 7));
      if (this.days > 0) result.setDate(result.getDate() + this.days);
      if (this.hours > 0) result.setHours(result.getHours() + this.hours);
      if (this.minutes > 0) result.setMinutes(result.getMinutes() + this.minutes);
      if (this.seconds > 0) result.setSeconds(result.getSeconds() + this.seconds);
      return result;
    }
    
    // JCRON Sequential Processing for complex expressions
    // Process in order: Years → Months → Weeks → Days → Hours → Minutes → Seconds
    // Each step finds the end/start of the period after adding the units
    
    // Step 1: Process Years
    if (this.years > 0) {
      result.setFullYear(result.getFullYear() + this.years);
      if (isEndOfPeriod) {
        result.setMonth(11, 31); // End of year
        result.setHours(23, 59, 59, 999);
      } else {
        result.setMonth(0, 1); // Start of year
        result.setHours(0, 0, 0, 0);
      }
    }
    
    // Step 2: Process Months
    if (this.months > 0) {
      result.setMonth(result.getMonth() + this.months);
      if (isEndOfPeriod) {
        result.setMonth(result.getMonth() + 1, 0); // Last day of month
        result.setHours(23, 59, 59, 999);
      } else {
        result.setDate(1); // First day of month
        result.setHours(0, 0, 0, 0);
      }
    }
    
    // Step 3: Process Weeks
    if (this.weeks > 0) {
      result.setDate(result.getDate() + (this.weeks * 7));
      if (isEndOfPeriod) {
        const daysUntilSunday = result.getDay() === 0 ? 0 : (7 - result.getDay());
        result.setDate(result.getDate() + daysUntilSunday);
        result.setHours(23, 59, 59, 999);
      } else {
        const daysFromMonday = result.getDay() === 0 ? 6 : (result.getDay() - 1);
        result.setDate(result.getDate() - daysFromMonday);
        result.setHours(0, 0, 0, 0);
      }
    }
    
    // Step 4: Process Days
    if (this.days > 0) {
      result.setDate(result.getDate() + this.days);
      if (isEndOfPeriod) {
        result.setHours(23, 59, 59, 999);
      } else {
        result.setHours(0, 0, 0, 0);
      }
    }
    
    // Step 5: Process Hours
    if (this.hours > 0) {
      result.setHours(result.getHours() + this.hours);
      if (isEndOfPeriod) {
        result.setMinutes(59, 59, 999);
      } else {
        result.setMinutes(0, 0, 0);
      }
    }
    
    // Step 6: Process Minutes
    if (this.minutes > 0) {
      result.setMinutes(result.getMinutes() + this.minutes);
      if (isEndOfPeriod) {
        result.setSeconds(59, 999);
      } else {
        result.setSeconds(0, 0);
      }
    }
    
    // Step 7: Process Seconds
    if (this.seconds > 0) {
      result.setSeconds(result.getSeconds() + this.seconds);
      if (isEndOfPeriod) {
        result.setMilliseconds(999);
      } else {
        result.setMilliseconds(0);
      }
    }
    
    // Handle single-unit special reference points
    const hasMultipleUnits = [this.years, this.months, this.weeks, this.days, this.hours, this.minutes, this.seconds].filter(v => v > 0).length > 1;
    if (!hasMultipleUnits) {
      // Single unit expressions like E0W, E1M use specific reference points
      switch (this.referencePoint) {
        case ReferencePoint.DAY:
          if (isEndOfPeriod) {
            result.setHours(23, 59, 59, 999);
          } else {
            result.setHours(0, 0, 0, 0);
          }
          break;
          
        case ReferencePoint.WEEK:
          if (isEndOfPeriod) {
            const daysUntilSunday = result.getDay() === 0 ? 0 : (7 - result.getDay());
            result.setDate(result.getDate() + daysUntilSunday);
            result.setHours(23, 59, 59, 999);
          } else {
            const daysFromMonday = result.getDay() === 0 ? 6 : (result.getDay() - 1);
            result.setDate(result.getDate() - daysFromMonday);
            result.setHours(0, 0, 0, 0);
          }
          break;
          
        case ReferencePoint.MONTH:
          if (isEndOfPeriod) {
            result.setMonth(result.getMonth() + 1, 0);
            result.setHours(23, 59, 59, 999);
          } else {
            result.setDate(1);
            result.setHours(0, 0, 0, 0);
          }
          break;
          
        case ReferencePoint.QUARTER:
          const currentQuarter = Math.floor(result.getMonth() / 3);
          if (isEndOfPeriod) {
            const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
            result.setMonth(quarterEndMonth + 1, 0);
            result.setHours(23, 59, 59, 999);
          } else {
            const quarterStartMonth = currentQuarter * 3;
            result.setMonth(quarterStartMonth, 1);
            result.setHours(0, 0, 0, 0);
          }
          break;
          
        case ReferencePoint.YEAR:
          if (isEndOfPeriod) {
            result.setMonth(11, 31);
            result.setHours(23, 59, 59, 999);
          } else {
            result.setMonth(0, 1);
            result.setHours(0, 0, 0, 0);
          }
          break;
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
 * JCRON EOD/SOD format: E[YEARS]Y[MONTHS]M[WEEKS]W[DAYS]D[HOURS]H[MINUTES]M[SECONDS]S
 * Examples: E0W, E1M, E2Y1M3W, S0D, S1W
 */
export function parseEoD(eodStr: string): EndOfDuration {
  if (!eodStr) {
    throw new ParseError("EOD string cannot be empty");
  }
  
  // Normalize string - trim whitespace
  eodStr = eodStr.trim();
  
  // Check for EOD (End of Duration) format: E[numbers and units]
  const eodMatch = eodStr.match(/^E(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)m)?(?:(\d+)S)?$/i);
  if (eodMatch) {
    const [, years, months, weeks, days, hours, minutes, seconds] = eodMatch;
    
    // For simple single-unit expressions like E0W, E1M, determine reference point
    const unitCount = [years, months, weeks, days, hours, minutes, seconds].filter(v => v).length;
    let referencePoint: ReferencePoint | null = null;
    
    if (unitCount === 1) {
      if (years) referencePoint = ReferencePoint.YEAR;
      else if (months) referencePoint = ReferencePoint.MONTH;
      else if (weeks) referencePoint = ReferencePoint.WEEK;
      else if (days) referencePoint = ReferencePoint.DAY;
      // For hours, minutes, seconds - use END for duration calculation
      else referencePoint = ReferencePoint.END;
    } else {
      // For complex expressions, use END for sequential processing
      referencePoint = ReferencePoint.END;
    }
    
    return new EndOfDuration(
      years ? parseInt(years, 10) : 0,
      months ? parseInt(months, 10) : 0,
      weeks ? parseInt(weeks, 10) : 0,
      days ? parseInt(days, 10) : 0,
      hours ? parseInt(hours, 10) : 0,
      minutes ? parseInt(minutes, 10) : 0,
      seconds ? parseInt(seconds, 10) : 0,
      referencePoint
    );
  }
  
  // Check for SOD (Start of Duration) format: S[numbers and units]
  const sodMatch = eodStr.match(/^S(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)m)?(?:(\d+)S)?$/i);
  if (sodMatch) {
    const [, years, months, weeks, days, hours, minutes, seconds] = sodMatch;
    
    // For SOD, always use START reference point
    let referencePoint: ReferencePoint = ReferencePoint.START;
    
    // For simple single-unit expressions, determine specific reference point
    const unitCount = [years, months, weeks, days, hours, minutes, seconds].filter(v => v).length;
    if (unitCount === 1) {
      if (years) referencePoint = ReferencePoint.YEAR;
      else if (months) referencePoint = ReferencePoint.MONTH;
      else if (weeks) referencePoint = ReferencePoint.WEEK;
      else if (days) referencePoint = ReferencePoint.DAY;
      else referencePoint = ReferencePoint.START;
    }
    
    return new EndOfDuration(
      years ? parseInt(years, 10) : 0,
      months ? parseInt(months, 10) : 0,
      weeks ? parseInt(weeks, 10) : 0,
      days ? parseInt(days, 10) : 0,
      hours ? parseInt(hours, 10) : 0,
      minutes ? parseInt(minutes, 10) : 0,
      seconds ? parseInt(seconds, 10) : 0,
      referencePoint,
      null, // eventIdentifier
      true  // isSOD = true for SOD expressions
    );
  }
  
  // Legacy support for simple patterns: E1H, S30M, E15m, etc.
  const simpleMatch = eodStr.match(/^([SE])(\d+)([YMWDdHhmsS])$/);
  if (simpleMatch) {
    const [, startEnd, amount, unit] = simpleMatch;
    const value = parseInt(amount, 10);
    const isSOD = startEnd.toUpperCase() === 'S';
    
    let referencePoint: ReferencePoint;
    if (isSOD) {
      // For SOD expressions, determine reference point based on unit  
      switch (unit.toUpperCase()) {
        case 'Y': referencePoint = ReferencePoint.YEAR; break;
        case 'M': referencePoint = unit === 'M' ? ReferencePoint.MONTH : ReferencePoint.START; break;
        case 'W': referencePoint = ReferencePoint.WEEK; break;
        case 'D': referencePoint = ReferencePoint.DAY; break;
        default: referencePoint = ReferencePoint.START; break;
      }
    } else {
      // E patterns - determine reference point based on unit
      switch (unit.toUpperCase()) {
        case 'Y': referencePoint = ReferencePoint.YEAR; break;
        case 'M': referencePoint = unit === 'M' ? ReferencePoint.MONTH : ReferencePoint.END; break; // M=month, m=minute
        case 'W': referencePoint = ReferencePoint.WEEK; break;
        case 'D': referencePoint = ReferencePoint.DAY; break;
        default: referencePoint = ReferencePoint.END; break;
      }
    }
    
    let eod: EndOfDuration;
    switch (unit) {
      case 'Y': case 'y': eod = new EndOfDuration(value, 0, 0, 0, 0, 0, 0, referencePoint, null, isSOD); break;
      case 'M': eod = new EndOfDuration(0, value, 0, 0, 0, 0, 0, referencePoint, null, isSOD); break; // uppercase M = months
      case 'W': case 'w': eod = new EndOfDuration(0, 0, value, 0, 0, 0, 0, referencePoint, null, isSOD); break;
      case 'D': case 'd': eod = new EndOfDuration(0, 0, 0, value, 0, 0, 0, referencePoint, null, isSOD); break;
      case 'H': case 'h': eod = new EndOfDuration(0, 0, 0, 0, value, 0, 0, referencePoint, null, isSOD); break;
      case 'm': eod = new EndOfDuration(0, 0, 0, 0, 0, value, 0, referencePoint, null, isSOD); break; // lowercase m = minutes
      case 'S': case 's': eod = new EndOfDuration(0, 0, 0, 0, 0, 0, value, referencePoint, null, isSOD); break;
      default:
        throw new ParseError(`Unknown time unit: ${unit}`);
    }
    return eod;
  }
  
  throw new ParseError(`Invalid EOD/SOD format: ${eodStr}. Expected formats: E0W, E1M2D, S0W, etc.`);
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
  eventIdentifier?: string,
  isSOD: boolean = false
): EndOfDuration {
  return new EndOfDuration(
    years, months, weeks, days, hours, minutes, seconds,
    referencePoint || null, eventIdentifier || null, isSOD
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
