// src/humanize/locales/de.ts
// German locale strings for humanization

import { LocaleStrings } from "../types";

export const deLocale: LocaleStrings = {
  // Time-related
  at: "um",
  every: "jeden",
  on: "am",
  in: "in",
  of: "von",
  and: "und",
  or: "oder",
  everyDay: "jeden Tag",
  // Frequency
  second: "Sekunde",
  seconds: "Sekunden",
  minute: "Minute",
  minutes: "Minuten",
  hour: "Stunde",
  hours: "Stunden",
  day: "Tag",
  days: "Tage",
  week: "Woche",
  weeks: "Wochen",
  month: "Monat",
  months: "Monate",
  year: "Jahr",
  years: "Jahre",

  // Special patterns
  last: "letzten",
  first: "ersten",
  secondOrdinal: "zweiten",
  third: "dritten",
  fourth: "vierten",
  fifth: "fünften",
  weekday: "Wochentag",
  weekend: "Wochenende",

  // Days of week
  daysLong: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  daysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  daysNarrow: ["S", "M", "D", "M", "D", "F", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ],
  monthsNarrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

  // Ordinals
  ordinals: [
    "1.",
    "2.",
    "3.",
    "4.",
    "5.",
    "6.",
    "7.",
    "8.",
    "9.",
    "10.",
    "11.",
    "12.",
    "13.",
    "14.",
    "15.",
    "16.",
    "17.",
    "18.",
    "19.",
    "20.",
    "21.",
    "22.",
    "23.",
    "24.",
    "25.",
    "26.",
    "27.",
    "28.",
    "29.",
    "30.",
    "31.",
  ],

  // Special expressions
  midnight: "Mitternacht",
  noon: "Mittag",

  // Complex patterns
  between: "zwischen",
  through: "bis",
  starting: "beginnend",
  ending: "endend",
  except: "außer",

  // Week of year
  weekOfYear: "Woche des Jahres",
  weekOfYearShort: "Woche",

  // Timezone
  timezone: "Zeitzone",
  utc: "UTC",
  local: "Ortszeit",

  // EOD
  endOfDuration: "Ende der Dauer",
  untilTheEndOf: "bis zum Ende von",
};
