// src/humanize/locales/pt.ts
// Portuguese locale strings for humanization

import { LocaleStrings } from "../types";

export const ptLocale: LocaleStrings = {
  // Time-related
  at: "às",
  every: "a cada",
  on: "em",
  in: "em",
  of: "de",
  and: "e",
  or: "ou",
  everyDay: "todos os dias",
  // Frequency
  second: "segundo",
  seconds: "segundos",
  minute: "minuto",
  minutes: "minutos",
  hour: "hora",
  hours: "horas",
  day: "dia",
  days: "dias",
  week: "semana",
  weeks: "semanas",
  month: "mês",
  months: "meses",
  year: "ano",
  years: "anos",

  // Special patterns
  last: "último",
  first: "primeiro",
  secondOrdinal: "segundo",
  third: "terceiro",
  fourth: "quarto",
  fifth: "quinto",
  weekday: "dia útil",
  weekend: "fim de semana",

  // Days of week
  daysLong: [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ],
  daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  daysNarrow: ["D", "S", "T", "Q", "Q", "S", "S"],

  // Months
  monthsLong: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  monthsShort: [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ],
  monthsNarrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],

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
  midnight: "meia-noite",
  noon: "meio-dia",

  // Complex patterns
  between: "entre",
  through: "até",
  starting: "começando",
  ending: "terminando",
  except: "exceto",

  // Week of year
  weekOfYear: "semana do ano",
  weekOfYearShort: "semana",

  // Timezone
  timezone: "fuso horário",
  utc: "UTC",
  local: "hora local",

  // EOD
  endOfDuration: "fim da duração",
  untilTheEndOf: "até o final de",
};
