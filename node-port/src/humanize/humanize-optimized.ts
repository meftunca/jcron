// src/humanize-optimized.ts
// Optimize edilmiş humanization fonksiyonları

import { Schedule } from "../schedule";

// Humanization template cache
class HumanizeCache {
  private static templates = new Map<string, string>();
  private static localeCache = new Map<string, Map<string, string>>();
  private static maxCacheSize = 500;
  
  static getTemplate(key: string, locale: string = 'en'): string | undefined {
    const cacheKey = `${locale}:${key}`;
    return this.templates.get(cacheKey);
  }
  
  static setTemplate(key: string, value: string, locale: string = 'en'): void {
    const cacheKey = `${locale}:${key}`;
    
    if (this.templates.size >= this.maxCacheSize) {
      // Use LRU eviction - remove oldest entries
      const firstKey = this.templates.keys().next().value;
      if (firstKey) {
        this.templates.delete(firstKey);
      }
    }
    
    this.templates.set(cacheKey, value);
  }
  
  static getLocaleCache(locale: string): Map<string, string> | undefined {
    return this.localeCache.get(locale);
  }
  
  static setLocaleCache(locale: string, cache: Map<string, string>): void {
    if (this.localeCache.size >= 20) { // Max 20 locales
      // Remove oldest locale cache
      const firstKey = this.localeCache.keys().next().value;
      if (firstKey) {
        this.localeCache.delete(firstKey);
      }
    }
    this.localeCache.set(locale, cache);
  }
  
  static clear(): void {
    this.templates.clear();
    this.localeCache.clear();
  }
}

// Pre-compiled regex patterns for faster parsing
class HumanizePatterns {
  static readonly numbersRegex = /^\d+$/;
  static readonly rangeRegex = /^(\d+)-(\d+)$/;
  static readonly stepRegex = /^(\*|\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)\/(\d+)$/;
  static readonly listRegex = /^(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)$/;
  static readonly everyRegex = /^\*$/;
}

// Fast lookup tables
const MONTH_NAMES_FAST = {
  'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  'tr': ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  'es': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
};

const DAY_NAMES_FAST = {
  'en': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  'tr': ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  'es': ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
};

const ORDINAL_SUFFIXES = {
  'en': { 1: 'st', 2: 'nd', 3: 'rd' },
  'tr': { default: '.' },
  'es': { default: 'º' }
};

const TEMPLATE_STRINGS = {
  'en': {
    every: 'every',
    at: 'at',
    on: 'on',
    minute: 'minute',
    minutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    day: 'day',
    days: 'days',
    week: 'week',
    weeks: 'weeks',
    month: 'month',
    months: 'months',
    year: 'year',
    years: 'years',
    and: 'and',
    past: 'past',
    between: 'between',
    to: 'to'
  },
  'tr': {
    every: 'her',
    at: 'saat',
    on: '',
    minute: 'dakika',
    minutes: 'dakika',
    hour: 'saat',
    hours: 'saat',
    day: 'gün',
    days: 'gün',
    week: 'hafta',
    weeks: 'hafta',
    month: 'ay',
    months: 'ay',
    year: 'yıl',
    years: 'yıl',
    and: 've',
    past: 'geçe',
    between: 'arasında',
    to: 'ile'
  },
  'es': {
    every: 'cada',
    at: 'a las',
    on: 'en',
    minute: 'minuto',
    minutes: 'minutos',
    hour: 'hora',
    hours: 'horas',
    day: 'día',
    days: 'días',
    week: 'semana',
    weeks: 'semanas',
    month: 'mes',
    months: 'meses',
    year: 'año',
    years: 'años',
    and: 'y',
    past: 'pasado',
    between: 'entre',
    to: 'a'
  }
};

export interface HumanizeOptions {
  locale?: string;
  use24HourFormat?: boolean;
  verbose?: boolean;
  includeSeconds?: boolean;
}

export function humanizeOptimized(schedule: Schedule, options: HumanizeOptions = {}): string {
  const locale = options.locale || 'en';
  const cacheKey = generateCacheKey(schedule, options);
  
  // Check cache first
  const cachedResult = HumanizeCache.getTemplate(cacheKey, locale);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Fast humanization
  const result = buildHumanDescription(schedule, options);
  
  // Cache result
  HumanizeCache.setTemplate(cacheKey, result, locale);
  
  return result;
}

function generateCacheKey(schedule: Schedule, options: HumanizeOptions): string {
  // Create a compact cache key
  const optionsKey = `${options.use24HourFormat ? '24' : '12'}${options.verbose ? 'v' : ''}${options.includeSeconds ? 's' : ''}`;
  return `${schedule.s || '*'}_${schedule.m || '*'}_${schedule.h || '*'}_${schedule.D || '*'}_${schedule.M || '*'}_${schedule.dow || '*'}_${schedule.Y || '*'}_${optionsKey}`;
}

function buildHumanDescription(schedule: Schedule, options: HumanizeOptions): string {
  const locale = options.locale || 'en';
  const templates = TEMPLATE_STRINGS[locale as keyof typeof TEMPLATE_STRINGS] || TEMPLATE_STRINGS.en;
  
  // Fast pattern detection
  const pattern = detectPatternOptimized(schedule);
  
  switch (pattern) {
    case 'daily':
      return buildDailyDescription(schedule, templates, options);
    case 'weekly':
      return buildWeeklyDescription(schedule, templates, options);
    case 'monthly':
      return buildMonthlyDescription(schedule, templates, options);
    case 'yearly':
      return buildYearlyDescription(schedule, templates, options);
    default:
      return buildCustomDescription(schedule, templates, options);
  }
}

function detectPatternOptimized(schedule: Schedule): string {
  // Fast pattern detection using pre-computed values
  const isEveryDay = (!schedule.D || schedule.D === '*') && (!schedule.dow || schedule.dow === '*');
  const isEveryWeek = schedule.dow && schedule.dow !== '*' && (!schedule.D || schedule.D === '*' || schedule.D === '?');
  const isEveryMonth = schedule.D && schedule.D !== '*' && schedule.D !== '?' && (!schedule.dow || schedule.dow === '*' || schedule.dow === '?');
  const isEveryYear = schedule.M && schedule.M !== '*';
  
  if (isEveryYear) return 'yearly';
  if (isEveryMonth) return 'monthly';
  if (isEveryWeek) return 'weekly';
  if (isEveryDay) return 'daily';
  
  return 'custom';
}

function buildDailyDescription(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const timeStr = buildTimeString(schedule, templates, options);
  return `${templates.every} ${templates.day} ${templates.at} ${timeStr}`;
}

function buildWeeklyDescription(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const locale = options.locale || 'en';
  const timeStr = buildTimeString(schedule, templates, options);
  const dayStr = parseDayOfWeek(schedule.dow!, locale);
  return `${templates.every} ${dayStr} ${templates.at} ${timeStr}`;
}

function buildMonthlyDescription(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const timeStr = buildTimeString(schedule, templates, options);
  const dayStr = parseDayOfMonth(schedule.D!, templates);
  return `${templates.every} ${templates.month} ${templates.on} ${dayStr} ${templates.at} ${timeStr}`;
}

function buildYearlyDescription(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const locale = options.locale || 'en';
  const timeStr = buildTimeString(schedule, templates, options);
  const monthStr = parseMonth(schedule.M!, locale);
  const dayStr = schedule.D && schedule.D !== '*' ? parseDayOfMonth(schedule.D, templates) : '';
  return `${templates.every} ${templates.year} ${templates.on} ${monthStr}${dayStr ? ' ' + dayStr : ''} ${templates.at} ${timeStr}`;
}

function buildCustomDescription(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const parts: string[] = [];
  
  // Build description from individual components
  if (schedule.m && schedule.m !== '*') {
    parts.push(parseMinute(schedule.m, templates));
  }
  
  if (schedule.h && schedule.h !== '*') {
    parts.push(parseHour(schedule.h, templates, options));
  }
  
  if (schedule.D && schedule.D !== '*') {
    parts.push(parseDayOfMonth(schedule.D, templates));
  }
  
  if (schedule.M && schedule.M !== '*') {
    const locale = options.locale || 'en';
    parts.push(parseMonth(schedule.M, locale));
  }
  
  if (schedule.dow && schedule.dow !== '*') {
    const locale = options.locale || 'en';
    parts.push(parseDayOfWeek(schedule.dow, locale));
  }
  
  return parts.join(' ');
}

function buildTimeString(schedule: Schedule, templates: any, options: HumanizeOptions): string {
  const hour = schedule.h || '0';
  const minute = schedule.m || '0';
  const second = schedule.s || '0';
  
  // Fast time formatting
  const h = hour === '*' ? '00' : hour.padStart(2, '0');
  const m = minute === '*' ? '00' : minute.padStart(2, '0');
  
  if (options.use24HourFormat) {
    if (options.includeSeconds && second !== '*') {
      const s = second.padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    return `${h}:${m}`;
  }
  
  // 12-hour format with fast conversion
  const hourNum = parseInt(h, 10);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  
  return `${displayHour}:${m} ${period}`;
}

function parseMinute(minute: string, templates: any): string {
  if (HumanizePatterns.everyRegex.test(minute)) {
    return `${templates.every} ${templates.minute}`;
  }
  
  if (HumanizePatterns.numbersRegex.test(minute)) {
    const num = parseInt(minute, 10);
    return `${templates.minute} ${num}`;
  }
  
  if (HumanizePatterns.stepRegex.test(minute)) {
    const match = minute.match(HumanizePatterns.stepRegex)!;
    const step = parseInt(match[2], 10);
    return `${templates.every} ${step} ${templates.minutes}`;
  }
  
  return minute;
}

function parseHour(hour: string, templates: any, options: HumanizeOptions): string {
  if (HumanizePatterns.everyRegex.test(hour)) {
    return `${templates.every} ${templates.hour}`;
  }
  
  if (HumanizePatterns.numbersRegex.test(hour)) {
    const num = parseInt(hour, 10);
    if (options.use24HourFormat) {
      return `${templates.hour} ${num.toString().padStart(2, '0')}`;
    } else {
      const period = num >= 12 ? 'PM' : 'AM';
      const displayHour = num === 0 ? 12 : num > 12 ? num - 12 : num;
      return `${displayHour} ${period}`;
    }
  }
  
  return hour;
}

function parseDayOfMonth(day: string, templates: any): string {
  if (HumanizePatterns.numbersRegex.test(day)) {
    const num = parseInt(day, 10);
    return `${templates.day} ${num}`;
  }
  
  return day;
}

function parseMonth(month: string, locale: string): string {
  const monthNames = MONTH_NAMES_FAST[locale as keyof typeof MONTH_NAMES_FAST] || MONTH_NAMES_FAST.en;
  
  if (HumanizePatterns.numbersRegex.test(month)) {
    const num = parseInt(month, 10);
    if (num >= 1 && num <= 12) {
      return monthNames[num - 1];
    }
  }
  
  return month;
}

function parseDayOfWeek(dow: string, locale: string): string {
  const dayNames = DAY_NAMES_FAST[locale as keyof typeof DAY_NAMES_FAST] || DAY_NAMES_FAST.en;
  
  if (HumanizePatterns.numbersRegex.test(dow)) {
    const num = parseInt(dow, 10);
    if (num >= 0 && num <= 7) {
      // Handle both 0=Sunday and 7=Sunday
      const dayIndex = num === 7 ? 0 : num;
      return dayNames[dayIndex];
    }
  }
  
  return dow;
}

// Batch humanization for better performance
export class BatchHumanizer {
  private cache = new Map<string, string>();
  private options: HumanizeOptions;
  
  constructor(options: HumanizeOptions = {}) {
    this.options = options;
  }
  
  humanize(id: string, schedule: Schedule): string {
    const cacheKey = `${id}_${generateCacheKey(schedule, this.options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const result = humanizeOptimized(schedule, this.options);
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  humanizeMultiple(schedules: Map<string, Schedule>): Map<string, string> {
    const results = new Map<string, string>();
    
    for (const [id, schedule] of schedules) {
      results.set(id, this.humanize(id, schedule));
    }
    
    return results;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats(): { cacheSize: number; options: HumanizeOptions } {
    return {
      cacheSize: this.cache.size,
      options: this.options
    };
  }
}

// Export optimized locale support
export const SUPPORTED_LOCALES = ['en', 'tr', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function getSupportedLocales(): readonly string[] {
  return SUPPORTED_LOCALES;
}

export function isLocaleSupported(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
