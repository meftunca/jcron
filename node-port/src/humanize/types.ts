// src/humanize/types.ts
// Type definitions for the humanize API

export interface HumanizeOptions {
  /** Language/locale for output (default: 'en') */
  locale?: string;

  /** Use 24-hour format instead of 12-hour with AM/PM (default: false) */
  use24HourTime?: boolean;

  /** Day of week naming format (default: 'long') */
  dayFormat?: "long" | "short" | "narrow";

  /** Month naming format (default: 'long') */
  monthFormat?: "long" | "short" | "narrow" | "numeric";

  /** Case style for output (default: 'lower') */
  caseStyle?: "lower" | "upper" | "title";

  /** Include verbose descriptions (default: false) */
  verbose?: boolean;

  /** Include timezone information in output (default: true) */
  includeTimezone?: boolean;

  /** Include year information in output (default: true) */
  includeYear?: boolean;

  /** Include week-of-year information in output (default: true) */
  includeWeekOfYear?: boolean;

  /** Include seconds in time display (default: true if seconds specified) */
  includeSeconds?: boolean;

  /** Use ordinal numbers (1st, 2nd, 3rd) instead of cardinal (default: true) */
  useOrdinals?: boolean;

  /** Custom format templates */
  customFormats?: {
    daily?: string;
    weekly?: string;
    monthly?: string;
    yearly?: string;
    custom?: string;
  };

  /** Maximum description length before truncation */
  maxLength?: number;

  /** Show range descriptions for complex patterns (default: true) */
  showRanges?: boolean;

  /** Show list descriptions for multiple values (default: true) */
  showLists?: boolean;

  /** Show step descriptions for interval patterns (default: true) */
  showSteps?: boolean;
}

export interface HumanizeResult {
  /** The humanized description */
  description: string;

  /** Detected pattern type */
  pattern: "daily" | "weekly" | "monthly" | "yearly" | "custom" | "complex";

  /** Next execution time (if calculable) */
  nextExecution?: Date;

  /** Frequency information */
  frequency: {
    type:
      | "seconds"
      | "minutes"
      | "hours"
      | "days"
      | "weeks"
      | "months"
      | "years"
      | "custom";
    interval: number;
    description: string;
  };

  /** Parsed components */
  components: {
    seconds?: string;
    minutes?: string;
    hours?: string;
    dayOfMonth?: string;
    month?: string;
    dayOfWeek?: string;
    year?: string;
    weekOfYear?: string;
    timezone?: string;
  };

  /** Original expression */
  originalExpression: string;

  /** Warnings or notes */
  warnings?: string[];
}

export interface LocaleStrings {
  // Time-related
  at: string;
  every: string;
  on: string;
  in: string;
  of: string;
  and: string;
  or: string;

  // Frequency
  second: string;
  seconds: string;
  minute: string;
  minutes: string;
  hour: string;
  hours: string;
  day: string;
  days: string;
  week: string;
  weeks: string;
  month: string;
  months: string;
  year: string;
  years: string;

  // Special patterns
  last: string;
  first: string;
  secondOrdinal: string;
  third: string;
  fourth: string;
  fifth: string;
  weekday: string;
  weekend: string;

  // Days of week
  daysLong: string[];
  daysShort: string[];
  daysNarrow: string[];

  // Months
  monthsLong: string[];
  monthsShort: string[];
  monthsNarrow: string[];

  // Ordinals
  ordinals: string[];

  // Special expressions
  midnight: string;
  noon: string;

  // Complex patterns
  between: string;
  through: string;
  starting: string;
  ending: string;
  except: string;

  // Week of year
  weekOfYear: string;
  weekOfYearShort: string;

  // Timezone
  timezone: string;
  utc: string;
  local: string;
}
