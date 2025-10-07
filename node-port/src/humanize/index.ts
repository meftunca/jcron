// src/humanize/index.ts
// Main humanize API - cronstrue-like functionality with jcron extensions

import { Engine } from "../engine";
import { Schedule, fromCronSyntax, fromJCronString } from "../schedule";
import { Formatters } from "./formatters";
import { czLocale } from "./locales/cz";
import { deLocale } from "./locales/de";
import { enLocale } from "./locales/en";
import { esLocale } from "./locales/es";
import { frLocale } from "./locales/fr";
import { itLocale } from "./locales/it";
import { nlLocale } from "./locales/nl";
import { plLocale } from "./locales/pl";
import { ptLocale } from "./locales/pt";
import { trLocale } from "./locales/tr";
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
    const langCode = browserLang.split("-")[0];
    if (locales.has(langCode)) {
      return langCode;
    }

    // Special mappings
    const langMap: Record<string, string> = {
      cs: "cz", // Czech
      "cs-cz": "cz",
      "pt-br": "pt", // Brazilian Portuguese
      "pt-pt": "pt", // European Portuguese
      "es-es": "es", // European Spanish
      "es-mx": "es", // Mexican Spanish
      "fr-fr": "fr", // French
      "fr-ca": "fr", // Canadian French
      "de-de": "de", // German
      "de-at": "de", // Austrian German
      "de-ch": "de", // Swiss German
      "it-it": "it", // Italian
      "nl-nl": "nl", // Dutch
      "nl-be": "nl", // Belgian Dutch
      "pl-pl": "pl", // Polish
      "tr-tr": "tr", // Turkish
    };

    if (langMap[browserLang] && locales.has(langMap[browserLang])) {
      return langMap[browserLang];
    }
  }

  // Node.js environment
  if (typeof process !== "undefined" && process.env) {
    const envLang = (
      process.env.LANG ||
      process.env.LANGUAGE ||
      process.env.LC_ALL ||
      ""
    ).toLowerCase();
    const langCode = envLang.split("_")[0].split(".")[0];
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
  useShorthand: true,
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
      throw new Error(
        `Unsupported locale: ${locale}. Supported locales: ${this.getSupportedLocales().join(
          ", "
        )}`
      );
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
    // Create cache key
    const optionsStr = JSON.stringify(options);
    const cacheKey = `${cronExpression}:${optionsStr}`;

    // Check cache first
    const cached = HumanizeCache.getTemplate(cacheKey, options.locale || "en");
    if (cached) {
      return cached;
    }

    try {
      const schedule = fromJCronString(cronExpression);
      const result = this.fromSchedule(schedule, options);

      // Cache the result
      HumanizeCache.setTemplate(cacheKey, result, options.locale || "en");

      return result;
    } catch (error) {
      const errorResult = "Invalid cron expression";
      HumanizeCache.setTemplate(cacheKey, errorResult, options.locale || "en");
      return errorResult;
    }
  }

  /**
   * Humanize a Schedule object
   */
  static fromSchedule(
    schedule: Schedule | any,
    options: Partial<HumanizeOptions> = {}
  ): string {
    // Input validation
    if (schedule == null) {
      return "Invalid schedule object";
    }

    // Ensure we have a proper Schedule object
    let normalizedSchedule: Schedule;
    try {
      if (schedule instanceof Schedule) {
        normalizedSchedule = schedule;
      } else {
        // Validate fields before creating Schedule
        const validateField = (
          value: any,
          min: number,
          max: number,
          fieldName: string
        ): string | null => {
          if (value == null || value === "*") return null;
          const strValue = String(value);

          // Skip validation for complex patterns
          if (
            strValue.includes("/") ||
            strValue.includes("-") ||
            strValue.includes(",") ||
            strValue.includes("L") ||
            strValue.includes("#") ||
            strValue.includes("W")
          ) {
            return strValue;
          }

          const numValue = parseInt(strValue, 10);
          if (isNaN(numValue) || numValue < min || numValue > max) {
            throw new Error(
              `Invalid ${fieldName}: ${value} (must be ${min}-${max})`
            );
          }
          return strValue;
        };

        // Validate all fields
        const validatedFields = {
          seconds: validateField(
            schedule.s ?? schedule.seconds,
            0,
            59,
            "seconds"
          ),
          minutes: validateField(
            schedule.m ?? schedule.minutes,
            0,
            59,
            "minutes"
          ),
          hours: validateField(schedule.h ?? schedule.hours, 0, 23, "hours"),
          dayOfMonth: validateField(
            schedule.D ?? schedule.dayOfMonth,
            1,
            31,
            "day of month"
          ),
          month: validateField(schedule.M ?? schedule.month, 1, 12, "month"),
          dayOfWeek: validateField(
            schedule.dow ?? schedule.dayOfWeek,
            0,
            7,
            "day of week"
          ),
          year: validateField(schedule.Y ?? schedule.year, 1970, 3000, "year"),
          weekOfYear: validateField(
            schedule.woy ?? schedule.weekOfYear,
            1,
            53,
            "week of year"
          ),
          timezone: schedule.tz ?? schedule.timezone ?? null,
        };

        // Try to create a proper Schedule from the validated object
        normalizedSchedule = new Schedule(
          validatedFields.seconds,
          validatedFields.minutes,
          validatedFields.hours,
          validatedFields.dayOfMonth,
          validatedFields.month,
          validatedFields.dayOfWeek,
          validatedFields.year,
          validatedFields.weekOfYear,
          validatedFields.timezone
        );
      }
    } catch (error) {
      return "Invalid schedule object";
    }

    const result = this.scheduleToResult(normalizedSchedule, options);
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

  private static hasStepPattern(parsed: ParsedExpression): boolean {
    return (
      parsed.hasSteps ||
      parsed.rawFields.minutes.includes("/") ||
      parsed.rawFields.hours.includes("/") ||
      parsed.rawFields.daysOfMonth.includes("/") ||
      parsed.rawFields.months.includes("/") ||
      parsed.rawFields.daysOfWeek.includes("/")
    );
  }

  private static buildStepDescription(
    parsed: ParsedExpression,
    options: Required<HumanizeOptions>,
    locale: LocaleStrings
  ): string {
    const parts: string[] = [];

    // Handle step patterns in different fields
    if (parsed.rawFields.minutes.includes("/")) {
      const stepMatch = parsed.rawFields.minutes.match(/^\*\/(\d+)$/);
      if (stepMatch) {
        const step = parseInt(stepMatch[1], 10);
        if (step === 1) {
          parts.push("every minute");
        } else {
          parts.push(`every ${step} minutes`);
        }
      }
    } else if (parsed.rawFields.hours.includes("/")) {
      const stepMatch = parsed.rawFields.hours.match(/^\*\/(\d+)$/);
      if (stepMatch) {
        const step = parseInt(stepMatch[1], 10);
        parts.push(`every ${step} hours`);
      }
    } else {
      // Complex step patterns - fallback to standard description
      return this.buildStandardDescription(parsed, options, locale);
    }

    // Add time components if specific
    if (parsed.hours[0] !== "*" && parsed.minutes[0] !== "*") {
      const timeStr = Formatters.formatTime(
        parsed.hours,
        parsed.minutes,
        parsed.seconds,
        options,
        locale
      );
      if (timeStr) {
        parts.unshift(`${locale.at} ${timeStr}`);
      }
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
      eod: parsed.eod || undefined, // Include End-of-Duration info
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
    if (
      options.includeWeekOfYear &&
      parsed.weekOfYear &&
      parsed.weekOfYear[0] !== "*"
    ) {
      const woyStr = Formatters.formatWeekOfYear(parsed.weekOfYear, locale);
      parts.push(woyStr);
    }

    // Day of week
    if (parsed.daysOfWeek[0] !== "*") {
      const dowStr = Formatters.formatDayOfWeek(
        parsed.daysOfWeek,
        options,
        locale
      );
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
    if (
      options.includeTimezone &&
      parsed.timezone &&
      parsed.timezone !== "UTC"
    ) {
      parts.push(`${locale.in} ${parsed.timezone}`);
    }

    // End-of-Duration (EoD)
    let result = parts.filter(Boolean).join(", ");

    // Add EoD at the end if present
    if (parsed.eod && parsed.eod !== "") {
      const eodStr = Formatters.formatEOD(parsed.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
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
    if (
      parsed.rawFields.minutes.includes("/") &&
      parsed.rawFields.minutes.startsWith("*")
    ) {
      const [, step] = parsed.rawFields.minutes.split("/");
      const stepNum = parseInt(step, 10);
      if (stepNum === 0) return "Invalid cron expression"; // Division by zero
      if (stepNum === 1) return "every minute"; // Special case for */1
      return `every ${step} minutes`;
    }

    if (
      parsed.rawFields.hours.includes("/") &&
      parsed.rawFields.hours.startsWith("*")
    ) {
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
    if (
      parsed.minutes[0] === "*" &&
      parsed.hours[0] === "*" &&
      parsed.daysOfMonth[0] === "*" &&
      parsed.daysOfWeek[0] === "*" &&
      parsed.months[0] === "*"
    ) {
      return "every minute";
    }

    // Check for "every hour" pattern (0 * * * *)
    if (
      parsed.minutes[0] === "0" &&
      parsed.hours[0] === "*" &&
      parsed.daysOfMonth[0] === "*" &&
      parsed.daysOfWeek[0] === "*" &&
      parsed.months[0] === "*"
    ) {
      return "every hour";
    }

    // 🚀 IMPROVEMENT: Natural language shortcuts for common patterns
    const isSpecificTime = parsed.hours[0] !== "*" && parsed.minutes[0] !== "*";
    const isAllDaysOfMonth = parsed.daysOfMonth[0] === "*";
    const isAllDaysOfWeek = parsed.daysOfWeek[0] === "*";
    const isAllMonths = parsed.months[0] === "*";
    const isSingleDayOfWeek =
      parsed.daysOfWeek.length === 1 && parsed.daysOfWeek[0] !== "*";
    const isSingleDayOfMonth =
      parsed.daysOfMonth.length === 1 && parsed.daysOfMonth[0] !== "*";
    const isSingleMonth =
      parsed.months.length === 1 && parsed.months[0] !== "*";

    // Pattern: "0 9 * * *" → "Daily at 9 AM"
    if (isSpecificTime && isAllDaysOfMonth && isAllDaysOfWeek && isAllMonths) {
      const timeStr = Formatters.formatTime(
        parsed.hours,
        parsed.minutes,
        parsed.seconds,
        options,
        locale
      );
      return options.useShorthand !== false
        ? `${locale.daily} ${locale.at} ${timeStr}`
        : `${locale.at} ${timeStr}, ${locale.everyDay}`;
    }

    // Pattern: "0 0 * * 0" → "Weekly on Sunday"
    if (
      isSpecificTime &&
      isAllDaysOfMonth &&
      isSingleDayOfWeek &&
      isAllMonths
    ) {
      const timeStr = Formatters.formatTime(
        parsed.hours,
        parsed.minutes,
        parsed.seconds,
        options,
        locale
      );
      const dowStr = Formatters.formatDayOfWeek(
        parsed.daysOfWeek,
        options,
        locale
      );
      return options.useShorthand !== false
        ? `${locale.weekly} ${locale.on} ${dowStr}`
        : `${locale.at} ${timeStr}, ${locale.on} ${dowStr}`;
    }

    // Pattern: "0 0 1 * *" → "Monthly on the 1st"
    if (
      isSpecificTime &&
      isSingleDayOfMonth &&
      isAllDaysOfWeek &&
      isAllMonths
    ) {
      const timeStr = Formatters.formatTime(
        parsed.hours,
        parsed.minutes,
        parsed.seconds,
        options,
        locale
      );
      const domStr = Formatters.formatDayOfMonth(
        parsed.daysOfMonth,
        options,
        locale
      );
      return options.useShorthand !== false
        ? `${locale.monthly} ${locale.on} ${domStr}`
        : `${locale.at} ${timeStr}, ${locale.on} ${domStr}, ${locale.everyMonth}`;
    }

    // Pattern: "0 0 1 1 *" → "Yearly on January 1st"
    if (
      isSpecificTime &&
      isSingleDayOfMonth &&
      isAllDaysOfWeek &&
      isSingleMonth
    ) {
      const timeStr = Formatters.formatTime(
        parsed.hours,
        parsed.minutes,
        parsed.seconds,
        options,
        locale
      );
      const domStr = Formatters.formatDayOfMonth(
        parsed.daysOfMonth,
        options,
        locale
      );
      const monthStr = Formatters.formatMonth(parsed.months, options, locale);
      return options.useShorthand !== false
        ? `${locale.yearly} ${locale.on} ${monthStr} ${domStr}`
        : `${locale.at} ${timeStr}, ${locale.on} ${domStr}, ${locale.in} ${monthStr}, ${locale.everyYear}`;
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
      const domStr = Formatters.formatDayOfMonth(
        parsed.daysOfMonth,
        options,
        locale
      );
      if (domStr && domStr.startsWith("Invalid"))
        return "Invalid cron expression";
      if (domStr) parts.push(`${locale.on} ${domStr}`);
    }

    // Day of week
    if (parsed.daysOfWeek[0] !== "*") {
      const dowStr = Formatters.formatDayOfWeek(
        parsed.daysOfWeek,
        options,
        locale
      );
      if (dowStr && dowStr.startsWith("Invalid"))
        return "Invalid cron expression";
      if (dowStr) parts.push(`${locale.on} ${dowStr}`);
    }

    // Month
    if (parsed.months[0] !== "*") {
      const monthStr = Formatters.formatMonth(parsed.months, options, locale);
      if (monthStr && monthStr.startsWith("Invalid"))
        return "Invalid cron expression";
      if (monthStr) parts.push(`${locale.in} ${monthStr}`);
    }

    // Year
    if (options.includeYear && parsed.years && parsed.years[0] !== "*") {
      const yearStr = Formatters.formatYear(parsed.years, locale);
      if (yearStr && yearStr.startsWith("Invalid"))
        return "Invalid cron expression";
      if (yearStr) parts.push(`${locale.in} ${yearStr}`);
    }

    // Timezone
    if (
      options.includeTimezone &&
      parsed.timezone &&
      parsed.timezone !== "UTC"
    ) {
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

    // Join main parts without EoD first
    let result = parts.filter(Boolean).join(", ");

    // Add EoD at the end if present - just return the description without adding it
    if (parsed.eod && parsed.eod !== "") {
      const eodStr = Formatters.formatEOD(parsed.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
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

// Fast lookup tables for optimized humanization
const MONTH_NAMES_FAST = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  tr: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
  es: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  fr: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
  de: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  pl: [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ],
  pt: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  it: [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ],
  cz: [
    "Leden",
    "Únor",
    "Březen",
    "Duben",
    "Květen",
    "Červen",
    "Červenec",
    "Srpen",
    "Září",
    "Říjen",
    "Listopad",
    "Prosinec",
  ],
  nl: [
    "Januari",
    "Februari",
    "Maart",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Augustus",
    "September",
    "Oktober",
    "November",
    "December",
  ],
};

const DAY_NAMES_FAST = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  tr: [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ],
  es: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  de: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  pl: [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
  ],
  pt: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
  it: [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ],
  cz: ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"],
  nl: [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ],
};

const TEMPLATE_STRINGS_FAST = {
  en: {
    every: "every",
    at: "at",
    on: "on",
    minute: "minute",
    minutes: "minutes",
    hour: "hour",
    hours: "hours",
    day: "day",
    days: "days",
    week: "week",
    weeks: "weeks",
    month: "month",
    months: "months",
    year: "year",
    years: "years",
    and: "and",
    past: "past",
    between: "between",
    to: "to",
  },
  tr: {
    every: "her",
    at: "saat",
    on: "",
    minute: "dakika",
    minutes: "dakika",
    hour: "saat",
    hours: "saat",
    day: "gün",
    days: "gün",
    week: "hafta",
    weeks: "hafta",
    month: "ay",
    months: "ay",
    year: "yıl",
    years: "yıl",
    and: "ve",
    past: "geçe",
    between: "arasında",
    to: "ile",
  },
  es: {
    every: "cada",
    at: "a las",
    on: "en",
    minute: "minuto",
    minutes: "minutos",
    hour: "hora",
    hours: "horas",
    day: "día",
    days: "días",
    week: "semana",
    weeks: "semanas",
    month: "mes",
    months: "meses",
    year: "año",
    years: "años",
    and: "y",
    past: "pasado",
    between: "entre",
    to: "a",
  },
};

// Humanization cache for performance optimization
class HumanizeCache {
  private static templates = new Map<string, string>();
  private static localeCache = new Map<string, Map<string, string>>();
  private static maxCacheSize = 500;

  static getTemplate(key: string, locale: string = "en"): string | undefined {
    const cacheKey = `${locale}:${key}`;
    return this.templates.get(cacheKey);
  }

  static setTemplate(key: string, value: string, locale: string = "en"): void {
    if (this.templates.size < this.maxCacheSize) {
      const cacheKey = `${locale}:${key}`;
      this.templates.set(cacheKey, value);
    }
  }

  static getLocaleCache(locale: string): Map<string, string> | undefined {
    return this.localeCache.get(locale);
  }

  static setLocaleCache(locale: string, cache: Map<string, string>): void {
    if (this.localeCache.size < 20) {
      // Max 20 locales
      this.localeCache.set(locale, cache);
    }
  }

  static clear(): void {
    this.templates.clear();
    this.localeCache.clear();
  }
}

// Pre-compiled regex patterns for faster parsing
class HumanizePatterns {
  static readonly numbersRegex = /^\d+$/;
  static readonly rangeRegex = /^(\d+)-(\d+)$/;
  static readonly stepRegex = /^(\*|\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)\/(\d+)$/;
  static readonly listRegex = /^(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)$/;
  static readonly everyRegex = /^\*$/;
}

// Batch humanizer for optimized performance with multiple schedules
export class BatchHumanizer {
  private cache = new Map<string, string>();
  private options: HumanizeOptions;

  constructor(options: Partial<HumanizeOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  humanize(id: string, schedule: Schedule): string {
    const cacheKey = `${id}_${this.generateCacheKey(schedule)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = this.humanizeOptimized(schedule);
    this.cache.set(cacheKey, result);

    return result;
  }

  humanizeMultiple(schedules: Map<string, Schedule>): Map<string, string> {
    const results = new Map<string, string>();

    for (const [id, schedule] of schedules) {
      results.set(id, this.humanize(id, schedule));
    }

    return results;
  }

  private generateCacheKey(schedule: Schedule): string {
    const optionsKey = `${this.options.use24HourTime ? "24" : "12"}${
      this.options.verbose ? "v" : ""
    }${this.options.includeSeconds ? "s" : ""}`;
    const eodKey = schedule.eod ? `_eod:${schedule.eod.toString()}` : "";
    return `${schedule.s || "*"}_${schedule.m || "*"}_${schedule.h || "*"}_${
      schedule.D || "*"
    }_${schedule.M || "*"}_${schedule.dow || "*"}_${
      schedule.Y || "*"
    }_${optionsKey}${eodKey}`;
  }

  private humanizeOptimized(schedule: Schedule): string {
    const locale = this.options.locale;
    const templates =
      TEMPLATE_STRINGS_FAST[locale as keyof typeof TEMPLATE_STRINGS_FAST] ||
      TEMPLATE_STRINGS_FAST.en;

    // Fast pattern detection
    const pattern = this.detectPatternOptimized(schedule);

    switch (pattern) {
      case "daily":
        return this.buildDailyDescription(schedule, templates);
      case "weekly":
        return this.buildWeeklyDescription(schedule, templates);
      case "monthly":
        return this.buildMonthlyDescription(schedule, templates);
      case "yearly":
        return this.buildYearlyDescription(schedule, templates);
      default:
        return HumanizerClass.fromSchedule(schedule, this.options);
    }
  }

  private detectPatternOptimized(schedule: Schedule): string {
    const isEveryDay =
      (!schedule.D || schedule.D === "*") &&
      (!schedule.dow || schedule.dow === "*");
    const isEveryWeek =
      schedule.dow &&
      schedule.dow !== "*" &&
      (!schedule.D || schedule.D === "*" || schedule.D === "?");
    const isEveryMonth =
      schedule.D &&
      schedule.D !== "*" &&
      schedule.D !== "?" &&
      (!schedule.dow || schedule.dow === "*" || schedule.dow === "?");
    const isEveryYear = schedule.M && schedule.M !== "*";

    if (isEveryYear) return "yearly";
    if (isEveryMonth) return "monthly";
    if (isEveryWeek) return "weekly";
    if (isEveryDay) return "daily";

    return "custom";
  }

  private buildTimeString(schedule: Schedule, templates: any): string {
    const hour = schedule.h || "0";
    const minute = schedule.m || "0";
    const second = schedule.s || "0";

    // Fast time formatting
    const h = hour === "*" ? "00" : hour.padStart(2, "0");
    const m = minute === "*" ? "00" : minute.padStart(2, "0");

    if (this.options.use24HourTime) {
      if (this.options.includeSeconds && second !== "*") {
        const s = second.padStart(2, "0");
        return `${h}:${m}:${s}`;
      }
      return `${h}:${m}`;
    }

    // 12-hour format with fast conversion
    const hourNum = parseInt(h, 10);
    const period = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;

    return `${displayHour}:${m} ${period}`;
  }

  private buildDailyDescription(schedule: Schedule, templates: any): string {
    const timeStr = this.buildTimeString(schedule, templates);
    let result = `${templates.every} ${templates.day} ${templates.at} ${timeStr}`;

    // Add EoD if present
    if (schedule.eod) {
      const locale = locales.get(this.options.locale || "en") || enLocale;
      const eodStr = Formatters.formatEOD(schedule.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
  }

  private buildWeeklyDescription(schedule: Schedule, templates: any): string {
    const timeStr = this.buildTimeString(schedule, templates);
    const dayStr = this.parseDayOfWeek(schedule.dow!);
    let result = `${templates.every} ${dayStr} ${templates.at} ${timeStr}`;

    // Add EoD if present
    if (schedule.eod) {
      const locale = locales.get(this.options.locale || "en") || enLocale;
      const eodStr = Formatters.formatEOD(schedule.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
  }

  private buildMonthlyDescription(schedule: Schedule, templates: any): string {
    const timeStr = this.buildTimeString(schedule, templates);
    const dayStr = this.parseDayOfMonth(schedule.D!, templates);
    let result = `${templates.every} ${templates.month} ${templates.on} ${dayStr} ${templates.at} ${timeStr}`;

    // Add EoD if present
    if (schedule.eod) {
      const locale = locales.get(this.options.locale || "en") || enLocale;
      const eodStr = Formatters.formatEOD(schedule.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
  }

  private buildYearlyDescription(schedule: Schedule, templates: any): string {
    const timeStr = this.buildTimeString(schedule, templates);
    const monthStr = this.parseMonth(schedule.M!);
    const dayStr =
      schedule.D && schedule.D !== "*"
        ? this.parseDayOfMonth(schedule.D, templates)
        : "";
    let result = `${templates.every} ${templates.year} ${
      templates.on
    } ${monthStr}${dayStr ? " " + dayStr : ""} ${templates.at} ${timeStr}`;

    // Add EoD if present
    if (schedule.eod) {
      const locale = locales.get(this.options.locale || "en") || enLocale;
      const eodStr = Formatters.formatEOD(schedule.eod, locale);
      if (eodStr) {
        result += `, ${eodStr}`;
      }
    }

    return result;
  }

  private parseDayOfMonth(day: string, templates: any): string {
    if (HumanizePatterns.numbersRegex.test(day)) {
      const num = parseInt(day, 10);
      return `${templates.day} ${num}`;
    }
    return day;
  }

  private parseMonth(month: string): string {
    const locale = this.options.locale;
    const monthNames =
      MONTH_NAMES_FAST[locale as keyof typeof MONTH_NAMES_FAST] ||
      MONTH_NAMES_FAST.en;

    if (HumanizePatterns.numbersRegex.test(month)) {
      const num = parseInt(month, 10);
      if (num >= 1 && num <= 12) {
        return monthNames[num - 1];
      }
    }
    return month;
  }

  private parseDayOfWeek(dow: string): string {
    const locale = this.options.locale;
    const dayNames =
      DAY_NAMES_FAST[locale as keyof typeof DAY_NAMES_FAST] ||
      DAY_NAMES_FAST.en;

    if (HumanizePatterns.numbersRegex.test(dow)) {
      const num = parseInt(dow, 10);
      if (num >= 0 && num <= 7) {
        // Handle both 0=Sunday and 7=Sunday
        const dayIndex = num === 7 ? 0 : num;
        return dayNames[dayIndex];
      }
    }
    return dow;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { cacheSize: number; options: HumanizeOptions } {
    return {
      cacheSize: this.cache.size,
      options: this.options,
    };
  }
}

// Export convenience functions
export const toString = HumanizerClass.toString.bind(HumanizerClass);
export const toHumanize = toString;
export const toResult = HumanizerClass.toResult.bind(HumanizerClass);
export const toHumanizeResult = toResult;
export const fromSchedule = HumanizerClass.fromSchedule.bind(HumanizerClass);
export const registerLocale =
  HumanizerClass.registerLocale.bind(HumanizerClass);
export const getSupportedLocales =
  HumanizerClass.getSupportedLocales.bind(HumanizerClass);
export const isLocaleSupported =
  HumanizerClass.isLocaleSupported.bind(HumanizerClass);
export const getDetectedLocale =
  HumanizerClass.getDetectedLocale.bind(HumanizerClass);
export const setDefaultLocale =
  HumanizerClass.setDefaultLocale.bind(HumanizerClass);

// Export optimized humanization functions
export function humanizeOptimized(
  schedule: Schedule,
  options: Partial<HumanizeOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const batchHumanizer = new BatchHumanizer(opts);
  return batchHumanizer.humanize("temp", schedule);
}

export function createBatchHumanizer(
  options: Partial<HumanizeOptions> = {}
): BatchHumanizer {
  return new BatchHumanizer(options);
}

// Export optimized locale support
export const SUPPORTED_LOCALES_OPTIMIZED = [
  "en",
  "tr",
  "es",
  "fr",
  "de",
  "pl",
  "pt",
  "it",
  "cz",
  "nl",
] as const;
export type SupportedLocaleOptimized =
  (typeof SUPPORTED_LOCALES_OPTIMIZED)[number];

export function isLocaleOptimizedSupported(
  locale: string
): locale is SupportedLocaleOptimized {
  return SUPPORTED_LOCALES_OPTIMIZED.includes(
    locale as SupportedLocaleOptimized
  );
}

// Export lookup tables for external use
export {
  DAY_NAMES_FAST,
  HumanizePatterns,
  MONTH_NAMES_FAST,
  TEMPLATE_STRINGS_FAST,
};

// Export locale utilities
export * from "./locales/index";

// Export types
export type { HumanizeOptions, HumanizeResult, LocaleStrings } from "./types";

// Default export
export default HumanizerClass;
