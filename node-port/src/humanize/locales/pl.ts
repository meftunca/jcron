// src/humanize/locales/pl.ts
// Polish locale strings for humanization

import { LocaleStrings } from "../types";

export const plLocale: LocaleStrings = {
  // Time-related
  at: "o",
  every: "co",
  on: "w",
  in: "w",
  of: "z",
  and: "i",
  or: "lub",
  everyDay: "codziennie",
  // Frequency
  second: "sekunda",
  seconds: "sekund",
  minute: "minuta",
  minutes: "minut",
  hour: "godzina",
  hours: "godzin",
  day: "dzień",
  days: "dni",
  week: "tydzień",
  weeks: "tygodni",
  month: "miesiąc",
  months: "miesięcy",
  year: "rok",
  years: "lat",

  // Special patterns
  last: "ostatni",
  first: "pierwszy",
  secondOrdinal: "drugi",
  third: "trzeci",
  fourth: "czwarty",
  fifth: "piąty",
  weekday: "dzień roboczy",
  weekend: "weekend",

  // Days of week
  daysLong: [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
  ],
  daysShort: ["Nie", "Pon", "Wto", "Śro", "Czw", "Pią", "Sob"],
  daysNarrow: ["N", "P", "W", "Ś", "C", "P", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Sty",
    "Lut",
    "Mar",
    "Kwi",
    "Maj",
    "Cze",
    "Lip",
    "Sie",
    "Wrz",
    "Paź",
    "Lis",
    "Gru",
  ],
  monthsNarrow: ["S", "L", "M", "K", "M", "C", "L", "S", "W", "P", "L", "G"],

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
  midnight: "północ",
  noon: "południe",

  // Complex patterns
  between: "między",
  through: "przez",
  starting: "zaczynając",
  ending: "kończąc",
  except: "oprócz",

  // Week of year
  weekOfYear: "tydzień roku",
  weekOfYearShort: "tydzień",

  // Timezone
  timezone: "strefa czasowa",
  utc: "UTC",
  local: "czas lokalny",

  // EOD
  endOfDuration: "koniec czasu trwania",
  untilTheEndOf: "do końca",
};
