# API Reference

Complete API documentation for `@devloops/jcron`.

## Table of Contents

- [Core Functions](#core-functions)
- [Runner Class](#runner-class)
- [Schedule Class](#schedule-class)
- [Engine Class](#engine-class)
- [Humanization](#humanization)
- [Types](#types)
- [Error Handling](#error-handling)

---

## Core Functions

### `getNext(schedule, from?)`

Calculate the next run time for a schedule.

**Signature:**

```typescript
function getNext(schedule: Schedule | string, from?: Date): Date;
```

**Parameters:**

- `schedule`: Schedule object or cron string
- `from` (optional): Start date for calculation (default: `new Date()`)

**Returns:** `Date` - The next scheduled run time

**Example:**

```typescript
import { getNext } from "@devloops/jcron";

// From current time
const next = getNext("0 9 * * *");

// From specific date
const nextFromDate = getNext("0 9 * * *", new Date("2024-12-25"));

// With Schedule object
const schedule = new Schedule({ h: "9", m: "0" });
const nextRun = getNext(schedule);
```

**Throws:**

- `ScheduleError`: If schedule is invalid
- `TimeoutError`: If no valid run time found within 10,000 attempts

---

### `getPrev(schedule, from?)`

Calculate the previous run time for a schedule.

**Signature:**

```typescript
function getPrev(schedule: Schedule | string, from?: Date): Date;
```

**Parameters:**

- `schedule`: Schedule object or cron string
- `from` (optional): Start date for calculation (default: `new Date()`)

**Returns:** `Date` - The previous scheduled run time

**Example:**

```typescript
import { getPrev } from "@devloops/jcron";

const prev = getPrev("0 9 * * *");
const prevFromDate = getPrev("0 9 * * *", new Date("2024-12-25"));
```

**Throws:**

- `ScheduleError`: If schedule is invalid
- `TimeoutError`: If no valid run time found within 10,000 attempts

---

### `isMatch(schedule, date)`

Check if a date matches a schedule.

**Signature:**

```typescript
function isMatch(schedule: Schedule | string, date: Date): boolean;
```

**Parameters:**

- `schedule`: Schedule object or cron string
- `date`: Date to check

**Returns:** `boolean` - `true` if the date matches the schedule

**Example:**

```typescript
import { isMatch } from "@devloops/jcron";

const matches = isMatch("0 9 * * *", new Date("2024-12-25 09:00:00")); // true
const noMatch = isMatch("0 9 * * *", new Date("2024-12-25 10:00:00")); // false
```

---

### `toString(schedule, options?)`

Convert a schedule to a human-readable string.

**Signature:**

```typescript
function toString(
  schedule: Schedule | string,
  options?: HumanizeOptions
): string;
```

**Parameters:**

- `schedule`: Schedule object or cron string
- `options` (optional): Humanization options (see [HumanizeOptions](#humanizeoptions))

**Returns:** `string` - Human-readable description

**Example:**

```typescript
import { toString } from "@devloops/jcron";

toString("0 9 * * *"); // "Daily at 9:00 AM"
toString("0 9 * * *", { locale: "tr" }); // "Günlük saat 9:00"
toString("0 9 * * *", { use24HourTime: true }); // "Daily at 09:00"
```

---

### `toHumanize(schedule, options?)`

Alias for `toString()`.

---

### `fromCronSyntax(cronString)`

Parse a standard cron string into a Schedule object.

**Signature:**

```typescript
function fromCronSyntax(cronString: string, options?: ParseOptions): Schedule;
```

**Parameters:**

- `cronString`: Standard cron string (5-7 fields)

**Returns:** `Schedule` - Parsed schedule object

**Example:**

```typescript
import { fromCronSyntax } from "@devloops/jcron";

const schedule = fromCronSyntax("0 9 * * 1-5");
// Schedule { m: "0", h: "9", D: "*", M: "*", dow: "1-5", ... }
```

**Throws:**

- `ParseError`: If cron string is invalid

---

### `fromJCronString(jcronString)`

Parse a JCRON string into a Schedule object.

**Signature:**

```typescript
function fromJCronString(jcronString: string, options?: ParseOptions): Schedule;
```

**Parameters:**

- `jcronString`: JCRON string with optional extensions

**Returns:** `Schedule` - Parsed schedule object

**Example:**

```typescript
import { fromJCronString } from "@devloops/jcron";

// Standard cron
const schedule1 = fromJCronString("0 9 * * *");

// With timezone
const schedule2 = fromJCronString("0 9 * * * * TZ:America/New_York");

// With EOD
const schedule3 = fromJCronString("0 9 * * * * * E1D");

// With WOY
const schedule4 = fromJCronString("0 9 * * * WOY:33");
```

---

## Runner Class

The `Runner` class manages scheduled tasks.

### Constructor

```typescript
new Runner(options?: RunnerOptions)
```

**Parameters:**

- `options` (optional): Runner configuration options

**Example:**

```typescript
import { Runner } from "@devloops/jcron";

const runner = new Runner();
```

---

### `addFuncCron(cronString, callback)`

Add a function-based cron job.

**Signature:**

```typescript
addFuncCron(cronString: string, callback: () => void | Promise<void>): string
```

**Parameters:**

- `cronString`: Cron expression
- `callback`: Function to execute

**Returns:** `string` - Unique job ID

**Example:**

```typescript
const runner = new Runner();

const jobId = runner.addFuncCron("0 9 * * *", () => {
  console.log("Daily task");
});

// With async callback
runner.addFuncCron("*/15 * * * *", async () => {
  await syncData();
});
```

---

### `addScheduleCron(schedule, callback)`

Add a Schedule-based cron job.

**Signature:**

```typescript
addScheduleCron(schedule: Schedule, callback: () => void | Promise<void>): string
```

**Parameters:**

- `schedule`: Schedule object
- `callback`: Function to execute

**Returns:** `string` - Unique job ID

**Example:**

```typescript
const runner = new Runner();

const schedule = new Schedule({
  h: "9",
  m: "0",
  tz: "America/New_York",
});

runner.addScheduleCron(schedule, () => {
  console.log("NYC morning task");
});
```

---

### `start()`

Start the runner.

**Signature:**

```typescript
start(): void
```

**Example:**

```typescript
runner.start();
```

---

### `stop()`

Stop the runner.

**Signature:**

```typescript
stop(): void
```

**Example:**

```typescript
runner.stop();
```

---

### `remove(jobId)`

Remove a job by ID.

**Signature:**

```typescript
remove(jobId: string): boolean
```

**Parameters:**

- `jobId`: Job ID returned by `addFuncCron()` or `addScheduleCron()`

**Returns:** `boolean` - `true` if job was removed

**Example:**

```typescript
const jobId = runner.addFuncCron("0 9 * * *", callback);
runner.remove(jobId); // true
```

---

### `setLogger(logger)`

Set a custom logger.

**Signature:**

```typescript
setLogger(logger: Logger): void
```

**Parameters:**

- `logger`: Logger object with `error`, `warn`, `info`, `debug` methods

**Example:**

```typescript
runner.setLogger({
  error: (msg, data) => console.error(msg, data),
  warn: (msg, data) => console.warn(msg, data),
  info: (msg, data) => console.info(msg, data),
  debug: (msg, data) => console.debug(msg, data),
});
```

---

## Schedule Class

The `Schedule` class represents a cron schedule.

### Constructor

```typescript
new Schedule(options: ScheduleOptions)
```

**Parameters:**

- `options`: Schedule configuration

**Example:**

```typescript
import { Schedule } from "@devloops/jcron";

const schedule = new Schedule({
  s: "0", // Seconds (0-59)
  m: "0", // Minutes (0-59)
  h: "9", // Hours (0-23)
  D: "*", // Day of month (1-31, L)
  M: "*", // Month (1-12, JAN-DEC)
  dow: "1-5", // Day of week (0-7, SUN-SAT, #, L)
  Y: "*", // Year (1970-3000)
  woy: "*", // Week of year (1-53)
  tz: "UTC", // Timezone (IANA)
  eod: null, // End of duration (E1D, S1W, etc.)
});
```

---

### Schedule Fields

#### `s` - Seconds

- **Range:** `0-59`
- **Special:** `*` (every second)
- **Examples:** `0`, `*/15`, `0,15,30,45`

#### `m` - Minutes

- **Range:** `0-59`
- **Special:** `*` (every minute)
- **Examples:** `0`, `*/15`, `0,15,30,45`

#### `h` - Hours

- **Range:** `0-23`
- **Special:** `*` (every hour)
- **Examples:** `9`, `*/2`, `9-17`

#### `D` - Day of Month

- **Range:** `1-31`
- **Special:** `*` (every day), `L` (last day)
- **Examples:** `1`, `15`, `L`, `1,15`, `1-7`

#### `M` - Month

- **Range:** `1-12` or `JAN-DEC`
- **Special:** `*` (every month)
- **Examples:** `1`, `JAN`, `1-6`, `JAN,JUN,DEC`

#### `dow` - Day of Week

- **Range:** `0-7` or `SUN-SAT` (0 and 7 = Sunday)
- **Special:**
  - `*` (every day)
  - `#` (nth weekday, e.g., `1#2` = 2nd Monday)
  - `L` (last weekday, e.g., `5L` = last Friday)
  - Multiple: `1#1,5#3` (1st Monday and 3rd Friday)
- **Examples:** `1`, `MON`, `1-5`, `1#2`, `5L`, `1#1,5#3`

#### `Y` - Year

- **Range:** `1970-3000`
- **Special:** `*` (every year)
- **Examples:** `2024`, `2024-2026`

#### `woy` - Week of Year

- **Range:** `1-53` (ISO week number)
- **Special:** `*` (every week)
- **Examples:** `33`, `1-10`

#### `tz` - Timezone

- **Format:** IANA timezone identifier
- **Default:** `UTC`
- **Examples:** `America/New_York`, `Europe/London`, `Asia/Tokyo`

#### `eod` - End of Duration

- **Format:** `E{n}{unit}` or `S{n}{unit}` (optional time offset)
- **Units:** `D` (day), `W` (week), `M` (month), `Q` (quarter), `Y` (year)
- **Examples:**
  - `E1D` - End of 1 day
  - `E1W` - End of 1 week
  - `S1M` - Start of 1 month
  - `E1DT12H30M` - End of 1 day + 12 hours 30 minutes

---

## Engine Class

The `Engine` class handles schedule calculations.

### Constructor

```typescript
new Engine(options?: EngineOptions);
```

**Example:**

```typescript
import { Engine } from "@devloops/jcron";

const engine = new Engine();
```

---

### `next(schedule, from)`

Calculate the next run time.

**Signature:**

```typescript
next(schedule: Schedule, from: Date): Date
```

**Parameters:**

- `schedule`: Schedule object
- `from`: Start date

**Returns:** `Date` - Next run time

**Example:**

```typescript
const engine = new Engine();
const schedule = new Schedule({ h: "9", m: "0" });
const next = engine.next(schedule, new Date());
```

---

### `prev(schedule, from)`

Calculate the previous run time.

**Signature:**

```typescript
prev(schedule: Schedule, from: Date): Date
```

---

### `isMatch(schedule, date)`

Check if a date matches a schedule.

**Signature:**

```typescript
isMatch(schedule: Schedule, date: Date): boolean
```

---

## Humanization

### `toHumanize(schedule, options?)`

Convert a schedule to human-readable text.

**Signature:**

```typescript
function toHumanize(
  schedule: Schedule | string,
  options?: HumanizeOptions
): string;
```

**Parameters:**

- `schedule`: Schedule object or cron string
- `options` (optional): Humanization options

**Returns:** `string` - Human-readable description

---

### HumanizeOptions

```typescript
interface HumanizeOptions {
  /** Language/locale for output (default: 'en') */
  locale?: string;

  /** Use 24-hour format (default: false) */
  use24HourTime?: boolean;

  /** Day naming format (default: 'long') */
  dayFormat?: "long" | "short" | "narrow";

  /** Month naming format (default: 'long') */
  monthFormat?: "long" | "short" | "narrow" | "numeric";

  /** Case style (default: 'lower') */
  caseStyle?: "lower" | "upper" | "title";

  /** Include verbose descriptions (default: false) */
  verbose?: boolean;

  /** Include timezone info (default: true) */
  includeTimezone?: boolean;

  /** Include year info (default: true) */
  includeYear?: boolean;

  /** Include week-of-year (default: true) */
  includeWeekOfYear?: boolean;

  /** Include seconds (default: true if seconds specified) */
  includeSeconds?: boolean;

  /** Use ordinal numbers (1st, 2nd) (default: true) */
  useOrdinals?: boolean;

  /** Use shorthand ("weekdays", "weekends") (default: true) */
  useShorthand?: boolean;

  /** Maximum description length */
  maxLength?: number;

  /** Show range descriptions (default: true) */
  showRanges?: boolean;

  /** Show list descriptions (default: true) */
  showLists?: boolean;

  /** Show step descriptions (default: true) */
  showSteps?: boolean;
}
```

**Example:**

```typescript
import { toHumanize } from "@devloops/jcron";

// Basic usage
toHumanize("0 9 * * *");
// "Daily at 9:00 AM"

// Turkish locale
toHumanize("0 9 * * *", { locale: "tr" });
// "Günlük saat 9:00"

// 24-hour format
toHumanize("0 9 * * *", { use24HourTime: true });
// "Daily at 09:00"

// Verbose mode
toHumanize("0 9 * * *", { verbose: true });
// "at 9:00 AM, every day, every month, every year"

// Custom formatting
toHumanize("0 9 * * 1-5", {
  locale: "en",
  use24HourTime: false,
  dayFormat: "short",
  monthFormat: "short",
  caseStyle: "title",
  useShorthand: true,
});
// "At 9:00 AM, On Weekdays"
```

---

### Supported Locales

| Code | Language   | Example Output          |
| ---- | ---------- | ----------------------- |
| `en` | English    | "Daily at 9:00 AM"      |
| `tr` | Turkish    | "Günlük saat 9:00"      |
| `es` | Spanish    | "Diario a las 9:00"     |
| `fr` | French     | "Quotidien à 9:00"      |
| `de` | German     | "Täglich um 9:00"       |
| `pl` | Polish     | "Codziennie o 9:00"     |
| `pt` | Portuguese | "Diário às 9:00"        |
| `it` | Italian    | "Giornaliero alle 9:00" |
| `cz` | Czech      | "Denně v 9:00"          |
| `nl` | Dutch      | "Dagelijks om 9:00"     |

---

## Types

### ScheduleOptions

```typescript
interface ScheduleOptions {
  s?: string | number; // Seconds
  m?: string | number; // Minutes
  h?: string | number; // Hours
  D?: string | number; // Day of month
  M?: string | number; // Month
  dow?: string | number; // Day of week
  Y?: string | number; // Year
  woy?: string | number; // Week of year
  tz?: string; // Timezone
  eod?: EndOfDuration | string | null; // End of duration
}

---

### ParseOptions

```typescript
interface ParseOptions {
  /** Maintain legacy parsing where 5-field cron defaults to seconds=0 (default: true) */
  legacyFieldMapping?: boolean;
  /** Accept trailing timezone tokens in cron syntax (e.g. '0 0 12 * * * UTC') */
  allowTrailingTimezone?: boolean;
  /** When enabled, invalid WOY values will not throw; they will be ignored (default: false) */
  tolerantWoY?: boolean;
}
```

---

### EngineOptions

```typescript
interface EngineOptions {
  /** When enabled, invalid timezones will not throw and will fallback to UTC (default: false) */
  tolerantTimezone?: boolean;
  /** When enabled, next()/prev() will broaden search attempts to avoid throwing edge-case errors (default: false) */
  tolerantNextSearch?: boolean;
  /** When true, Day-of-Month and Day-of-Week fields must both be satisfied (AND semantics) instead of legacy OR (default: false) */
  andDomDow?: boolean;
}
```
```

---

### RunnerOptions

```typescript
interface RunnerOptions {
  logger?: Logger; // Custom logger
}
```

---

### Logger

```typescript
interface Logger {
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  info(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}
```

---

## Error Handling

### Error Types

#### `ScheduleError`

Thrown when a schedule is invalid.

```typescript
try {
  const schedule = fromCronSyntax("invalid");
} catch (error) {
  if (error instanceof ScheduleError) {
    console.error("Invalid schedule:", error.message);
  }
}
```

#### `ParseError`

Thrown when parsing fails.

```typescript
try {
  const schedule = fromJCronString("99 99 * * *");
} catch (error) {
  if (error instanceof ParseError) {
    console.error("Parse error:", error.message);
  }
}
```

#### `TimeoutError`

Thrown when no valid run time is found within the limit.

```typescript
try {
  const next = getNext("0 0 30 2 *"); // February 30th (invalid)
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error("Could not find valid run time");
  }
}
```

---

## Advanced Usage

### Custom Shortcuts

```typescript
// Define custom shortcuts
const SHORTCUTS = {
  "@quarterly": "0 0 1 */3 *",
  "@weekdays": "0 9 * * 1-5",
  "@weekends": "0 10 * * 0,6",
};

// Use in code
runner.addFuncCron(SHORTCUTS["@weekdays"], callback);
```

---

### Batch Operations

```typescript
const runner = new Runner();

const jobs = [
  { cron: "0 9 * * *", task: dailyTask },
  { cron: "0 */6 * * *", task: sixHourlyTask },
  { cron: "*/15 * * * *", task: frequentTask },
];

jobs.forEach(({ cron, task }) => {
  runner.addFuncCron(cron, task);
});

runner.start();
```

---

### Dynamic Job Management

```typescript
const runner = new Runner();
const jobIds = new Map();

function addDynamicJob(name: string, cron: string, callback: () => void) {
  const id = runner.addFuncCron(cron, callback);
  jobIds.set(name, id);
}

function removeDynamicJob(name: string) {
  const id = jobIds.get(name);
  if (id) {
    runner.remove(id);
    jobIds.delete(name);
  }
}

// Add jobs dynamically
addDynamicJob("morning", "0 9 * * *", morningTask);
addDynamicJob("evening", "0 18 * * *", eveningTask);

// Remove later
removeDynamicJob("morning");
```

---

## See Also

- [README](./README.md) - Getting started guide
- [Examples](./EXAMPLES.md) - Real-world examples
- [Build System](./BUILD_SYSTEM.md) - Build configuration
- [React Native](./REACT_NATIVE_COMPATIBILITY.md) - Mobile development
- [Migration Guide](./MIGRATION_GUIDE.md) - Upgrading versions

---

**Last Updated:** 2025-10-07  
**Version:** 1.3.27
