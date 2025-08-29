// src/engine.ts
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addSeconds,
  getDate,
  getDay,
  getISOWeek,
  getISOWeekYear,
  lastDayOfMonth,
  set,
  setISOWeek,
  startOfISOWeek,
  startOfISOWeekYear,
  subSeconds,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ParseError } from "./errors";
import { Schedule } from "./schedule";
import { EndOfDuration, ReferencePoint } from "./eod";

// Optimized expanded schedule with Sets for faster lookups
class ExpandedSchedule {
  secondsSet: Set<number> = new Set();
  minutesSet: Set<number> = new Set();
  hoursSet: Set<number> = new Set();
  monthsSet: Set<number> = new Set();
  yearsSet: Set<number> = new Set();
  weeksOfYearSet: Set<number> = new Set();
  dayOfMonthSet: Set<number> = new Set(); // Added for day of month
  dayOfWeekSet: Set<number> = new Set();  // Added for day of week
  
  // Keep arrays for ordered operations
  seconds: number[] = [];
  minutes: number[] = [];
  hours: number[] = [];
  months: number[] = [];
  years: number[] = [];
  weeksOfYear: number[] = []; // Added for week of year support
  daysOfMonth: number[] = [];  // Added for day of month
  daysOfWeek: number[] = [];   // Added for day of week
  
  dayOfMonth: string = "*";
  dayOfWeek: string = "*";
  weekOfYear: string = "*"; // Original week expression
  timezone: string = "UTC";
  
  // Fast-path flags for common cases
  isEverySecond: boolean = false;
  isEveryMinute: boolean = false;
  isEveryHour: boolean = false;
  isEveryDay: boolean = false;
  isEveryMonth: boolean = false;
  isEveryYear: boolean = false;
  isUTC: boolean = true;
  
  // Pre-compiled regex for common patterns
  private static dayOfMonthLastPattern = /^(\d+)?L$/;
  private static dayOfWeekNthPattern = /^(\d+)#(\d+)$/;
  private static dayOfWeekLastPattern = /^(\d+)L$/;
  
  setFastPathFlags() {
    this.isEverySecond = this.secondsSet.size === 60;
    this.isEveryMinute = this.minutesSet.size === 60;
    this.isEveryHour = this.hoursSet.size === 24;
    this.isEveryMonth = this.monthsSet.size === 12;
    this.isEveryYear = this.yearsSet.size > 50; // Reasonable year range
    this.isUTC = this.timezone === "UTC";
  }
}

export class Engine {
  private readonly scheduleCache = new WeakMap<Schedule, ExpandedSchedule>();
  
  // Cache for commonly used date calculations
  private readonly dateCache = new Map<string, Date>();
  private static readonly maxCacheSize = 1000;

  public next(schedule: Schedule, fromTime: Date): Date {
    // Handle pure EOD/SOD expressions (no cron pattern, just EOD calculation)
    if (schedule.eod && this._isPureEodSchedule(schedule)) {
      return this._applyEodCalculation(fromTime, schedule.eod, schedule.tz || "UTC");
    }
    
    const expSchedule = this._getExpandedSchedule(schedule);
    const location = expSchedule.timezone;
    
    // Fast path for UTC and simple patterns
    if (expSchedule.isUTC && expSchedule.isEverySecond) {
      const result = new Date(fromTime.getTime() + 1000);
      return result;
    }
    
    if (expSchedule.isUTC && expSchedule.isEveryMinute && expSchedule.secondsSet.size === 1 && expSchedule.secondsSet.has(0)) {
      const result = new Date(fromTime);
      result.setSeconds(0, 0);
      result.setMinutes(result.getMinutes() + 1);
      return result;
    }
    
    let searchTime = addSeconds(fromTime, 1);

    for (let i = 0; i < 2000; i++) {
      // Güvenlik limiti
      const zonedView = expSchedule.isUTC ? searchTime : toZonedTime(searchTime, location);

      // Extract time values correctly based on timezone
      const year = expSchedule.isUTC ? searchTime.getUTCFullYear() : zonedView.getFullYear();
      const month = expSchedule.isUTC ? searchTime.getUTCMonth() : zonedView.getMonth();
      const date = expSchedule.isUTC ? searchTime.getUTCDate() : zonedView.getDate();
      const hours = expSchedule.isUTC ? searchTime.getUTCHours() : zonedView.getHours();
      const minutes = expSchedule.isUTC ? searchTime.getUTCMinutes() : zonedView.getMinutes();
      const seconds = expSchedule.isUTC ? searchTime.getUTCSeconds() : zonedView.getSeconds();

      // Use Set.has() instead of Array.includes() for better performance
      if (!expSchedule.yearsSet.has(year)) {
        searchTime = expSchedule.isUTC ? 
          new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)) :
          fromZonedTime(
            set(zonedView, {
              year: year + 1,
              month: 0,
              date: 1,
              hours: 0,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            location
          );
        continue;
      }
      if (!expSchedule.monthsSet.has(month + 1)) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)) :
          fromZonedTime(
            set(addMonths(zonedView, 1), {
              date: 1,
              hours: 0,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            location
          );
        continue;
      }
      if (!this._isWeekOfYearMatch(searchTime, expSchedule)) {
        // SIMPLIFIED WOY LOGIC using date-fns: Find next valid week occurrence
        const currentWeek = getISOWeek(searchTime);
        const currentYear = getISOWeekYear(searchTime);
        const validWeeks = Array.from(expSchedule.weeksOfYearSet).sort((a, b) => a - b);
        
        let targetWeek = null;
        let targetYear = currentYear;
        
        // Find next valid week in current year
        for (const week of validWeeks) {
          if (week >= currentWeek) {
            targetWeek = week;
            break;
          }
        }
        
        // If no valid week found in current year, use first week of next year
        if (targetWeek === null) {
          targetWeek = validWeeks[0];
          targetYear = currentYear + 1;
        }
        
        // Create date for the target week using date-fns
        try {
          // Start with beginning of the target year
          const yearStart = startOfISOWeekYear(new Date(targetYear, 0, 1));
          // Set to the target week
          const targetDate = setISOWeek(yearStart, targetWeek);
          // Get start of that week (Monday)
          searchTime = startOfISOWeek(targetDate);
          
        } catch (error) {
          console.error('Date-fns WOY calculation failed:', error);
          // Fallback to next year if calculation fails
          searchTime = new Date(targetYear + 1, 0, 1);
        }
        
        continue;
      }
      if (!this._isDayMatch(searchTime, expSchedule)) {
        searchTime = expSchedule.isUTC ?
          set(addDays(searchTime, 1), {
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
          }) :
          fromZonedTime(
            set(addDays(zonedView, 1), {
              hours: 0,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            location
          );
        continue;
      }

      // Optimized binary search for next value
      const [nextHour, hourWrap] = this._findNextValueOptimized(
        expSchedule.hours,
        expSchedule.hoursSet,
        hours
      );
      if (hourWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date + 1, expSchedule.hours[0], 0, 0, 0)) :
          fromZonedTime(
            set(addDays(zonedView, 1), {
              hours: expSchedule.hours[0],
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            }),
            location
          );
        continue;
      }
      if (nextHour > hours) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, nextHour, expSchedule.minutes[0], expSchedule.seconds[0], 0)) :
          fromZonedTime(
            set(zonedView, {
              hours: nextHour,
              minutes: expSchedule.minutes[0],
              seconds: expSchedule.seconds[0],
              milliseconds: 0,
            }),
            location
          );
        continue;
      }

      const [nextMinute, minuteWrap] = this._findNextValueOptimized(
        expSchedule.minutes,
        expSchedule.minutesSet,
        minutes
      );
      if (minuteWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours + 1, expSchedule.minutes[0], expSchedule.seconds[0], 0)) :
          fromZonedTime(
            set(addHours(zonedView, 1), {
              minutes: expSchedule.minutes[0],
              seconds: expSchedule.seconds[0],
              milliseconds: 0,
            }),
            location
          );
        continue;
      }
      if (nextMinute > minutes) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, nextMinute, expSchedule.seconds[0], 0)) :
          fromZonedTime(
            set(zonedView, {
              minutes: nextMinute,
              seconds: expSchedule.seconds[0],
              milliseconds: 0,
            }),
            location
          );
        continue;
      }

      const [nextSecond, secondWrap] = this._findNextValueOptimized(
        expSchedule.seconds,
        expSchedule.secondsSet,
        seconds
      );
      if (secondWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, minutes + 1, expSchedule.seconds[0], 0)) :
          fromZonedTime(
            set(addMinutes(zonedView, 1), {
              seconds: expSchedule.seconds[0],
              milliseconds: 0,
            }),
            location
          );
        continue;
      }
      if (nextSecond > seconds) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, minutes, nextSecond, 0)) :
          fromZonedTime(
            set(zonedView, { seconds: nextSecond, milliseconds: 0 }),
            location
          );
        continue;
      }

      // Return the normal trigger time - EOD is only used for end time calculation in isRangeNow()
      return searchTime;
    }

    throw new Error(
      "JCRON: Could not find a valid next run time within a reasonable number of attempts."
    );
  }
  public prev(schedule: Schedule, fromTime: Date): Date {
    const expSchedule = this._getExpandedSchedule(schedule);
    const location = expSchedule.timezone;
    let searchTime = subSeconds(fromTime, 1);

    for (let i = 0; i < 2000; i++) {
      // Extract time components properly based on timezone
      const zonedView = expSchedule.isUTC ? searchTime : fromZonedTime(searchTime, location);
      const year = expSchedule.isUTC ? searchTime.getUTCFullYear() : zonedView.getFullYear();
      const month = expSchedule.isUTC ? searchTime.getUTCMonth() : zonedView.getMonth();
      const date = expSchedule.isUTC ? searchTime.getUTCDate() : zonedView.getDate();
      const hours = expSchedule.isUTC ? searchTime.getUTCHours() : zonedView.getHours();
      const minutes = expSchedule.isUTC ? searchTime.getUTCMinutes() : zonedView.getMinutes();
      const seconds = expSchedule.isUTC ? searchTime.getUTCSeconds() : zonedView.getSeconds();

      if (!expSchedule.yearsSet.has(year)) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999)) :
          toZonedTime(
            set(zonedView, {
              year: year - 1,
              month: 11,
              date: 31,
              hours: 23,
              minutes: 59,
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (!expSchedule.monthsSet.has(month + 1)) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month - 1, 31, 23, 59, 59, 999)) :
          toZonedTime(
            set(addMonths(zonedView, -1), {
              date: 31,
              hours: 23,
              minutes: 59,
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (!this._isWeekOfYearMatch(searchTime, expSchedule)) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date - 1, 23, 59, 59, 999)) :
          toZonedTime(
            set(addDays(zonedView, -1), {
              hours: 23,
              minutes: 59,
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (!this._isDayMatch(searchTime, expSchedule)) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date - 1, 23, 59, 59, 999)) :
          toZonedTime(
            set(addDays(zonedView, -1), {
              hours: 23,
              minutes: 59,
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }

      const [prevHour, hourWrap] = this._findPrevValue(
        expSchedule.hours,
        hours
      );
      if (hourWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date - 1, expSchedule.hours.at(-1) || 23, 59, 59, 999)) :
          toZonedTime(
            set(addDays(zonedView, -1), {
              hours: expSchedule.hours.at(-1),
              minutes: 59,
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (prevHour < hours) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, prevHour, expSchedule.minutes.at(-1) || 59, expSchedule.seconds.at(-1) || 59, 999)) :
          toZonedTime(
            set(zonedView, {
              hours: prevHour,
              minutes: expSchedule.minutes.at(-1),
              seconds: expSchedule.seconds.at(-1),
              milliseconds: 999,
            }),
            location
          );
        continue;
      }

      const [prevMinute, minuteWrap] = this._findPrevValue(
        expSchedule.minutes,
        minutes
      );
      if (minuteWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours - 1, expSchedule.minutes.at(-1) || 59, 59, 999)) :
          toZonedTime(
            set(addHours(zonedView, -1), {
              minutes: expSchedule.minutes.at(-1),
              seconds: 59,
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (prevMinute < minutes) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, prevMinute, expSchedule.seconds.at(-1) || 59, 999)) :
          toZonedTime(
            set(zonedView, {
              minutes: prevMinute,
              seconds: expSchedule.seconds.at(-1),
              milliseconds: 999,
            }),
            location
          );
        continue;
      }

      const [prevSecond, secondWrap] = this._findPrevValue(
        expSchedule.seconds,
        seconds
      );
      if (secondWrap) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, minutes - 1, expSchedule.seconds.at(-1) || 59, 999)) :
          toZonedTime(
            set(addMinutes(zonedView, -1), {
              seconds: expSchedule.seconds.at(-1),
              milliseconds: 999,
            }),
            location
          );
        continue;
      }
      if (prevSecond < seconds) {
        searchTime = expSchedule.isUTC ?
          new Date(Date.UTC(year, month, date, hours, minutes, prevSecond, 999)) :
          toZonedTime(
            set(zonedView, { seconds: prevSecond, milliseconds: 999 }),
            location
          );
        continue;
      }

      // Return the normal trigger time - EOD is only used for end time calculation in isRangeNow()
      return searchTime;
    }

    throw new Error(
      "JCRON: Could not find a valid previous run time within a reasonable number of attempts."
    );
  }
  public isMatch(schedule: Schedule, date: Date): boolean {
    const expSchedule = this._getExpandedSchedule(schedule);
    const location = expSchedule.timezone;
    
    // For UTC, we need to use UTC methods, not local time methods
    let seconds, minutes, hours, day, month, year;
    if (expSchedule.isUTC) {
      seconds = date.getUTCSeconds();
      minutes = date.getUTCMinutes();
      hours = date.getUTCHours();
      day = date.getUTCDay();
      month = date.getUTCMonth() + 1;
      year = date.getUTCFullYear();
    } else {
      const zonedView = toZonedTime(date, location);
      seconds = zonedView.getSeconds();
      minutes = zonedView.getMinutes();
      hours = zonedView.getHours();
      day = zonedView.getDay();
      month = zonedView.getMonth() + 1;
      year = zonedView.getFullYear();
    }
    
    // Use Set.has() for O(1) lookups instead of Array.includes() O(n)
    return (
      expSchedule.secondsSet.has(seconds) &&
      expSchedule.minutesSet.has(minutes) &&
      expSchedule.hoursSet.has(hours) &&
      expSchedule.monthsSet.has(month) &&
      expSchedule.yearsSet.has(year) &&
      this._isWeekOfYearMatch(date, expSchedule) &&
      this._isDayMatch(date, expSchedule)
    );
  }
  private _findPrevValue(slice: number[], current: number): [number, boolean] {
    for (let i = slice.length - 1; i >= 0; i--) {
      const val = slice[i];
      if (val <= current) {
        return [val, false]; // [prev, wrapped=false]
      }
    }
    // Eğer uygun değer bulunamazsa, bir önceki periyodun sonuna gitmek için "sarma" (wrap) sinyali ver.
    return [slice[slice.length - 1], true]; // [last_element, wrapped=true]
  }
  public _getExpandedSchedule(schedule: Schedule): ExpandedSchedule {
    if (this.scheduleCache.has(schedule)) {
      return this.scheduleCache.get(schedule)!;
    }

    const exp = new ExpandedSchedule();
    // Handle both null and empty string values
    const s = schedule.s && schedule.s !== "" ? schedule.s : "0";
    const m = schedule.m && schedule.m !== "" ? schedule.m : "*";
    const h = schedule.h && schedule.h !== "" ? schedule.h : "*";
    const D = schedule.D && schedule.D !== "" ? schedule.D : "*";
    const M = schedule.M && schedule.M !== "" ? schedule.M : "*";
    const dow = schedule.dow && schedule.dow !== "" ? schedule.dow : "*";
    const Y = schedule.Y && schedule.Y !== "" ? schedule.Y : "*";
    const woy = schedule.woy && schedule.woy !== "" ? schedule.woy : "*"; // Week of Year
    const tz = schedule.tz && schedule.tz !== "" ? schedule.tz : "UTC";

    try {
      formatInTimeZone(new Date(), tz, "yyyy-MM-dd HH:mm:ssXXX");
      exp.timezone = tz;
    } catch (e) {
      throw new ParseError(`Invalid timezone '${tz}': ${(e as Error).message}`);
    }

    // Expand fields with optimizations
    exp.seconds = this._expandPartOptimized(s, 0, 59);
    exp.minutes = this._expandPartOptimized(m, 0, 59);
    exp.hours = this._expandPartOptimized(h, 0, 23);
    exp.months = this._expandPartOptimized(M, 1, 12);
    exp.weeksOfYear = this._expandPartOptimized(woy, 1, 53); // Parse weeks 1-53
    const currentYear = new Date().getFullYear();
    exp.years =
      Y === "*"
        ? Array.from({ length: 30 }, (_, i) => currentYear - 10 + i) // Include 10 years in the past and 20 in the future
        : this._expandPartOptimized(Y, currentYear - 10, currentYear + 100);
        
    // Expand day-related fields (for complex patterns like L, #, etc.)
    // For simple numeric patterns, we'll use sets directly in _isDayMatch
    exp.daysOfMonth = D === "*" || D === "?" ? [] : (D.match(/[LW#]/) ? [] : this._expandPartOptimized(D, 1, 31));
    exp.daysOfWeek = dow === "*" || dow === "?" ? [] : (dow.match(/[LW#]/) ? [] : this._expandPartOptimized(dow.replace("7", "0"), 0, 6));
    
    // Create Sets for fast lookups
    exp.secondsSet = new Set(exp.seconds);
    exp.minutesSet = new Set(exp.minutes);
    exp.hoursSet = new Set(exp.hours);
    exp.monthsSet = new Set(exp.months);
    exp.yearsSet = new Set(exp.years);
    exp.weeksOfYearSet = new Set(exp.weeksOfYear);
    exp.dayOfMonthSet = new Set(exp.daysOfMonth);
    exp.dayOfWeekSet = new Set(exp.daysOfWeek);
    
    exp.dayOfMonth = D;
    exp.dayOfWeek = dow;
    exp.weekOfYear = woy; // Store original expression
    
    // Set fast-path flags
    exp.setFastPathFlags();
    
    this.scheduleCache.set(schedule, exp);
    return exp;
  }

  private _expandPartOptimized(expr: string, min: number, max: number): number[] {
    if (expr === "*" || expr === "?") {
      // Pre-compute common ranges for better performance
      const result = new Array(max - min + 1);
      for (let i = 0; i <= max - min; i++) {
        result[i] = min + i;
      }
      return result;
    }
    if (/[LW#]/.test(expr)) return [];
    
    const values = new Set<number>();
    const parts = expr.split(",");
    
    for (const part of parts) {
      if (part.includes("/")) {
        const [range, stepStr] = part.split("/");
        const step = parseInt(stepStr, 10);
        if (isNaN(step) || step === 0)
          throw new ParseError(`Invalid step value: ${stepStr}`);
        
        if (range === "*") {
          for (let i = min; i <= max; i += step) {
            values.add(i);
          }
        } else if (range.includes("-")) {
          const [startStr, endStr] = range.split("-");
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          for (let i = start; i <= end; i += step) {
            values.add(i);
          }
        } else {
          const start = parseInt(range, 10);
          for (let i = start; i <= max; i += step) {
            values.add(i);
          }
        }
      } else if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        for (let i = start; i <= end; i++) {
          values.add(i);
        }
      } else {
        values.add(parseInt(part, 10));
      }
    }
    
    // Sort and return as array
    return Array.from(values).sort((a, b) => a - b);
  }

  private _isDayMatch(date: Date, schedule: ExpandedSchedule): boolean {
    const { dayOfMonth: D, dayOfWeek: dow } = schedule;
    const isDomRestricted = D !== "*" && D !== "?";
    const isDowRestricted = dow !== "*" && dow !== "?";

    if (isDomRestricted && isDowRestricted)
      return this._checkDayOfMonth(date, D, schedule) || this._checkDayOfWeek(date, dow, schedule);
    if (isDomRestricted) return this._checkDayOfMonth(date, D, schedule);
    if (isDowRestricted) return this._checkDayOfWeek(date, dow, schedule);
    return true;
  }

  // --- HATALI KISIM DÜZELTİLDİ ---
  // 'require' çağrıları kaldırıldı, fonksiyonlar artık dosyanın en üstündeki import'tan geliyor.
  private _checkDayOfMonth(date: Date, expr: string, schedule: ExpandedSchedule): boolean {
    // Use appropriate time method based on timezone
    const dayOfMonth = schedule.isUTC ? date.getUTCDate() : date.getDate();
    
    if (expr.toUpperCase() === "L") {
      const lastDay = schedule.isUTC ? 
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() :
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return dayOfMonth === lastDay;
    }
    
    // Fast path for simple numeric patterns
    if (schedule.dayOfMonthSet.size > 0) {
      return schedule.dayOfMonthSet.has(dayOfMonth);
    }
    
    // Fallback for complex patterns
    try {
      return this._expandPartOptimized(expr, 1, 31).includes(dayOfMonth);
    } catch {
      return false;
    }
  }

  private _checkDayOfWeek(date: Date, expr: string, schedule: ExpandedSchedule): boolean {
    // Use appropriate time method based on timezone
    const dayOfWeek = schedule.isUTC ? date.getUTCDay() : date.getDay();
    const dayOfMonth = schedule.isUTC ? date.getUTCDate() : date.getDate();
    
    const lastDayMatch = expr.match(/^(\d)L$/i);
    if (lastDayMatch) {
      const day = parseInt(lastDayMatch[1], 10) % 7;
      const lastDayOfCurrentMonth = schedule.isUTC ?
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() :
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return dayOfWeek === day && dayOfMonth > lastDayOfCurrentMonth - 7;
    }
    
    const nthDayMatch = expr.match(/^(\d)#(\d)$/);
    if (nthDayMatch) {
      const day = parseInt(nthDayMatch[1], 10) % 7;
      const nth = parseInt(nthDayMatch[2], 10);
      return dayOfWeek === day && Math.floor((dayOfMonth - 1) / 7) + 1 === nth;
    }
    
    // Fast path for simple numeric patterns
    if (schedule.dayOfWeekSet.size > 0) {
      return schedule.dayOfWeekSet.has(dayOfWeek);
    }
    
    // Fallback for complex patterns
    try {
      const dowNorm = expr.replace("7", "0");
      return this._expandPartOptimized(dowNorm, 0, 6).includes(dayOfWeek);
    } catch {
      return false;
    }
  }
  // --- DÜZELTME SONU ---

  // Helper function to get ISO week number (1-53) using reliable date-fns
  private _getISOWeek(date: Date, schedule?: ExpandedSchedule): number {
    // Use date-fns getISOWeek for reliable ISO week calculation
    return getISOWeek(date);
  }

  private _isWeekOfYearMatch(
    date: Date,
    expSchedule: ExpandedSchedule
  ): boolean {
    // If no restriction on week of year, match anything
    if (expSchedule.weekOfYear === "*") {
      return true;
    }

    const weekNum = this._getISOWeek(date, expSchedule);
    return expSchedule.weeksOfYearSet.has(weekNum);
  }

  private _findNextValue(slice: number[], current: number): [number, boolean] {
    for (const val of slice) {
      if (val >= current) return [val, false];
    }
    return [slice[0], true];
  }

  // Optimized binary search with Set pre-check
  private _findNextValueOptimized(
    sortedArray: number[],
    valueSet: Set<number>,
    currentValue: number
  ): [number, boolean] {
    // Quick check if current value is valid
    if (valueSet.has(currentValue)) {
      return [currentValue, false];
    }
    
    // Binary search for next valid value
    let left = 0;
    let right = sortedArray.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midValue = sortedArray[mid];
      
      if (midValue > currentValue) {
        if (mid === 0 || sortedArray[mid - 1] <= currentValue) {
          return [midValue, false];
        }
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    // Wrap to next period
    return [sortedArray[0], true];
  }

  /**
   * Apply EOD (End of Duration) calculation to a schedule reference time
   * Implements JCRON sequential processing for complex expressions
   */
  private _applyEodCalculation(referenceTime: Date, eod: EndOfDuration, timezone: string): Date {
    // Determine if this is SOD (Start of Duration) or EOD (End of Duration)
    // Check if the original string started with 'S'
    const eodString = eod.toString();
    const isSOD = eodString.startsWith('S');
    
    // Use the appropriate calculation method
    const result = isSOD ? 
      eod.calculateStartDate(referenceTime) : 
      eod.calculateEndDate(referenceTime);
    
    // Apply timezone if the result needs timezone conversion
    if (timezone !== "UTC") {
      // The result should be in the specified timezone
      try {
        return fromZonedTime(toZonedTime(result, "UTC"), timezone);
      } catch (error) {
        // If timezone conversion fails, return the result as-is
        console.warn(`JCRON: Failed to convert EOD/SOD result to timezone ${timezone}, using UTC`);
        return result;
      }
    }
    
    return result;
  }

  /**
   * Check if this is a pure EOD/SOD schedule (no cron pattern, just EOD calculation)
   */
  private _isPureEodSchedule(schedule: Schedule): boolean {
    // A pure EOD schedule has minimal cron pattern (like "0 0 0 1 1 *") and an EOD object
    // This is created when parsing expressions like "E0W", "S1M", etc.
    return schedule.eod !== null &&
           schedule.s === "0" &&
           schedule.m === "0" &&
           schedule.h === "0" &&
           schedule.D === "1" &&
           schedule.M === "1" &&
           schedule.dow === "*";
  }
}
