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

      // Validate ranges - return Invalid if out of range
      if (isNaN(hour) || hour < 0 || hour > 23) return "Invalid hour";
      if (isNaN(minute) || minute < 0 || minute > 59) return "Invalid minute";
      if (isNaN(second) || second < 0 || second > 59) return "Invalid second";

      // 24-hour format validation
      if (options.use24HourTime) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        if (options.includeSeconds && second > 0) {
          return `${timeStr}:${second.toString().padStart(2, "0")}`;
        }
        return timeStr;
      } else {
        // Special cases for midnight and noon (single time only)
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

    // Multiple times - check if it's a simple range first
    const times: string[] = [];

    // 🚀 IMPROVEMENT: Detect range patterns to avoid verbose listing
    const isHourRange =
      hours.length > 3 &&
      hours.every(
        (h, i, arr) => i === 0 || parseInt(h) === parseInt(arr[i - 1]) + 1
      );
    const isMinuteStep =
      minutes.length > 3 && minutes.some((m) => m.includes("/"));

    // If it's a range with step (e.g., */15 9-17), use concise format
    if (isHourRange && isMinuteStep && times.length > 10) {
      const startHour = parseInt(hours[0]);
      const endHour = parseInt(hours[hours.length - 1]);
      const minuteStep = minutes.length === 1 ? minutes[0] : null;

      if (minuteStep && minuteStep.includes("/")) {
        const step = parseInt(minuteStep.split("/")[1]);
        const startTime = options.use24HourTime
          ? `${startHour.toString().padStart(2, "0")}:00`
          : `${startHour % 12 || 12}:00 ${startHour >= 12 ? "PM" : "AM"}`;
        const endTime = options.use24HourTime
          ? `${endHour.toString().padStart(2, "0")}:00`
          : `${endHour % 12 || 12}:00 ${endHour >= 12 ? "PM" : "AM"}`;

        return `${locale.every} ${step} ${locale.minutes}, ${locale.between} ${startTime} ${locale.and} ${endTime}`;
      }
    }

    for (const hour of hours) {
      for (const minute of minutes) {
        if (hour !== "*" && minute !== "*") {
          const h = parseInt(hour, 10);
          const m = parseInt(minute, 10);
          const s = seconds.length === 1 ? parseInt(seconds[0], 10) : 0;

          // Skip invalid values instead of showing them
          if (isNaN(h) || h < 0 || h > 23) continue;
          if (isNaN(m) || m < 0 || m > 59) continue;
          if (isNaN(s) || s < 0 || s > 59) continue;

          // 🚀 IMPROVEMENT: Limit verbose time listings to max 10 entries
          if (times.length >= 10) {
            times.push("...");
            break;
          }

          if (options.use24HourTime) {
            let timeStr = `${h.toString().padStart(2, "0")}:${m
              .toString()
              .padStart(2, "0")}`;
            if (options.includeSeconds && s > 0) {
              timeStr += `:${s.toString().padStart(2, "0")}`;
            }
            times.push(timeStr);
          } else {
            // Use special names for multiple times when appropriate
            let timeStr: string;
            if (h === 0 && m === 0 && s === 0) {
              timeStr = locale.midnight;
            } else if (h === 12 && m === 0 && s === 0) {
              timeStr = locale.noon;
            } else {
              const ampm = h >= 12 ? "PM" : "AM";
              const hour12 = h % 12 === 0 ? 12 : h % 12;
              timeStr = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;

              if (options.includeSeconds && s > 0) {
                timeStr = `${hour12}:${m.toString().padStart(2, "0")}:${s
                  .toString()
                  .padStart(2, "0")} ${ampm}`;
              }
            }
            times.push(timeStr);
          }
        }
      }
      if (times[times.length - 1] === "...") break;
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

    // 🚀 IMPROVEMENT: Detect weekdays (Mon-Fri) and weekends (Sat-Sun)
    const sortedDays = [...daysOfWeek]
      .map((d) => parseInt(d, 10))
      .filter((d) => !isNaN(d))
      .sort((a, b) => a - b);

    // Check for weekdays pattern (1,2,3,4,5)
    if (sortedDays.length === 5 && sortedDays.join(",") === "1,2,3,4,5") {
      return options.useShorthand !== false ? locale.weekdays : "";
    }

    // Check for weekend pattern (0,6 or 6,0)
    if (sortedDays.length === 2) {
      const daySet = new Set(sortedDays);
      if (
        (daySet.has(0) && daySet.has(6)) ||
        (daySet.has(6) && daySet.has(0))
      ) {
        return options.useShorthand !== false ? locale.weekends : "";
      }
    }

    const dayNames = this.getDayNames(options.dayFormat || "long", locale);
    const formattedDays: string[] = [];
    let hasNthPattern = false;

    for (const day of daysOfWeek) {
      if (day.includes("L")) {
        const dayNum = parseInt(day.replace("L", ""), 10);
        if (dayNames[dayNum]) {
          formattedDays.push(`${locale.last} ${dayNames[dayNum]}`);
          hasNthPattern = true;
        }
      } else if (day.includes("#")) {
        const [dayNum, occurrence] = day.split("#").map(Number);
        const ordinal = this.getOrdinal(occurrence, locale);
        if (dayNames[dayNum]) {
          // 🚀 IMPROVEMENT: Add clearer context for nth patterns
          formattedDays.push(`${ordinal} ${dayNames[dayNum]}`);
          hasNthPattern = true;
        }
      } else {
        const dayNum = parseInt(day, 10);
        if (dayNames[dayNum]) {
          formattedDays.push(dayNames[dayNum]);
        }
      }
    }

    const result = this.formatList(formattedDays, locale);

    // 🚀 IMPROVEMENT: Add "of the month" context for nth patterns
    if (hasNthPattern && result) {
      return `${result} ${locale.of} ${locale.theMonth}`;
    }

    return result;
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

  static formatEOD(
    eod: string | any,
    locale: LocaleStrings,
    scheduleDescription?: string
  ): string {
    if (!eod) {
      return scheduleDescription || "";
    }

    let eodString: string;

    // Handle EndOfDuration object
    if (typeof eod === "object" && eod.toString) {
      eodString = eod.toString();
    } else if (typeof eod === "string") {
      eodString = eod;
    } else {
      eodString = String(eod);
    }

    // Parse EOD format: E1W, E2D, S30M, E1DT12H30M, etc.
    const eodPattern =
      /^([SE])(\d+)([DWMQY])(?:T(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    const match = eodString.match(eodPattern);

    let eodDescription: string;

    if (match) {
      const [, refPoint, num, unit, hours, minutes, seconds] = match;
      const number = parseInt(num, 10);

      // Build duration description
      const parts: string[] = [];

      // Reference point description
      const isEndRef = refPoint === "E";

      // Main unit
      let unitDesc = "";
      switch (unit) {
        case "D":
          unitDesc = number === 1 ? locale.day : locale.days;
          break;
        case "W":
          unitDesc = number === 1 ? "week" : "weeks";
          break;
        case "M":
          unitDesc = number === 1 ? locale.month : locale.months;
          break;
        case "Q":
          unitDesc = number === 1 ? "quarter" : "quarters";
          break;
        case "Y":
          unitDesc = number === 1 ? locale.year : locale.years;
          break;
      }

      if (isEndRef) {
        if (number === 1) {
          parts.push(`end of current ${unitDesc}`);
        } else {
          parts.push(`end of ${number} ${unitDesc}`);
        }
      } else {
        parts.push(`${number} ${unitDesc} from start`);
      }

      // Add time components if present
      const timeComponents: string[] = [];
      if (hours) timeComponents.push(`${parseInt(hours, 10)} ${locale.hours}`);
      if (minutes)
        timeComponents.push(`${parseInt(minutes, 10)} ${locale.minutes}`);
      if (seconds) timeComponents.push(`${parseInt(seconds, 10)} seconds`);

      if (timeComponents.length > 0) {
        parts.push(`+ ${timeComponents.join(" ")}`);
      }

      eodDescription = `${locale.endOfDuration} ${parts.join(" ")}`;
    } else {
      // Fallback for complex or unparseable EOD
      eodDescription = `${locale.endOfDuration}: ${eodString}`;
    }

    if (scheduleDescription) {
      return `${scheduleDescription}, ${eodDescription}`;
    }

    return eodDescription;
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
    // Validate inputs
    if (!locale || !locale.ordinals || !Array.isArray(locale.ordinals)) {
      return num.toString();
    }

    if (num >= 1 && num <= locale.ordinals.length) {
      return locale.ordinals[num - 1];
    }

    // Fallback for numbers beyond ordinals array
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
        const stepNum = parseInt(step, 10);
        return {
          type: "minutes",
          interval: stepNum,
          description: stepNum === 1 ? "every minute" : `every ${step} minutes`,
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
        type: "weeks",
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
