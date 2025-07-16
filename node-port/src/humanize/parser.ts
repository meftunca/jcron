// src/humanize/parser.ts
// Core parsing logic for cron expressions

import { Schedule } from "../schedule";

export interface ParsedExpression {
  seconds: string[];
  minutes: string[];
  hours: string[];
  daysOfMonth: string[];
  months: string[];
  daysOfWeek: string[];
  years: string[];
  weekOfYear: string[];
  timezone?: string;
  hasSpecialChars: boolean;
  hasRanges: boolean;
  hasSteps: boolean;
  hasLists: boolean;
  // Raw field values for pattern detection
  rawFields: {
    seconds: string;
    minutes: string;
    hours: string;
    daysOfMonth: string;
    months: string;
    daysOfWeek: string;
    years: string;
    weekOfYear: string;
  };
}

export class ExpressionParser {
  static parseField(field: string, min: number, max: number): string[] {
    if (!field || field === "*" || field === "?") {
      return ["*"];
    }

    const values: number[] = [];
    const parts = field.split(",");

    for (const part of parts) {
      if (part.includes("/")) {
        // Step values (e.g., */5, 10-20/2)
        const [range, step] = part.split("/");
        const stepNum = parseInt(step, 10);

        // Validate step
        if (isNaN(stepNum) || stepNum <= 0) {
          throw new Error(`Division by zero in step pattern`);
        }

        if (range === "*") {
          for (let i = min; i <= max; i += stepNum) {
            values.push(i);
          }
        } else if (range.includes("-")) {
          const [start, end] = range.split("-").map((n) => parseInt(n, 10));
          if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
            throw new Error(`Invalid range: ${range}`);
          }
          for (let i = start; i <= end; i += stepNum) {
            values.push(i);
          }
        } else {
          const start = parseInt(range, 10);
          if (isNaN(start) || start < min || start > max) {
            throw new Error(`Invalid value: ${range}`);
          }
          for (let i = start; i <= max; i += stepNum) {
            values.push(i);
          }
        }
      } else if (part.includes("-")) {
        // Range values (e.g., 1-5)
        const [start, end] = part.split("-").map((n) => parseInt(n, 10));
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
          throw new Error(`Invalid range: ${part}`);
        }
        for (let i = start; i <= end; i++) {
          values.push(i);
        }
      } else if (part.includes("L")) {
        // Last day patterns
        return [part]; // Keep as string for special handling
      } else if (part.includes("#")) {
        // Nth occurrence patterns
        const [dayOfWeekStr, nthStr] = part.split("#");
        const dayOfWeek = parseInt(dayOfWeekStr, 10);
        const nth = parseInt(nthStr, 10);
        
        // Validate # patterns
        if (isNaN(dayOfWeek) || isNaN(nth) || dayOfWeek < 0 || dayOfWeek > 6 || nth < 1 || nth > 5) {
          throw new Error(`Invalid # pattern: ${part}`);
        }
        
        return [part]; // Keep as string for special handling
      } else {
        // Single value
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          if (num < min || num > max) {
            throw new Error(`Value ${num} out of range [${min}-${max}]`);
          }
          values.push(num);
        } else {
          return [part]; // Keep as string (e.g., month/day names)
        }
      }
    }

    return Array.from(new Set(values))
      .sort((a, b) => a - b)
      .map(String);
  }

  static parseExpression(schedule: Schedule | any): ParsedExpression {
    // Ensure we have proper field values, handling null, undefined, and empty strings
    const getField = (primary: any, fallback: string): string => {
      if (primary === null || primary === undefined || primary === '') {
        return fallback;
      }
      return String(primary);
    };

    const seconds = this.parseField(getField(schedule.s ?? schedule.seconds, "0"), 0, 59);
    const minutes = this.parseField(getField(schedule.m ?? schedule.minutes, "*"), 0, 59);
    const hours = this.parseField(getField(schedule.h ?? schedule.hours, "*"), 0, 23);
    const daysOfMonth = this.parseField(getField(schedule.D ?? schedule.dayOfMonth, "*"), 1, 31);
    const months = this.parseField(getField(schedule.M ?? schedule.month, "*"), 1, 12);
    const daysOfWeek = this.parseField(getField(schedule.dow ?? schedule.dayOfWeek, "*"), 0, 6);
    const years = this.parseField(getField(schedule.Y ?? schedule.year, "*"), 1970, 3000);
    const weekOfYear = this.parseField(getField(schedule.woy ?? schedule.weekOfYear, "*"), 1, 53);

    // Check for special characters
    const checkSpecialChars = (field: any): boolean => {
      const str = getField(field, "*");
      return Boolean(str && (str.includes("L") || str.includes("#")));
    };

    const checkPattern = (field: any, pattern: string): boolean => {
      const str = getField(field, "*");
      return Boolean(str && str.includes(pattern));
    };

    const hasSpecialChars = checkSpecialChars(schedule.D ?? schedule.dayOfMonth) || 
                           checkSpecialChars(schedule.dow ?? schedule.dayOfWeek);

    const hasRanges = [
      schedule.s ?? schedule.seconds,
      schedule.m ?? schedule.minutes,
      schedule.h ?? schedule.hours,
      schedule.D ?? schedule.dayOfMonth,
      schedule.M ?? schedule.month,
      schedule.dow ?? schedule.dayOfWeek,
      schedule.Y ?? schedule.year,
      schedule.woy ?? schedule.weekOfYear,
    ].some((field) => checkPattern(field, "-"));

    const hasSteps = [
      schedule.s ?? schedule.seconds,
      schedule.m ?? schedule.minutes,
      schedule.h ?? schedule.hours,
      schedule.D ?? schedule.dayOfMonth,
      schedule.M ?? schedule.month,
      schedule.dow ?? schedule.dayOfWeek,
      schedule.Y ?? schedule.year,
      schedule.woy ?? schedule.weekOfYear,
    ].some((field) => checkPattern(field, "/"));

    const hasLists = [
      schedule.s ?? schedule.seconds,
      schedule.m ?? schedule.minutes,
      schedule.h ?? schedule.hours,
      schedule.D ?? schedule.dayOfMonth,
      schedule.M ?? schedule.month,
      schedule.dow ?? schedule.dayOfWeek,
      schedule.Y ?? schedule.year,
      schedule.woy ?? schedule.weekOfYear,
    ].some((field) => checkPattern(field, ","));

    return {
      seconds,
      minutes,
      hours,
      daysOfMonth,
      months,
      daysOfWeek,
      years,
      weekOfYear,
      timezone: schedule.tz ?? schedule.timezone ?? undefined,
      hasSpecialChars,
      hasRanges,
      hasSteps,
      hasLists,
      rawFields: {
        seconds: getField(schedule.s ?? schedule.seconds, "0"),
        minutes: getField(schedule.m ?? schedule.minutes, "*"),
        hours: getField(schedule.h ?? schedule.hours, "*"),
        daysOfMonth: getField(schedule.D ?? schedule.dayOfMonth, "*"),
        months: getField(schedule.M ?? schedule.month, "*"),
        daysOfWeek: getField(schedule.dow ?? schedule.dayOfWeek, "*"),
        years: getField(schedule.Y ?? schedule.year, "*"),
        weekOfYear: getField(schedule.woy ?? schedule.weekOfYear, "*"),
      },
    };
  }

  static convertTextualNames(field: string): string {
    if (!field) return field;

    const monthNames: Record<string, string> = {
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

    const dayNames: Record<string, string> = {
      SUN: "0",
      MON: "1",
      TUE: "2",
      WED: "3",
      THU: "4",
      FRI: "5",
      SAT: "6",
    };

    let result = field.toUpperCase();

    // Replace month names
    for (const [name, num] of Object.entries(monthNames)) {
      result = result.replace(new RegExp(name, "g"), num);
    }

    // Replace day names
    for (const [name, num] of Object.entries(dayNames)) {
      result = result.replace(new RegExp(name, "g"), num);
    }

    return result;
  }
}
