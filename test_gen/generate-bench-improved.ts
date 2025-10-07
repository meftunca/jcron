// generate-bench.ts - IMPROVED VERSION
// Advanced JCRON Test Data Generator
// 
// Usage:
//   bun run generate-bench.ts --format jsonl --out tests.jsonl
//   bun run generate-bench.ts --format sql --out tests.sql
//
// Options:
//   --format <json|jsonl|sql>  : Output format (default: jsonl)
//   --out <path>               : Output file (default: benchmark_tests.{format})
//   --seed <num>               : Seed for RNG (default: 42)
//   --total <num>              : Total tests to generate (default: 1000)
//   --validPct <0-100>         : Valid test percentage (default: 70)
//   --categories               : Generate tests by realistic categories
//   --woy                      : Include WOY (Week of Year) patterns
//   --eod                      : Include EOD/SOD patterns
//   --special                  : Include L/# special syntax
//   --tableName <name>         : SQL table name (default: jcron_tests)

type TestCase = {
  id: string;
  pattern: string;
  valid: boolean;
  category: string;
  complexity: "simple" | "medium" | "complex" | "extreme";
  timezone?: string;
  fromTime?: string;
  expectedTime?: string;
  note?: string;
  expectedError?: string;
  tags: string[];
};

type Options = {
  format: "json" | "jsonl" | "sql";
  out: string;
  seed: number;
  total: number;
  validPct: number;
  categories: boolean;
  woy: boolean;
  eod: boolean;
  special: boolean;
  tableName: string;
};

// ===================================================================
// 🎲 RANDOM NUMBER GENERATOR
// ===================================================================

function makeRng(seed = 42) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function chance(rng: () => number, p: number) {
  return rng() < p;
}

function int(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function slug(s: string) {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

// ===================================================================
// 📋 REALISTIC PATTERN CATEGORIES
// ===================================================================

const PATTERN_CATEGORIES = {
  // Simple patterns (high frequency use cases)
  simple: [
    { name: "every_minute", pattern: "0 * * * * *", weight: 10 },
    { name: "every_5_minutes", pattern: "0 */5 * * * *", weight: 10 },
    { name: "every_15_minutes", pattern: "0 */15 * * * *", weight: 8 },
    { name: "every_30_minutes", pattern: "0 */30 * * * *", weight: 8 },
    { name: "hourly", pattern: "0 0 * * * *", weight: 10 },
    { name: "every_2_hours", pattern: "0 0 */2 * * *", weight: 6 },
    { name: "every_6_hours", pattern: "0 0 */6 * * *", weight: 6 },
    { name: "daily_midnight", pattern: "0 0 0 * * *", weight: 10 },
    { name: "daily_morning", pattern: "0 0 9 * * *", weight: 10 },
    { name: "daily_evening", pattern: "0 0 18 * * *", weight: 8 },
  ],

  // Business hours patterns
  business: [
    { name: "business_hours_start", pattern: "0 0 9 * * 1-5", weight: 8 },
    { name: "business_hours_end", pattern: "0 0 17 * * 1-5", weight: 8 },
    { name: "lunch_time", pattern: "0 0 12 * * 1-5", weight: 6 },
    { name: "every_hour_business", pattern: "0 0 9-17 * * 1-5", weight: 6 },
    { name: "every_15min_business", pattern: "0 */15 9-17 * * 1-5", weight: 5 },
  ],

  // Weekly patterns
  weekly: [
    { name: "monday_morning", pattern: "0 0 9 * * 1", weight: 6 },
    { name: "friday_evening", pattern: "0 0 17 * * 5", weight: 6 },
    { name: "weekend_morning", pattern: "0 0 10 * * 0,6", weight: 5 },
    { name: "sunday_night", pattern: "0 0 23 * * 0", weight: 5 },
  ],

  // Monthly patterns
  monthly: [
    { name: "first_day_of_month", pattern: "0 0 0 1 * *", weight: 6 },
    { name: "last_day_of_month", pattern: "0 0 0 L * *", weight: 6 },
    { name: "middle_of_month", pattern: "0 0 0 15 * *", weight: 5 },
    { name: "first_monday", pattern: "0 0 9 * * 1#1", weight: 4 },
    { name: "last_friday", pattern: "0 0 17 * * 5L", weight: 4 },
  ],

  // Quarterly/Annual patterns
  periodic: [
    { name: "quarterly", pattern: "0 0 0 1 1,4,7,10 *", weight: 4 },
    { name: "first_of_year", pattern: "0 0 0 1 1 *", weight: 4 },
    { name: "last_of_year", pattern: "0 0 23 31 12 *", weight: 4 },
  ],

  // Complex patterns
  complex: [
    { name: "backup_schedule", pattern: "0 30 2 * * *", weight: 5 },
    { name: "report_generation", pattern: "0 0 8 1 * *", weight: 5 },
    { name: "maintenance_window", pattern: "0 0 2 * * 0", weight: 5 },
    { name: "multi_hour_steps", pattern: "0 0 0,6,12,18 * * *", weight: 4 },
    { name: "specific_weekdays", pattern: "0 0 9 * * 1,3,5", weight: 4 },
  ],
};

// ===================================================================
// 🌍 TIMEZONE SUPPORT
// ===================================================================

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles", 
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

// ===================================================================
// 📅 WOY (WEEK OF YEAR) PATTERNS
// ===================================================================

const WOY_PATTERNS = [
  { woy: "1,2,3", desc: "first_3_weeks" },
  { woy: "10,20,30", desc: "every_10_weeks" },
  { woy: "1,13,26,39,52", desc: "quarterly_weeks" },
  { woy: "52,53", desc: "last_weeks" },
  { woy: "*", desc: "all_weeks" },
];

// ===================================================================
// 🕐 EOD/SOD PATTERNS
// ===================================================================

const EOD_SOD_PATTERNS = [
  { modifier: "E1D", desc: "end_of_day" },
  { modifier: "E1W", desc: "end_of_week" },
  { modifier: "E1M", desc: "end_of_month" },
  { modifier: "S1D", desc: "start_of_day" },
  { modifier: "S1W", desc: "start_of_week" },
  { modifier: "S1M", desc: "start_of_month" },
];

// ===================================================================
// ❌ INVALID PATTERN GENERATORS
// ===================================================================

const INVALID_PATTERNS = {
  out_of_range: [
    { pattern: "0 60 * * * *", error: "minute out of range", category: "range_error" },
    { pattern: "0 61 * * * *", error: "minute out of range", category: "range_error" },
    { pattern: "0 99 * * * *", error: "minute out of range", category: "range_error" },
    { pattern: "0 * 24 * * *", error: "hour out of range", category: "range_error" },
    { pattern: "0 * 25 * * *", error: "hour out of range", category: "range_error" },
    { pattern: "0 * 48 * * *", error: "hour out of range", category: "range_error" },
    { pattern: "0 * * 32 * *", error: "day out of range", category: "range_error" },
    { pattern: "0 * * 33 * *", error: "day out of range", category: "range_error" },
    { pattern: "0 * * 99 * *", error: "day out of range", category: "range_error" },
    { pattern: "0 * * * 13 *", error: "month out of range", category: "range_error" },
    { pattern: "0 * * * 14 *", error: "month out of range", category: "range_error" },
    { pattern: "0 * * * 99 *", error: "month out of range", category: "range_error" },
    { pattern: "0 * * * * 7", error: "dow out of range", category: "range_error" },
    { pattern: "0 * * * * 8", error: "dow out of range", category: "range_error" },
    { pattern: "0 * * * * 99", error: "dow out of range", category: "range_error" },
    { pattern: "0 */61 * * * *", error: "step out of range", category: "range_error" },
    { pattern: "0 * */25 * * *", error: "step out of range", category: "range_error" },
    { pattern: "0 * * */32 * *", error: "step out of range", category: "range_error" },
    { pattern: "0 * * * */13 *", error: "step out of range", category: "range_error" },
    { pattern: "0 * * * * */7", error: "step out of range", category: "range_error" },
  ],
  
  syntax_errors: [
    { pattern: "0 * * * *", error: "missing fields", category: "syntax_error" },
    { pattern: "* * * * *", error: "missing second field", category: "syntax_error" },
    { pattern: "0 * * *", error: "only 4 fields", category: "syntax_error" },
    { pattern: "0 * *", error: "only 3 fields", category: "syntax_error" },
    { pattern: "0 *", error: "only 2 fields", category: "syntax_error" },
    { pattern: "0", error: "only 1 field", category: "syntax_error" },
    { pattern: "0 * * * * * *", error: "too many fields", category: "syntax_error" },
    { pattern: "0 * * * * * * *", error: "8 fields", category: "syntax_error" },
    { pattern: "a * * * * *", error: "invalid character", category: "syntax_error" },
    { pattern: "0 b * * * *", error: "invalid character", category: "syntax_error" },
    { pattern: "0 * c * * *", error: "invalid character", category: "syntax_error" },
    { pattern: "0 * * d * *", error: "invalid character", category: "syntax_error" },
    { pattern: "0 * * * e *", error: "invalid character", category: "syntax_error" },
    { pattern: "0 * * * * f", error: "invalid character", category: "syntax_error" },
    { pattern: "0 */0 * * * *", error: "step cannot be zero", category: "syntax_error" },
    { pattern: "0 * */0 * * *", error: "step cannot be zero", category: "syntax_error" },
    { pattern: "0 * * */0 * *", error: "step cannot be zero", category: "syntax_error" },
    { pattern: "0 * * * */0 *", error: "step cannot be zero", category: "syntax_error" },
    { pattern: "0 * * * * */0", error: "step cannot be zero", category: "syntax_error" },
    { pattern: "0 10-5 * * * *", error: "invalid range", category: "syntax_error" },
    { pattern: "0 * 20-10 * * *", error: "invalid range", category: "syntax_error" },
    { pattern: "0 * * 25-10 * *", error: "invalid range", category: "syntax_error" },
    { pattern: "0 * * * 12-6 *", error: "invalid range", category: "syntax_error" },
    { pattern: "0 * * * * 5-2", error: "invalid range", category: "syntax_error" },
    { pattern: "0 * * * * *,", error: "trailing comma", category: "syntax_error" },
    { pattern: "0 *, * * * *", error: "leading comma", category: "syntax_error" },
    { pattern: "0 *,, * * * *", error: "double comma", category: "syntax_error" },
    { pattern: "0 - * * * *", error: "lone dash", category: "syntax_error" },
    { pattern: "0 / * * * *", error: "lone slash", category: "syntax_error" },
    { pattern: "0 */ * * * *", error: "missing step value", category: "syntax_error" },
    { pattern: "0 *// * * * *", error: "double slash", category: "syntax_error" },
  ],
  
  special_syntax_errors: [
    { pattern: "0 0 0 * * 7#1", error: "dow 7 with #", category: "special_error" },
    { pattern: "0 0 0 * * 1#6", error: "nth > 5", category: "special_error" },
    { pattern: "0 0 0 * * 1#7", error: "nth > 5", category: "special_error" },
    { pattern: "0 0 0 * * 1#99", error: "nth > 5", category: "special_error" },
    { pattern: "0 0 0 * * 1#0", error: "nth < 1", category: "special_error" },
    { pattern: "0 0 0 * * 7#2", error: "dow 7 with #", category: "special_error" },
    { pattern: "0 0 0 32W * *", error: "invalid W day", category: "special_error" },
    { pattern: "0 0 0 33W * *", error: "invalid W day", category: "special_error" },
    { pattern: "0 0 0 0W * *", error: "invalid W day", category: "special_error" },
    { pattern: "0 0 0 99W * *", error: "invalid W day", category: "special_error" },
    { pattern: "0 0 0 * * LX", error: "invalid L syntax", category: "special_error" },
    { pattern: "0 0 0 * * 7L", error: "dow 7 with L", category: "special_error" },
    { pattern: "0 0 0 * * 8L", error: "dow > 6 with L", category: "special_error" },
    { pattern: "0 0 0 LL * *", error: "double L", category: "special_error" },
    { pattern: "0 0 0 * * ##", error: "double #", category: "special_error" },
    { pattern: "0 0 0 WW * *", error: "double W", category: "special_error" },
  ],
  
  timezone_errors: [
    { pattern: "TZ:Invalid/Zone 0 * * * * *", error: "invalid timezone", category: "tz_error" },
    { pattern: "TZ:Fake/City 0 * * * * *", error: "invalid timezone", category: "tz_error" },
    { pattern: "TZ:Bad/Place 0 * * * * *", error: "invalid timezone", category: "tz_error" },
    { pattern: "TZ:Wrong/Tz 0 * * * * *", error: "invalid timezone", category: "tz_error" },
    { pattern: "TZ: 0 * * * * *", error: "empty timezone", category: "tz_error" },
    { pattern: "TZ:0 * * * * *", error: "numeric timezone", category: "tz_error" },
    { pattern: "TZ:123 0 * * * * *", error: "numeric timezone", category: "tz_error" },
    { pattern: "TZ:UTC+25 0 * * * * *", error: "invalid offset", category: "tz_error" },
    { pattern: "TZ:UTC-15 0 * * * * *", error: "invalid offset", category: "tz_error" },
  ],
  
  woy_errors: [
    { pattern: "0 0 0 * * * WOY:54", error: "woy > 53", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:55", error: "woy > 53", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:99", error: "woy > 53", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:0", error: "woy < 1", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:", error: "empty woy", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:abc", error: "non-numeric woy", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:1,54", error: "woy > 53 in list", category: "woy_error" },
    { pattern: "0 0 0 * * * WOY:1,0", error: "woy < 1 in list", category: "woy_error" },
  ],
};

// ===================================================================
// 🎯 PATTERN GENERATOR
// ===================================================================

function generateRealisticPattern(
  rng: () => number,
  opts: Options,
  testId: number
): TestCase {
  const categories = Object.keys(PATTERN_CATEGORIES) as Array<keyof typeof PATTERN_CATEGORIES>;
  const category = pick(rng, categories);
  const templates = PATTERN_CATEGORIES[category];
  
  // Weight-based selection
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
  let rand = rng() * totalWeight;
  let selected = templates[0];
  
  for (const template of templates) {
    rand -= template.weight;
    if (rand <= 0) {
      selected = template;
      break;
    }
  }
  
  let pattern = selected.pattern;
  let complexity: TestCase["complexity"] = "simple";
  let tags: string[] = [category, selected.name];
  
  // Add timezone (50% chance)
  let timezone: string | undefined;
  if (chance(rng, 0.5)) {
    timezone = pick(rng, TIMEZONES);
    pattern = `TZ:${timezone} ${pattern}`;
    tags.push("with_timezone");
    complexity = "medium";
  }
  
  // Add WOY (20% chance if enabled)
  if (opts.woy && chance(rng, 0.2)) {
    const woyPattern = pick(rng, WOY_PATTERNS);
    pattern = `${pattern} WOY:${woyPattern.woy}`;
    tags.push("with_woy", woyPattern.desc);
    complexity = "complex";
  }
  
  // Add EOD/SOD (15% chance if enabled)
  if (opts.eod && chance(rng, 0.15)) {
    const eodPattern = pick(rng, EOD_SOD_PATTERNS);
    pattern = `${pattern} ${eodPattern.modifier}`;
    tags.push("with_eod_sod", eodPattern.desc);
    complexity = "complex";
  }
  
  // Determine complexity
  if (pattern.includes("WOY") && pattern.includes("TZ") && (pattern.includes("E1") || pattern.includes("S1"))) {
    complexity = "extreme";
  }
  
  // Generate fromTime
  const fromTime = randomFromTime(rng);
  
  // Calculate expectedTime (next trigger time after fromTime)
  const expectedTime = calculateExpectedTime(pattern, fromTime);
  
  return {
    id: `${testId.toString().padStart(6, "0")}-${slug(selected.name)}`,
    pattern,
    valid: true,
    category: `valid_${category}`,
    complexity,
    timezone,
    fromTime,
    expectedTime,
    tags,
  };
}

function generateInvalidPattern(
  rng: () => number,
  testId: number
): TestCase {
  // Pick error category
  const errorCategories = Object.keys(INVALID_PATTERNS) as Array<keyof typeof INVALID_PATTERNS>;
  const errorCategory = pick(rng, errorCategories);
  const templates = INVALID_PATTERNS[errorCategory];
  const selected = pick(rng, templates);
  
  // Add randomization to make patterns unique
  let pattern = selected.pattern;
  
  // For range errors, randomize the out-of-range value
  if (errorCategory === "out_of_range") {
    if (pattern.includes("60")) {
      pattern = pattern.replace("60", String(60 + int(rng, 0, 39))); // 60-99
    } else if (pattern.includes("24")) {
      pattern = pattern.replace("24", String(24 + int(rng, 0, 24))); // 24-48
    } else if (pattern.includes("32")) {
      pattern = pattern.replace("32", String(32 + int(rng, 0, 67))); // 32-99
    } else if (pattern.includes("13")) {
      pattern = pattern.replace("13", String(13 + int(rng, 0, 86))); // 13-99
    } else if (pattern.includes(" 7") || pattern.includes("*7")) {
      pattern = pattern.replace(/([* ])7/, `$1${7 + int(rng, 0, 92)}`); // 7-99
    }
  }
  
  // For syntax errors, vary the invalid character or position
  if (errorCategory === "syntax_errors" && pattern.match(/[a-f]/)) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const randomChar = chars[int(rng, 0, chars.length - 1)];
    pattern = pattern.replace(/[a-f]/, randomChar);
  }
  
  // For timezone errors, vary the fake timezone
  if (errorCategory === "timezone_errors" && pattern.includes("TZ:")) {
    const fakeZones = [
      "Invalid/Zone", "Fake/City", "Bad/Place", "Wrong/Tz",
      "Nowhere/Land", "Ghost/Town", "Lost/City", "Empty/Space",
      "Null/Void", "Unknown/Area", "Missing/Region", "False/Territory"
    ];
    const zone = pick(rng, fakeZones);
    pattern = pattern.replace(/TZ:\w+\/\w+/, `TZ:${zone}`);
  }
  
  // For WOY errors with numbers, randomize the value
  if (errorCategory === "woy_errors" && pattern.match(/WOY:\d+/)) {
    if (pattern.includes("54")) {
      pattern = pattern.replace("54", String(54 + int(rng, 0, 45))); // 54-99
    } else if (pattern.includes("55")) {
      pattern = pattern.replace("55", String(55 + int(rng, 0, 44))); // 55-99
    } else if (pattern.includes("99")) {
      pattern = pattern.replace("99", String(99 + int(rng, 0, 900))); // 99-999
    }
  }
  
  return {
    id: `${testId.toString().padStart(6, "0")}-invalid-${slug(selected.category)}`,
    pattern,
    valid: false,
    category: `invalid_${selected.category}`,
    complexity: "simple",
    expectedError: selected.error,
    tags: ["invalid", errorCategory, selected.category],
  };
}

function randomFromTime(rng: () => number): string {
  // Random time in 2025
  const start = Date.UTC(2025, 0, 1, 0, 0, 0);
  const end = Date.UTC(2025, 11, 31, 23, 59, 59);
  const t = int(rng, Math.floor(start / 1000), Math.floor(end / 1000)) * 1000;
  return new Date(t).toISOString();
}

function calculateExpectedTime(pattern: string, fromTime: string): string {
  // Parse fromTime
  const from = new Date(fromTime);
  
  // Extract modifiers before removing them
  const hasWOY = /\s+WOY:(\S+)/.test(pattern);
  const woyMatch = pattern.match(/\s+WOY:(\S+)/);
  const woyValue = woyMatch ? woyMatch[1] : null;
  
  const hasEOD = /\s+[ES]\d[DWMY]/.test(pattern);
  const eodMatch = pattern.match(/\s+([ES]\d[DWMY])/);
  const eodModifier = eodMatch ? eodMatch[1] : null;
  
  // Extract base cron pattern (remove TZ, WOY, EOD prefixes/suffixes)
  let cronPattern = pattern.replace(/^TZ:\S+\s+/, ""); // Remove timezone
  cronPattern = cronPattern.replace(/\s+WOY:\S+/, ""); // Remove WOY
  cronPattern = cronPattern.replace(/\s+[ES]\d[DWMY]/, ""); // Remove EOD/SOD
  cronPattern = cronPattern.trim();
  
  // Parse cron fields: second minute hour day month dow
  const parts = cronPattern.split(/\s+/);
  if (parts.length !== 6) {
    // Invalid pattern, return fromTime + 1 minute
    return new Date(from.getTime() + 60000).toISOString();
  }
  
  const [secPart, minPart, hourPart, dayPart, monthPart, dowPart] = parts;
  
  // Helper to check if part matches a value
  const matches = (part: string, value: number, max: number): boolean => {
    if (part === "*") return true;
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepVal = parseInt(step) || 1;
      if (range === "*") return value % stepVal === 0;
      return false; // Simplified
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      return value >= start && value <= end;
    }
    if (part.includes(",")) {
      return part.split(",").map(Number).includes(value);
    }
    return parseInt(part) === value;
  };
  
  // Start from fromTime and find next matching time
  let next = new Date(from.getTime());
  let calculatedNext = false;
  
  // Simple algorithm: advance time until we find a match
  // For realistic test data, we'll use simple heuristics
  
  // If it's "every X minutes" pattern (e.g., "0 */5 * * * *")
  if (secPart === "0" && minPart.startsWith("*/") && !calculatedNext) {
    const step = parseInt(minPart.split("/")[1]) || 1;
    const currentMin = next.getUTCMinutes();
    const nextMin = Math.ceil((currentMin + 1) / step) * step;
    
    if (nextMin >= 60) {
      next.setUTCHours(next.getUTCHours() + 1);
      next.setUTCMinutes(0);
    } else {
      next.setUTCMinutes(nextMin);
    }
    next.setUTCSeconds(0);
    next.setUTCMilliseconds(0);
    calculatedNext = true;
  }
  
  // If it's hourly (e.g., "0 0 * * * *")
  if (secPart === "0" && minPart === "0" && hourPart === "*" && !calculatedNext) {
    next.setUTCHours(next.getUTCHours() + 1);
    next.setUTCMinutes(0);
    next.setUTCSeconds(0);
    next.setUTCMilliseconds(0);
    calculatedNext = true;
  }
  
  // If it's daily at specific time (e.g., "0 0 9 * * *")
  if (secPart === "0" && minPart === "0" && !hourPart.includes("*") && !calculatedNext) {
    const targetHour = parseInt(hourPart);
    next.setUTCHours(targetHour);
    next.setUTCMinutes(0);
    next.setUTCSeconds(0);
    next.setUTCMilliseconds(0);
    
    // If we've passed that hour today, move to tomorrow
    if (next <= from) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    calculatedNext = true;
  }
  
  // If it's first day of month (e.g., "0 0 0 1 * *")
  if (dayPart === "1" && !dayPart.includes("*") && !calculatedNext) {
    next.setUTCDate(1);
    next.setUTCHours(parseInt(hourPart) || 0);
    next.setUTCMinutes(parseInt(minPart) || 0);
    next.setUTCSeconds(parseInt(secPart) || 0);
    next.setUTCMilliseconds(0);
    
    // If we've passed this month's 1st, move to next month
    if (next <= from) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
    calculatedNext = true;
  }
  
  // If it's last day of month ("L")
  if (dayPart === "L" && !calculatedNext) {
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
    next.setUTCDate(lastDay.getUTCDate());
    next.setUTCHours(parseInt(hourPart) || 0);
    next.setUTCMinutes(parseInt(minPart) || 0);
    next.setUTCSeconds(parseInt(secPart) || 0);
    next.setUTCMilliseconds(0);
    
    if (next <= from) {
      next.setUTCMonth(next.getUTCMonth() + 1);
      const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
      next.setUTCDate(lastDay.getUTCDate());
    }
    calculatedNext = true;
  }
  
  // Default: add time based on pattern complexity if not yet calculated
  if (!calculatedNext) {
    let addMs = 5 * 60 * 1000; // 5 minutes default
    
    if (pattern.includes("WOY") || pattern.includes("#") || pattern.includes("L")) {
      addMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    } else if (monthPart !== "*" || dayPart !== "*") {
      addMs = 24 * 60 * 60 * 1000; // 1 day
    } else if (hourPart !== "*") {
      addMs = 60 * 60 * 1000; // 1 hour
    }
    
    next = new Date(from.getTime() + addMs);
  }
  
  // ===================================================================
  // 📅 Apply WOY (Week of Year) filtering
  // ===================================================================
  if (hasWOY && woyValue) {
    // WOY filters execution to specific weeks
    // For simplicity, if current week doesn't match, advance to next matching week
    
    const getWeekNumber = (date: Date): number => {
      const target = new Date(date.getTime());
      target.setUTCHours(0, 0, 0, 0);
      target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    
    const currentWeek = getWeekNumber(next);
    
    // Parse WOY value (can be "1,2,3" or "10,20,30" or "*")
    if (woyValue !== "*") {
      const allowedWeeks = woyValue.split(",").map(Number);
      
      // If current week is not in allowed weeks, jump to next allowed week
      if (!allowedWeeks.includes(currentWeek)) {
        // Find next allowed week
        const nextAllowedWeek = allowedWeeks.find(w => w > currentWeek) || allowedWeeks[0];
        
        if (nextAllowedWeek && nextAllowedWeek > currentWeek) {
          // Jump forward (nextAllowedWeek - currentWeek) weeks
          next.setUTCDate(next.getUTCDate() + (nextAllowedWeek - currentWeek) * 7);
        } else if (nextAllowedWeek) {
          // Wrap to next year's week
          next.setUTCFullYear(next.getUTCFullYear() + 1);
          next.setUTCMonth(0);
          next.setUTCDate(1 + (nextAllowedWeek - 1) * 7);
        }
      }
    }
  }
  
  // ===================================================================
  // 🕐 Apply EOD/SOD (End/Start of Day/Week/Month) modifiers
  // ===================================================================
  if (hasEOD && eodModifier) {
    // EOD/SOD modifiers adjust the execution time
    // E1D = End of Day (23:59:59)
    // S1D = Start of Day (00:00:00)
    // E1W = End of Week (Sunday 23:59:59)
    // S1W = Start of Week (Monday 00:00:00)
    // E1M = End of Month (last day 23:59:59)
    // S1M = Start of Month (first day 00:00:00)
    
    const modifier = eodModifier;
    const isEnd = modifier.startsWith("E");
    const period = modifier.charAt(2); // D, W, M, Y
    
    if (period === "D") {
      // Day modifier
      if (isEnd) {
        next.setUTCHours(23, 59, 59, 999);
      } else {
        next.setUTCHours(0, 0, 0, 0);
      }
    } else if (period === "W") {
      // Week modifier
      if (isEnd) {
        // End of week = Sunday
        const dayOfWeek = next.getUTCDay();
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        next.setUTCDate(next.getUTCDate() + daysToSunday);
        next.setUTCHours(23, 59, 59, 999);
      } else {
        // Start of week = Monday
        const dayOfWeek = next.getUTCDay();
        const daysToMonday = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
        next.setUTCDate(next.getUTCDate() + daysToMonday);
        next.setUTCHours(0, 0, 0, 0);
      }
    } else if (period === "M") {
      // Month modifier
      if (isEnd) {
        // End of month = last day
        const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
        next.setUTCDate(lastDay.getUTCDate());
        next.setUTCHours(23, 59, 59, 999);
      } else {
        // Start of month = first day
        next.setUTCDate(1);
        next.setUTCHours(0, 0, 0, 0);
      }
    }
  }
  
  return next.toISOString();
}

// ===================================================================
// 💾 OUTPUT FORMATTERS
// ===================================================================

function formatJSON(tests: TestCase[], meta: any): string {
  return JSON.stringify({ meta, tests }, null, 2);
}

function formatJSONL(tests: TestCase[]): string {
  return tests.map(test => JSON.stringify(test)).join("\n");
}

function formatSQL(tests: TestCase[], tableName: string): string {
  const lines: string[] = [];
  
  // Create table
  lines.push(`-- JCRON Test Cases`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Total tests: ${tests.length}`);
  lines.push(``);
  lines.push(`DROP TABLE IF EXISTS ${tableName};`);
  lines.push(``);
  lines.push(`CREATE TABLE ${tableName} (`);
  lines.push(`  id TEXT PRIMARY KEY,`);
  lines.push(`  pattern TEXT NOT NULL,`);
  lines.push(`  valid BOOLEAN NOT NULL,`);
  lines.push(`  category TEXT NOT NULL,`);
  lines.push(`  complexity TEXT NOT NULL,`);
  lines.push(`  timezone TEXT,`);
  lines.push(`  from_time TIMESTAMPTZ,`);
  lines.push(`  expected_time TIMESTAMPTZ,`);
  lines.push(`  note TEXT,`);
  lines.push(`  expected_error TEXT,`);
  lines.push(`  tags TEXT[],`);
  lines.push(`  created_at TIMESTAMPTZ DEFAULT NOW()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`-- Indexes for performance`);
  lines.push(`CREATE INDEX idx_${tableName}_valid ON ${tableName}(valid);`);
  lines.push(`CREATE INDEX idx_${tableName}_category ON ${tableName}(category);`);
  lines.push(`CREATE INDEX idx_${tableName}_complexity ON ${tableName}(complexity);`);
  lines.push(`CREATE INDEX idx_${tableName}_tags ON ${tableName} USING GIN(tags);`);
  lines.push(``);
  
  // Bulk insert (batches of 100)
  lines.push(`-- Bulk insert data`);
  lines.push(`INSERT INTO ${tableName} (`);
  lines.push(`  id, pattern, valid, category, complexity, timezone,`);
  lines.push(`  from_time, expected_time, note, expected_error, tags`);
  lines.push(`) VALUES`);
  
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  
  tests.forEach((test, idx) => {
    const values = [
      `'${test.id.replace(/'/g, "''")}'`,
      `'${test.pattern.replace(/'/g, "''")}'`,
      test.valid ? "TRUE" : "FALSE",
      `'${test.category.replace(/'/g, "''")}'`,
      `'${test.complexity}'`,
      test.timezone ? `'${test.timezone}'` : "NULL",
      test.fromTime ? `'${test.fromTime}'::TIMESTAMPTZ` : "NULL",
      test.expectedTime ? `'${test.expectedTime}'::TIMESTAMPTZ` : "NULL",
      test.note ? `'${test.note.replace(/'/g, "''")}'` : "NULL",
      test.expectedError ? `'${test.expectedError.replace(/'/g, "''")}'` : "NULL",
      `ARRAY[${test.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(", ")}]`,
    ];
    
    // Check if this is the last item in current batch or last item overall
    const isLastInBatch = currentBatch.length === 99 || idx === tests.length - 1;
    const line = `  (${values.join(", ")})${isLastInBatch ? ";" : ","}`;
    currentBatch.push(line);
    
    if (currentBatch.length >= 100 || idx === tests.length - 1) {
      batches.push([...currentBatch]);
      currentBatch = [];
    }
  });
  
  batches.forEach((batch, batchIdx) => {
    if (batchIdx > 0) {
      lines.push(``);
      lines.push(`-- Batch ${batchIdx + 1}`);
      lines.push(`INSERT INTO ${tableName} (`);
      lines.push(`  id, pattern, valid, category, complexity, timezone,`);
      lines.push(`  from_time, expected_time, note, expected_error, tags`);
      lines.push(`) VALUES`);
    }
    lines.push(...batch);
  });
  
  lines.push(``);
  lines.push(`-- Summary statistics`);
  lines.push(`SELECT `);
  lines.push(`  valid,`);
  lines.push(`  complexity,`);
  lines.push(`  COUNT(*) as count`);
  lines.push(`FROM ${tableName}`);
  lines.push(`GROUP BY valid, complexity`);
  lines.push(`ORDER BY valid DESC, complexity;`);
  
  return lines.join("\n");
}

// ===================================================================
// 🔧 CLI PARSER
// ===================================================================

function parseOpts(): Options {
  const argv = Bun.argv.slice(2);
  const get = (k: string, d?: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const has = (k: string) => argv.includes(`--${k}`);
  
  const format = (get("format", "jsonl") as Options["format"]) || "jsonl";
  const ext = format === "sql" ? "sql" : format === "jsonl" ? "jsonl" : "json";
  const out = get("out", `benchmark_tests.${ext}`)!;
  const seed = Number(get("seed", "42"));
  const total = Number(get("total", "1000"));
  const validPct = Number(get("validPct", "70"));
  const tableName = get("tableName", "jcron_tests")!;
  
  return {
    format,
    out,
    seed: Number.isFinite(seed) ? seed : 42,
    total: Number.isFinite(total) ? total : 1000,
    validPct: Math.max(0, Math.min(100, Number.isFinite(validPct) ? validPct : 70)),
    categories: has("categories") || true,
    woy: has("woy"),
    eod: has("eod"),
    special: has("special"),
    tableName,
  };
}

// ===================================================================
// 🚀 MAIN
// ===================================================================

async function main() {
  const opts = parseOpts();
  const rng = makeRng(opts.seed);
  
  console.log("🎯 JCRON Test Generator v2.0");
  console.log(`   Format: ${opts.format}`);
  console.log(`   Output: ${opts.out}`);
  console.log(`   Total: ${opts.total} tests`);
  console.log(`   Valid: ${opts.validPct}%`);
  console.log(`   Features: WOY=${opts.woy}, EOD=${opts.eod}, Special=${opts.special}`);
  console.log("");
  
  const wantValid = Math.round((opts.total * opts.validPct) / 100);
  const wantInvalid = opts.total - wantValid;
  
  const tests: TestCase[] = [];
  const seen = new Set<string>();
  
  // Generate valid tests
  console.log("⏳ Generating valid tests...");
  let testId = 1;
  while (tests.filter(t => t.valid).length < wantValid) {
    const test = generateRealisticPattern(rng, opts, testId++);
    
    const key = `${test.pattern}|${test.fromTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    tests.push(test);
    
    if (tests.length % 100 === 0) {
      process.stdout.write(`\r   Generated: ${tests.length}/${opts.total}`);
    }
  }
  
  // Generate invalid tests
  console.log("\n⏳ Generating invalid tests...");
  let invalidAttempts = 0;
  const maxAttempts = wantInvalid * 10; // Prevent infinite loop
  
  while (tests.filter(t => !t.valid).length < wantInvalid && invalidAttempts < maxAttempts) {
    const test = generateInvalidPattern(rng, testId++);
    invalidAttempts++;
    
    const key = test.pattern; // Only use pattern for invalid tests
    if (seen.has(key)) continue;
    seen.add(key);
    
    tests.push(test);
    
    if (tests.length % 100 === 0) {
      process.stdout.write(`\r   Generated: ${tests.length}/${opts.total}`);
    }
  }
  
  if (invalidAttempts >= maxAttempts) {
    console.warn(`\n⚠️  Warning: Could only generate ${tests.filter(t => !t.valid).length} invalid tests (wanted ${wantInvalid})`);
    console.warn(`    Ran out of unique invalid patterns after ${invalidAttempts} attempts`);
  }
  
  console.log(`\n✅ Generated ${tests.length} tests`);
  
  // Sort by ID
  tests.sort((a, b) => a.id.localeCompare(b.id));
  
  // Format output
  console.log("💾 Formatting output...");
  let output: string;
  
  switch (opts.format) {
    case "json":
      const meta = {
        generator: "generate-bench.ts v2.0",
        created_at: new Date().toISOString(),
        config: opts,
        stats: {
          total: tests.length,
          valid: tests.filter(t => t.valid).length,
          invalid: tests.filter(t => !t.valid).length,
          by_complexity: {
            simple: tests.filter(t => t.complexity === "simple").length,
            medium: tests.filter(t => t.complexity === "medium").length,
            complex: tests.filter(t => t.complexity === "complex").length,
            extreme: tests.filter(t => t.complexity === "extreme").length,
          },
        },
      };
      output = formatJSON(tests, meta);
      break;
    
    case "jsonl":
      output = formatJSONL(tests);
      break;
    
    case "sql":
      output = formatSQL(tests, opts.tableName);
      break;
    
    default:
      throw new Error(`Unknown format: ${opts.format}`);
  }
  
  // Write output
  await Bun.write(opts.out, output);
  
  console.log(`✅ Written to ${opts.out}`);
  console.log("");
  console.log("📊 Statistics:");
  console.log(`   Valid: ${tests.filter(t => t.valid).length}`);
  console.log(`   Invalid: ${tests.filter(t => !t.valid).length}`);
  console.log(`   Simple: ${tests.filter(t => t.complexity === "simple").length}`);
  console.log(`   Medium: ${tests.filter(t => t.complexity === "medium").length}`);
  console.log(`   Complex: ${tests.filter(t => t.complexity === "complex").length}`);
  console.log(`   Extreme: ${tests.filter(t => t.complexity === "extreme").length}`);
  console.log("");
  
  if (opts.format === "sql") {
    console.log("🎯 SQL Usage:");
    console.log(`   psql -U postgres -d mydb -f ${opts.out}`);
    console.log(`   docker exec -i postgres_container psql -U postgres -d mydb < ${opts.out}`);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
