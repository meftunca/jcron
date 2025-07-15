# JCRON Client-Side Usage Guide

This guide covers client-side/browser usage of JCRON Node.js port, focusing on features most useful in frontend applications.

## 📦 Installation

```bash
npm install @devloops/jcron
# or
yarn add @devloops/jcron
# or
pnpm add @devloops/jcron
```

## 🌐 Browser Bundle

JCRON automatically detects browser environment and provides optimized functionality for client-side applications.

```html
<!-- CDN -->
<script src="https://unpkg.com/@devloops/jcron@latest/dist/browser.min.js"></script>

<!-- ES Modules -->
<script type="module">
  import { toString, getNext, getPrev, isValid, match } from '@devloops/jcron';
</script>
```

## 🚀 Quick Start

```javascript
import { 
  toString, 
  getNext, 
  getPrev, 
  isValid, 
  match, 
  fromCronSyntax,
  fromObject,
  fromSchedule 
} from '@devloops/jcron';

// Method 1: Create a schedule from cron expression
const schedule = fromCronSyntax('0 9 * * *');

// Method 2: Create a schedule from object (NEW!)
const schedule2 = fromObject({
  hours: 9,
  minutes: 0
});

// Get human-readable description
console.log(toString('0 9 * * *')); // "at 09:00, every day"
console.log(fromSchedule(schedule2)); // "at 09:00, every day"

// Get next execution time
const nextRun = getNext('0 9 * * *');
console.log('Next run:', nextRun.toLocaleString());

// Check if current time matches cron expression
const now = new Date();
if (match('0 9 * * *', now)) {
  console.log('Time to execute!');
}

// Validate cron expression
if (isValid('0 9 * * *')) {
  console.log('Valid cron expression');
}
```

## 🕐 Next/Previous Execution Times

### Basic Usage

```javascript
import { getNext, getPrev, match, isValid } from '@devloops/jcron';

const cronExpr = '0 9 * * 1-5'; // Weekdays at 9 AM

// Get next execution
const nextRun = getNext(cronExpr);
console.log('Next run:', nextRun.toLocaleString());

// Get previous execution
const prevRun = getPrev(cronExpr);
console.log('Previous run:', prevRun.toLocaleString());

// Check if a specific time matches
const testDate = new Date('2024-01-15T09:00:00');
if (match(cronExpr, testDate)) {
  console.log('Time matches the cron expression!');
}

// Validate expression
if (isValid(cronExpr)) {
  console.log('Valid cron expression');
}
```

### Multiple Next Executions

```javascript
import { getNextN } from '@devloops/jcron';

// Get next 5 executions
const next5 = getNextN('0 */6 * * *', 5); // Every 6 hours
next5.forEach((date, index) => {
  console.log(`${index + 1}. ${date.toLocaleString()}`);
});
```

### Custom Reference Time

```javascript
import { getNext, getPrev, match } from '@devloops/jcron';

const cronExpr = '0 14 * * *'; // Daily at 2 PM
const referenceTime = new Date('2024-01-15T10:00:00');

// Next execution from specific time
const next = getNext(cronExpr, referenceTime);
console.log('Next from reference:', next.toLocaleString());

// Previous execution before specific time
const prev = getPrev(cronExpr, referenceTime);
console.log('Previous before reference:', prev.toLocaleString());

// Check if reference time matches
if (match(cronExpr, referenceTime)) {
  console.log('Reference time matches!');
}
```

### Real-time Countdown Component

```javascript
// React component example
import React, { useState, useEffect } from 'react';
import { getNext, match } from '@devloops/jcron';

function CronCountdown({ cronExpression }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      
      // Check if current time matches
      if (match(cronExpression, now)) {
        setIsExecuting(true);
        setTimeLeft('Executing now!');
        return;
      }
      
      setIsExecuting(false);
      const next = getNext(cronExpression);
      const diff = next.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [cronExpression]);
  
  return (
    <div className={isExecuting ? 'executing' : 'waiting'}>
      Next execution in: {timeLeft}
    </div>
  );
}

// Usage
<CronCountdown cronExpression="0 9 * * 1-5" />
```

## 📦 Object-Based Schedule Creation

### Using fromObject Function

Instead of using cron syntax, you can create schedules using JavaScript objects for more intuitive configuration:

```javascript
import { fromObject, toString, getNext } from '@devloops/jcron';

// Basic time scheduling
const dailyMeeting = fromObject({
  hours: [9],
  minutes: [30]
});
console.log(toString(dailyMeeting)); // "at 09:30"

// Specific days
const weekendBackup = fromObject({
  hours: [2],
  minutes: [0],
  dayOfWeek: ['Saturday', 'Sunday']
});
console.log(toString(weekendBackup)); // "at 02:00 on Saturday and Sunday"

// Multiple times
const notifications = fromObject({
  hours: [9, 13, 17],
  minutes: [0],
  dayOfWeek: ['Monday', 'Wednesday', 'Friday']
});
console.log(toString(notifications)); 
// "at 09:00, 13:00, and 17:00 on Monday, Wednesday, and Friday"

// With timezone
const globalMeeting = fromObject({
  hours: [14],
  minutes: [30],
  dayOfWeek: ['Tuesday'],
  timezone: 'Europe/London'
});
console.log(toString(globalMeeting)); 
// "at 14:30 on Tuesday (Europe/London)"
```

### Object Properties

The `fromObject` function accepts these properties:

```javascript
{
  seconds?: number[],        // 0-59
  minutes?: number[],        // 0-59  
  hours?: number[],          // 0-23
  dayOfMonth?: number[],     // 1-31
  month?: number[] | string[], // 1-12 or month names
  dayOfWeek?: number[] | string[], // 0-6 or day names
  timezone?: string          // IANA timezone name
}
```

### Month and Day Names

You can use textual names for months and days:

```javascript
// Using month names
const quarterlyReview = fromObject({
  hours: [10],
  minutes: [0],
  dayOfMonth: [1],
  month: ['January', 'April', 'July', 'October']
});

// Using day names  
const weeklyReport = fromObject({
  hours: [17],
  minutes: [0],
  dayOfWeek: ['Friday']
});

// Mixed numeric and textual
const mixedSchedule = fromObject({
  hours: [8, 12, 16],
  minutes: [30],
  dayOfWeek: ['Monday', 'Wednesday', 5], // Monday, Wednesday, Friday
  month: [1, 'March', 'May', 7, 'September', 11] // Jan, Mar, May, Jul, Sep, Nov
});
```

### Practical Examples

```javascript
// Database backup every day at 3 AM
const backup = fromObject({
  hours: [3],
  minutes: [0]
});

// Team standup Monday-Friday at 9:30 AM
const standup = fromObject({
  hours: [9],
  minutes: [30], 
  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
});

// Monthly report on first Monday of each month at 2 PM
const monthlyReport = fromObject({
  hours: [14],
  minutes: [0],
  dayOfWeek: ['Monday'],
  dayOfMonth: [1, 2, 3, 4, 5, 6, 7] // First week
});

// Quarterly maintenance on weekends
const maintenance = fromObject({
  hours: [1],
  minutes: [0],
  dayOfWeek: ['Saturday'],
  month: ['January', 'April', 'July', 'October']
});
```

## 🌍 Humanization with Localization

### Auto-Detection

JCRON automatically detects browser language and uses appropriate locale:

```javascript
import { toString, fromCronSyntax } from '@devloops/jcron';

// Create schedule and humanize with auto-detection
const schedule = fromCronSyntax('0 9 * * 1');
console.log(toString(schedule)); 
// English: "at 09:00 on Monday"
// Turkish: "her Pazartesi 09:00'da"
// French: "à 09:00 tous les lundi"
```

### Explicit Locale

```javascript
import { toString, toResult, fromCronSyntax } from '@devloops/jcron';

const schedule = fromCronSyntax('0 9 * * 1-5'); // Weekdays at 9 AM

// Different languages
console.log(toString(schedule, { locale: 'en' })); 
// "at 09:00 on Monday through Friday"

console.log(toString(schedule, { locale: 'tr' })); 
// "Pazartesi-Cuma arası 09:00'da"

console.log(toString(schedule, { locale: 'fr' })); 
// "à 09:00 du lundi au vendredi"

console.log(toString(schedule, { locale: 'es' })); 
// "a las 09:00 de lunes a viernes"

console.log(toString(schedule, { locale: 'de' })); 
// "um 09:00 von Montag bis Freitag"
```

### Detailed Humanization

```javascript
import { toResult, fromCronSyntax } from '@devloops/jcron';

const schedule = fromCronSyntax('0 9 * * 1-5');
const result = toResult(schedule, { 
  locale: 'en',
  verbose: true,
  caseStyle: 'title'
});

console.log(result);
// {
//   description: "At 09:00 On Monday Through Friday",
//   pattern: "weekly",
//   frequency: { type: "weekly", interval: 1, description: "weekly" },
//   components: {
//     minutes: "0",
//     hours: "9",
//     dayOfWeek: "1,2,3,4,5"
//   },
//   originalExpression: "0 9 * * 1-5",
//   warnings: []
// }
```

### Supported Locales

```javascript
import { getSupportedLocales, getLocaleDisplayName, setDefaultLocale } from '@devloops/jcron';

// Get all supported locales
console.log(getSupportedLocales());
// ['en', 'tr', 'fr', 'es', 'de', 'pl', 'pt', 'it', 'cz', 'nl']

// Get locale display names
console.log(getLocaleDisplayName('tr')); // "Türkçe"
console.log(getLocaleDisplayName('fr')); // "Français"
console.log(getLocaleDisplayName('de')); // "Deutsch"

// Set default locale for all operations
setDefaultLocale('tr');
const schedule = fromCronSyntax('0 9 * * 1');
console.log(toString(schedule)); // Now uses Turkish by default
```

## 🎨 Interactive Cron Builder

```javascript
// Vue.js component example
import { toString, isValid, fromCronSyntax } from '@devloops/jcron';

export default {
  data() {
    return {
      cronExpression: '0 9 * * *',
      minute: '0',
      hour: '9',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*'
    };
  },
  computed: {
    humanReadable() {
      try {
        const schedule = fromCronSyntax(this.cronExpression);
        return toString(schedule, { locale: 'en' });
      } catch {
        return 'Invalid expression';
      }
    },
    isValidExpression() {
      return isValid(this.cronExpression);
    }
  },
  watch: {
    minute() { this.updateCronExpression(); },
    hour() { this.updateCronExpression(); },
    dayOfMonth() { this.updateCronExpression(); },
    month() { this.updateCronExpression(); },
    dayOfWeek() { this.updateCronExpression(); }
  },
  methods: {
    updateCronExpression() {
      this.cronExpression = `${this.minute} ${this.hour} ${this.dayOfMonth} ${this.month} ${this.dayOfWeek}`;
    }
  }
};
```

## 📅 Calendar Integration

```javascript
import { getNextN, toString, fromCronSyntax } from '@devloops/jcron';

// Generate calendar events from cron expression
function generateCalendarEvents(cronExpr, daysAhead = 30) {
  const events = getNextN(cronExpr, daysAhead);
  const schedule = fromCronSyntax(cronExpr);
  const description = toString(schedule);
  
  return events.map(date => ({
    title: description,
    start: date,
    end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour duration
    description: `Scheduled task: ${cronExpr}`
  }));
}

// Usage with FullCalendar
const events = generateCalendarEvents('0 9 * * 1-5', 60); // Next 60 weekday mornings
$('#calendar').fullCalendar({
  events: events
});
```

## 🔔 Notification Scheduler

```javascript
import { getNext, toString, match, fromCronSyntax } from '@devloops/jcron';

class NotificationScheduler {
  constructor() {
    this.timers = new Map();
    this.checkInterval = null;
  }
  
  schedule(id, cronExpression, message) {
    this.cancel(id); // Clear existing
    
    const scheduleNext = () => {
      const next = getNext(cronExpression);
      const delay = next.getTime() - Date.now();
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          this.showNotification(message, cronExpression);
          scheduleNext(); // Schedule the next one
        }, delay);
        
        this.timers.set(id, timer);
      }
    };
    
    scheduleNext();
  }
  
  // Alternative: Check every minute using match()
  startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      const now = new Date();
      this.timers.forEach((timer, id) => {
        if (match(timer.cronExpression, now)) {
          this.showNotification(timer.message, timer.cronExpression);
        }
      });
    }, 60000); // Check every minute
  }
  
  cancel(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }
  
  showNotification(message, cronExpr) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const schedule = fromCronSyntax(cronExpr);
      const description = toString(schedule);
      new Notification(message, {
        body: `Scheduled: ${description}`,
        icon: '/icon.png'
      });
    }
  }
}

// Usage
const scheduler = new NotificationScheduler();
scheduler.schedule('daily-standup', '0 9 * * 1-5', 'Daily standup meeting!');
scheduler.schedule('lunch-break', '0 12 * * *', 'Lunch time!');
```

## 🕰️ Time Zone Handling

```javascript
import { getNext, toString } from '@devloops/jcron';

// Working with different time zones
const cronExpr = '0 9 * * *'; // 9 AM daily

// Get next execution in user's local time
const nextLocal = getNext(cronExpr);
console.log('Local time:', nextLocal.toLocaleString());

// Convert to different time zones
const nextUTC = new Date(nextLocal.toISOString());
console.log('UTC time:', nextUTC.toISOString());

// Display in different time zones
const options = { timeZone: 'America/New_York' };
console.log('NY time:', nextLocal.toLocaleString('en-US', options));

const optionsTokyo = { timeZone: 'Asia/Tokyo' };
console.log('Tokyo time:', nextLocal.toLocaleString('ja-JP', optionsTokyo));
```

## ⚡ Performance Tips

### Batch Operations

```javascript
import { getNext, toString, isValid, match, fromCronSyntax } from '@devloops/jcron';

// Instead of calling functions repeatedly
const expressions = ['0 9 * * *', '0 12 * * *', '0 18 * * *'];

// Batch process for better performance
const cronAnalysis = expressions.map(expr => {
  let schedule = null;
  let humanText = 'Invalid';
  
  const valid = isValid(expr);
  if (valid) {
    schedule = fromCronSyntax(expr);
    humanText = toString(schedule);
  }
  
  return {
    expression: expr,
    isValid: valid,
    human: humanText,
    next: valid ? getNext(expr) : null,
    matchesNow: valid ? match(expr) : false
  };
});

console.log(cronAnalysis);

// Filter valid expressions
const validExpressions = cronAnalysis.filter(item => item.isValid);

// Find expressions that match current time
const currentMatches = cronAnalysis.filter(item => item.matchesNow);
```

### Caching Results

```javascript
import { toString, getNext, isValid, match, fromCronSyntax } from '@devloops/jcron';

class CronCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }
  
  getHumanized(cronExpr, options = {}) {
    const key = `human-${cronExpr}-${JSON.stringify(options)}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }
    
    const schedule = fromCronSyntax(cronExpr);
    const value = toString(schedule, options);
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
  
  getNextExecution(cronExpr) {
    const key = `next-${cronExpr}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.value > new Date()) {
      return cached.value;
    }
    
    const value = getNext(cronExpr);
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
  
  isValidExpression(cronExpr) {
    const key = `valid-${cronExpr}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl * 10) { // Cache longer for validation
      return cached.value;
    }
    
    const value = isValid(cronExpr);
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
  
  matchesTime(cronExpr, date = new Date()) {
    // Don't cache match results as they're time-sensitive
    return match(cronExpr, date);
  }
}

const cronCache = new CronCache();
```

## 🛠️ Error Handling

```javascript
import { isValid, toString, getNext, match } from '@devloops/jcron';

function safeCronOperation(cronExpression, operation) {
  try {
    if (!isValid(cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    return operation(cronExpression);
  } catch (error) {
    console.error('Cron operation failed:', error.message);
    return null;
  }
}

// Safe usage examples
const humanized = safeCronOperation('0 9 * * *', toString);
const nextExecution = safeCronOperation('0 9 * * *', getNext);
const isMatching = safeCronOperation('0 9 * * *', (expr) => match(expr, new Date()));

if (humanized) {
  console.log('Description:', humanized);
}

if (nextExecution) {
  console.log('Next run:', nextExecution.toLocaleString());
}

if (isMatching !== null) {
  console.log('Current time matches:', isMatching);
}

// Comprehensive validation helper
function validateAndProcess(cronExpression) {
  const validation = {
    isValid: isValid(cronExpression),
    humanized: null,
    nextRun: null,
    currentMatch: false,
    errors: []
  };
  
  if (validation.isValid) {
    try {
      validation.humanized = toString(cronExpression);
      validation.nextRun = getNext(cronExpression);
      validation.currentMatch = match(cronExpression);
    } catch (error) {
      validation.errors.push(error.message);
    }
  } else {
    validation.errors.push('Invalid cron expression format');
  }
  
  return validation;
}

// Usage
const result = validateAndProcess('0 9 * * 1-5');
console.log(result);
```

## ✅ Validation and Matching

### Expression Validation

```javascript
import { isValid, validateCron } from '@devloops/jcron';

// Simple validation
console.log(isValid('0 9 * * *'));     // true
console.log(isValid('60 9 * * *'));    // false (minute > 59)
console.log(isValid('0 25 * * *'));    // false (hour > 24)

// Detailed validation with error messages
const result = validateCron('0 9 * * 8'); // Invalid day of week
console.log(result);
// {
//   valid: false,
//   errors: ['Day of week must be 0-7 or SUN-SAT']
// }
```

### Time Matching

```javascript
import { match, isTime } from '@devloops/jcron';

const cronExpr = '0 9 * * 1-5'; // Weekdays at 9 AM

// Check if current time matches
if (match(cronExpr)) {
  console.log('Current time matches!');
}

// Check specific date
const monday9am = new Date('2024-01-15T09:00:00');
if (match(cronExpr, monday9am)) {
  console.log('Monday 9 AM matches weekday schedule!');
}

// Check if it's time to run (with tolerance)
if (isTime(cronExpr, new Date(), 30000)) { // 30 second tolerance
  console.log('Within 30 seconds of scheduled time!');
}
```

### Pattern Matching

```javascript
import { matchPattern, getPattern } from '@devloops/jcron';

// Check pattern types
console.log(getPattern('0 9 * * *'));     // "daily"
console.log(getPattern('0 9 * * 1'));     // "weekly"
console.log(getPattern('0 9 1 * *'));     // "monthly"
console.log(getPattern('0 9 1 1 *'));     // "yearly"

// Match against pattern
const dailyJobs = ['0 9 * * *', '0 12 * * *', '0 18 * * *'];
const weeklyJobs = dailyJobs.filter(cron => matchPattern(cron, 'daily'));
console.log('Daily jobs:', weeklyJobs);
```

## 🎯 Common Use Cases

### Meeting Scheduler

```javascript
import { getNextN, toString, fromObject, fromCronSyntax } from '@devloops/jcron';

// Using object syntax (recommended for readability)
const meetings = [
  { 
    name: 'Daily Standup', 
    schedule: fromObject({
      hours: [9],
      minutes: [0],
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    })
  },
  { 
    name: 'Weekly Review', 
    schedule: fromObject({
      hours: [14],
      minutes: [0],
      dayOfWeek: ['Friday']
    })
  },
  { 
    name: 'Monthly Planning', 
    schedule: fromObject({
      hours: [10],
      minutes: [0],
      dayOfMonth: [1]
    })
  }
];

// Or using cron syntax
const meetingsWithCron = [
  { name: 'Daily Standup', schedule: fromCronSyntax('0 9 * * 1-5') },
  { name: 'Weekly Review', schedule: fromCronSyntax('0 14 * * 5') },
  { name: 'Monthly Planning', schedule: fromCronSyntax('0 10 1 * *') }
];

meetings.forEach(meeting => {
  const next = getNextN(meeting.schedule, 3);
  const description = toString(meeting.schedule);
  
  console.log(`${meeting.name}: ${description}`);
  console.log('Next 3 occurrences:');
  next.forEach((date, i) => {
    console.log(`  ${i + 1}. ${date.toLocaleString()}`);
  });
  console.log('---');
});
```

### Backup Reminder

```javascript
import { getNext, toString, fromCronSyntax, fromObject } from '@devloops/jcron';

function createBackupReminder(scheduleInput) {
  // Accept either Schedule object or cron string
  const schedule = typeof scheduleInput === 'string' 
    ? fromCronSyntax(scheduleInput)
    : scheduleInput;
    
  const description = toString(schedule, { locale: 'en' });
  const nextBackup = getNext(schedule);
  
  return {
    schedule: description,
    nextRun: nextBackup,
    timeUntilNext: nextBackup.getTime() - Date.now(),
    isToday: nextBackup.toDateString() === new Date().toDateString()
  };
}

// Using object syntax (more readable)
const weeklyBackup = fromObject({
  hours: [2],
  minutes: [0],
  dayOfWeek: ['Sunday']
});

// Using cron syntax
const reminder1 = createBackupReminder(weeklyBackup);
const reminder2 = createBackupReminder('0 2 * * 0'); // Sunday 2 AM

console.log(`Backup scheduled: ${reminder1.schedule}`);
console.log(`Next backup: ${reminder1.nextRun.toLocaleString()}`);
console.log(`Is today: ${reminder1.isToday}`);
```

## 📱 Mobile Considerations

```javascript
import { toString, fromCronSyntax } from '@devloops/jcron';

// Check if running in mobile browser
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
  // Use shorter descriptions for mobile
  const mobileOptions = {
    maxLength: 50,
    caseStyle: 'lower',
    verbose: false
  };
  
  const schedule = fromCronSyntax('0 9 * * 1-5');
  console.log(toString(schedule, mobileOptions));
  // "at 09:00 on monday through friday" (shortened)
}
```

## 🔧 Advanced Configuration

```javascript
import { toString, setDefaultLocale, registerLocale, fromCronSyntax } from '@devloops/jcron';

// Custom locale registration
const customLocale = {
  at: 'på',
  every: 'hver',
  on: 'på',
  in: 'i',
  // ... other translations
};

registerLocale('no', customLocale);

// Set global defaults
setDefaultLocale('no');

// Now all operations use Norwegian
const schedule = fromCronSyntax('0 9 * * 1');
console.log(toString(schedule)); // Uses Norwegian locale
```

This guide covers the most important client-side utility functions of JCRON for frontend applications. The client-side library focuses on:

- **🕐 Time Calculations**: `getNext()`, `getPrev()`, `getNextN()`
- **🌍 Humanization**: `toString()`, `toResult()` with multi-language support  
- **✅ Validation**: `isValid()`, `validateCron()`
- **🎯 Matching**: `match()`, `isTime()`, pattern matching
- **🔧 Utilities**: Caching, error handling, performance optimization

## 📚 Client-Side API Reference

### Core Functions

#### `fromCronSyntax(expression: string): Schedule`
Parse a cron expression into a Schedule object.

```javascript
import { fromCronSyntax } from '@devloops/jcron';
const schedule = fromCronSyntax('0 9 * * 1-5');
```

#### `fromObject(config: ScheduleConfig): Schedule`
Create a Schedule object from a configuration object.

```javascript
import { fromObject } from '@devloops/jcron';

// Simple daily schedule
const schedule = fromObject({
  hours: [9],
  minutes: [30]
});

// Complex schedule with multiple options
const complex = fromObject({
  hours: [9, 13, 17],
  minutes: [0, 30],
  dayOfWeek: ['Monday', 'Wednesday', 'Friday'],
  timezone: 'Europe/London'
});
```

#### `getNext(cronExpression: string, fromTime?: Date): Date`
Get the next execution time for a cron expression.

```javascript
import { getNext } from '@devloops/jcron';
const next = getNext('0 9 * * *'); // Next 9 AM
const nextFromSpecific = getNext('0 9 * * *', new Date('2025-01-15'));
```

#### `getPrev(cronExpression: string, fromTime?: Date): Date`
Get the previous execution time for a cron expression.

```javascript
import { getPrev } from '@devloops/jcron';
const prev = getPrev('0 9 * * *'); // Previous 9 AM
```

#### `getNextN(cronExpression: string, count: number, fromTime?: Date): Date[]`
Get multiple next execution times.

```javascript
import { getNextN } from '@devloops/jcron';
const next5 = getNextN('0 9 * * *', 5); // Next 5 executions
```

#### `match(cronExpression: string, date?: Date): boolean`
Check if a date matches a cron expression.

```javascript
import { match } from '@devloops/jcron';
const matches = match('0 9 * * *', new Date()); // Does now match 9 AM pattern?
```

#### `isValid(cronExpression: string): boolean`
Validate if a cron expression is syntactically correct.

```javascript
import { isValid } from '@devloops/jcron';
const valid = isValid('0 9 * * *'); // true
const invalid = isValid('invalid'); // false
```

#### `isTime(cronExpression: string, date?: Date, toleranceMs?: number): boolean`
Check if it's time to execute (within tolerance).

```javascript
import { isTime } from '@devloops/jcron';
const shouldExecute = isTime('0 9 * * *', new Date(), 5000); // Within 5 seconds
```

#### `validateCron(cronExpression: string): { valid: boolean; errors: string[] }`
Detailed validation with error messages.

```javascript
import { validateCron } from '@devloops/jcron';
const result = validateCron('invalid expression');
// { valid: false, errors: ['Parse error message'] }
```

### Humanization Functions

#### `toString(schedule: Schedule, options?: HumanizeOptions): string`
Convert a schedule to human-readable text.

```javascript
import { toString, fromCronSyntax } from '@devloops/jcron';
const schedule = fromCronSyntax('0 9 * * 1-5');
const text = toString(schedule, { locale: 'en' }); // "at 09:00 on Monday through Friday"
```

#### `toResult(schedule: Schedule, options?: HumanizeOptions): HumanizeResult`
Get detailed humanization result with metadata.

```javascript
import { toResult, fromCronSyntax } from '@devloops/jcron';
const schedule = fromCronSyntax('0 9 * * *');
const result = toResult(schedule, { locale: 'en', verbose: true });
// Returns: { description, patternType, frequency, components, warnings }
```

#### `fromSchedule(schedule: Schedule, options?: HumanizeOptions): string`
Convenience function to humanize a Schedule object.

```javascript
import { fromSchedule, fromCronSyntax } from '@devloops/jcron';
const schedule = fromCronSyntax('0 9 * * *');
const text = fromSchedule(schedule); // "at 09:00, every day"
```

### Locale Functions

#### `getSupportedLocales(): string[]`
Get list of supported locale codes.

```javascript
import { getSupportedLocales } from '@devloops/jcron';
const locales = getSupportedLocales(); // ['en', 'tr', 'fr', 'es', ...]
```

#### `setDefaultLocale(locale: string): void`
Set the default locale for all humanization operations.

```javascript
import { setDefaultLocale } from '@devloops/jcron';
setDefaultLocale('tr'); // All subsequent calls use Turkish
```

#### `getDetectedLocale(): string`
Get the auto-detected browser locale.

```javascript
import { getDetectedLocale } from '@devloops/jcron';
const locale = getDetectedLocale(); // 'en-US', 'tr-TR', etc.
```

### Utility Functions

#### `getPattern(cronExpression: string): PatternType`
Identify the pattern type of a cron expression.

```javascript
import { getPattern } from '@devloops/jcron';
const pattern = getPattern('0 9 * * 1-5'); // 'weekly'
// Returns: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
```

#### `matchPattern(cronExpression: string, pattern: PatternType): boolean`
Check if a cron expression matches a specific pattern type.

```javascript
import { matchPattern } from '@devloops/jcron';
const isWeekly = matchPattern('0 9 * * 1-5', 'weekly'); // true
```

### Types

```typescript
interface HumanizeOptions {
  locale?: string;
  verbose?: boolean;
  caseStyle?: 'lower' | 'upper' | 'title';
  maxLength?: number;
  use24HourTime?: boolean;
  includeSeconds?: boolean;
  includeTimezone?: boolean;
  dayFormat?: 'numeric' | 'short' | 'long';
  monthFormat?: 'numeric' | 'short' | 'long';
}

interface HumanizeResult {
  description: string;
  patternType?: string;
  frequency?: any;
  components?: any;
  warnings?: string[];
  originalExpression?: string;
}
```

For server-side features like job execution, persistence, and the Engine class, see the main README.md.
