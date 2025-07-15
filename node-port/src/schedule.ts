// src/schedule.ts
import { ParseError } from "./errors.js";

export class Schedule {
  constructor(
    public readonly s: string | null = null,
    public readonly m: string | null = null,
    public readonly h: string | null = null,
    public readonly D: string | null = null,
    public readonly M: string | null = null,
    public readonly dow: string | null = null,
    public readonly Y: string | null = null,
    public readonly woy: string | null = null, // Week of Year
    public readonly tz: string | null = null
  ) {
    // Handle backward compatibility where 8th parameter might be timezone instead of woy
    if (
      arguments.length === 8 &&
      typeof arguments[7] === "string" &&
      !this.tz
    ) {
      // If 8 params and 8th is string, it's likely the old format (s,m,h,D,M,dow,Y,tz)
      // Move tz from woy position to tz position
      (this as any).tz = this.woy;
      (this as any).woy = null;
    }
  }
}

// Standart cron kısaltmaları için harita
const SHORTCUTS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

// Metinsel ifadeleri sayısal değerlere çeviren yardımcı fonksiyon
function replaceTextualNames(field: string): string {
  const replacements: Record<string, string> = {
    SUN: "0",
    MON: "1",
    TUE: "2",
    WED: "3",
    THU: "4",
    FRI: "5",
    SAT: "6",
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
  // Büyük/küçük harf duyarsız bir şekilde tüm metinsel ifadeleri bul ve değiştir.
  const regex = new RegExp(Object.keys(replacements).join("|"), "gi");
  return field.replace(regex, (match) => replacements[match.toUpperCase()]);
}

export function fromCronSyntax(cronString: string): Schedule {
  const originalString = cronString.trim();

  if (SHORTCUTS[originalString]) {
    cronString = SHORTCUTS[originalString];
  }

  const parts = cronString.trim().split(/\s+/);

  if (parts.length < 5 || parts.length > 8) {
    if (originalString === "@reboot") {
      return new Schedule("@reboot");
    }
    throw new ParseError(
      `Invalid cron format: 5, 6, 7, or 8 fields expected, but ${parts.length} found for '${cronString}'.`
    );
  }

  if (parts.length === 5) {
    parts.unshift("0"); // saniye
  }

  // 6: s m h D M dow
  // 7: s m h D M dow Y
  // 8: s m h D M dow Y tz
  let s,
    m,
    h,
    D,
    M,
    dow,
    Y = null,
    woy = null,
    tz = null;
  if (parts.length === 6) {
    [s, m, h, D, M, dow] = parts;
  } else if (parts.length === 7) {
    [s, m, h, D, M, dow, Y] = parts;
  } else if (parts.length === 8) {
    [s, m, h, D, M, dow, Y, tz] = parts;
  }

  M = replaceTextualNames(M || "");
  dow = replaceTextualNames(dow || "");

  return new Schedule(s, m, h, D, M, dow, Y || null, woy, tz || null);
}

export function withWeekOfYear(
  schedule: Schedule,
  weekOfYear: string
): Schedule {
  return new Schedule(
    schedule.s,
    schedule.m,
    schedule.h,
    schedule.D,
    schedule.M,
    schedule.dow,
    schedule.Y,
    weekOfYear,
    schedule.tz
  );
}

export function fromCronWithWeekOfYear(
  cronString: string,
  weekOfYear: string
): Schedule {
  const originalString = cronString.trim();
  if (SHORTCUTS[originalString]) {
    cronString = SHORTCUTS[originalString];
  }
  const parts = cronString.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 8) {
    throw new ParseError(
      `Invalid cron format: 5, 6, 7, or 8 fields expected, but ${parts.length} found for '${cronString}'.`
    );
  }
  if (parts.length === 5) parts.unshift("0");
  let s,
    m,
    h,
    D,
    M,
    dow,
    Y = null,
    tz = null;
  if (parts.length === 6) {
    [s, m, h, D, M, dow] = parts;
  } else if (parts.length === 7) {
    [s, m, h, D, M, dow, Y] = parts;
  } else if (parts.length === 8) {
    [s, m, h, D, M, dow, Y, tz] = parts;
  }
  M = M ? replaceTextualNames(M) : M;
  dow = dow ? replaceTextualNames(dow) : dow;
  return new Schedule(s, m, h, D, M, dow, Y || null, weekOfYear, tz || null);
}

// Predefined week patterns for convenience
export const WeekPatterns = {
  FIRST_WEEK: "1",
  LAST_WEEK: "53",
  EVEN_WEEKS:
    "2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52",
  ODD_WEEKS:
    "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53",
  FIRST_QUARTER: "1-13", // Weeks 1-13 (roughly first quarter)
  SECOND_QUARTER: "14-26", // Weeks 14-26 (roughly second quarter)
  THIRD_QUARTER: "27-39", // Weeks 27-39 (roughly third quarter)
  FOURTH_QUARTER: "40-53", // Weeks 40-53 (roughly fourth quarter)
  BI_WEEKLY:
    "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53", // Every other week (odd weeks)
  MONTHLY: "1,5,9,13,17,21,25,29,33,37,41,45,49,53", // Roughly monthly (every 4 weeks)
} as const;
