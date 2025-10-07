// src/humanize/locales/tr.ts
// Turkish locale strings for humanization

import { LocaleStrings } from "../types";

export const trLocale: LocaleStrings = {
  // Time-related
  at: "saat",
  every: "her",
  on: "tarihinde",
  in: "içinde",
  of: "nin",
  and: "ve",
  or: "veya",
  everyDay: "her gün",
  // Frequency
  second: "saniye",
  seconds: "saniye",
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

  // Special patterns
  last: "son",
  first: "ilk",
  secondOrdinal: "ikinci",
  third: "üçüncü",
  fourth: "dördüncü",
  fifth: "beşinci",
  weekday: "hafta içi",
  weekend: "hafta sonu",
  theMonth: "the month",
  weekdays: "weekdays",
  weekends: "weekends",  // Days of week
  daysLong: [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ],
  daysShort: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
  daysNarrow: ["P", "P", "S", "Ç", "P", "C", "C"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ],
  monthsNarrow: ["O", "Ş", "M", "N", "M", "H", "T", "A", "E", "E", "K", "A"],

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
  midnight: "gece yarısı",
  noon: "öğlen",

  // Complex patterns
  between: "arasında",
  through: "boyunca",
  starting: "başlayarak",
  ending: "bitirilerek",
  except: "hariç",

  // Week of year
  weekOfYear: "yılın haftası",
  weekOfYearShort: "hafta",

  // Timezone
  timezone: "saat dilimi",
  utc: "UTC",
  local: "yerel saat",

  // EOD
  endOfDuration: "süre sonu",
  untilTheEndOf: "sonuna kadar",
};
