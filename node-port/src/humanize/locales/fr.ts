// src/humanize/locales/fr.ts
// French locale strings for humanization

import { LocaleStrings } from "../types.js";

export const frLocale: LocaleStrings = {
  // Time-related
  at: "à",
  every: "chaque",
  on: "le",
  in: "en",
  of: "de",
  and: "et",
  or: "ou",

  // Frequency
  second: "seconde",
  seconds: "secondes",
  minute: "minute",
  minutes: "minutes",
  hour: "heure",
  hours: "heures",
  day: "jour",
  days: "jours",
  week: "semaine",
  weeks: "semaines",
  month: "mois",
  months: "mois",
  year: "année",
  years: "années",

  // Special patterns
  last: "dernier",
  first: "premier",
  secondOrdinal: "deuxième",
  third: "troisième",
  fourth: "quatrième",
  fifth: "cinquième",
  weekday: "jour de semaine",
  weekend: "week-end",

  // Days of week
  daysLong: [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ],
  daysShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  daysNarrow: ["D", "L", "M", "M", "J", "V", "S"],

  // Months
  monthsLong: [
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
  monthsShort: [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ],
  monthsNarrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

  // Ordinals
  ordinals: [
    "1er",
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
  midnight: "minuit",
  noon: "midi",

  // Complex patterns
  between: "entre",
  through: "jusqu'à",
  starting: "à partir de",
  ending: "se terminant",
  except: "sauf",

  // Week of year
  weekOfYear: "semaine de l'année",
  weekOfYearShort: "semaine",

  // Timezone
  timezone: "fuseau horaire",
  utc: "UTC",
  local: "heure locale",
};
