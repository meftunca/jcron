// src/humanize/locales/en.ts
// English locale strings for humanization

import { LocaleStrings } from "../types";

export const enLocale: LocaleStrings = {
  // Time-related
  at: "at",
  every: "every",
  on: "on",
  in: "in",
  of: "of",
  and: "and",
  or: "or",
  everyDay: "every day",
  // Frequency
  second: "second",
  seconds: "seconds",
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

  // Special patterns
  last: "last",
  first: "first",
  secondOrdinal: "second",
  third: "third",
  fourth: "fourth",
  fifth: "fifth",
  weekday: "weekday",
  weekend: "weekend",

  // Days of week
  daysLong: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  daysNarrow: ["S", "M", "T", "W", "T", "F", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  monthsNarrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

  // Ordinals
  ordinals: [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "13th",
    "14th",
    "15th",
    "16th",
    "17th",
    "18th",
    "19th",
    "20th",
    "21st",
    "22nd",
    "23rd",
    "24th",
    "25th",
    "26th",
    "27th",
    "28th",
    "29th",
    "30th",
    "31st",
  ],

  // Special expressions
  midnight: "midnight",
  noon: "noon",

  // Complex patterns
  between: "between",
  through: "through",
  starting: "starting",
  ending: "ending",
  except: "except",

  // Week of year
  weekOfYear: "week of year",
  weekOfYearShort: "week",

  // Timezone
  timezone: "timezone",
  utc: "UTC",
  local: "local time",

  // EOD
  endOfDuration: "end of duration",
  untilTheEndOf: "until the end of",
};
