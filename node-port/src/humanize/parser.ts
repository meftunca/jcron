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

        if (range === "*") {
          for (let i = min; i <= max; i += stepNum) {
            values.push(i);
          }
        } else if (range.includes("-")) {
          const [start, end] = range.split("-").map((n) => parseInt(n, 10));
          for (let i = start; i <= end; i += stepNum) {
            values.push(i);
          }
        } else {
          const start = parseInt(range, 10);
          for (let i = start; i <= max; i += stepNum) {
            values.push(i);
          }
        }
      } else if (part.includes("-")) {
        // Range values (e.g., 1-5)
        const [start, end] = part.split("-").map((n) => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          values.push(i);
        }
      } else if (part.includes("L")) {
        // Last day patterns
        return [part]; // Keep as string for special handling
      } else if (part.includes("#")) {
        // Nth occurrence patterns
        return [part]; // Keep as string for special handling
      } else {
        // Single value
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
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

  static parseExpression(schedule: Schedule): ParsedExpression {
    const seconds = this.parseField(schedule.s ?? "0", 0, 59);
    const minutes = this.parseField(schedule.m ?? "*", 0, 59);
    const hours = this.parseField(schedule.h ?? "*", 0, 23);
    const daysOfMonth = this.parseField(schedule.D ?? "*", 1, 31);
    const months = this.parseField(schedule.M ?? "*", 1, 12);
    const daysOfWeek = this.parseField(schedule.dow ?? "*", 0, 6);
    const years = this.parseField(schedule.Y ?? "*", 1970, 3000);
    const weekOfYear = this.parseField(schedule.woy ?? "*", 1, 53);

    const hasSpecialChars = [schedule.D, schedule.dow].some(
      (field) => field && (field.includes("L") || field.includes("#"))
    );

    const hasRanges = [
      schedule.s,
      schedule.m,
      schedule.h,
      schedule.D,
      schedule.M,
      schedule.dow,
      schedule.Y,
      schedule.woy,
    ].some((field) => field && field.includes("-"));

    const hasSteps = [
      schedule.s,
      schedule.m,
      schedule.h,
      schedule.D,
      schedule.M,
      schedule.dow,
      schedule.Y,
      schedule.woy,
    ].some((field) => field && field.includes("/"));

    const hasLists = [
      schedule.s,
      schedule.m,
      schedule.h,
      schedule.D,
      schedule.M,
      schedule.dow,
      schedule.Y,
      schedule.woy,
    ].some((field) => field && field.includes(","));

    return {
      seconds,
      minutes,
      hours,
      daysOfMonth,
      months,
      daysOfWeek,
      years,
      weekOfYear,
      timezone: schedule.tz ?? undefined,
      hasSpecialChars,
      hasRanges,
      hasSteps,
      hasLists,
      rawFields: {
        seconds: schedule.s ?? "0",
        minutes: schedule.m ?? "*",
        hours: schedule.h ?? "*",
        daysOfMonth: schedule.D ?? "*",
        months: schedule.M ?? "*",
        daysOfWeek: schedule.dow ?? "*",
        years: schedule.Y ?? "*",
        weekOfYear: schedule.woy ?? "*",
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
