// src/eod.ts - End-of-Duration (EoD) format support for JCRON

import { ParseError } from "./errors";

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
   * Supports both simple format (S30m, E1h) and complex format (E1DT12H M)
   */
  toString(): string {
    // Check if this is a simple single-unit duration with START/END reference point
    const isSimpleFormat = this.referencePoint === ReferencePoint.START || this.referencePoint === ReferencePoint.END;
    const unitCount = [this.years, this.months, this.weeks, this.days, this.hours, this.minutes, this.seconds].filter(v => v > 0).length;
    
    if (isSimpleFormat && unitCount === 1) {
      // Use simple format: S30m, E1h, etc.
      const refPrefix = this.referencePoint === ReferencePoint.START ? 'S' : 'E';
      
      if (this.seconds > 0) return `${refPrefix}${this.seconds}s`;
      if (this.minutes > 0) return `${refPrefix}${this.minutes}m`;
      if (this.hours > 0) return `${refPrefix}${this.hours}h`;
      if (this.days > 0) return `${refPrefix}${this.days}d`;
      if (this.weeks > 0) return `${refPrefix}${this.weeks}w`;
      if (this.months > 0) return `${refPrefix}${this.months}M`;
      if (this.years > 0) return `${refPrefix}${this.years}Y`;
    }
    
    // Use complex format
    let result = "E";
    
    // Add duration units
    if (this.years > 0) result += `${this.years}Y`;
    if (this.months > 0) result += `${this.months}M`;
    if (this.weeks > 0) result += `${this.weeks}W`;
    if (this.days > 0) result += `${this.days}D`;
    
    // Add time designator and time units if any time components exist
    const hasTimeComponents = this.hours > 0 || this.minutes > 0 || this.seconds > 0;
    if (hasTimeComponents) {
      result += "T";
      if (this.hours > 0) result += `${this.hours}H`;
      if (this.minutes > 0) result += `${this.minutes}M`;
      if (this.seconds > 0) result += `${this.seconds}S`;
    }
    
    // Add reference point
    if (this.eventIdentifier) {
      result += ` E[${this.eventIdentifier}]`;
    } else if (this.referencePoint && this.referencePoint !== ReferencePoint.START && this.referencePoint !== ReferencePoint.END) {
      result += ` ${this.referencePoint}`;
    }
    
    return result;
  }

  /**
   * Calculate total duration in milliseconds
   * Note: This is an approximation since months and years have variable lengths
   */
  toMilliseconds(): number {
    const msPerSecond = 1000;
    const msPerMinute = msPerSecond * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const msPerWeek = msPerDay * 7;
    const msPerMonth = msPerDay * 30.44; // Average month length
    const msPerYear = msPerDay * 365.25; // Average year length including leap years

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

  /**
   * Check if this EoD has any duration components
   */
  hasDuration(): boolean {
    return this.years > 0 || this.months > 0 || this.weeks > 0 || 
           this.days > 0 || this.hours > 0 || this.minutes > 0 || this.seconds > 0;
  }

  /**
   * Calculate the actual end date from a given start date
   */
  calculateEndDate(fromDate: Date = new Date()): Date {
    let endDate = new Date(fromDate);
    
    // Add duration components
    if (this.years > 0) endDate.setFullYear(endDate.getFullYear() + this.years);
    if (this.months > 0) endDate.setMonth(endDate.getMonth() + this.months);
    if (this.weeks > 0) endDate.setDate(endDate.getDate() + (this.weeks * 7));
    if (this.days > 0) endDate.setDate(endDate.getDate() + this.days);
    if (this.hours > 0) endDate.setHours(endDate.getHours() + this.hours);
    if (this.minutes > 0) endDate.setMinutes(endDate.getMinutes() + this.minutes);
    if (this.seconds > 0) endDate.setSeconds(endDate.getSeconds() + this.seconds);
    
    // Apply reference point
    if (this.referencePoint) {
      endDate = this.applyReferencePoint(endDate, this.referencePoint);
    }
    
    return endDate;
  }

  /**
   * Apply reference point to the calculated end date
   */
  private applyReferencePoint(date: Date, refPoint: ReferencePoint): Date {
    const result = new Date(date);
    
    switch (refPoint) {
      case ReferencePoint.DAY:
        // End of day (23:59:59.999)
        result.setHours(23, 59, 59, 999);
        break;
        
      case ReferencePoint.WEEK:
        // End of week (Sunday 23:59:59.999)
        const daysUntilSunday = (7 - result.getDay()) % 7;
        result.setDate(result.getDate() + daysUntilSunday);
        result.setHours(23, 59, 59, 999);
        break;
        
      case ReferencePoint.MONTH:
        // End of month
        result.setMonth(result.getMonth() + 1, 0); // Last day of current month
        result.setHours(23, 59, 59, 999);
        break;
        
      case ReferencePoint.QUARTER:
        // End of quarter
        const currentQuarter = Math.floor(result.getMonth() / 3);
        const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
        result.setMonth(quarterEndMonth + 1, 0); // Last day of quarter
        result.setHours(23, 59, 59, 999);
        break;
        
      case ReferencePoint.YEAR:
        // End of year (December 31, 23:59:59.999)
        result.setMonth(11, 31);
        result.setHours(23, 59, 59, 999);
        break;
    }
    
    return result;
  }
}

/**
 * Reference point types for EoD format
 */
export enum ReferencePoint {
  START = "S",
  END = "E",
  DAY = "D",
  WEEK = "W", 
  MONTH = "M",
  QUARTER = "Q",
  YEAR = "Y"
}

/**
 * Parse EoD string format to EndOfDuration object
 * Supports both complex format (E1DT12H) and simple format (E30m, S1h)
 * Format: E[N_Units][R_Point] or [S|E]N_Unit
 * Examples: E1DT12H, E2Y M, E1H E[task_completion], E30m, S2h
 */
export function parseEoD(eodString: string): EndOfDuration {
  if (!eodString || typeof eodString !== 'string') {
    throw new ParseError('EoD string cannot be null or empty');
  }

  const trimmed = eodString.trim();
  
  // Check for simplified format first (S30m, E1h, etc.)
  const simpleMatch = trimmed.match(/^([SE])(\d+(?:\.\d+)?)(s|m|h|d|w|M|Y)$/);
  if (simpleMatch) {
    const [, refPoint, valueStr, unit] = simpleMatch;
    const value = parseFloat(valueStr);
    
    // Validate that value is positive
    if (value <= 0) {
      throw new ParseError('EoD duration must be greater than zero');
    }
    
    const referencePoint = refPoint === 'S' ? ReferencePoint.START : ReferencePoint.END;
    
    // Create EoD with single unit
    let years = 0, months = 0, weeks = 0, days = 0;
    let hours = 0, minutes = 0, seconds = 0;
    
    switch (unit) {
      case 's': seconds = value; break;
      case 'm': minutes = value; break;
      case 'h': hours = value; break;
      case 'd': days = value; break;
      case 'w': weeks = value; break;
      case 'M': months = value; break;
      case 'Y': years = value; break;
      default:
        throw new ParseError(`Invalid time unit: ${unit}`);
    }
    
    return new EndOfDuration(
      years, months, weeks, days, hours, minutes, seconds,
      referencePoint, null
    );
  }
  
  // Complex format parsing (original logic)
  if (!trimmed.startsWith('E')) {
    throw new ParseError('EoD string must start with "E"');
  }

  // Remove the leading 'E'
  let remaining = trimmed.substring(1);
  
  // Initialize values
  let years = 0, months = 0, weeks = 0, days = 0;
  let hours = 0, minutes = 0, seconds = 0;
  let referencePoint: ReferencePoint | null = null;
  let eventIdentifier: string | null = null;
  
  // Check for event identifier E[identifier] at the end
  const eventMatch = remaining.match(/\s+E\[([^\]]+)\]$/);
  if (eventMatch) {
    eventIdentifier = eventMatch[1];
    remaining = remaining.substring(0, eventMatch.index!);
  }
  
  // Check for reference point at the end
  const refPointMatch = remaining.match(/\s+([DWMQYSE])$/);
  if (refPointMatch) {
    const refChar = refPointMatch[1];
    referencePoint = Object.values(ReferencePoint).find(rp => rp === refChar) || null;
    remaining = remaining.substring(0, refPointMatch.index!);
  }
  
  // Split by T to separate date and time components
  const tIndex = remaining.indexOf('T');
  let datePart = remaining;
  let timePart = '';
  
  if (tIndex !== -1) {
    datePart = remaining.substring(0, tIndex);
    timePart = remaining.substring(tIndex + 1);
  }
  
  // Parse date part
  const datePattern = /(\d+(?:\.\d+)?)(Y|M|W|D)/g;
  let dateMatch;
  while ((dateMatch = datePattern.exec(datePart)) !== null) {
    const value = parseFloat(dateMatch[1]);
    const unit = dateMatch[2];
    
    switch (unit) {
      case 'Y': years = value; break;
      case 'M': months = value; break;
      case 'W': weeks = value; break;
      case 'D': days = value; break;
    }
  }
  
  // Parse time part
  if (timePart) {
    const timePattern = /(\d+(?:\.\d+)?)(H|M|S)/g;
    let timeMatch;
    while ((timeMatch = timePattern.exec(timePart)) !== null) {
      const value = parseFloat(timeMatch[1]);
      const unit = timeMatch[2];
      
      switch (unit) {
        case 'H': hours = value; break;
        case 'M': minutes = value; break;
        case 'S': seconds = value; break;
      }
    }
  }
  
  // Validate that at least one duration component exists
  if (years === 0 && months === 0 && weeks === 0 && days === 0 && 
      hours === 0 && minutes === 0 && seconds === 0) {
    throw new ParseError('EoD string must contain at least one duration component');
  }
  
  return new EndOfDuration(
    years, months, weeks, days, hours, minutes, seconds, 
    referencePoint, eventIdentifier
  );
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
  /**
   * End of current day
   */
  endOfDay: (hours: number = 0, minutes: number = 0, seconds: number = 0) => 
    createEoD(0, 0, 0, 0, hours, minutes, seconds, ReferencePoint.DAY),
    
  /**
   * End of current week
   */
  endOfWeek: (days: number = 0, hours: number = 0, minutes: number = 0) =>
    createEoD(0, 0, 0, days, hours, minutes, 0, ReferencePoint.WEEK),
    
  /**
   * End of current month
   */
  endOfMonth: (days: number = 0, hours: number = 0, minutes: number = 0) =>
    createEoD(0, 0, 0, days, hours, minutes, 0, ReferencePoint.MONTH),
    
  /**
   * End of current quarter
   */
  endOfQuarter: (months: number = 0, days: number = 0, hours: number = 0) =>
    createEoD(0, months, 0, days, hours, 0, 0, ReferencePoint.QUARTER),
    
  /**
   * End of current year
   */
  endOfYear: (months: number = 0, days: number = 0, hours: number = 0) =>
    createEoD(0, months, 0, days, hours, 0, 0, ReferencePoint.YEAR),
    
  /**
   * Until specific event
   */
  untilEvent: (eventId: string, hours: number = 0, minutes: number = 0, seconds: number = 0) =>
    createEoD(0, 0, 0, 0, hours, minutes, seconds, undefined, eventId)
};
