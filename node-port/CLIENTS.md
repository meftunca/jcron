# JCron Client Usage Guide

This guide demonstrates how to use JCron's core functionality for parsing, humanizing, and calculating cron expressions without running scheduled jobs.

## 📝 JCron Syntax Overview

JCron supports standard cron syntax with additional features:

```
┌───────────── second (0-59)
│ ┌─────────── minute (0-59)
│ │ ┌───────── hour (0-23)
│ │ │ ┌─────── day of month (1-31)
│ │ │ │ ┌───── month (1-12 or JAN-DEC)
│ │ │ │ │ ┌─── day of week (0-7 or SUN-SAT, 0 and 7 are Sunday)
│ │ │ │ │ │
* * * * * *
```

### Supported Operators

- `*` - Any value
- `,` - Value list separator (e.g., `1,3,5`)
- `-` - Range of values (e.g., `1-5`)
- `/` - Step values (e.g., `*/15` for every 15 units)
- `L` - Last day of month or last occurrence of weekday
- `#` - Nth occurrence of weekday in month (e.g., `1#3` for 3rd Monday)

### Standard Shortcuts

- `@yearly` or `@annually` - Run once a year (`0 0 0 1 1 *`)
- `@monthly` - Run once a month (`0 0 0 1 * *`)
- `@weekly` - Run once a week (`0 0 0 * * 0`)
- `@daily` or `@midnight` - Run once a day (`0 0 0 * * *`)
- `@hourly` - Run once an hour (`0 0 * * * *`)

## 🔍 Core API Functions

### Basic Parsing and Validation

```typescript
import { fromCronSyntax, isValid, toString, endOfDuration } from '@devloops/jcron';

// Parse cron expression
const schedule = fromCronSyntax('0 30 9 * * MON-FRI');

// Validate cron expression (using isValid - the correct function name)
const valid = isValid('0 30 9 * * MON-FRI');
console.log(valid); // true

// Convert to human readable format
const readable = toString('0 30 9 * * MON-FRI');
console.log(readable); // "At 09:30 on Monday through Friday"

// Calculate end of duration for schedules with EOD
const endDate = endOfDuration('0 9 * * 1-5 EOD:E8h');
console.log(endDate); // 8 hours from now
```

### Next Execution Time

```typescript
import { getNext, fromCronSyntax, Engine } from '@devloops/jcron';

// Get next execution time from now
const nextRun = getNext('0 0 12 * * *');
console.log(nextRun); // Next occurrence of 12:00 PM

// Get next execution from specific date
const specificDate = new Date('2024-01-15T10:00:00Z');
const nextFromDate = getNext('0 0 12 * * *', specificDate);
console.log(nextFromDate); // Next 12:00 PM after Jan 15, 2024 10:00 AM

// Using Engine for more control
const engine = new Engine();
const schedule = fromCronSyntax('0 0 9 * * MON');
const nextMonday = engine.next(schedule, new Date());
console.log(nextMonday); // Next Monday at 9 AM
```

### Previous Execution Time

```typescript
import { getPrev, Engine, fromCronSyntax } from '@devloops/jcron';

// Get previous execution time from now
const lastRun = getPrev('0 0 12 * * *');
console.log(lastRun); // Last occurrence of 12:00 PM

// Get previous execution from specific date
const specificDate = new Date('2024-01-15T14:00:00Z');
const prevFromDate = getPrev('0 0 12 * * *', specificDate);
console.log(prevFromDate); // Last 12:00 PM before Jan 15, 2024 2:00 PM

// Using Engine
const engine = new Engine();
const schedule = fromCronSyntax('0 0 18 * * FRI');
const lastFriday = engine.prev(schedule, new Date());
console.log(lastFriday); // Previous Friday at 6 PM
```

### Check if Time Matches

```typescript
import { match, Engine, fromCronSyntax } from '@devloops/jcron';

// Check if current time matches expression (using match function - actual API)
const matches = match('0 0 12 * * *');
console.log(matches); // true if current time is exactly 12:00 PM

// Check specific date
const testDate = new Date('2024-01-15T12:00:00Z');
const matchesDate = match('0 0 12 * * *', testDate);
console.log(matchesDate); // true

// Using Engine directly for more control
const engine = new Engine();
const schedule = fromCronSyntax('0 0 9 * * MON-FRI');
const mondayMorning = new Date('2024-01-15T09:00:00Z'); // Monday
const isBusinessHour = engine.isMatch(schedule, mondayMorning);
console.log(isBusinessHour); // true if it's Monday 9 AM
```

## �️ Schedule Object & JSON Format

JCron provides multiple ways to create schedules, including a powerful JSON format that uses short field names.

### Schedule Constructor & JSON Fields

```typescript
import { Schedule, fromObject, fromJCronString } from '@devloops/jcron';

// Traditional constructor with full field names
const schedule1 = new Schedule(
    '0',        // second
    '30',       // minute  
    '9',        // hour
    '*',        // dayOfMonth
    '*',        // month
    'MON-FRI',  // dayOfWeek
    undefined,  // year (optional)
    'Europe/Istanbul' // timezone (optional)
);

// JSON format with short field names (recommended)
const schedule2 = fromObject({
    s: '0',           // second
    m: '30',          // minute
    h: '9',           // hour
    dom: '*',         // day of month
    mon: '*',         // month
    dow: 'MON-FRI',   // day of week
    y: undefined,     // year (optional)
    tz: 'Europe/Istanbul' // timezone (optional)
});

// JCron pipe-separated string format
const schedule3 = fromJCronString('0|30|9|*|*|MON-FRI||Europe/Istanbul');

console.log('All schedules are equivalent:', 
    schedule1.toString() === schedule2.toString() && 
    schedule2.toString() === schedule3.toString()
);
```

### JSON Field Reference

| Short | Full Name | Description | Examples |
|-------|-----------|-------------|----------|
| `s` | second | Second (0-59) | `'0'`, `'*/15'`, `'30,45'` |
| `m` | minute | Minute (0-59) | `'0'`, `'*/5'`, `'15,30,45'` |
| `h` | hour | Hour (0-23) | `'9'`, `'9-17'`, `'*/2'` |
| `dom` | dayOfMonth | Day of month (1-31, L) | `'1'`, `'15'`, `'L'`, `'1,15'` |
| `mon` | month | Month (1-12, JAN-DEC) | `'*'`, `'1,6,12'`, `'JAN-MAR'` |
| `dow` | dayOfWeek | Day of week (0-7, SUN-SAT) | `'MON-FRI'`, `'1#3'`, `'5L'` |
| `y` | year | Year (optional) | `'2024'`, `'2024-2026'` |
| `tz` | timezone | Timezone (optional) | `'UTC'`, `'Europe/Istanbul'` |

### Complex JSON Schedule Examples

```typescript
import { fromObject, toString, getNext } from '@devloops/jcron';

// Business hours: 9 AM to 5 PM, weekdays, Istanbul timezone
const businessHours = fromObject({
    s: '0',
    m: '0', 
    h: '9-17',
    dom: '*',
    mon: '*',
    dow: 'MON-FRI',
    tz: 'Europe/Istanbul'
});

// Monthly board meeting: First Monday at 10 AM
const boardMeeting = fromObject({
    s: '0',
    m: '0',
    h: '10',
    dom: '*',
    mon: '*',
    dow: '1#1'  // First Monday of month
});

// Quarterly reports: Last business day of quarter at 6 PM
const quarterlyReport = fromObject({
    s: '0',
    m: '0',
    h: '18',
    dom: 'L',    // Last day of month
    mon: '3,6,9,12', // March, June, September, December
    dow: 'MON-FRI'
});

// Year-end specific: December 31st, 2024 only
const yearEnd2024 = fromObject({
    s: '0',
    m: '0',
    h: '23',
    dom: '31',
    mon: '12',
    dow: '*',
    y: '2024'
});

console.log('Business hours:', toString(businessHours));
console.log('Board meeting:', boardMeeting.toString());  // Using Schedule.toString()
console.log('Next board meeting:', getNext(boardMeeting));
```

## 🎯 End of Duration (EOD) - Advanced Scheduling

EndOfDuration is one of JCron's most powerful features for calculating when recurring schedules will complete or reach specific milestones. It's now fully integrated and accessible through the main API.

### What is End of Duration?

End of Duration calculates:
1. **When should a recurring schedule stop running?** (e.g., daily meetings for 8 hours)
2. **What's the end point for a time-limited schedule?** (e.g., end of month processing)
3. **How to set duration-based termination conditions?** (combined with milestone logic)

### Core EOD API Functions

```typescript
import { 
  endOfDuration, 
  EndOfDuration, 
  EoDHelpers, 
  Schedule,
  fromJCronString 
} from '@devloops/jcron';

// Method 1: Using the endOfDuration convenience function
const endDate1 = endOfDuration('0 9 * * 1-5 EOD:E8h');
console.log('Schedule ends at:', endDate1); // 8 hours from now

// Method 2: Using Schedule.endOf() method
const schedule = fromJCronString('0 30 14 * * * EOD:E2DT4H');
const endDate2 = schedule.endOf();
console.log('Schedule ends at:', endDate2); // 2 days 4 hours from now

// Method 3: Using EOD helpers for common patterns
const monthEndEoD = EoDHelpers.endOfMonth(2, 12, 0); // 2 days 12 hours until end of month
const schedule3 = Schedule.fromObject({
  minute: '0',
  hour: '9',
  dayOfWeek: 'MON-FRI',
  eod: monthEndEoD
});
const endDate3 = schedule3.endOf();
console.log('Schedule ends at:', endDate3); // End of month calculation
```

### EOD Format Reference

```typescript
// Simple format (single unit with START/END reference)
'E30m'    // End + 30 minutes
'S2h'     // Start + 2 hours
'E1d'     // End + 1 day

// Complex format (multiple units with reference points)
'E1DT12H'     // End + 1 day 12 hours
'E2DT4H M'    // End + 2 days 4 hours until end of Month
'E1Y6M Q'     // End + 1 year 6 months until end of Quarter
'E30m E[event_completion]'  // End + 30 minutes until event completion
```

### EOD Helper Functions

```typescript
import { EoDHelpers, ReferencePoint } from '@devloops/jcron';

// Pre-built helpers for common patterns
const endOfDay = EoDHelpers.endOfDay(2, 30, 0);     // 2h 30m until end of day
const endOfWeek = EoDHelpers.endOfWeek(1, 12, 0);   // 1d 12h until end of week  
const endOfMonth = EoDHelpers.endOfMonth(5, 0, 0);  // 5d until end of month
const endOfQuarter = EoDHelpers.endOfQuarter(0, 2, 16); // 2d 16h until end of quarter
const endOfYear = EoDHelpers.endOfYear(1, 0, 12);   // 1d 12h until end of year

// Custom event termination
const untilEvent = EoDHelpers.untilEvent('project_deadline', 4, 0, 0); // 4h until event

console.log('End of month EoD:', endOfMonth.toString()); // "E5D M"
```

### Practical EOD Examples

### Practical EOD Examples

```typescript
import { Schedule, endOfDuration, EoDHelpers, getNext } from '@devloops/jcron';

// Daily standup meetings for 8 hours each day
const dailyStandup = Schedule.fromObject({
  s: '0', m: '30', h: '9', 
  dom: '*', mon: '*', dow: 'MON-FRI',
  eod: 'E8h'  // Run for 8 hours each day
});

console.log('Daily standup schedule:', dailyStandup.toString());
console.log('Standup ends at:', dailyStandup.endOf());

// Weekly project reviews until end of month
const weeklyReview = fromJCronString('0 0 14 * * FRI EOD:E5D M');
console.log('Weekly review ends:', endOfDuration(weeklyReview));

// Quarterly processing that runs until specific deadline
const quarterlyProcess = Schedule.fromObject({
  minute: '0',
  hour: '2',
  dayOfMonth: '1',
  month: '3,6,9,12',
  eod: EoDHelpers.endOfQuarter(0, 10, 0) // 10 days until end of quarter
});

const nextRun = getNext(quarterlyProcess);
const processEnds = quarterlyProcess.endOf(nextRun);
console.log('Process starts:', nextRun.toLocaleDateString());
console.log('Process ends:', processEnds.toLocaleDateString());
```

### Project Planning with EOD

```typescript
import { Schedule, EoDHelpers, endOfDuration } from '@devloops/jcron';

// Sprint planning: Every 2 weeks on Monday for 8 hours
const sprintPlanning = Schedule.fromObject({
  s: '0', m: '0', h: '10',
  dom: '*', mon: '*', dow: 'MON/2',
  eod: 'E8h'  // Each sprint planning session lasts 8 hours
});

// Daily standups with end of month termination
const dailyStandups = Schedule.fromObject({
  s: '0', m: '30', h: '9',
  dom: '*', mon: '*', dow: 'MON-FRI',
  eod: EoDHelpers.endOfMonth(0, 0, 0)
});

// Security scans with quarterly termination
const securityScans = Schedule.fromObject({
  s: '0', m: '0', h: '2',
  dom: '*', mon: '*', dow: 'TUE,THU',
  eod: EoDHelpers.endOfQuarter(1, 0, 0) // 1 day before end of quarter
});

console.log('=== PROJECT SCHEDULING WITH EOD ===');
console.log('Sprint planning schedule:', sprintPlanning.toString());
console.log('Sprint planning ends:', sprintPlanning.endOf()?.toLocaleString());

console.log('Daily standups schedule:', dailyStandups.toString());
console.log('Standups end at:', dailyStandups.endOf()?.toLocaleDateString());

console.log('Security scans schedule:', securityScans.toString());
console.log('Security scans end at:', securityScans.endOf()?.toLocaleDateString());
```

### Event-Based EOD Termination

```typescript
import { EoDHelpers, Schedule } from '@devloops/jcron';

// Automated backups until specific event
const backupSchedule = Schedule.fromObject({
  s: '0', m: '0', h: '*/6',
  dom: '*', mon: '*', dow: '*',
  eod: EoDHelpers.untilEvent('maintenance_window', 2, 0, 0) // 2 hours before maintenance
});

// Development builds until project completion
const devBuilds = Schedule.fromObject({
  minute: '*/30',
  hour: '9-17',
  dayOfWeek: 'MON-FRI',
  eod: EoDHelpers.untilEvent('project_completion', 0, 0, 0)
});

console.log('Backup schedule:', backupSchedule.toString());
console.log('Dev builds schedule:', devBuilds.toString());

// Calculate termination points
const backupEnds = backupSchedule.endOf();
const buildsEnd = devBuilds.endOf();

console.log('Backups terminate at:', backupEnds?.toLocaleString() || 'No end date');
console.log('Builds terminate at:', buildsEnd?.toLocaleString() || 'No end date');
```

### Advanced EOD Calculations

```typescript
import { Schedule, endOfDuration, EoDHelpers } from '@devloops/jcron';

// Complex duration patterns
const complexEoD = new EndOfDuration(
  0,    // years
  1,    // months
  2,    // weeks  
  3,    // days
  4,    // hours
  30,   // minutes
  0,    // seconds
  ReferencePoint.QUARTER, // until end of quarter
  null  // no event identifier
);

const complexSchedule = Schedule.fromObject({
  minute: '0',
  hour: '12',
  dayOfWeek: 'MON',
  eod: complexEoD
});

console.log('Complex schedule:', complexSchedule.toString());
console.log('Complex end date:', complexSchedule.endOf()?.toISOString());

// Duration calculations
const testDate = new Date('2024-07-15T12:00:00Z');
const calculatedEnd = complexEoD.calculateEndDate(testDate);
console.log('From specific date:', calculatedEnd.toISOString());

// Check duration components
console.log('Has duration?', complexEoD.hasDuration());
console.log('Total milliseconds:', complexEoD.toMilliseconds());
```

### EOD Validation and Error Handling

```typescript
import { parseEoD, isValidEoD, Schedule } from '@devloops/jcron';

// Validate EOD strings before use
const eodExpressions = [
  'E8h',           // Valid: 8 hours
  'S30m',          // Valid: 30 minutes from start
  'E2DT4H M',      // Valid: 2 days 4 hours until end of month
  'INVALID',       // Invalid format
  'E25h',          // Invalid: 25 hours doesn't exist
];

eodExpressions.forEach(expr => {
  try {
    if (isValidEoD(expr)) {
      const eod = parseEoD(expr);
      console.log(`✓ ${expr}: ${eod.toString()}`);
      
      // Create schedule with valid EOD
      const schedule = Schedule.fromObject({
        minute: '0',
        hour: '9',
        eod: expr
      });
      console.log(`  Schedule: ${schedule.toString()}`);
      console.log(`  Ends: ${schedule.endOf()?.toLocaleDateString()}`);
    } else {
      console.log(`✗ ${expr}: Invalid EOD format`);
    }
  } catch (error) {
    console.log(`✗ ${expr}: Error - ${error.message}`);
  }
});
```

### Migration from Manual Calculations

Before EOD was available, you might have used manual calculations. Here's how to migrate:

```typescript
// OLD WAY: Manual calculation (still works but not recommended)
function calculateNthOccurrence(schedule: any, startDate: Date, n: number): Date {
  let current = getNext(schedule, startDate);
  for (let i = 1; i < n; i++) {
    current = getNext(schedule, new Date(current.getTime() + 1000));
  }
  return current;
}

// NEW WAY: Using EOD for duration-based termination
const modernSchedule = Schedule.fromObject({
  minute: '30',
  hour: '14',
  dayOfWeek: 'MON-FRI',
  eod: EoDHelpers.endOfMonth(0, 0, 0) // Until end of month
});

console.log('Modern schedule:', modernSchedule.toString());
console.log('Terminates at:', modernSchedule.endOf()?.toLocaleDateString());

// EOD provides cleaner, more maintainable termination logic
const weeklyMeeting = Schedule.fromObject({
  minute: '0',
  hour: '10',  
  dayOfWeek: 'MON',
  eod: 'E2h'  // Each meeting lasts 2 hours
});

console.log('Weekly meeting schedule:', weeklyMeeting.toString());
console.log('Each meeting ends at:', weeklyMeeting.endOf()?.toLocaleString());
```

## 🌍 Humanization Features

### Basic Humanization

```typescript
import { toString, toResult, fromObject, fromCronSyntax } from '@devloops/jcron';

// Method 1: toString() with cron string (basic usage)
console.log(toString('0 0 9 * * *'));        // "At 09:00"
console.log(toString('0 30 14 * * MON'));    // "At 14:30 on Monday"
console.log(toString('0 0 12 1 * *'));       // "At 12:00 on day 1 of the month"
console.log(toString('0 0 0 1 1 *'));        // "At 00:00 on January 1"

// Method 2: toString() with Schedule object (recommended)
const businessSchedule = fromObject({
    s: '0', m: '30', h: '9', 
    dom: '*', mon: '*', dow: 'MON-FRI'
});

console.log(toString(businessSchedule));     // "At 09:30 on Monday through Friday"

// Method 3: Schedule.toString() method (most efficient for existing schedules)
const meetingSchedule = fromCronSyntax('0 0 14 * * WED');
console.log(meetingSchedule.toString());     // "At 14:00 on Wednesday"

// Method 4: Complex schedule with timezone
const complexSchedule = fromObject({
    s: '0', m: '0', h: '9-17',
    dom: '*', mon: '*', dow: 'MON-FRI',
    tz: 'Europe/Istanbul'
});

// All these methods produce the same result:
console.log(toString(complexSchedule));      // Using toString() function
console.log(complexSchedule.toString());     // Using Schedule method (preferred)

// Detailed result with metadata
const result = toResult('0 */15 9-17 * * MON-FRI');
console.log(result.human);     // Human readable string
console.log(result.schedule);  // Parsed schedule object
console.log(result.next);      // Next execution time
console.log(result.isValid);   // Validation status
```

### Locale Support

```typescript
import { 
    toString, 
    registerLocale, 
    setDefaultLocale,
    getSupportedLocales,
    getDetectedLocale 
} from '@devloops/jcron';

// Check available locales
console.log(getSupportedLocales()); // ['en', 'tr', 'es', 'fr', ...]

// Get browser detected locale
console.log(getDetectedLocale()); // 'en-US' or user's browser locale

// Set default locale
setDefaultLocale('tr');

// Humanize in Turkish
console.log(toString('0 0 9 * * MON-FRI')); // Turkish output

// Humanize with specific locale
console.log(toString('0 0 9 * * MON-FRI', { locale: 'es' })); // Spanish output

// Register custom locale
registerLocale('custom', {
    and: 'and',
    at: 'at',
    // ... other locale strings
});
```

### Advanced Humanization Options

```typescript
import { toString, HumanizeOptions, fromObject, fromCronSyntax } from '@devloops/jcron';

const options: HumanizeOptions = {
    locale: 'en',
    use24HourTime: false,  // Use 12-hour format with AM/PM
    verboseFormat: true,   // More detailed descriptions
    includeSeconds: false, // Hide seconds from output
    timezone: 'America/New_York'
};

// Using toString() function with options
const businessHours = toString('0 0 9-17 * * MON-FRI', options);
console.log(businessHours); // "At 9:00 AM through 5:00 PM on Monday through Friday"

// Using Schedule object with toString() function
const weeklyMeeting = fromObject({
    s: '0', m: '30', h: '14', 
    dom: '*', mon: '*', dow: 'WED'
});
console.log(toString(weeklyMeeting, options)); // "At 2:30 PM on Wednesday"

// Using Schedule.toString() method with options
const monthlyReport = fromCronSyntax('0 0 9 1 * *');
console.log(monthlyReport.toString(options)); // "At 9:00 AM on day 1 of the month"

// Comparison of different approaches
const cronExpr = '0 15 10 * * MON-FRI';
const scheduleObj = fromCronSyntax(cronExpr);

console.log('=== COMPARISON ===');
console.log('String + toString():', toString(cronExpr, options));
console.log('Schedule + toString():', toString(scheduleObj, options));
console.log('Schedule.toString():', scheduleObj.toString(options));
// All three produce identical output

// Different locale examples
const turkishOptions: HumanizeOptions = { 
    locale: 'tr', 
    use24HourTime: true 
};

console.log('English:', scheduleObj.toString(options));
console.log('Turkish:', scheduleObj.toString(turkishOptions));
```

## 📅 Complex Expression Examples

### Business Scenarios

```typescript
import { toString, getNext, getPrev, match } from '@devloops/jcron';

// Business hours: 9 AM to 5 PM, Monday to Friday
const businessHours = '0 0 9-17 * * MON-FRI';
console.log(toString(businessHours));
console.log('Next business hour:', getNext(businessHours));

// Lunch break: 12:30 PM on weekdays
const lunchTime = '0 30 12 * * MON-FRI';
console.log(toString(lunchTime));

// Monthly team meeting: First Monday of each month at 10 AM
const monthlyMeeting = '0 0 10 * * 1#1';
console.log(toString(monthlyMeeting));
console.log('Next meeting:', getNext(monthlyMeeting));

// Quarterly review: Last Friday of March, June, September, December at 3 PM
const quarterlyReview = '0 0 15 * 3,6,9,12 5L';
console.log(toString(quarterlyReview));

// Year-end party: December 31st at 6 PM
const yearEnd = '0 0 18 31 12 *';
console.log(toString(yearEnd));
console.log('Next year-end party:', getNext(yearEnd));
```

### Time Calculations

```typescript
import { getNext, getPrev } from '@devloops/jcron';

// Daily standup at 9:30 AM
const dailyStandup = '0 30 9 * * MON-FRI';

// When is the next standup?
const nextStandup = getNext(dailyStandup);
console.log('Next standup:', nextStandup.toLocaleString());

// When was the last standup?
const lastStandup = getPrev(dailyStandup);
console.log('Last standup:', lastStandup.toLocaleString());

// How many standups in the next 30 days?
const startDate = new Date();
const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
let count = 0;
let current = getNext(dailyStandup, startDate);

while (current <= endDate) {
    count++;
    current = getNext(dailyStandup, new Date(current.getTime() + 1000)); // Add 1 second
}

console.log(`${count} standups in the next 30 days`);

// When will the 20th standup occur?
function calculateNthOccurrence(schedule: any, startDate: Date, n: number): Date {
    let current = getNext(schedule, startDate);
    for (let i = 1; i < n; i++) {
        current = getNext(schedule, new Date(current.getTime() + 1000));
    }
    return current;
}

const twentieth = calculateNthOccurrence(dailyStandup, startDate, 20);
console.log('20th standup will be on:', twentieth.toLocaleString());
```

### Special Patterns

```typescript
import { toString, getNext, fromCronSyntax } from '@devloops/jcron';

// Last day of every month at midnight
const lastDayOfMonth = '0 0 0 L * *';
console.log(toString(lastDayOfMonth));
console.log('Next end of month:', getNext(lastDayOfMonth));

// Every 15 minutes during business hours
const frequentDuringBusiness = '0 */15 9-17 * * MON-FRI';
console.log(toString(frequentDuringBusiness));

// Second Tuesday of every month at 2 PM
const secondTuesday = '0 0 14 * * 2#2';
console.log(toString(secondTuesday));

// Every other hour starting at 8 AM
const everyOtherHour = '0 0 8-18/2 * * *';
console.log(toString(everyOtherHour));

// Weekends only at 10 AM
const weekendMorning = '0 0 10 * * SAT,SUN';
console.log(toString(weekendMorning));
```

## 🔧 Utility Functions

### Schedule Creation

```typescript
import { 
  Schedule, 
  fromJCronString, 
  fromObject, 
  fromCronSyntax, 
  EoDHelpers,
  EndOfDuration 
} from '@devloops/jcron';

// Method 1: Traditional constructor
const schedule1 = new Schedule('0', '30', '9', '*', '*', 'MON-FRI');

// Method 2: From cron syntax (most common)
const schedule2 = fromCronSyntax('0 30 9 * * MON-FRI');

// Method 3: From JSON object with short field names (recommended for complex schedules)
const schedule3 = fromObject({
    s: '0',           // second
    m: '30',          // minute
    h: '9',           // hour
    dom: '*',         // day of month
    mon: '*',         // month
    dow: 'MON-FRI',   // day of week
    tz: 'Europe/Istanbul' // timezone
});

// Method 4: From JCron pipe-separated string
const schedule4 = fromJCronString('0|30|9|*|*|MON-FRI||Europe/Istanbul');

// Method 5: Complex schedule with all options including EOD
const complexSchedule = fromObject({
    s: '0',
    m: '0,30',        // On the hour and half hour
    h: '9-17',        // Business hours
    dom: '1-5,15-19', // First week and mid-month
    mon: 'JAN,APR,JUL,OCT', // Quarterly
    dow: 'MON-FRI',   // Weekdays only
    y: '2024-2026',   // Specific years
    tz: 'America/New_York',
    eod: EoDHelpers.endOfMonth(2, 0, 0) // 2 days until end of month
});

console.log('Complex schedule:', toString(complexSchedule));
console.log('Next run:', getNext(complexSchedule));
console.log('Schedule ends:', complexSchedule.endOf()?.toLocaleDateString());

// Method 6: Schedule with End-of-Duration from string
const eodSchedule = fromJCronString('0 0 9 * * MON-FRI EOD:E8h');
console.log('EOD schedule:', eodSchedule.toString());
console.log('Each session ends:', eodSchedule.endOf()?.toLocaleString());

// Different ways to get human-readable format
console.log('=== HUMANIZATION METHODS ===');
console.log('1. toString(string):', toString('0 30 9 * * MON-FRI'));
console.log('2. toString(schedule):', toString(schedule3));
console.log('3. schedule.toString():', schedule3.toString());

// Comparing different creation methods
console.log('All basic schedules equivalent:', 
    schedule1.toString() === schedule2.toString() &&
    schedule2.toString() === schedule3.toString() &&
    schedule3.toString() === schedule4.toString()
);
```

### Validation and Error Handling

```typescript
import { isValid, fromCronSyntax, ParseError } from '@devloops/jcron';

// Validate before using (isValid is the correct function name)
const expressions = [
    '0 30 9 * * MON-FRI',  // Valid
    '0 30 25 * * *',       // Invalid hour
    '0 * * * * MON-SUN',   // Valid
    '* * * * * * *'        // Too many fields
];

expressions.forEach(expr => {
    try {
        const valid = isValid(expr);
        if (valid) {
            const schedule = fromCronSyntax(expr);
            console.log(`✓ ${expr}: ${toString(expr)}`);
        } else {
            console.log(`✗ ${expr}: Invalid expression`);
        }
    } catch (error) {
        if (error instanceof ParseError) {
            console.log(`✗ ${expr}: Parse error - ${error.message}`);
        } else {
            console.log(`✗ ${expr}: Unexpected error`);
        }
    }
});
```

## 📊 Time Range Analysis

```typescript
import { getNext, getPrev, match, toString } from '@devloops/jcron';

// Analyze a cron expression over a time period
function analyzeCronExpression(cronExpr: string, startDate: Date, endDate: Date) {
    const occurrences: Date[] = [];
    let current = getNext(cronExpr, startDate);
    
    while (current <= endDate) {
        occurrences.push(new Date(current));
        current = getNext(cronExpr, new Date(current.getTime() + 1000));
    }
    
    return {
        expression: cronExpr,
        humanReadable: toString(cronExpr),
        totalOccurrences: occurrences.length,
        firstOccurrence: occurrences[0],
        lastOccurrence: occurrences[occurrences.length - 1],
        averageInterval: occurrences.length > 1 
            ? (occurrences[occurrences.length - 1].getTime() - occurrences[0].getTime()) / (occurrences.length - 1)
            : null,
        occurrences: occurrences
    };
}

// Example usage
const startDate = new Date('2024-01-01T00:00:00Z');
const endDate = new Date('2024-01-31T23:59:59Z');

const dailyReport = analyzeCronExpression('0 0 9 * * MON-FRI', startDate, endDate);
console.log('Daily reports in January 2024:', dailyReport);

const weeklyMeeting = analyzeCronExpression('0 0 14 * * WED', startDate, endDate);
console.log('Weekly meetings in January 2024:', weeklyMeeting);
```

## 🌟 Advanced Use Cases

### Timezone Handling

```typescript
import { Schedule, Engine, toString } from '@devloops/jcron';

// Create schedule with timezone
const nySchedule = new Schedule('0', '0', '9', '*', '*', 'MON-FRI', undefined, 'America/New_York');
const londonSchedule = new Schedule('0', '0', '9', '*', '*', 'MON-FRI', undefined, 'Europe/London');

const engine = new Engine();

// Compare execution times
const nyNext = engine.next(nySchedule, new Date());
const londonNext = engine.next(londonSchedule, new Date());

console.log('New York 9 AM:', nyNext.toISOString());
console.log('London 9 AM:', londonNext.toISOString());
console.log('Time difference:', Math.abs(nyNext.getTime() - londonNext.getTime()) / (1000 * 60 * 60), 'hours');
```

### Multiple Expression Comparison

```typescript
import { toString, getNext } from '@devloops/jcron';

// Compare different scheduling options
const scheduleOptions = [
    '0 0 9 * * MON-FRI',   // Daily weekdays
    '0 0 9 * * MON,WED,FRI', // MWF only
    '0 0 9 1,15 * *',      // Twice a month
    '0 0 9 * * 1#1,1#3'    // First and third Monday
];

console.log('Schedule Comparison:');
scheduleOptions.forEach((expr, index) => {
    const next = getNext(expr);
    console.log(`${index + 1}. ${toString(expr)}`);
    console.log(`   Next occurrence: ${next.toLocaleString()}\n`);
});
```

## 📚 Reference

### Common Patterns Quick Reference

```typescript
// Every minute
'0 * * * * *'

// Every hour at 30 minutes past
'0 30 * * * *'

// Every day at 9:30 AM
'0 30 9 * * *'

// Every weekday at 9:30 AM
'0 30 9 * * MON-FRI'

// Every Monday at 9:30 AM
'0 30 9 * * MON'

// First day of every month at midnight
'0 0 0 1 * *'

// Last day of every month at 11:59 PM
'0 59 23 L * *'

// Every 15 minutes
'0 */15 * * * *'

// Every 2 hours from 8 AM to 6 PM
'0 0 8-18/2 * * *'

// First Monday of every month
'0 0 9 * * 1#1'

// Last Friday of every month
'0 0 17 * * 5L'

// With End-of-Duration (EOD) patterns
'0 9 * * 1-5 EOD:E8h'        // Weekdays 9 AM for 8 hours each day
'0 0 2 * * * EOD:E2DT4H M'   // 2 AM daily for 2 days 4 hours until end of month
'0 30 14 * * FRI EOD:S2h'    // Friday 2:30 PM starting with 2 hours duration
```

### Core API Methods Reference

```typescript
// Basic schedule operations
fromCronSyntax(cronString)      // Parse standard cron syntax
fromJCronString(jcronString)    // Parse JCRON format with extensions
toString(schedule)              // Convert to human readable
isValid(cronString)             // Validate cron expression
getNext(schedule, fromDate?)    // Get next execution time
getPrev(schedule, fromDate?)    // Get previous execution time
match(schedule, date?)          // Check if date matches schedule

// EOD (End of Duration) operations
endOfDuration(schedule, fromDate?)  // Calculate end date for schedule with EOD
schedule.endOf(fromDate?)           // Schedule method to get end date
EoDHelpers.endOfDay(h, m, s)       // Helper for end of day calculations
EoDHelpers.endOfMonth(d, h, m)     // Helper for end of month calculations
parseEoD(eodString)                // Parse EOD string format
isValidEoD(eodString)              // Validate EOD format

// Schedule creation and manipulation
Schedule.fromObject(obj)           // Create from object notation
fromObject(obj)                    // Create from short format object
validateSchedule(obj)              // Validate and normalize schedule object
schedule.toString()                // Get JCRON string representation
schedule.toStandardCron()          // Get standard cron format
```

### Error Handling Best Practices

```typescript
import { isValid, ParseError, toString, getNext } from '@devloops/jcron';

function safeScheduleOperations(cronExpr: string) {
    try {
        // Always validate first (using isValid - the correct function name)
        if (!isValid(cronExpr)) {
            return { error: 'Invalid cron expression' };
        }

        // Perform operations
        const humanReadable = toString(cronExpr);
        const nextExecution = getNext(cronExpr);

        return {
            expression: cronExpr,
            humanReadable,
            nextExecution,
            isValid: true
        };
    } catch (error) {
        if (error instanceof ParseError) {
            return { error: `Parse error: ${error.message}` };
        }
        return { error: 'Unexpected error occurred' };
    }
}

// Usage
const result = safeScheduleOperations('0 30 9 * * MON-FRI');
if (result.error) {
    console.error(result.error);
} else {
    console.log('Next business day 9:30 AM:', result.nextExecution);
}
```

---

This guide covers the core client-side functionality of JCron for parsing, analyzing, and humanizing cron expressions without running actual scheduled jobs.
