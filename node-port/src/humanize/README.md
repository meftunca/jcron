# JCron Humanize API

A human-readable description generator for jcron expressions, supporting multiple languages and advanced jcron features.

## Features

- 🌍 **Multi-language support**: English, Turkish, French, Spanish, German, Polish, Portuguese, Italian, Czech, Dutch
- 🔄 **Jcron extensions**: Week of Year, timezone support, seconds field
- 📝 **Natural descriptions**: Convert complex cron expressions into readable text
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- ⚡ **Performance optimized**: Direct Schedule object processing

## Quick Start

```typescript
import { fromSchedule, toString } from '@devloops/jcron/humanize';
import { fromCronSyntax, withWeekOfYear } from '@devloops/jcron';

// Basic usage with cron string
console.log(toString("0 9 * * 1-5")); // "at 9:00 AM, on Monday through Friday"

// Using Schedule objects for advanced features
const schedule = fromCronSyntax("0 12 * * *");
const withWeek = withWeekOfYear(schedule, "1");
console.log(fromSchedule(withWeek)); // "at noon, week 1"

// Step patterns
console.log(toString("*/15 * * * *")); // "every 15 minutes"
console.log(toString("0 9-17/2 * * *")); // "at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM, every day"
```

## API Reference

### Core Functions

#### `toString(cronExpression, options?)`
Convert a cron expression string to human-readable text.

```typescript
toString("0 9 * * 1"); // "at 9:00 AM, on Monday"
toString("*/30 * * * *"); // "every 30 minutes"
```

#### `fromSchedule(schedule, options?)`
Convert a jcron Schedule object to human-readable text. **Recommended for advanced features.**

```typescript
const schedule = fromCronSyntax("0 12 * * *");
fromSchedule(schedule); // "at noon, every day"
```

#### `toResult(cronExpression, options?)`
Get detailed analysis of a cron expression.

```typescript
const result = toResult("0 9 * * 1-5");
// Returns: { description, pattern, frequency, components, warnings }
```

### Options

```typescript
interface HumanizeOptions {
  locale?: string;              // Language: 'en', 'tr', 'fr', etc.
  use24HourTime?: boolean;      // 24-hour vs 12-hour format
  dayFormat?: 'long' | 'short' | 'narrow';
  monthFormat?: 'long' | 'short' | 'narrow' | 'numeric';
  caseStyle?: 'lower' | 'upper' | 'title';
  verbose?: boolean;
  includeTimezone?: boolean;
  includeYear?: boolean;
  includeWeekOfYear?: boolean;
  includeSeconds?: boolean;
  useOrdinals?: boolean;
  maxLength?: number;           // Truncate long descriptions
}
```

## Advanced jcron Features

### Week of Year
```typescript
import { fromCronSyntax, withWeekOfYear } from '@devloops/jcron';

const schedule = fromCronSyntax("0 9 * * 1");
const firstWeek = withWeekOfYear(schedule, "1");
fromSchedule(firstWeek); // "at 9:00 AM, on Monday, week 1"

const evenWeeks = withWeekOfYear(schedule, "2,4,6,8,10,12");
fromSchedule(evenWeeks); // "at 9:00 AM, on Monday, weeks 2, 4, 6, 8, 10, and 12"
```

### Timezone Support
```typescript
const schedule = fromCronSyntax("0 12 * * * * * EST");
fromSchedule(schedule); // "at noon, in EST"
```

### Seconds Field
```typescript
toString("30 0 12 * * *"); // "at 12:00:30, every day"
```

## Multi-language Support

```typescript
// Turkish
toString("0 9 * * 1", { locale: 'tr' }); // "saat 09:00, Pazartesi tarihinde"

// French  
toString("0 9 * * 1", { locale: 'fr' }); // "à 09:00, le Lundi"

// German
toString("0 9 * * 1", { locale: 'de' }); // "um 09:00, am Montag"
```

### Supported Locales
- `en` - English
- `tr` - Turkish  
- `fr` - French
- `es` - Spanish
- `de` - German
- `pl` - Polish
- `pt` - Portuguese
- `it` - Italian
- `cz` - Czech
- `nl` - Dutch

## Common Patterns

```typescript
// Shortcuts
toString("@yearly");   // "at midnight, on January 1st"
toString("@monthly");  // "at midnight, on the 1st"
toString("@weekly");   // "at midnight, on Sunday"
toString("@daily");    // "at midnight"
toString("@hourly");   // "at minute 0"

// Step patterns
toString("*/5 * * * *");     // "every 5 minutes"
toString("0 */2 * * *");     // "every 2 hours"
toString("0 9-17/2 * * *");  // "at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM, every day"

// Complex patterns
toString("0 9 1-7 * 1");     // "at 9:00 AM, on day-of-month 1 through 7, on Monday"
toString("0 12 * * 1-5");    // "at noon, on Monday through Friday"
```

## Best Practices

1. **Use Schedule objects for advanced features**: Week of year, timezone, and complex patterns work best with the Schedule API.

2. **Convert cron strings first**: Use `fromCronSyntax()` to convert strings to Schedule objects for maximum compatibility.

3. **Handle errors gracefully**: Invalid expressions return "Invalid cron expression" - check your input format.

4. **Choose appropriate locale**: Auto-detection works well, but explicit locale setting ensures consistency.

```typescript
// ✅ Recommended approach
const schedule = fromCronSyntax("0 9 * * 1-5");
const description = fromSchedule(schedule, { locale: 'en' });

// ✅ Also valid for simple cases  
const description2 = toString("0 9 * * 1-5", { locale: 'en' });
```

## Error Handling

The humanize API is designed to be fault-tolerant:

```typescript
toString("");           // "Invalid cron expression"
toString("invalid");    // "Invalid cron expression"
toString("0 25 * * *"); // "Invalid cron expression" (25 is invalid hour)

// Check for errors in detailed results
const result = toResult("invalid expression");
if (result.warnings.length > 0) {
  console.log("Issues found:", result.warnings);
}
```
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
