// src/humanize/locales/nl.ts
// Dutch locale strings for humanization

import { LocaleStrings } from "../types";

export const nlLocale: LocaleStrings = {
  // Time-related
  at: "om",
  every: "elke",
  on: "op",
  in: "in",
  of: "van",
  and: "en",
  or: "of",

  // Frequency
  second: "seconde",
  seconds: "seconden",
  minute: "minuut",
  minutes: "minuten",
  hour: "uur",
  hours: "uren",
  day: "dag",
  days: "dagen",
  week: "week",
  weeks: "weken",
  month: "maand",
  months: "maanden",
  year: "jaar",
  years: "jaren",

  // Special patterns
  last: "laatste",
  first: "eerste",
  secondOrdinal: "tweede",
  third: "derde",
  fourth: "vierde",
  fifth: "vijfde",
  weekday: "werkdag",
  weekend: "weekend",
  theMonth: "the month",

  // Natural language shortcuts
  daily: "Dagelijks",
  weekly: "Wekelijks",
  monthly: "Maandelijks",
  yearly: "Jaarlijks",
  everyDay: "elke dag",
  everyMonth: "elke maand",
  everyYear: "elk jaar",
  weekdays: "weekdays",
  weekends: "weekends",

  // Days of week
  daysLong: [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ],
  daysShort: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"],
  daysNarrow: ["Z", "M", "D", "W", "D", "V", "Z"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Jan",
    "Feb",
    "Mrt",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ],
  monthsNarrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

  // Ordinals
  ordinals: [
    "1e",
    "2e",
    "3e",
    "4e",
    "5e",
    "6e",
    "7e",
    "8e",
    "9e",
    "10e",
    "11e",
    "12e",
    "13e",
    "14e",
    "15e",
    "16e",
    "17e",
    "18e",
    "19e",
    "20e",
    "21e",
    "22e",
    "23e",
    "24e",
    "25e",
    "26e",
    "27e",
    "28e",
    "29e",
    "30e",
    "31e",
  ],

  // Special expressions
  midnight: "middernacht",
  noon: "middag",

  // Complex patterns
  between: "tussen",
  through: "tot",
  starting: "beginnend",
  ending: "eindigend",
  except: "behalve",

  // Week of year
  weekOfYear: "week van het jaar",
  weekOfYearShort: "week",

  // Timezone
  timezone: "tijdzone",
  utc: "UTC",
  local: "lokale tijd",

  // EOD
  endOfDuration: "einde van de duur",
  untilTheEndOf: "tot het einde van",
};
