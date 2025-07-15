// src/humanize/README.md
# JCRON Humanize API

A comprehensive humanization library for cron expressions, inspired by cronstrue but with full support for JCRON's advanced features including week-of-year, special characters, and timezone support.

## Features

### Complete cronstrue Compatibility
- ✅ All standard cron expression patterns
- ✅ Multiple output formats (12/24 hour, short/long names)
- ✅ Case styling options (lower, upper, title)
- ✅ Verbose and compact descriptions
- ✅ Custom locale support

### JCRON Extensions
- ✅ **Week-of-year (ISO 8601) support** - Handle WOY patterns like `"1,3,5"` for odd weeks
- ✅ **Advanced special characters** - Full L (last) and # (nth) pattern support
- ✅ **Timezone awareness** - Include timezone information in descriptions
- ✅ **Complex pattern detection** - Identify and warn about OR logic patterns
- ✅ **Frequency analysis** - Detect execution intervals and patterns

### Advanced Features
- ✅ **Pattern classification** - Categorize as daily, weekly, monthly, yearly, or complex
- ✅ **Next execution calculation** - Predict next run time when possible
- ✅ **Smart warnings** - Detect impossible dates, leap year issues, etc.
- ✅ **Flexible formatting** - Extensive customization options
- ✅ **Performance optimized** - Efficient parsing and caching

## Quick Start

```typescript
import { toString, toResult, fromSchedule } from './humanize/index.js';

// Basic usage (cronstrue-style)
console.log(toString('0 9 * * 1')); 
// "at 9:00 AM, on Monday"

console.log(toString('0 0 12 * * MON', { use24HourTime: true }));
// "at 12:00, on Monday"

// Advanced JCRON features
console.log(toString('0 0 8 * * 1 2025 10')); 
// "at 8:00 AM, on Monday, in week 10, in 2025"

// Detailed result with metadata
const result = toResult('*/15 9-17 * * 1-5');
console.log(result.description);    // "every 15 minutes, between 9:00 AM and 5:00 PM, on Monday through Friday"
console.log(result.pattern);        // "daily"
console.log(result.frequency.type); // "minutes"
console.log(result.nextExecution);  // Next Date object
```

## API Reference

### Basic Functions

#### `toString(cronExpression: string, options?: HumanizeOptions): string`
Converts a cron expression to human-readable text.

```typescript
toString('0 9 * * 1');                    // "at 9:00 AM, on Monday"
toString('0 9 * * 1', { caseStyle: 'title' }); // "At 9:00 AM, On Monday"
```

#### `toResult(cronExpression: string, options?: HumanizeOptions): HumanizeResult`
Returns detailed information about the cron expression.

```typescript
const result = toResult('0 9 * * 1');
// {
//   description: "at 9:00 AM, on Monday",
//   pattern: "weekly",
//   frequency: { type: "weeks", interval: 1, description: "every week" },
//   nextExecution: Date,
//   components: { ... },
//   warnings: []
// }
```

#### `fromSchedule(schedule: Schedule, options?: HumanizeOptions): string`
Humanize a JCRON Schedule object directly.

```typescript
const schedule = new Schedule('0', '9', '*', '*', '*', '1', '2025', '10');
fromSchedule(schedule); // "at 9:00 AM, on Monday, in week 10, in 2025"
```

### Options

```typescript
interface HumanizeOptions {
  locale?: string;              // 'en' (default), custom locales
  use24HourTime?: boolean;      // false (default) = 12-hour with AM/PM
  dayFormat?: 'long' | 'short' | 'narrow';  // 'long' (default)
  monthFormat?: 'long' | 'short' | 'narrow' | 'numeric';
  caseStyle?: 'lower' | 'upper' | 'title';  // 'lower' (default)
  verbose?: boolean;            // false (default) = concise output
  includeTimezone?: boolean;    // true (default)
  includeYear?: boolean;        // true (default)
  includeWeekOfYear?: boolean;  // true (default)
  includeSeconds?: boolean;     // true (default) when seconds specified
  useOrdinals?: boolean;        // true (default) = 1st, 2nd, 3rd
  maxLength?: number;           // 200 (default) = truncate if longer
  showRanges?: boolean;         // true (default)
  showLists?: boolean;          // true (default)
  showSteps?: boolean;          // true (default)
}
```

### Advanced Examples

#### Custom Formatting
```typescript
// 24-hour time with short day names
toString('0 14 * * 1-5', {
  use24HourTime: true,
  dayFormat: 'short',
  caseStyle: 'title'
});
// "At 14:00, On Mon Through Fri"

// Compact format without timezone/year
toString('0 9 1 * * * 2025', {
  includeYear: false,
  includeTimezone: false,
  monthFormat: 'short'
});
// "at 9:00 AM, on 1st"
```

#### Week-of-Year Patterns
```typescript
// Odd weeks only
toString('0 0 12 * * MON', { /* with WOY: "1,3,5,7..." */ });
// "at 12:00 PM, on Monday, in weeks 1, 3, 5, 7, ..."

// Specific week of specific year
toString('0 0 8 * * 1 2025 10');
// "at 8:00 AM, on Monday, in week 10, in 2025"
```

#### Special Characters
```typescript
// Last day patterns
toString('0 0 0 L * *');
// "at midnight, on last day of month"

toString('0 17 * * 5L');
// "at 5:00 PM, on last Friday"

// Nth occurrence patterns  
toString('0 9 * * 1#2');
// "at 9:00 AM, on 2nd Monday"
```

#### Complex Patterns with Warnings
```typescript
const result = toResult('0 0 0 31 2 *');
console.log(result.description); // "at midnight, on 31st, in February"
console.log(result.warnings);    // ["Day 30+ does not exist in February"]
```

### Locale Support

#### Register Custom Locale
```typescript
import { registerLocale } from './humanize/index.js';

registerLocale('tr', {
  at: 'saat',
  every: 'her',
  on: 'günü',
  // ... complete locale object
});

toString('0 9 * * 1', { locale: 'tr' });
// "saat 9:00 AM, Pazartesi günü"
```

### Pattern Detection

The humanizer automatically detects and classifies patterns:

- **daily**: Runs at specific times each day
- **weekly**: Runs on specific days of the week  
- **monthly**: Runs on specific days of the month
- **yearly**: Runs on specific dates
- **complex**: Uses advanced features (L, #, ranges, steps)
- **custom**: Other patterns

### Frequency Analysis

Automatically calculates execution frequency:

```typescript
const result = toResult('*/15 * * * *');
console.log(result.frequency);
// {
//   type: "minutes",
//   interval: 15, 
//   description: "every 15 minutes"
// }
```

## Migration from cronstrue

This library is designed as a drop-in replacement for cronstrue with additional features:

```typescript
// cronstrue
import cronstrue from 'cronstrue';
const desc = cronstrue.toString('0 9 * * 1');

// jcron-humanize (same API)
import { toString } from './humanize/index.js';
const desc = toString('0 9 * * 1');
```

Additional features available:
- Week-of-year support
- Advanced special characters (L, #)
- Timezone handling
- Pattern classification
- Execution prediction
- Smart warnings

## Performance

The humanizer is optimized for performance:
- Lazy evaluation of expensive operations
- Efficient string building
- Cached locale data
- Minimal memory allocations

Typical performance: **~1-5ms** per humanization operation.
