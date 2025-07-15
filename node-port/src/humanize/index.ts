// src/humanize/index.ts
// Main humanize API - cronstrue-like functionality with jcron extensions

import { Engine } from "../engine.js";
import { Schedule, fromCronSyntax } from "../schedule.js";
import { Formatters } from "./formatters.js";
import { enLocale } from "./locales/en.js";
import { frLocale } from "./locales/fr.js";
import { trLocale } from "./locales/tr.js";
import { esLocale } from "./locales/es.js";
import { deLocale } from "./locales/de.js";
import { plLocale } from "./locales/pl.js";
import { ptLocale } from "./locales/pt.js";
import { itLocale } from "./locales/it.js";
import { czLocale } from "./locales/cz.js";
import { nlLocale } from "./locales/nl.js";
import { ExpressionParser, ParsedExpression } from "./parser.js";
import { HumanizeOptions, HumanizeResult, LocaleStrings } from "./types.js";

// Locale registry with all supported languages
const locales: Map<string, LocaleStrings> = new Map();
locales.set("en", enLocale);
locales.set("fr", frLocale);
locales.set("tr", trLocale);
locales.set("es", esLocale);
locales.set("de", deLocale);
locales.set("pl", plLocale);
locales.set("pt", ptLocale);
locales.set("it", itLocale);
locales.set("cz", czLocale);
locales.set("cs", czLocale); // Czech alias
locales.set("nl", nlLocale);

/**
 * Detect browser/system locale automatically
 */
function detectLocale(): string {
  if (typeof navigator !== "undefined" && (navigator as any).language) {
    const browserLang = ((navigator as any).language as string).toLowerCase();
    
    // Direct matches
    if (locales.has(browserLang)) {
      return browserLang;
    }
    
    // Language code only (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0];
    if (locales.has(langCode)) {
      return langCode;
    }
    
    // Special mappings
    const langMap: Record<string, string> = {
      'cs': 'cz', // Czech
      'cs-cz': 'cz',
      'pt-br': 'pt', // Brazilian Portuguese
      'pt-pt': 'pt', // European Portuguese
      'es-es': 'es', // European Spanish
      'es-mx': 'es', // Mexican Spanish
      'fr-fr': 'fr', // French
      'fr-ca': 'fr', // Canadian French
      'de-de': 'de', // German
      'de-at': 'de', // Austrian German
      'de-ch': 'de', // Swiss German
      'it-it': 'it', // Italian
      'nl-nl': 'nl', // Dutch
      'nl-be': 'nl', // Belgian Dutch
      'pl-pl': 'pl', // Polish
      'tr-tr': 'tr', // Turkish
    };
    
    if (langMap[browserLang] && locales.has(langMap[browserLang])) {
      return langMap[browserLang];
    }
  }
  
  // Node.js environment
  if (typeof process !== "undefined" && process.env) {
    const envLang = (process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '').toLowerCase();
    const langCode = envLang.split('_')[0].split('.')[0];
    if (locales.has(langCode)) {
      return langCode;
    }
  }
  
  return "en"; // Default fallback
}

// Default options with auto-detected locale
const defaultOptions: Required<HumanizeOptions> = {
  locale: detectLocale(),
  use24HourTime: false,
  dayFormat: "long",
  monthFormat: "long",
  caseStyle: "lower",
  verbose: false,
  includeTimezone: true,
  includeYear: true,
  includeWeekOfYear: true,
  includeSeconds: false,
  useOrdinals: true,
  customFormats: {},
  maxLength: 0,
  showRanges: true,
  showLists: true,
  showSteps: true,
};

class HumanizerClass {
  private static engine = new Engine();

  /**
   * Register a new locale for humanization
   */
  static registerLocale(locale: string, strings: LocaleStrings): void {
    locales.set(locale, strings);
  }

  /**
   * Get list of supported locales
   */
  static getSupportedLocales(): string[] {
    return Array.from(locales.keys()).sort();
  }

  /**
   * Check if a locale is supported
   */
  static isLocaleSupported(locale: string): boolean {
    return locales.has(locale);
  }

  /**
   * Get the current detected locale
   */
  static getDetectedLocale(): string {
    return detectLocale();
  }

  /**
   * Set default locale for future operations
   */
  static setDefaultLocale(locale: string): void {
    if (locales.has(locale)) {
      defaultOptions.locale = locale;
    } else {
      throw new Error(`Unsupported locale: ${locale}. Supported locales: ${this.getSupportedLocales().join(', ')}`);
    }
  }

  /**
   * Humanize a cron expression string
   */
  static toString(
    cronExpression: string,
    options: Partial<HumanizeOptions> = {}
  ): string {
    // Input validation and sanitization
    if (cronExpression == null || cronExpression === "") {
      return "Invalid cron expression";
    }

    // Normalize whitespace
    const normalizedExpression = cronExpression
      .toString()
      .trim()
      .replace(/\s+/g, " ");

    const result = this.toResult(normalizedExpression, options);
    return result.description;
  }

  /**
   * Humanize a Schedule object
   */
  static fromSchedule(
    schedule: Schedule,
    options: Partial<HumanizeOptions> = {}
  ): string {
    // Input validation
    if (schedule == null) {
      return "Invalid schedule object";
    }

    const result = this.scheduleToResult(schedule, options);
    return result.description;
  }

  /**
   * Get detailed humanization result for a cron expression
   */
  static toResult(
    cronExpression: string,
    options: Partial<HumanizeOptions> = {}
  ): HumanizeResult {
    try {
      // Input validation
      if (cronExpression == null || cronExpression === "") {
        return {
          description: "Invalid cron expression",
          pattern: "custom",
          frequency: { type: "custom", interval: 1, description: "custom" },
          components: {},
          originalExpression: cronExpression || "",
          warnings: ["Empty or null cron expression"],
        };
      }

      // Normalize and validate field count
      const normalizedExpression = cronExpression
        .toString()
        .trim()
        .replace(/\s+/g, " ");
      const fields = normalizedExpression.split(" ");

      if (fields.length < 5 || fields.length > 7) {
        return {
          description: "Invalid cron expression",
          pattern: "custom",
          frequency: { type: "custom", interval: 1, description: "custom" },
          components: {},
          originalExpression: normalizedExpression,
          warnings: [
            `Invalid number of fields: ${fields.length}. Expected 5-7 fields.`,
          ],
        };
      }

      const schedule = fromCronSyntax(normalizedExpression);
      return this.scheduleToResult(schedule, options, normalizedExpression);
    } catch (error) {
      return {
        description: "Invalid cron expression",
        pattern: "custom",
        frequency: { type: "custom", interval: 1, description: "custom" },
        components: {},
        originalExpression: cronExpression || "",
        warnings: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get detailed humanization result for a Schedule object
   */
  static scheduleToResult(
    schedule: Schedule,
    options: Partial<HumanizeOptions> = {},
    originalExpression?: string
  ): HumanizeResult {
    try {
      const opts = { ...defaultOptions, ...options };
      const locale = locales.get(opts.locale) || enLocale;

      const parsed = ExpressionParser.parseExpression(schedule);
      const pattern = this.detectPattern(parsed);
      const frequency = Formatters.formatFrequency(parsed, locale);

      const description = this.buildDescription(parsed, opts, locale);
      const styledDescription = this.applyCaseStyle(
        description,
        opts.caseStyle
      );

      return {
        description: this.applyMaxLength(styledDescription, opts.maxLength),
        pattern,
        frequency,
        components: this.buildComponents(parsed),
        originalExpression:
          originalExpression || this.scheduleToString(schedule),
        warnings: this.detectWarnings(parsed, locale),
      };
    } catch (error) {
      return {
        description: "Invalid cron expression",
        pattern: "custom",
        frequency: { type: "custom", interval: 1, description: "custom" },
        components: {},
        originalExpression:
          originalExpression || this.scheduleToString(schedule),
        warnings: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private static buildDescription(
    parsed: ParsedExpression,
    options: Required<HumanizeOptions>,
    locale: LocaleStrings
  ): string {
    const parts: string[] = [];

    // Check for step patterns first
    const hasStepPattern = this.hasStepPattern(parsed);
    if (hasStepPattern) {
      return this.buildStepDescription(parsed, options, locale);
    }

    // Time component with "at" prefix
    const timeStr = Formatters.formatTime(
      parsed.hours,
      parsed.minutes,
      parsed.seconds,
      options,
      locale
    );
    if (timeStr) {
      // For special times (midnight, noon) or with "at" prefix
      if (timeStr === locale.midnight || timeStr === locale.noon) {
        parts.push(`${locale.at} ${timeStr}`);
      } else {
        parts.push(`${locale.at} ${timeStr}`);
      }
    }

    // Add "every day" for simple daily patterns
    if (
      parsed.daysOfWeek[0] === "*" &&
      parsed.daysOfMonth[0] === "*" &&
      parsed.months[0] === "*"
    ) {
      parts.push("every day");
    }

    // Day of month component
    const domStr = Formatters.formatDayOfMonth(
      parsed.daysOfMonth,
      options,
      locale
    );
    if (domStr && parsed.daysOfMonth[0] !== "*") {
      parts.push(`${locale.on} ${domStr}`);
    }

    // Day of week component
    const dowStr = Formatters.formatDayOfWeek(
      parsed.daysOfWeek,
      options,
      locale
    );
    if (dowStr && parsed.daysOfWeek[0] !== "*") {
      parts.push(`${locale.on} ${dowStr}`);
    }

    // Month component
    const monthStr = Formatters.formatMonth(parsed.months, options, locale);
    if (monthStr && parsed.months[0] !== "*") {
      parts.push(`${locale.in} ${monthStr}`);
    }

    // Week of year component
    if (
      options.includeWeekOfYear &&
      parsed.weekOfYear &&
      parsed.weekOfYear[0] !== "*"
    ) {
      const woyStr = Formatters.formatWeekOfYear(parsed.weekOfYear, locale);
      if (woyStr) {
        parts.push(woyStr); // No "in" prefix since formatWeekOfYear already includes "week"
      }
    }

    // Year component
    if (options.includeYear && parsed.years && parsed.years[0] !== "*") {
      const yearStr = Formatters.formatYear(parsed.years, locale);
      if (yearStr) {
        parts.push(`${locale.in} ${yearStr}`);
      }
    }

    // Timezone component - proper format
    if (
      options.includeTimezone &&
      parsed.timezone &&
      parsed.timezone !== "UTC"
    ) {
      parts.push(`${locale.in} ${parsed.timezone}`);
    }

    return parts.join(", ");
  }

  private static detectPattern(
    parsed: ParsedExpression
  ): "daily" | "weekly" | "monthly" | "yearly" | "custom" | "complex" {
    // Check for standard patterns
    if (parsed.daysOfWeek[0] !== "*" && parsed.daysOfMonth[0] === "*") {
      return "weekly";
    }
    if (parsed.daysOfMonth[0] !== "*" && parsed.daysOfWeek[0] === "*") {
      if (parsed.months[0] !== "*") {
        return "yearly"; // specific day in specific month
      }
      return "monthly";
    }
    if (parsed.months[0] !== "*") {
      return "yearly";
    }
    if (parsed.daysOfWeek[0] === "*" && parsed.daysOfMonth[0] === "*") {
      return "daily";
    }
    return "custom";
  }

  private static buildComponents(parsed: ParsedExpression): any {
    return {
      seconds: parsed.seconds[0] !== "*" ? parsed.seconds.join(",") : undefined,
      minutes: parsed.minutes[0] !== "*" ? parsed.minutes.join(",") : undefined,
      hours: parsed.hours[0] !== "*" ? parsed.hours.join(",") : undefined,
      dayOfMonth:
        parsed.daysOfMonth[0] !== "*"
          ? parsed.daysOfMonth.join(",")
          : undefined,
      month: parsed.months[0] !== "*" ? parsed.months.join(",") : undefined,
      dayOfWeek:
        parsed.daysOfWeek[0] !== "*" ? parsed.daysOfWeek.join(",") : undefined,
      year:
        parsed.years && parsed.years[0] !== "*"
          ? parsed.years.join(",")
          : undefined,
      weekOfYear:
        parsed.weekOfYear && parsed.weekOfYear[0] !== "*"
          ? parsed.weekOfYear.join(",")
          : undefined,
      timezone: parsed.timezone,
    };
  }

  private static detectWarnings(
    parsed: ParsedExpression,
    locale: LocaleStrings
  ): string[] {
    const warnings: string[] = [];

    // Check for impossible dates
    if (
      parsed.daysOfMonth.some((d) => parseInt(d) > 29) &&
      parsed.months.includes("2")
    ) {
      warnings.push("Day 30+ does not exist in February");
    }

    if (parsed.daysOfMonth.includes("29") && parsed.months.includes("2")) {
      warnings.push("February 29th only exists in leap years");
    }

    // Check for OR logic (both day of month and day of week specified)
    if (parsed.daysOfMonth[0] !== "*" && parsed.daysOfWeek[0] !== "*") {
      warnings.push("Uses OR logic");
    }

    // Check for potentially inefficient patterns
    if (
      parsed.rawFields.minutes.includes(",") &&
      parsed.rawFields.minutes.split(",").length > 10
    ) {
      warnings.push("Very frequent execution pattern (many minute values)");
    }

    // Check for impossible day-month combinations
    const monthsWith30Days = ["4", "6", "9", "11"]; // April, June, September, November
    if (
      parsed.daysOfMonth.includes("31") &&
      parsed.months.some((m) => monthsWith30Days.includes(m))
    ) {
      warnings.push(
        "Day 31 does not exist in April, June, September, or November"
      );
    }

    // Check for division by zero in step patterns
    if (
      parsed.rawFields.minutes.includes("/0") ||
      parsed.rawFields.hours.includes("/0") ||
      parsed.rawFields.daysOfMonth.includes("/0") ||
      parsed.rawFields.months.includes("/0") ||
      parsed.rawFields.daysOfWeek.includes("/0")
    ) {
      warnings.push("Division by zero in step pattern");
    }

    // Check for very frequent execution
    if (
      parsed.rawFields.minutes.startsWith("*/") &&
      parseInt(parsed.rawFields.minutes.split("/")[1]) <= 1
    ) {
      warnings.push("Very frequent execution (every minute or less)");
    }

    // Check for overlapping ranges
    if (
      parsed.rawFields.hours.includes("-") &&
      parsed.rawFields.hours.includes(",")
    ) {
      warnings.push("Complex hour pattern with both ranges and lists");
    }

    return warnings;
  }

  private static scheduleToString(schedule: Schedule): string {
    return `${schedule.s} ${schedule.m} ${schedule.h} ${schedule.D} ${schedule.M} ${schedule.dow}`;
  }

  private static applyMaxLength(
    description: string,
    maxLength: number
  ): string {
    if (maxLength > 0 && description.length > maxLength) {
      // Reserve 3 characters for "..."
      const truncateAt = Math.max(0, maxLength - 3);
      return description.substring(0, truncateAt) + "...";
    }
    return description;
  }

  private static applyCaseStyle(
    description: string,
    caseStyle: "lower" | "title" | "upper"
  ): string {
    switch (caseStyle) {
      case "title":
        return description
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      case "upper":
        return description.toUpperCase();
      case "lower":
      default:
        return description;
    }
  }

  private static hasStepPattern(parsed: ParsedExpression): boolean {
    return (
      parsed.rawFields.minutes.includes("/") ||
      parsed.rawFields.hours.includes("/") ||
      parsed.rawFields.daysOfWeek.includes("/") ||
      parsed.rawFields.daysOfMonth.includes("/") ||
      parsed.rawFields.months.includes("/")
    );
  }

  private static buildStepDescription(
    parsed: ParsedExpression,
    options: Required<HumanizeOptions>,
    locale: LocaleStrings
  ): string {
    // Handle minute steps (*/15)
    if (parsed.rawFields.minutes.includes("/")) {
      const stepPattern = parsed.rawFields.minutes;
      if (stepPattern.startsWith("*")) {
        const [, step] = stepPattern.split("/");
        return `every ${step} minutes`;
      }
    }

    // Handle hour steps
    if (parsed.rawFields.hours.includes("/")) {
      const stepPattern = parsed.rawFields.hours;
      if (stepPattern.startsWith("*")) {
        const [, step] = stepPattern.split("/");
        return `every ${step} hours`;
      } else if (stepPattern.includes("-")) {
        // Handle range-based steps like 9-17/2
        const [range, step] = stepPattern.split("/");
        const [start, end] = range.split("-");
        const timeStrs = [];
        for (let h = parseInt(start); h <= parseInt(end); h += parseInt(step)) {
          const timeStr = Formatters.formatTime(
            [h.toString()],
            ["0"],
            ["0"],
            options,
            locale
          );
          timeStrs.push(timeStr);
        }
        return `${locale.at} ${Formatters.formatList(
          timeStrs,
          locale
        )}, every day`;
      }
    }

    return "every day"; // fallback
  }
}

// Export convenience functions
export const toString = HumanizerClass.toString.bind(HumanizerClass);
export const toResult = HumanizerClass.toResult.bind(HumanizerClass);
export const fromSchedule = HumanizerClass.fromSchedule.bind(HumanizerClass);
export const registerLocale = HumanizerClass.registerLocale.bind(HumanizerClass);
export const getSupportedLocales = HumanizerClass.getSupportedLocales.bind(HumanizerClass);
export const isLocaleSupported = HumanizerClass.isLocaleSupported.bind(HumanizerClass);
export const getDetectedLocale = HumanizerClass.getDetectedLocale.bind(HumanizerClass);
export const setDefaultLocale = HumanizerClass.setDefaultLocale.bind(HumanizerClass);

// Export locale utilities
export * from "./locales/index.js";

// Export types
export type { HumanizeOptions, HumanizeResult, LocaleStrings } from "./types.js";

// Default export
export default HumanizerClass;
