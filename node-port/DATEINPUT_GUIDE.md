# DateInput Support - Flexible Date Parameter Handling

## Overview

JCRON now supports **flexible date inputs** across all time-related functions. You can pass dates in three formats:

- `Date` objects
- ISO date strings (e.g., `"2024-01-01"`, `"2024-01-01T10:00:00Z"`)
- Unix timestamps in milliseconds (e.g., `1704067200000`)

This is powered by `date-fns` for high-quality, reliable date parsing.

## Type Definition

```typescript
export type DateInput = Date | string | number;
```

## Examples

### 1. Using Date Objects (Traditional)

```typescript
import { getNext } from '@devloops/jcron';

const pattern = '0 0 12 * * *'; // Daily at noon
const fromDate = new Date('2024-01-01T10:00:00Z');
const next = getNext(pattern, fromDate);
```

### 2. Using ISO Date Strings

```typescript
import { getNext, next_time } from '@devloops/jcron';

// Full ISO 8601 format
const next1 = getNext('0 0 12 * * *', '2024-01-01T10:00:00Z');

// Simple date format (midnight UTC)
const next2 = getNext('0 0 12 * * *', '2024-01-01');

// Unified API also supports strings
const next3 = next_time('0 0 12 * * *', '2024-01-01T10:00:00Z');
```

### 3. Using Unix Timestamps

```typescript
import { getNext, getPrev } from '@devloops/jcron';

const timestamp = 1704110400000; // 2024-01-01T10:00:00Z
const next = getNext('0 0 12 * * *', timestamp);
const prev = getPrev('0 0 12 * * *', timestamp);
```

### 4. Mixed Usage in Real Applications

```typescript
import { getNextN, match, isTime } from '@devloops/jcron';

// Get next 5 executions from string date
const executions = getNextN('0 0 9 * * 1-5', 5, '2024-01-01');

// Check if timestamp matches pattern
const isMatch = match('0 0 12 * * *', 1704110400000);

// Check if it's time to execute (with string date)
const shouldExecute = isTime('0 */5 * * * *', '2024-01-01T12:05:00Z');
```

### 5. V2 API with DateInput

```typescript
import { next_time_v2, next, next_end } from '@devloops/jcron';

// V2 core function
const result1 = next_time_v2('0 0 12 * * * WOY:33', '2024-01-01');

// V2 wrapper functions
const result2 = next('0 0 12 * * *', 'E1W', 1704067200000);
const result3 = next_end('WOY:33', 'E1W', new Date());
```

## Error Handling

The library provides clear error messages for invalid date inputs:

```typescript
import { getNext } from '@devloops/jcron';

try {
  getNext('0 0 12 * * *', 'invalid-date');
} catch (error) {
  // Error: fromTime is not a valid ISO date string: invalid-date
}

try {
  getNext('0 0 12 * * *', NaN);
} catch (error) {
  // Error: fromTime must be a finite number (Unix timestamp)
}

try {
  getNext('0 0 12 * * *', null);
} catch (error) {
  // Error: fromTime is required
}
```

## TypeScript Support

Full TypeScript support with proper type inference:

```typescript
import { DateInput, getNext, next_time } from '@devloops/jcron';

function scheduleJob(pattern: string, startTime: DateInput): Date {
  // All three formats are type-safe
  return getNext(pattern, startTime);
}

// Usage examples - all type-safe!
scheduleJob('0 0 12 * * *', new Date());
scheduleJob('0 0 12 * * *', '2024-01-01');
scheduleJob('0 0 12 * * *', 1704067200000);
```

## API Functions Supporting DateInput

All time-related functions now accept `DateInput`:

### Core Functions
- `getNext(expression, fromTime)`
- `getPrev(expression, fromTime)`
- `getNextN(expression, count, fromTime)`
- `match(expression, date)`
- `isTime(expression, date, toleranceMs?)`

### Unified API
- `next_time(expression, fromTime, timezone?)`
- `prev_time(expression, fromTime, timezone?)`
- `is_time_match(expression, checkTime, tolerance?)`

### V2 API
- `next_time_v2(pattern, base_time, end_of?, start_of?)`
- `next(pattern, modifier?, base_time)`
- `next_end(pattern, modifier?, base_time)`
- `next_start(pattern, modifier?, base_time)`

### Schedule Class Methods
- `schedule.isRangeNow(timeCreated)`
- `schedule.endOf(fromDate?)`
- `schedule.startOf(fromDate?)`

#### Schedule DateInput Examples

```typescript
import { fromJCronString } from '@devloops/jcron';

const schedule = fromJCronString('0 0 12 * * * WOY:33 E1W');

// All three formats work with Schedule methods
schedule.isRangeNow(new Date());
schedule.isRangeNow('2024-08-12T10:00:00Z');
schedule.isRangeNow(1723456800000);

schedule.endOf(new Date('2024-08-01'));
schedule.endOf('2024-08-01');
schedule.endOf(Date.UTC(2024, 7, 1));
schedule.endOf(); // Optional - defaults to current time

schedule.startOf('2024-08-20');
schedule.startOf(new Date('2024-08-20'));
```

## Benefits

✅ **Developer Experience**: Write less boilerplate code  
✅ **Type Safety**: Full TypeScript support for all formats  
✅ **Quality**: Powered by `date-fns` for reliable parsing  
✅ **Backward Compatible**: Existing code with Date objects still works  
✅ **Clear Errors**: Helpful error messages for invalid inputs  
✅ **Flexibility**: Choose the format that fits your use case

## Migration from Strict Date-only API

If you were previously using `new Date()` for current time or converting strings manually:

```typescript
// Before (manual conversion required)
const next = getNext('0 0 12 * * *', new Date('2024-01-01'));

// After (direct string usage)
const next = getNext('0 0 12 * * *', '2024-01-01');
```

```typescript
// Before (current time)
const next = getNext('0 0 12 * * *', new Date());

// After (still works, but you can also use)
const next = getNext('0 0 12 * * *', Date.now());
```

No breaking changes - your existing code continues to work! 🎉
