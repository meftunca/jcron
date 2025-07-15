// src/humanize/index.ts
// Main humanize API - cronstrue-like functionality with jcron extensions

import { Engine } from "../engine";
import { Schedule, fromCronSyntax } from "../schedule";
import { Formatters } from "./formatters";
import { enLocale } from "./locales/en";
import { frLocale } from "./locales/fr";
import { trLocale } from "./locales/tr";
import { esLocale } from "./locales/es";
import { deLocale } from "./locales/de";
import { plLocale } from "./locales/pl";
import { ptLocale } from "./locales/pt";
import { itLocale } from "./locales/it";
import { czLocale } from "./locales/cz";
import { nlLocale } from "./locales/nl";
import { ExpressionParser, ParsedExpression } from "./parser";
import { HumanizeOptions, HumanizeResult, LocaleStrings } from "./types";

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
   * Users should convert cron syntax to Schedule using fromCronSyntax() first
   */
  static toString(
    cronExpression: string,
    options: Partial<HumanizeOptions> = {}
  ): string {
    try {
      const schedule = fromCronSyntax(cronExpression);
      return this.fromSchedule(schedule, options);
    } catch (error) {
      return "Invalid cron expression";
    }
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
   * Users should convert cron syntax to Schedule using fromCronSyntax() first
   */
  static toResult(
    cronExpression: string,
    options: Partial<HumanizeOptions> = {}
  ): HumanizeResult {
    try {
      const schedule = fromCronSyntax(cronExpression);
      return this.scheduleToResult(schedule, options, cronExpression);
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
    // Jcron özel formatları kontrolü
    if (this.isJcronSpecialFormat(parsed)) {
      return this.buildJcronDescription(parsed, options, locale);
    }

    // Step pattern kontrolü
    if (this.hasStepPattern(parsed)) {
      return this.buildStepDescription(parsed, options, locale);
    }

    // Normal cron format
    return this.buildStandardDescription(parsed, options, locale);
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
        const stepNum = parseInt(step, 10);
        if (stepNum === 1) return "every minute";
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

  private static isJcronSpecialFormat(parsed: ParsedExpression): boolean {
    // Week of Year var mı kontrol et
    return parsed.weekOfYear && parsed.weekOfYear[0] !== "*";
  }

  private static buildJcronDescription(
    parsed: ParsedExpression,
    options: Required<HumanizeOptions>,
    locale: LocaleStrings
  ): string {
    const parts: string[] = [];

    // Zaman bileşeni
    const timeStr = Formatters.formatTime(
      parsed.hours,
      parsed.minutes,
      parsed.seconds,
      options,
      locale
    );
    if (timeStr) {
      parts.push(`${locale.at} ${timeStr}`);
    }

    // Week of Year öncelikli
    if (options.includeWeekOfYear && parsed.weekOfYear && parsed.weekOfYear[0] !== "*") {
      const woyStr = Formatters.formatWeekOfYear(parsed.weekOfYear, locale);
      parts.push(woyStr);
    }

    // Day of week
    if (parsed.daysOfWeek[0] !== "*") {
      const dowStr = Formatters.formatDayOfWeek(parsed.daysOfWeek, options, locale);
      if (dowStr) parts.push(`${locale.on} ${dowStr}`);
    }

    // Month
    if (parsed.months[0] !== "*") {
      const monthStr = Formatters.formatMonth(parsed.months, options, locale);
      if (monthStr) parts.push(`${locale.in} ${monthStr}`);
    }

    // Year
    if (options.includeYear && parsed.years && parsed.years[0] !== "*") {
      const yearStr = Formatters.formatYear(parsed.years, locale);
      if (yearStr) parts.push(`${locale.in} ${yearStr}`);
    }

    // Timezone
    if (options.includeTimezone && parsed.timezone && parsed.timezone !== "UTC") {
      parts.push(`${locale.in} ${parsed.timezone}`);
    }

    return parts.filter(Boolean).join(", ");
  }

  private static buildStandardDescription(
    parsed: ParsedExpression,
    options: Required<HumanizeOptions>,
    locale: LocaleStrings
  ): string {
    const parts: string[] = [];

    // Validate fields first
    if (this.hasInvalidFields(parsed)) {
      return "Invalid cron expression";
    }

    // Handle step patterns first for minutes and hours
    if (parsed.rawFields.minutes.includes("/") && parsed.rawFields.minutes.startsWith("*")) {
      const [, step] = parsed.rawFields.minutes.split("/");
      const stepNum = parseInt(step, 10);
      if (stepNum === 0) return "Invalid cron expression"; // Division by zero
      if (stepNum === 1) return "every minute"; // Special case for */1
      return `every ${step} minutes`;
    }

    if (parsed.rawFields.hours.includes("/") && parsed.rawFields.hours.startsWith("*")) {
      const [, step] = parsed.rawFields.hours.split("/");
      const stepNum = parseInt(step, 10);
      if (stepNum === 0) return "Invalid cron expression"; // Division by zero
      return `every ${step} hours`;
    }

    // Handle full range cases (e.g., 0-23 for hours)
    if (parsed.rawFields.hours === "0-23" && parsed.rawFields.minutes === "0") {
      return "every minute";
    }

    // Check for "every minute" pattern (* * * * *)
    if (parsed.minutes[0] === "*" && parsed.hours[0] === "*" && 
        parsed.daysOfMonth[0] === "*" && parsed.daysOfWeek[0] === "*" && 
        parsed.months[0] === "*") {
      return "every minute";
    }

    // Check for "every hour" pattern (0 * * * *)
    if (parsed.minutes[0] === "0" && parsed.hours[0] === "*" && 
        parsed.daysOfMonth[0] === "*" && parsed.daysOfWeek[0] === "*" && 
        parsed.months[0] === "*") {
      return "every hour";
    }

    // Zaman bileşeni
    const timeStr = Formatters.formatTime(
      parsed.hours,
      parsed.minutes,
      parsed.seconds,
      options,
      locale
    );
    
    // If time formatting returned an error, return invalid expression
    if (timeStr && timeStr.startsWith("Invalid")) {
      return "Invalid cron expression";
    }
    
    if (timeStr) {
      parts.push(`${locale.at} ${timeStr}`);
    }

    // Day of month
    if (parsed.daysOfMonth[0] !== "*") {
      const domStr = Formatters.formatDayOfMonth(parsed.daysOfMonth, options, locale);
      if (domStr && domStr.startsWith("Invalid")) return "Invalid cron expression";
      if (domStr) parts.push(`${locale.on} ${domStr}`);
    }

    // Day of week
    if (parsed.daysOfWeek[0] !== "*") {
      const dowStr = Formatters.formatDayOfWeek(parsed.daysOfWeek, options, locale);
      if (dowStr && dowStr.startsWith("Invalid")) return "Invalid cron expression";
      if (dowStr) parts.push(`${locale.on} ${dowStr}`);
    }

    // Month
    if (parsed.months[0] !== "*") {
      const monthStr = Formatters.formatMonth(parsed.months, options, locale);
      if (monthStr && monthStr.startsWith("Invalid")) return "Invalid cron expression";
      if (monthStr) parts.push(`${locale.in} ${monthStr}`);
    }

    // Year
    if (options.includeYear && parsed.years && parsed.years[0] !== "*") {
      const yearStr = Formatters.formatYear(parsed.years, locale);
      if (yearStr && yearStr.startsWith("Invalid")) return "Invalid cron expression";
      if (yearStr) parts.push(`${locale.in} ${yearStr}`);
    }

    // Timezone
    if (options.includeTimezone && parsed.timezone && parsed.timezone !== "UTC") {
      parts.push(`${locale.in} ${parsed.timezone}`);
    }

    // Eğer sadece zaman varsa "every day" ekle
    if (parts.length === 1 && timeStr) {
      parts.push("every day");
    }

    // If no valid parts, return error
    if (parts.length === 0) {
      return "Invalid cron expression";
    }

    return parts.filter(Boolean).join(", ");
  }

  private static hasInvalidFields(parsed: ParsedExpression): boolean {
    // Check hours (0-23)
    for (const hour of parsed.hours) {
      if (hour !== "*") {
        const h = parseInt(hour, 10);
        if (isNaN(h) || h < 0 || h > 23) {
          return true;
        }
      }
    }

    // Check minutes (0-59)
    for (const minute of parsed.minutes) {
      if (minute !== "*") {
        const m = parseInt(minute, 10);
        if (isNaN(m) || m < 0 || m > 59) {
          return true;
        }
      }
    }

    // Check seconds (0-59)
    for (const second of parsed.seconds) {
      if (second !== "*") {
        const s = parseInt(second, 10);
        if (isNaN(s) || s < 0 || s > 59) {
          return true;
        }
      }
    }

    // Check days of month (1-31)
    for (const day of parsed.daysOfMonth) {
      if (day !== "*" && !day.includes("L") && !day.includes("#")) {
        const d = parseInt(day, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          return true;
        }
      }
    }

    // Check months (1-12)
    for (const month of parsed.months) {
      if (month !== "*") {
        const mo = parseInt(month, 10);
        if (isNaN(mo) || mo < 1 || mo > 12) {
          return true;
        }
      }
    }

    // Check days of week (0-6)
    for (const dow of parsed.daysOfWeek) {
      if (dow !== "*" && !dow.includes("L") && !dow.includes("#")) {
        const d = parseInt(dow, 10);
        if (isNaN(d) || d < 0 || d > 6) {
          return true;
        }
      }
    }

    return false;
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
export * from "./locales/index";

// Export types
export type { HumanizeOptions, HumanizeResult, LocaleStrings } from "./types";

// Default export
export default HumanizerClass;
