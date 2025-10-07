// src/humanize/locales/es.ts
// Spanish locale strings for humanization

import { LocaleStrings } from "../types";

export const esLocale: LocaleStrings = {
  // Time-related
  at: "a las",
  every: "cada",
  on: "el",
  in: "en",
  of: "de",
  and: "y",
  or: "o",
  second: "segundo",
  seconds: "segundos",
  minute: "minuto",
  minutes: "minutos",
  hour: "hora",
  hours: "horas",
  day: "día",
  days: "días",
  week: "semana",
  weeks: "semanas",
  month: "mes",
  months: "meses",
  year: "año",
  years: "años",

  // Special patterns
  last: "último",
  first: "primero",
  secondOrdinal: "segundo",
  third: "tercero",
  fourth: "cuarto",
  fifth: "quinto",
  weekday: "día de semana",
  weekend: "fin de semana",
  theMonth: "the month",

  // Natural language shortcuts
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
  everyDay: "cada día",
  everyMonth: "cada mes",
  everyYear: "cada año",
  weekdays: "weekdays",
  weekends: "weekends",

  // Days of week
  daysLong: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  daysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  daysNarrow: ["D", "L", "M", "M", "J", "V", "S"],

  // Months
  monthsLong: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthsShort: [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ],
  monthsNarrow: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

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
  midnight: "medianoche",
  noon: "mediodía",

  // Complex patterns
  between: "entre",
  through: "hasta",
  starting: "comenzando",
  ending: "terminando",
  except: "excepto",

  // Week of year
  weekOfYear: "semana del año",
  weekOfYearShort: "semana",

  // Timezone
  timezone: "zona horaria",
  utc: "UTC",
  local: "hora local",

  // EOD
  endOfDuration: "fin de la duración",
  untilTheEndOf: "hasta el final de",
};
