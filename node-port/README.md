# JCRON-node

A high-performance, type-safe job scheduler for Node.js and TypeScript, ported from the robust Go library `jcron`.

[![npm version](https://badge.fury.io/js/jcron-ts.svg)](https://www.npmjs.com/package/jcron-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## 🚀 Quick Start

```bash
npm install @devloops/jcron
```

```typescript
import { Runner, getNext, toString } from '@devloops/jcron';

const runner = new Runner();

// Run every day at 9 AM
runner.addFuncCron('0 9 * * *', () => {
    console.log('Daily morning task executed!');
});

runner.start();

// Or use utility functions for calculations
const nextRun = getNext('0 9 * * *');
console.log('Next execution:', toString('0 9 * * *'));
```

## ✨ Features

- 🏃‍♂️ **High Performance**: Mathematical scheduling algorithm, not polling-based
- 🔒 **Type Safe**: Full TypeScript support with strict typing
- ✅ **100% Classic Cron Compatible**: All standard Unix/Linux cron patterns work perfectly
- 📅 **Classic Shortcuts**: `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`
- 📝 **Textual Names**: `JAN-DEC`, `SUN-SAT` (case-insensitive)
- 🌍 **Timezone Support**: Automatic DST handling with IANA timezone support
- 🔄 **Advanced Patterns**: Supports L (last), # (nth), and complex cron expressions
- ⚡ **Zero CPU Idle**: Near-zero CPU usage when no jobs are running
- 🛡️ **Error Recovery**: Built-in retry policies and error handling
- 📊 **Comprehensive Testing**: 116+ test cases covering edge cases and performance
- 🔧 **Flexible Logging**: Compatible with popular Node.js loggers

## 📖 Documentation

For comprehensive documentation, API reference, and advanced usage examples, see [jcron.md](./jcron.md).

## 🧪 Testing

```bash
# Install dependencies
bun install

# Run all tests (116+ test cases)
bun test

# Run performance benchmarks
bun test tests/engine.performance.test.ts

# Run specific test suites
bun test tests/engine.test.ts           # Core functionality
bun test tests/schedule.parsing.test.ts # Parsing tests
bun test tests/runner.test.ts           # Runner integration
```

## 📊 Performance

JCRON-node delivers excellent performance:

- **Simple patterns**: ~0.002ms per calculation
- **Complex patterns**: ~0.008ms per calculation  
- **Cache efficiency**: 99.8% hit rate
- **Memory stable**: Handles 100,000+ jobs efficiently

## 🌟 Advanced Examples

### Classic Cron Compatibility
```typescript
// All standard Unix cron patterns work perfectly
runner.addFuncCron("0 9 * * *", dailyTask);       // 9 AM daily
runner.addFuncCron("0 0 * * 0", weeklyTask);      // Sunday midnight
runner.addFuncCron("*/15 * * * *", frequentTask); // Every 15 minutes

// Classic shortcuts work as expected
runner.addFuncCron("@daily", dailyTask);          // Same as "0 0 * * *"
runner.addFuncCron("@hourly", hourlyTask);        // Same as "0 * * * *"

// Textual names (case-insensitive)
runner.addFuncCron("0 9 * JAN *", januaryTask);   // January mornings
runner.addFuncCron("0 17 * * FRI", fridayTask);   // Friday 5 PM
```

### Timezone-aware Scheduling
```typescript
import { Schedule, Runner } from 'jcron-ts';

const schedule = new Schedule({
    h: "9",
    m: "0", 
    tz: "America/New_York"
});

runner.addJob(schedule, myJob);
```

### Retry Policies
```typescript
import { withRetries } from 'jcron-ts';

runner.addFuncCron(
    "*/5 * * * * *",
    riskyTask,
    withRetries(3, 5000) // 3 retries, 5 second delay
);
```

### Last Day Patterns
```typescript
// Last day of month
runner.addFuncCron("0 0 0 L * ?", monthlyCleanup);

// Last Friday of month  
runner.addFuncCron("0 0 17 ? * 5L", monthlyReport);

// Third Monday of month
runner.addFuncCron("0 0 9 ? * 1#3", quarterlyMeeting);
```

## 📅 Week of Year (ISO 8601) Support

- **Full support for ISO 8601 week-of-year (WOY) scheduling**
- Use `fromCronWithWeekOfYear` or JSON API to schedule jobs for specific weeks (1-53)
- All edge-cases (year boundaries, leap weeks, odd/even weeks, etc.) are covered by comprehensive tests
- Stable and API-compliant: all week-of-year logic matches ISO 8601 and passes 100% of edge-case tests

### Example: Schedule for Odd Weeks Only (Cron API)
```typescript
import { fromCronWithWeekOfYear, Engine, WeekPatterns } from 'jcron-ts';
const engine = new Engine();
const schedule = fromCronWithWeekOfYear('0 0 12 * * MON', WeekPatterns.ODD_WEEKS);
const next = engine.next(schedule, new Date('2024-01-01T00:00:00Z'));
console.log(next.toISOString()); // First odd week Monday at 12:00
```

### Example: Schedule for Week 10 of 2025 (Cron API)
```typescript
const schedule = fromCronWithWeekOfYear('0 0 8 * * MON 2025', '10');
const next = engine.next(schedule, new Date('2024-01-01T00:00:00Z'));
console.log(next.toISOString()); // 2025-03-03T08:00:00.000Z
```

### Example: JSON API
```typescript
import { Schedule, Engine } from 'jcron-ts';
const schedule = new Schedule('0', '0', '8', '*', '*', '1', '2025', '10');
const engine = new Engine();
const dt = new Date('2025-03-03T08:00:00Z');
console.log(engine.isMatch(schedule, dt)); // true
```

### Predefined Patterns
- `WeekPatterns.ODD_WEEKS`, `EVEN_WEEKS`, `FIRST_WEEK`, `LAST_WEEK`, `FIRST_QUARTER`, etc.

### Test Coverage
- 100% of week-of-year edge-cases are covered by automated tests (see `week-of-year-cron.test.ts`, `week-of-year-test.ts`)
- All API and edge-cases are validated for both cron and JSON syntax
- Stable for production use

## 🔄 Migration from Go Version

JCRON-node maintains API compatibility with the Go version while providing JavaScript-native features:

- Same cron expression syntax
- Equivalent scheduling behavior
- Promise-based async operations
- TypeScript type safety
- Compatible timezone handling

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./jcron.md#contributing) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [Full Documentation](./jcron.md)
- [NPM Package](https://www.npmjs.com/package/jcron-ts)
- [Go Version](../go/) (original implementation)
