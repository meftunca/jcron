// src/humanize/locales/it.ts
// Italian locale strings for humanization

import { LocaleStrings } from "../types";

export const itLocale: LocaleStrings = {
  // Time-related
  at: "alle",
  every: "ogni",
  on: "il",
  in: "in",
  of: "di",
  and: "e",
  or: "o",
  everyDay: "ogni giorno",
  // Frequency
  second: "secondo",
  seconds: "secondi",
  minute: "minuto",
  minutes: "minuti",
  hour: "ora",
  hours: "ore",
  day: "giorno",
  days: "giorni",
  week: "settimana",
  weeks: "settimane",
  month: "mese",
  months: "mesi",
  year: "anno",
  years: "anni",

  // Special patterns
  last: "ultimo",
  first: "primo",
  secondOrdinal: "secondo",
  third: "terzo",
  fourth: "quarto",
  fifth: "quinto",
  weekday: "giorno feriale",
  weekend: "fine settimana",

  // Days of week
  daysLong: [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ],
  daysShort: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  daysNarrow: ["D", "L", "M", "M", "G", "V", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ],
  monthsNarrow: ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"],

  // Ordinals
  ordinals: [
    "1º",
    "2º",
    "3º",
    "4º",
    "5º",
    "6º",
    "7º",
    "8º",
    "9º",
    "10º",
    "11º",
    "12º",
    "13º",
    "14º",
    "15º",
    "16º",
    "17º",
    "18º",
    "19º",
    "20º",
    "21º",
    "22º",
    "23º",
    "24º",
    "25º",
    "26º",
    "27º",
    "28º",
    "29º",
    "30º",
    "31º",
  ],

  // Special expressions
  midnight: "mezzanotte",
  noon: "mezzogiorno",

  // Complex patterns
  between: "tra",
  through: "fino a",
  starting: "iniziando",
  ending: "finendo",
  except: "eccetto",

  // Week of year
  weekOfYear: "settimana dell'anno",
  weekOfYearShort: "settimana",

  // Timezone
  timezone: "fuso orario",
  utc: "UTC",
  local: "ora locale",
};
