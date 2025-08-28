// src/schedule.ts
import { ParseError } from "./errors";
import { EndOfDuration, parseEoD } from "./eod";
import { getPrev, getNext } from ".";

// Interface for timezone validation
interface TimezoneValidation {
  isValidTimezone(tz: string): boolean;
}

// Interface for Schedule object notation format
export interface ScheduleObjectNotation {
  // Basic cron fields
  second?: string;
  minute?: string;
  hour?: string;
  dayOfMonth?: string;
  month?: string;
  dayOfWeek?: string;
  year?: string;
  
  // JCRON extensions
  timezone?: string;
  weekOfYear?: string;
  eod?: string | EndOfDuration; // End-of-Duration format
  
  // Special fields for different schedule types
  type?: 'CRON' | 'ONCE';
  date?: Date | string; // For ONCE type schedules
}

// Simple timezone validation - basic check for common timezone formats
function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  
  // Common timezone formats: UTC, GMT, EST, PST, etc.
  if (/^(UTC|GMT|EST|PST|CST|MST|EDT|PDT|CDT|MDT)$/i.test(tz)) {
    return true;
  }
  
  // IANA timezone format: Continent/City
  if (/^[A-Za-z_]+\/[A-Za-z_]+$/.test(tz)) {
    return true;
  }
  
  // UTC offset format: +05:30, -08:00
  if (/^[+-]\d{2}:\d{2}$/.test(tz)) {
    return true;
  }
  
  return false;
}

export class Schedule {
  public readonly s: string | null;
  
  constructor(
    scheduleOrS: string | null = null,
    public readonly m: string | null = null,
    public readonly h: string | null = null,
    public readonly D: string | null = null,
    public readonly M: string | null = null,
    public readonly dow: string | null = null,
    public readonly Y: string | null = null,
    public readonly woy: string | null = null, // Week of Year
    public readonly tz: string | null = null,
    public readonly eod: EndOfDuration | null = null // End-of-Duration support
  ) {
    // If first parameter is a string and no other parameters, parse as JCRON string
    if (typeof scheduleOrS === 'string' && arguments.length === 1) {
      const parsed = fromJCronString(scheduleOrS);
      this.s = parsed.s;
      (this as any).m = parsed.m;
      (this as any).h = parsed.h;
      (this as any).D = parsed.D;
      (this as any).M = parsed.M;
      (this as any).dow = parsed.dow;
      (this as any).Y = parsed.Y;
      (this as any).woy = parsed.woy;
      (this as any).tz = parsed.tz;
      (this as any).eod = parsed.eod;
      return;
    }
    
    // Regular constructor behavior
    this.s = scheduleOrS;
    
    // Handle backward compatibility where 8th parameter might be timezone instead of woy
    // This only applies when exactly 8 parameters are passed and last one looks like timezone
    if (
      arguments.length === 8 &&
      typeof arguments[7] === "string" &&
      arguments[7] &&
      !this.tz &&
      // Check if it looks like a timezone (contains / or common timezone abbreviations)
      (arguments[7].includes('/') || 
       /^(UTC|GMT|EST|PST|CST|MST|EDT|PDT|CDT|MDT)$/i.test(arguments[7]))
    ) {
      // If 8 params and 8th looks like timezone, it's the old format (s,m,h,D,M,dow,Y,tz)
      // Move tz from woy position to tz position
      (this as any).tz = this.woy;
      (this as any).woy = null;
    }
  }

  /**
   * Convert Schedule object to JCRON specification string
   * This is the default toString behavior and includes all JCRON-specific features
   * Returns: "s m h D M dow [Y] [WOY:woy] [TZ:tz] [EOD:eod]"
   */
  toString(): string {
    // Build the basic cron expression (6 or 7 fields)
    const fields = [
      this.s || "*",        // seconds
      this.m || "*",        // minutes
      this.h || "*",        // hours
      this.D || "*",        // day of month
      this.M || "*",        // month
      this.dow || "*",      // day of week
    ];

    // Add year if specified
    if (this.Y) {
      fields.push(this.Y);
    }

    let result = fields.join(" ");
    
    // Add JCRON extensions
    // Add week-of-year if specified (JCRON extension)
    if (this.woy) {
      result += ` WOY:${this.woy}`;
    }
    
    // Add timezone if specified (JCRON extension)
    if (this.tz) {
      result += ` TZ:${this.tz}`;
    }
    
    // Add End-of-Duration if specified (JCRON extension)
    if (this.eod) {
      result += ` EOD:${this.eod.toString()}`;
    }
    
    return result;
  }

  /**
   * Convert Schedule object to standard cron syntax (5, 6, or 7 fields only)
   * Compatible with traditional cron parsers
   * Does NOT include JCRON extensions (week-of-year, timezone)
   * @param convertTextualNames - Whether to convert textual names (MON-FRI) to numbers (1-5)
   */
  toStandardCron(convertTextualNames: boolean = false): string {
    // Convert textual names to numbers for compatibility if requested
    const convertField = (field: string | null): string => {
      if (!field) return "*";
      
      if (!convertTextualNames) return field;
      
      // Convert day names to numbers
      let converted = field
        .replace(/SUN/gi, "0")
        .replace(/MON/gi, "1")
        .replace(/TUE/gi, "2")
        .replace(/WED/gi, "3")
        .replace(/THU/gi, "4")
        .replace(/FRI/gi, "5")
        .replace(/SAT/gi, "6");
      
      // Convert month names to numbers
      converted = converted
        .replace(/JAN/gi, "1")
        .replace(/FEB/gi, "2")
        .replace(/MAR/gi, "3")
        .replace(/APR/gi, "4")
        .replace(/MAY/gi, "5")
        .replace(/JUN/gi, "6")
        .replace(/JUL/gi, "7")
        .replace(/AUG/gi, "8")
        .replace(/SEP/gi, "9")
        .replace(/OCT/gi, "10")
        .replace(/NOV/gi, "11")
        .replace(/DEC/gi, "12");
      
      return converted;
    };

    // Build standard cron expression (5, 6 or 7 fields)
    const fields = [
      this.s || "*",                    // seconds
      this.m || "*",                    // minutes
      this.h || "*",                    // hours
      this.D || "*",                    // day of month
      convertField(this.M),             // month
      convertField(this.dow),           // day of week
    ];

    // Add year if specified
    if (this.Y) {
      fields.push(this.Y);
    }

    return fields.join(" ");
  }

  /**
   * Convert Schedule object to numeric standard cron syntax (textual names converted)
   * @deprecated Use toStandardCron(true) instead
   */
  toNumericString(): string {
    return this.toStandardCron(true);
  }

  /**
   * Calculate the end date for this schedule based on its End-of-Duration (EOD) configuration
   * If the schedule has an EOD, calculates when the schedule should end execution
   * @param fromDate The starting date for the calculation (defaults to current time)
   * @returns Date when the schedule should end, or null if no EOD is configured
   */
  endOf(fromDate: Date = new Date()): Date | null {
    if (!this.eod) {
      return null;
    }
    
    // Get the next trigger time (when the schedule will be triggered)
    const nextTime = getNext(this, fromDate);
    if (!nextTime) {
      return null; // No next trigger time found
    }
    
    // Calculate end time from the next trigger time
    return this.eod.calculateEndDate(nextTime);
  }
  // startof
  /**
   * Calculate the start date for this schedule based on its End-of-Duration (EOD) configuration
   * If the schedule has an EOD, calculates when the schedule should start execution
   * @param fromDate The starting date for the calculation (defaults to current time)
   * @returns Date when the schedule should start, or null if no EOD is configured
   */
  startOf(fromDate: Date = new Date()): Date | null {
    if (!this.eod) {
      return null;
    }
    
    // Get the previous trigger time (when the schedule would have been triggered)
    const prev = getPrev(this, fromDate);
    if (!prev) {
      return null; // No previous trigger time found
    }
    
    // The start time is the previous trigger time itself
    return prev;
  }

  // isrange now
  /**
   * Check if the current time is within the execution window of this schedule
   * For EOD schedules, checks if now is between the previous trigger and next endOf
   * @param now The time to check (defaults to current time)
   * @returns true if now is within the execution window, false otherwise
   */
  isRangeNow(now: Date = new Date()): boolean {
    if (!this.eod) {
      return false;
    }
    
    // Get the previous trigger time (start of current window)
    const start = this.startOf(now);
    // Get the end time for current execution window
    // Since endOf now uses next trigger, we need to calculate end from previous trigger
    let end: Date | null = null;
    if (start) {
      end = this.eod.calculateEndDate(start);
    }
    
    // Check if both start and end are valid and now is within the range
    return start !== null && end !== null && now >= start && now <= end;
  }

  /**
   * Convert Schedule object to JCRON extended syntax with week-of-year and timezone
   * @deprecated Use toString() instead, as it now includes JCRON extensions by default
   */
  toJCronString(): string {
    return this.toString();
  }

  /**
   * Create a Schedule from a ScheduleObjectNotation or Schedule format object
   * Supports both semantic field names (second, minute, hour...) and short format (s, m, h...)
   */
  static fromObject(schedule: ScheduleObjectNotation | {
    s?: string | null;
    m?: string | null;
    h?: string | null;
    D?: string | null;
    M?: string | null;
    dow?: string | null;
    Y?: string | null;
    woy?: string | null;
    tz?: string | null;
    eod?: EndOfDuration | string | null;
  }): Schedule {
    // Check if it's short format (has 's', 'm', 'h', etc.) or long format (has 'second', 'minute', etc.)
    const hasShortFormat = 's' in schedule || 'm' in schedule || 'h' in schedule || 
                          'D' in schedule || 'M' in schedule || 'dow' in schedule;
    const hasLongFormat = 'second' in schedule || 'minute' in schedule || 'hour' in schedule ||
                         'dayOfMonth' in schedule || 'month' in schedule || 'dayOfWeek' in schedule;
    
    if (hasShortFormat) {
      // Use the existing fromObject function for short format
      return fromObject(schedule as any);
    }
    
    // Handle long format (ScheduleObjectNotation)
    const longSchedule = schedule as ScheduleObjectNotation;
    let parts: string[] = [];
    
    if (longSchedule.timezone && !isValidTimezone(longSchedule.timezone)) {
      throw new ParseError(`Invalid timezone: ${longSchedule.timezone}`);
    }
    
    // Handle ONCE schedule with date
    if (longSchedule.type === 'ONCE' && longSchedule.date) {
      const date = typeof longSchedule.date === 'string' ? new Date(longSchedule.date) : longSchedule.date;
      
      parts.push(date.getSeconds().toString());
      parts.push(date.getMinutes().toString());
      parts.push(date.getHours().toString());
      parts.push(date.getDate().toString());
      parts.push((date.getMonth() + 1).toString());
      parts.push('?');
      parts.push(date.getFullYear().toString());
      
      let expression = parts.join(' ');
      
      if (longSchedule.timezone) {
        expression += ` TZ:${longSchedule.timezone}`;
      }
      
      return new Schedule(expression);
    }
    
    // Regular CRON schedule
    parts = [
      longSchedule.second ?? '*',
      longSchedule.minute ?? '*', 
      longSchedule.hour ?? '*',
      longSchedule.dayOfMonth ?? '*',
      longSchedule.month ?? '*',
      longSchedule.dayOfWeek ?? '*'
    ];
    
    if (longSchedule.year !== undefined) {
      parts.push(longSchedule.year);
    }
    
    let expression = parts.join(' ');
    
    // Extract woy and tz for later use
    const woy = longSchedule.weekOfYear || null;
    const tz = longSchedule.timezone || null;
    
    if (longSchedule.timezone) {
      expression += ` TZ:${longSchedule.timezone}`;
    }
    
    if (longSchedule.weekOfYear) {
      expression += ` WOY:${longSchedule.weekOfYear}`;
    }

    // EoD support - handle eod field if present
    let eodObject: EndOfDuration | null = null;
    if (longSchedule.eod) {
      try {
        // If eod is already an EndOfDuration object, use it directly
        if (typeof longSchedule.eod === 'object' && 'toString' in longSchedule.eod) {
          eodObject = longSchedule.eod as EndOfDuration;
          expression += ` EOD:${longSchedule.eod.toString()}`;
        } else if (typeof longSchedule.eod === 'string') {
          // Parse string to EndOfDuration object
          eodObject = parseEoD(longSchedule.eod);
          expression += ` EOD:${longSchedule.eod}`;
        } else {
          throw new ParseError('EoD must be a string or EndOfDuration object');
        }
      } catch (error) {
        throw new ParseError(`Invalid EoD format: ${longSchedule.eod}`);
      }
    }
    
    // Instead of creating Schedule from expression, create directly with all parameters
    // This preserves the original EoD object instead of re-parsing it
    
    return new Schedule(
      longSchedule.second ?? "*",
      longSchedule.minute ?? "*", 
      longSchedule.hour ?? "*",
      longSchedule.dayOfMonth ?? "*",
      longSchedule.month ?? "*",
      longSchedule.dayOfWeek ?? "*",
      longSchedule.year || null,
      woy,
      tz,
      eodObject
    );
  }
}

// Standart cron kısaltmaları için harita
const SHORTCUTS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

// Metinsel ifadeleri sayısal değerlere çeviren yardımcı fonksiyon
function replaceTextualNames(field: string): string {
  const replacements: Record<string, string> = {
    SUN: "0",
    MON: "1",
    TUE: "2",
    WED: "3",
    THU: "4",
    FRI: "5",
    SAT: "6",
    JAN: "1",
    FEB: "2",
    MAR: "3",
    APR: "4",
    MAY: "5",
    JUN: "6",
    JUL: "7",
    AUG: "8",
    SEP: "9",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };
  // Büyük/küçük harf duyarsız bir şekilde tüm metinsel ifadeleri bul ve değiştir.
  const regex = new RegExp(Object.keys(replacements).join("|"), "gi");
  return field.replace(regex, (match) => replacements[match.toUpperCase()]);
}

export function fromCronSyntax(cronString: string): Schedule {
  const originalString = cronString.trim();

  if (SHORTCUTS[originalString]) {
    cronString = SHORTCUTS[originalString];
  }

  const parts = cronString.trim().split(/\s+/);

  if (parts.length < 5 || parts.length > 8) {
    if (originalString === "@reboot") {
      return new Schedule("@reboot");
    }
    throw new ParseError(
      `Invalid cron format: 5, 6, 7, or 8 fields expected, but ${parts.length} found for '${cronString}'.`
    );
  }

  if (parts.length === 5) {
    parts.unshift("0"); // saniye
  }

  // 6: s m h D M dow
  // 7: s m h D M dow Y
  // 8: s m h D M dow Y tz
  let s,
    m,
    h,
    D,
    M,
    dow,
    Y = null,
    woy = null,
    tz = null;
  if (parts.length === 6) {
    [s, m, h, D, M, dow] = parts;
  } else if (parts.length === 7) {
    [s, m, h, D, M, dow, Y] = parts;
  } else if (parts.length === 8) {
    [s, m, h, D, M, dow, Y, tz] = parts;
  }

  M = replaceTextualNames(M || "");
  dow = replaceTextualNames(dow || "");

  return new Schedule(s, m, h, D, M, dow, Y || null, woy, tz || null);
}

export function withWeekOfYear(
  schedule: Schedule,
  weekOfYear: string
): Schedule {
  return new Schedule(
    schedule.s,
    schedule.m,
    schedule.h,
    schedule.D,
    schedule.M,
    schedule.dow,
    schedule.Y,
    weekOfYear,
    schedule.tz
  );
}

export function fromCronWithWeekOfYear(
  cronString: string,
  weekOfYear: string
): Schedule {
  const originalString = cronString.trim();
  if (SHORTCUTS[originalString]) {
    cronString = SHORTCUTS[originalString];
  }
  const parts = cronString.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 8) {
    throw new ParseError(
      `Invalid cron format: 5, 6, 7, or 8 fields expected, but ${parts.length} found for '${cronString}'.`
    );
  }
  if (parts.length === 5) parts.unshift("0");
  let s,
    m,
    h,
    D,
    M,
    dow,
    Y = null,
    tz = null;
  if (parts.length === 6) {
    [s, m, h, D, M, dow] = parts;
  } else if (parts.length === 7) {
    [s, m, h, D, M, dow, Y] = parts;
  } else if (parts.length === 8) {
    [s, m, h, D, M, dow, Y, tz] = parts;
  }
  M = M ? replaceTextualNames(M) : M;
  dow = dow ? replaceTextualNames(dow) : dow;
  return new Schedule(s, m, h, D, M, dow, Y || null, weekOfYear, tz || null);
}

/**
 * Create a Schedule from a Schedule object or Schedule instance
 * Accepts objects with Schedule format: {s,m,h,D,M,dow,Y,woy,tz,eod}
 */
export function fromObject(obj: {
  s?: string | null;
  m?: string | null;
  h?: string | null;
  D?: string | null;
  M?: string | null;
  dow?: string | null;
  Y?: string | null;
  woy?: string | null;
  tz?: string | null;
  eod?: EndOfDuration | string | null;
} | Schedule): Schedule {
  // If it's already a Schedule instance, create a new one from its properties
  if (obj instanceof Schedule) {
    return new Schedule(obj.s, obj.m, obj.h, obj.D, obj.M, obj.dow, obj.Y, obj.woy, obj.tz, obj.eod);
  }

  // Check if we have meaningful time or date components
  const hasTimeComponents = obj.s !== undefined || obj.m !== undefined || obj.h !== undefined;
  const hasDateComponents = obj.D !== undefined || obj.M !== undefined || obj.dow !== undefined;

  // If we have a meaningful time-based schedule, provide smart defaults
  let s: string | null, m: string | null, h: string | null;
  let D: string | null, M: string | null, dow: string | null;
  let Y: string | null, woy: string | null, tz: string | null;
  let eod: EndOfDuration | null = null;

  if (hasTimeComponents || hasDateComponents) {
    // Provide sensible defaults for a complete cron expression
    s = obj.s != null ? String(obj.s) : "0";
    m = obj.m != null ? String(obj.m) : (obj.h !== undefined ? "0" : "*");
    h = obj.h != null ? String(obj.h) : "*";
    D = obj.D != null ? String(obj.D) : "*";
    M = obj.M != null ? String(obj.M) : "*";
    dow = obj.dow != null ? String(obj.dow) : "*";
  } else {
    // For partial schedules (only year, week, timezone), keep minimal
    s = obj.s != null ? String(obj.s) : null;
    m = obj.m != null ? String(obj.m) : null;
    h = obj.h != null ? String(obj.h) : null;
    D = obj.D != null ? String(obj.D) : null;
    M = obj.M != null ? String(obj.M) : null;
    dow = obj.dow != null ? String(obj.dow) : null;
  }

  Y = obj.Y != null ? String(obj.Y) : null;
  woy = obj.woy != null ? String(obj.woy) : null;
  tz = obj.tz || null;

  // Handle EoD field
  if (obj.eod) {
    if (typeof obj.eod === 'string') {
      // Parse EoD string
      try {
        eod = parseEoD(obj.eod);
      } catch (error) {
        throw new ParseError(`Invalid EoD format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (obj.eod instanceof EndOfDuration) {
      eod = obj.eod;
    }
  }

  // Apply textual name conversion
  const processedM = M ? replaceTextualNames(M) : M;
  const processedDow = dow ? replaceTextualNames(dow) : dow;

  return new Schedule(s, m, h, D, processedM, processedDow, Y, woy, tz, eod);
}

/**
 * Validate and normalize a Schedule object to handle null/undefined values
 * This ensures compatibility with objects that might have been JSON.parsed or created dynamically
 */
export function validateSchedule(schedule: any): Schedule {
  if (!schedule || typeof schedule !== 'object') {
    throw new ParseError('Invalid schedule: must be a Schedule object or compatible object');
  }

  // If it's already a Schedule instance, return a new instance to ensure immutability
  if (schedule instanceof Schedule) {
    return new Schedule(
      schedule.s, schedule.m, schedule.h, schedule.D, schedule.M, 
      schedule.dow, schedule.Y, schedule.woy, schedule.tz, schedule.eod
    );
  }

  // Handle case where schedule might be a plain object or have null prototype
  const normalized = {
    s: schedule.s ?? null,
    m: schedule.m ?? null,
    h: schedule.h ?? null,
    D: schedule.D ?? null,
    M: schedule.M ?? null,
    dow: schedule.dow ?? null,
    Y: schedule.Y ?? null,
    woy: schedule.woy ?? null,
    tz: schedule.tz ?? null,
    eod: schedule.eod ?? null
  };

  // Convert empty strings to null to ensure consistent handling
  Object.keys(normalized).forEach(key => {
    const value = normalized[key as keyof typeof normalized];
    if (value === '' || value === undefined) {
      normalized[key as keyof typeof normalized] = null;
    }
  });

  // Parse EoD if it's a string
  let eod: EndOfDuration | null = null;
  if (normalized.eod) {
    if (typeof normalized.eod === 'string') {
      try {
        eod = parseEoD(normalized.eod);
      } catch (error) {
        throw new ParseError(`Invalid EoD format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (normalized.eod instanceof EndOfDuration) {
      eod = normalized.eod;
    }
  }

  return new Schedule(
    normalized.s,
    normalized.m,
    normalized.h,
    normalized.D,
    normalized.M,
    normalized.dow,
    normalized.Y,
    normalized.woy,
    normalized.tz,
    eod
  );
}

/**
 * Check if a value is a valid Schedule object or compatible object
 * Only requires at least one field to be present
 */
export function isValidScheduleObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  // Must have at least one cron field (any field is sufficient)
  const hasAnyField = obj.s !== undefined || obj.m !== undefined || obj.h !== undefined ||
                     obj.D !== undefined || obj.M !== undefined || obj.dow !== undefined ||
                     obj.Y !== undefined || obj.woy !== undefined || obj.tz !== undefined ||
                     obj.eod !== undefined;
  
  if (!hasAnyField) return false;

  try {
    validateSchedule(obj);
    return true;
  } catch {
    return false;
  }
}

// Predefined week patterns for convenience
export const WeekPatterns = {
  FIRST_WEEK: "1",
  LAST_WEEK: "53",
  EVEN_WEEKS:
    "2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52",
  ODD_WEEKS:
    "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53",
  FIRST_QUARTER: "1-13", // Weeks 1-13 (roughly first quarter)
  SECOND_QUARTER: "14-26", // Weeks 14-26 (roughly second quarter)
  THIRD_QUARTER: "27-39", // Weeks 27-39 (roughly third quarter)
  FOURTH_QUARTER: "40-53", // Weeks 40-53 (roughly fourth quarter)
  BI_WEEKLY:
    "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53", // Every other week (odd weeks)
  MONTHLY: "1,5,9,13,17,21,25,29,33,37,41,45,49,53", // Roughly monthly (every 4 weeks)
} as const;

/**
 * Parse a JCRON specification string that may include WOY:, TZ:, and EOD: extensions
 * Supports: "s m h D M dow [Y] [WOY:woy] [TZ:tz] [EOD:eod]"
 */
export function fromJCronString(jcronString: string): Schedule {
  const originalString = jcronString.trim();
  
  // Handle shortcuts first
  if (SHORTCUTS[originalString]) {
    return fromCronSyntax(SHORTCUTS[originalString]);
  }
  
  // Split by spaces and identify extensions
  const parts = originalString.split(/\s+/);
  
  let cronParts: string[] = [];
  let woy: string | null = null;
  let tz: string | null = null;
  let eodStr: string | null = null;
  
  // Separate cron fields from JCRON extensions
  for (const part of parts) {
    if (part.startsWith('WOY:')) {
      woy = part.substring(4);
    } else if (part.startsWith('TZ:')) {
      tz = part.substring(3);
    } else if (part.startsWith('EOD:')) {
      eodStr = part.substring(4);
    } else if (/^[ES]\d+[WMD]$/.test(part)) {
      // Direct EOD modifiers like E1W, S2D, E3M etc.
      eodStr = part;
    } else {
      cronParts.push(part);
    }
  }
  
  // Validate cron part count
  if (cronParts.length < 5 || cronParts.length > 7) {
    throw new ParseError(
      `Invalid JCRON format: 5, 6, or 7 cron fields expected, but ${cronParts.length} found for '${originalString}'.`
    );
  }
  
  // Add seconds if missing (5-field format)
  if (cronParts.length === 5) {
    cronParts.unshift("0");
  }
  
  // Parse cron fields
  let s, m, h, D, M, dow, Y = null;
  
  if (cronParts.length === 6) {
    [s, m, h, D, M, dow] = cronParts;
  } else if (cronParts.length === 7) {
    [s, m, h, D, M, dow, Y] = cronParts;
  }
  
  // Apply textual name conversion
  M = replaceTextualNames(M || "");
  dow = replaceTextualNames(dow || "");
  
  // Parse EoD if present
  let eod: EndOfDuration | null = null;
  if (eodStr) {
    try {
      eod = parseEoD(eodStr);
    } catch (error) {
      throw new ParseError(`Invalid EOD format '${eodStr}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return new Schedule(s, m, h, D, M, dow, Y || null, woy, tz || null, eod);
}
