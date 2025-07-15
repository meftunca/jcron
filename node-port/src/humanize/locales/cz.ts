// src/humanize/locales/cz.ts
// Czech locale strings for humanization

import { LocaleStrings } from "../types.js";

export const czLocale: LocaleStrings = {
  // Time-related
  at: "v",
  every: "každý",
  on: "dne",
  in: "v",
  of: "z",
  and: "a",
  or: "nebo",

  // Frequency
  second: "sekunda",
  seconds: "sekund",
  minute: "minuta",
  minutes: "minut",
  hour: "hodina",
  hours: "hodin",
  day: "den",
  days: "dní",
  week: "týden",
  weeks: "týdnů",
  month: "měsíc",
  months: "měsíců",
  year: "rok",
  years: "let",

  // Special patterns
  last: "poslední",
  first: "první",
  secondOrdinal: "druhý",
  third: "třetí",
  fourth: "čtvrtý",
  fifth: "pátý",
  weekday: "pracovní den",
  weekend: "víkend",

  // Days of week
  daysLong: [
    "Neděle",
    "Pondělí",
    "Úterý",
    "Středa",
    "Čtvrtek",
    "Pátek",
    "Sobota",
  ],
  daysShort: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],
  daysNarrow: ["N", "P", "Ú", "S", "Č", "P", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Led",
    "Úno",
    "Bře",
    "Dub",
    "Kvě",
    "Čer",
    "Čvc",
    "Srp",
    "Zář",
    "Říj",
    "Lis",
    "Pro",
  ],
  monthsNarrow: ["L", "Ú", "B", "D", "K", "Č", "Č", "S", "Z", "Ř", "L", "P"],

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
  midnight: "půlnoc",
  noon: "poledne",

  // Complex patterns
  between: "mezi",
  through: "přes",
  starting: "začíná",
  ending: "končí",
  except: "kromě",

  // Week of year
  weekOfYear: "týden roku",
  weekOfYearShort: "týden",

  // Timezone
  timezone: "časové pásmo",
  utc: "UTC",
  local: "místní čas",
};
