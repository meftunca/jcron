// src/humanize/formatters.ts
// Formatting utilities for different components

import { HumanizeOptions, LocaleStrings } from "./types";

export class Formatters {
  static formatTime(
    hours: string[],
    minutes: string[],
    seconds: string[],
    options: HumanizeOptions,
    locale: LocaleStrings
  ): string {
    // Input validation
    if (!hours || !minutes || hours.length === 0 || minutes.length === 0) {
      return "";
    }

    if (
      hours.length === 1 &&
      minutes.length === 1 &&
      hours[0] !== "*" &&
      minutes[0] !== "*"
    ) {
      const hour = parseInt(hours[0], 10);
      const minute = parseInt(minutes[0], 10);
      const second =
        seconds && seconds.length === 1 ? parseInt(seconds[0], 10) : 0;

      // Validate ranges
      if (isNaN(hour) || hour < 0 || hour > 23) return "Invalid hour";
      if (isNaN(minute) || minute < 0 || minute > 59) return "Invalid minute";
      if (isNaN(second) || second < 0 || second > 59) return "Invalid second";

      if (options.use24HourTime) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        if (options.includeSeconds && second > 0) {
          return `${timeStr}:${second.toString().padStart(2, "0")}`;
        }
        return timeStr;
      } else {
        // Special cases for midnight and noon only when it's a single time
        if (hour === 0 && minute === 0 && second === 0) return locale.midnight;
        if (hour === 12 && minute === 0 && second === 0) return locale.noon;

        // 12-hour format
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        let timeStr = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;

        if (options.includeSeconds && second > 0) {
          timeStr = `${hour12}:${minute.toString().padStart(2, "0")}:${second
            .toString()
            .padStart(2, "0")} ${ampm}`;
        }

        return timeStr;
      }
    }

    // Multiple times - use regular format, not special names
    const times: string[] = [];
    for (const hour of hours) {
      for (const minute of minutes) {
        if (hour !== "*" && minute !== "*") {
          const h = parseInt(hour, 10);
          const m = parseInt(minute, 10);
          const s = seconds.length === 1 ? parseInt(seconds[0], 10) : 0;

          // Don't use special names for multiple times
          const ampm = h >= 12 ? "PM" : "AM";
          const hour12 = h % 12 === 0 ? 12 : h % 12;
          let timeStr = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;

          if (options.includeSeconds && s > 0) {
            timeStr = `${hour12}:${m.toString().padStart(2, "0")}:${s
              .toString()
              .padStart(2, "0")} ${ampm}`;
          }

          times.push(timeStr);
        }
      }
    }

    return this.formatList(times, locale);
  }

  static formatDayOfWeek(
    daysOfWeek: string[],
    options: HumanizeOptions,
    locale: LocaleStrings
  ): string {
    if (daysOfWeek[0] === "*") {
      return "";
    }

    const dayNames = this.getDayNames(options.dayFormat || "long", locale);
    const formattedDays: string[] = [];

    for (const day of daysOfWeek) {
      if (day.includes("L")) {
        const dayNum = parseInt(day.replace("L", ""), 10);
        if (dayNames[dayNum]) {
          formattedDays.push(`${locale.last} ${dayNames[dayNum]}`);
        }
      } else if (day.includes("#")) {
        const [dayNum, occurrence] = day.split("#").map(Number);
        const ordinal = this.getOrdinal(occurrence, locale);
        if (dayNames[dayNum]) {
          formattedDays.push(`${ordinal} ${dayNames[dayNum]}`);
        }
      } else {
        const dayNum = parseInt(day, 10);
        if (dayNames[dayNum]) {
          formattedDays.push(dayNames[dayNum]);
        }
      }
    }

    return this.formatList(formattedDays, locale);
  }

  static formatDayOfMonth(
    daysOfMonth: string[],
    options: HumanizeOptions,
    locale: LocaleStrings
  ): string {
    if (daysOfMonth[0] === "*") {
      return "";
    }

    const formattedDays: string[] = [];

    for (const day of daysOfMonth) {
      if (day === "L") {
        formattedDays.push("last day of the month");
      } else {
        const dayNum = parseInt(day, 10);
        if (!isNaN(dayNum)) {
          formattedDays.push(this.getOrdinal(dayNum, locale));
        }
      }
    }

    return this.formatList(formattedDays, locale);
  }

  static formatMonth(
    months: string[],
    options: HumanizeOptions,
    locale: LocaleStrings
  ): string {
    if (months[0] === "*") {
      return "";
    }

    const monthNames = this.getMonthNames(
      options.monthFormat || "long",
      locale
    );
    const formattedMonths: string[] = [];

    for (const month of months) {
      const monthNum = parseInt(month, 10);
      if (monthNames[monthNum - 1]) {
        formattedMonths.push(monthNames[monthNum - 1]);
      }
    }

    return this.formatList(formattedMonths, locale);
  }

  static formatYear(years: string[], locale: LocaleStrings): string {
    if (years[0] === "*") {
      return "";
    }
    return this.formatList(years, locale);
  }

  static formatWeekOfYear(weekOfYear: string[], locale: LocaleStrings): string {
    if (!weekOfYear || weekOfYear[0] === "*") {
      return "";
    }

    if (weekOfYear.length === 1) {
      return `${locale.week} ${weekOfYear[0]}`;
    }

    return `${locale.weeks} ${this.formatList(weekOfYear, locale)}`;
  }

  // Helper methods
  static getDayNames(
    format: "long" | "short" | "narrow",
    locale: LocaleStrings
  ): string[] {
    switch (format) {
      case "short":
        return locale.daysShort;
      case "narrow":
        return locale.daysNarrow;
      default:
        return locale.daysLong;
    }
  }

  static getMonthNames(
    format: "long" | "short" | "narrow" | "numeric",
    locale: LocaleStrings
  ): string[] {
    switch (format) {
      case "short":
        return locale.monthsShort;
      case "narrow":
        return locale.monthsNarrow;
      case "numeric":
        return Array.from({ length: 12 }, (_, i) => (i + 1).toString());
      default:
        return locale.monthsLong;
    }
  }

  static getOrdinal(num: number, locale: LocaleStrings): string {
    if (num >= 1 && num <= locale.ordinals.length) {
      return locale.ordinals[num - 1];
    }
    return num.toString();
  }

  static formatList(items: string[], locale: LocaleStrings): string {
    // Input validation
    if (!items || items.length === 0) return "";

    // Filter out invalid items
    const validItems = items.filter((item) => item != null && item !== "");

    if (validItems.length === 0) return "";
    if (validItems.length === 1) return validItems[0];
    if (validItems.length === 2)
      return `${validItems[0]} ${locale.and} ${validItems[1]}`;

    const lastItem = validItems.pop();
    return `${validItems.join(", ")}, ${locale.and} ${lastItem}`;
  }

  static formatFrequency(parsed: any, locale: LocaleStrings): any {
    // Check for step patterns using raw fields
    if (parsed.rawFields && parsed.rawFields.minutes.includes("/")) {
      const stepPattern = parsed.rawFields.minutes;
      if (stepPattern.startsWith("*")) {
        const [, step] = stepPattern.split("/");
        return {
          type: "minutes",
          interval: parseInt(step, 10),
          description: `every ${step} minutes`,
        };
      }
    }

    if (parsed.rawFields && parsed.rawFields.hours.includes("/")) {
      const stepPattern = parsed.rawFields.hours;
      if (stepPattern.startsWith("*")) {
        const [, step] = stepPattern.split("/");
        return {
          type: "hours",
          interval: parseInt(step, 10),
          description: `every ${step} hours`,
        };
      }
    }

    // Check for daily patterns
    if (
      parsed.daysOfWeek[0] === "*" &&
      parsed.daysOfMonth[0] === "*" &&
      parsed.months[0] === "*"
    ) {
      return {
        type: "daily",
        interval: 1,
        description: "daily",
      };
    }

    // Check for weekly patterns
    if (parsed.daysOfWeek[0] !== "*" && parsed.daysOfMonth[0] === "*") {
      return {
        type: "weekly",
        interval: 1,
        description: "weekly",
      };
    }

    return {
      type: "custom",
      interval: 1,
      description: "custom pattern",
    };
  }
}
