// src/engine.ts
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addSeconds,
  getDate,
  getDay,
  lastDayOfMonth,
  set,
  subSeconds,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ParseError } from "./errors";
import { Schedule } from "./schedule";

class ExpandedSchedule {
  seconds: number[] = [];
  minutes: number[] = [];
  hours: number[] = [];
  months: number[] = [];
  years: number[] = [];
  weeksOfYear: number[] = []; // Added for week of year support
  dayOfMonth: string = "*";
  dayOfWeek: string = "*";
  weekOfYear: string = "*"; // Original week expression
  timezone: string = "UTC";
}

export class Engine {
  private readonly scheduleCache = new WeakMap<Schedule, ExpandedSchedule>();

  public next(schedule: Schedule, fromTime: Date): Date {
    const expSchedule = this._getExpandedSchedule(schedule);
    const location = expSchedule.timezone;
    let searchTime = addSeconds(fromTime, 1);

    for (let i = 0; i < 2000; i++) {
      // Güvenlik limiti
      const zonedView = toZonedTime(searchTime, location);

      if (!expSchedule.years.includes(zonedView.getFullYear())) {
        searchTime = fromZonedTime(
          set(zonedView, {
            year: zonedView.getFullYear() + 1,
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
      if (!expSchedule.months.includes(zonedView.getMonth() + 1)) {
        searchTime = fromZonedTime(
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
      if (!this._isWeekOfYearMatch(zonedView, expSchedule)) {
        searchTime = fromZonedTime(
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
      if (!this._isDayMatch(zonedView, expSchedule)) {
        searchTime = fromZonedTime(
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

      const [nextHour, hourWrap] = this._findNextValue(
        expSchedule.hours,
        zonedView.getHours()
      );
      if (hourWrap) {
        searchTime = fromZonedTime(
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
      if (nextHour > zonedView.getHours()) {
        searchTime = fromZonedTime(
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

      const [nextMinute, minuteWrap] = this._findNextValue(
        expSchedule.minutes,
        zonedView.getMinutes()
      );
      if (minuteWrap) {
        searchTime = fromZonedTime(
          set(addHours(zonedView, 1), {
            minutes: expSchedule.minutes[0],
            seconds: expSchedule.seconds[0],
            milliseconds: 0,
          }),
          location
        );
        continue;
      }
      if (nextMinute > zonedView.getMinutes()) {
        searchTime = fromZonedTime(
          set(zonedView, {
            minutes: nextMinute,
            seconds: expSchedule.seconds[0],
            milliseconds: 0,
          }),
          location
        );
        continue;
      }

      const [nextSecond, secondWrap] = this._findNextValue(
        expSchedule.seconds,
        zonedView.getSeconds()
      );
      if (secondWrap) {
        searchTime = fromZonedTime(
          set(addMinutes(zonedView, 1), {
            seconds: expSchedule.seconds[0],
            milliseconds: 0,
          }),
          location
        );
        continue;
      }
      if (nextSecond > zonedView.getSeconds()) {
        searchTime = fromZonedTime(
          set(zonedView, { seconds: nextSecond, milliseconds: 0 }),
          location
        );
        continue;
      }

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
      const zonedView = fromZonedTime(searchTime, location);

      if (!expSchedule.years.includes(zonedView.getFullYear())) {
        searchTime = toZonedTime(
          set(zonedView, {
            year: zonedView.getFullYear() - 1,
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
      if (!expSchedule.months.includes(zonedView.getMonth() + 1)) {
        searchTime = toZonedTime(
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
      if (!this._isWeekOfYearMatch(zonedView, expSchedule)) {
        searchTime = toZonedTime(
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
      if (!this._isDayMatch(zonedView, expSchedule)) {
        searchTime = toZonedTime(
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
        zonedView.getHours()
      );
      if (hourWrap) {
        searchTime = toZonedTime(
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
      if (prevHour < zonedView.getHours()) {
        searchTime = toZonedTime(
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
        zonedView.getMinutes()
      );
      if (minuteWrap) {
        searchTime = toZonedTime(
          set(addHours(zonedView, -1), {
            minutes: expSchedule.minutes.at(-1),
            seconds: 59,
            milliseconds: 999,
          }),
          location
        );
        continue;
      }
      if (prevMinute < zonedView.getMinutes()) {
        searchTime = toZonedTime(
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
        zonedView.getSeconds()
      );
      if (secondWrap) {
        searchTime = toZonedTime(
          set(addMinutes(zonedView, -1), {
            seconds: expSchedule.seconds.at(-1),
            milliseconds: 999,
          }),
          location
        );
        continue;
      }
      if (prevSecond < zonedView.getSeconds()) {
        searchTime = toZonedTime(
          set(zonedView, { seconds: prevSecond, milliseconds: 999 }),
          location
        );
        continue;
      }

      return searchTime;
    }

    throw new Error(
      "JCRON: Could not find a valid previous run time within a reasonable number of attempts."
    );
  }
  public isMatch(schedule: Schedule, date: Date): boolean {
    const expSchedule = this._getExpandedSchedule(schedule);
    const location = expSchedule.timezone;
    const zonedView = toZonedTime(date, location);
    if (!expSchedule.years.includes(zonedView.getFullYear())) return false;
    if (!expSchedule.months.includes(zonedView.getMonth() + 1)) return false;
    if (!this._isWeekOfYearMatch(zonedView, expSchedule)) return false;
    if (!this._isDayMatch(zonedView, expSchedule)) return false;
    if (!expSchedule.hours.includes(zonedView.getHours())) return false;
    if (!expSchedule.minutes.includes(zonedView.getMinutes())) return false;
    if (!expSchedule.seconds.includes(zonedView.getSeconds())) return false;
    return true;
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
  private _getExpandedSchedule(schedule: Schedule): ExpandedSchedule {
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

    exp.seconds = this._expandPart(s, 0, 59);
    exp.minutes = this._expandPart(m, 0, 59);
    exp.hours = this._expandPart(h, 0, 23);
    exp.months = this._expandPart(M, 1, 12);
    exp.weeksOfYear = this._expandPart(woy, 1, 53); // Parse weeks 1-53
    const currentYear = new Date().getFullYear();
    exp.years =
      Y === "*"
        ? Array.from({ length: 30 }, (_, i) => currentYear - 10 + i) // Include 10 years in the past and 20 in the future
        : this._expandPart(Y, currentYear - 10, currentYear + 100);
    exp.dayOfMonth = D;
    exp.dayOfWeek = dow;
    exp.weekOfYear = woy; // Store original expression
    this.scheduleCache.set(schedule, exp);
    return exp;
  }

  private _expandPart(expr: string, min: number, max: number): number[] {
    if (expr === "*" || expr === "?") {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    if (/[LW#]/.test(expr)) return [];
    const values = new Set<number>();
    const parts = expr.split(",");
    for (const part of parts) {
      const stepMatch = part.match(/(.*)\/(\d+)/);
      let rangePart = part;
      let step = 1;
      if (stepMatch) {
        rangePart = stepMatch[1];
        step = parseInt(stepMatch[2], 10);
        if (isNaN(step) || step === 0)
          throw new ParseError(`Invalid step value: ${stepMatch[2]}`);
      }
      const rangeMatch = rangePart.match(/^(\d+)-(\d+)$/);
      let start = rangePart === "*" ? min : -1;
      let end = rangePart === "*" ? max : -1;
      if (rangeMatch) {
        start = parseInt(rangeMatch[1], 10);
        end = parseInt(rangeMatch[2], 10);
      } else if (/^\d+$/.test(rangePart)) {
        start = end = parseInt(rangePart, 10);
      } else if (rangePart !== "*") {
        throw new ParseError(`Invalid expression part: ${part}`);
      }
      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) values.add(i);
      }
    }
    return Array.from(values).sort((a, b) => a - b);
  }

  private _isDayMatch(t: Date, schedule: ExpandedSchedule): boolean {
    const { dayOfMonth: D, dayOfWeek: dow } = schedule;
    const isDomRestricted = D !== "*" && D !== "?";
    const isDowRestricted = dow !== "*" && dow !== "?";

    if (isDomRestricted && isDowRestricted)
      return this._checkDayOfMonth(t, D) || this._checkDayOfWeek(t, dow);
    if (isDomRestricted) return this._checkDayOfMonth(t, D);
    if (isDowRestricted) return this._checkDayOfWeek(t, dow);
    return true;
  }

  // --- HATALI KISIM DÜZELTİLDİ ---
  // 'require' çağrıları kaldırıldı, fonksiyonlar artık dosyanın en üstündeki import'tan geliyor.
  private _checkDayOfMonth(t: Date, expr: string): boolean {
    if (expr.toUpperCase() === "L")
      return getDate(t) === getDate(lastDayOfMonth(t));
    try {
      return this._expandPart(expr, 1, 31).includes(getDate(t));
    } catch {
      return false;
    }
  }

  private _checkDayOfWeek(t: Date, expr: string): boolean {
    const lastDayMatch = expr.match(/^(\d)L$/i);
    if (lastDayMatch) {
      const day = parseInt(lastDayMatch[1], 10) % 7;
      const ldom = lastDayOfMonth(t);
      return getDay(t) === day && getDate(t) > getDate(ldom) - 7;
    }
    const nthDayMatch = expr.match(/^(\d)#(\d)$/);
    if (nthDayMatch) {
      const day = parseInt(nthDayMatch[1], 10) % 7;
      const nth = parseInt(nthDayMatch[2], 10);
      return getDay(t) === day && Math.floor((getDate(t) - 1) / 7) + 1 === nth;
    }
    try {
      const dowNorm = expr.replace("7", "0");
      return this._expandPart(dowNorm, 0, 6).includes(getDay(t));
    } catch {
      return false;
    }
  }
  // --- DÜZELTME SONU ---

  // Helper function to get ISO week number (1-53)
  private _getISOWeek(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    // Perşembe haftanın yılını belirler
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return weekNo;
  }

  private _isWeekOfYearMatch(
    date: Date,
    expSchedule: ExpandedSchedule
  ): boolean {
    // If no restriction on week of year, match anything
    if (expSchedule.weekOfYear === "*") {
      return true;
    }

    const weekNum = this._getISOWeek(date);
    return expSchedule.weeksOfYear.includes(weekNum);
  }

  private _findNextValue(slice: number[], current: number): [number, boolean] {
    for (const val of slice) {
      if (val >= current) return [val, false];
    }
    return [slice[0], true];
  }
}
