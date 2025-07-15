# JCRON-node: A High-Performance, Type-Safe Job Scheduler

`JCRON-node` is a modern, high-performance job scheduling library for TypeScript and Node.js, ported from the robust Go library `jcron`. It is designed to be a flexible and efficient alternative to standard cron libraries, incorporating advanced scheduling features inspired by the Quartz Scheduler while maintaining a simple, type-safe, and developer-friendly API.

Its core philosophy is built on **performance**, **robustness**, and **readability**.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [JCRON Format Specification](#jcron-format-specification)
- [Advanced Features](#advanced-features)
- [Testing and Benchmarks](#testing-and-benchmarks)
- [Differences from Go Version](#differences-from-go-version)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **100% Classic Cron Compatibility:** Fully supports traditional Unix/Linux cron syntax including:
  - Standard 5-field (`* * * * *`) and 6-field (`* * * * * *`) formats
  - Classic shortcuts: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`
  - Textual names: `JAN-DEC` for months, `SUN-SAT` for days, case-insensitive
  - All standard operators: `*`, `,`, `-`, `/`
- **Enhanced Scheduling Rules:** Advanced Quartz-like specifiers for complex schedules:
    - `L`: For the "last" day of the month or week (e.g., `L` for the last day of the month, `5L` for the last Friday).
    - `#`: For the "Nth" day of the week in a month (e.g., `1#3` for the third Monday).
    - `?`: Question mark for day/month independence.
- **High-Performance "Next Jump" Algorithm:** Instead of tick-by-tick time checking, JCRON mathematically calculates the next valid run time, providing significant performance gains for long-interval jobs and consuming near-zero CPU while idle.
- **Aggressive Caching:** Cron expressions are parsed only once, and their expanded integer-based representations are cached, making subsequent schedule calculations extremely fast.
- **Built-in Error Handling & Retries:** Jobs can be `async` and throw errors. You can configure automatic retry policies with delays for each job.
- **Panic Recovery:** A job that throws an unhandled error will not crash the runner. The error is recovered, logged, and the runner continues to operate smoothly.
- **Structured Logging:** Uses a simple logger interface. Inject your own configured logger (e.g., `pino`, `winston`, or just `console`) to integrate JCRON's logs seamlessly into your application's logging infrastructure.
- **Type-Safe:** Written entirely in TypeScript with strict type checking, ensuring robust and maintainable code.
- **Concurrency-Safe:** Designed from the ground up to be safe for concurrent use. You can add, remove, and manage jobs from multiple async operations without race conditions.
- **Timezone Support:** Full timezone support with automatic DST handling using date-fns-tz.
- **Comprehensive Test Suite:** 116+ test cases covering edge cases, timezones, special characters, and performance scenarios.
- **Benchmark Tools:** Built-in performance testing and benchmarking capabilities.

## Installation

```bash
npm install jcron-ts
# or
yarn add jcron-ts
# or
pnpm add jcron-ts
# or (using Bun)
bun add jcron-ts
```

**Prerequisites:**
- Node.js 16+ (tested with Node.js 16-22)
- TypeScript 4.5+ (for TypeScript projects)
- Works with CommonJS and ES modules

## Quick Start

Here is a simple example to get you up and running in minutes.

```typescript
import { Runner, withRetries } from 'jcron-ts';
import pino from 'pino'; // Example using a popular logger

// 1. Create a structured logger (optional, defaults to console)
const logger = pino();

// 2. Initialize the runner with the logger
const runner = new Runner(logger);

// 3. Add jobs using the familiar cron syntax
// This job runs every 5 seconds.
runner.addFuncCron('*/5 * * * * *', () => {
    logger.info('-> Simple job running every 5 seconds!');
});

// This job runs once at the 30th second of every minute.
runner.addFuncCron('30 * * * * *', () => {
    logger.info(`--> It's the 30th second. Time is ${new Date().toLocaleTimeString()}`);
});

// 4. Start the runner (non-blocking)
runner.start();
logger.info("JCRON runner has been started. Press CTRL+C to exit.");

// 5. Wait for the application to be terminated
// In a real application, this would be your main application loop.
process.on('SIGINT', () => {
    logger.info('Shutting down runner...');
    runner.stop();
    process.exit(0);
});
```

### ES Modules (ESM) Example

```typescript
import { Runner, Schedule, Engine } from 'jcron-ts';

const runner = new Runner();

// Advanced scheduling with timezone
const schedule = new Schedule({
    m: "0",      // At minute 0
    h: "9",      // At 9 AM
    D: "1-5",    // Monday to Friday
    tz: "America/New_York"
});

const engine = new Engine(schedule);
const nextRun = engine.next(new Date());
console.log('Next run:', nextRun);

runner.start();
```

### CommonJS Example

```javascript
const { Runner, withRetries } = require('jcron-ts');

const runner = new Runner(console);

runner.addFuncCron('0 */6 * * *', async () => {
    console.log('Running every 6 hours');
    // Your job logic here
}, withRetries(3, 5000));

runner.start();
```

## Core Concepts


### The `Runner`

The `Runner` is the heart of the scheduler. It manages the entire lifecycle of all jobs. You create a single `Runner` instance for your application.

TypeScript

```javascript
import { Runner } from 'jcron-ts';
import pino from 'pino';

// The runner requires a logger that conforms to the ILogger interface.
const logger = pino();
const runner = new Runner(logger);

// Start and Stop the runner's background operations.
runner.start();
// In your application's shutdown sequence:
// runner.stop();

```

### The `IJob` Interface

Any task you want to schedule must implement the `IJob` interface. The `run` method can be synchronous or `async`. If the job is successful, the promise should resolve; otherwise, it should reject (or throw an error).

```typescript
import type { IJob } from 'jcron-ts';

class MyDatabaseBackupJob implements IJob {
    async run(): Promise<void> {
        console.log('Starting database backup...');
        // ... logic to back up the database ...
        console.log('Backup complete!');
    }
}
```

For convenience, you can use `addFuncCron` which accepts any function with the signature `() => void | Promise<void>`.

### Scheduling a Job

The easiest way to schedule a job is with `addFuncCron`, which accepts the standard cron string format.

```typescript
const jobId = runner.addFuncCron(
    "0 17 * * 5", // Run at 5:00 PM every Friday
    () => {
        console.log("It's Friday at 5 PM! Time to go home.");
    },
);
```

You can remove a job at any time using its ID.

```typescript
runner.removeJob(jobId);
```

### Advanced Options: Retry Policies

You can pass additional options when scheduling a job. The most common is setting a retry policy using the "Functional Options Pattern".

```typescript
import { withRetries } from 'jcron-ts';

// This job will be retried up to 3 times, with a 5-second delay
// between each attempt if it fails.
const id = runner.addFuncCron(
    "*/15 * * * * *", // Trigger every 15 seconds
    async () => {
        console.log("Attempting to connect to a flaky API...");
        // ... logic that might fail ...
        throw new Error("API connection failed");
    },
    withRetries(3, 5000), // maxRetries, delayMs
);
```

## API Reference

### Runner Class

The main scheduler class that manages job execution.

#### Constructor

```typescript
constructor(logger?: ILogger)
```

- `logger` (optional): Logger implementation. Defaults to console logger.

#### Methods

##### `start(): void`
Starts the runner's background scheduler.

##### `stop(): void`
Stops the runner and clears all scheduled jobs.

##### `addFuncCron(cronExpression: string, fn: () => void | Promise<void>, ...options: JobOption[]): string`
Schedules a function to run based on a cron expression.

- `cronExpression`: Standard cron string (5 or 6 fields)
- `fn`: Function to execute
- `options`: Optional job configuration (e.g., `withRetries()`)
- Returns: Job ID string

##### `addJob(schedule: Schedule, job: IJob, ...options: JobOption[]): string`
Schedules a job implementation with a custom schedule.

- `schedule`: Schedule object with detailed timing configuration
- `job`: Object implementing the IJob interface
- `options`: Optional job configuration
- Returns: Job ID string

##### `removeJob(id: string): boolean`
Removes a scheduled job.

- `id`: Job ID returned from `addFuncCron` or `addJob`
- Returns: `true` if job was found and removed

##### `listJobs(): Array<{ id: string, schedule: Schedule, nextRun?: Date }>`
Returns a list of all scheduled jobs with their next run times.

### Engine Class

Low-level scheduling engine for calculating next/previous execution times.

#### Constructor

```typescript
constructor(schedule: Schedule)
```

#### Methods

##### `next(from: Date): Date | null`
Calculates the next execution time after the given date.

##### `prev(from: Date): Date | null`
Calculates the previous execution time before the given date.

### Schedule Class

Represents a parsed cron schedule with advanced configuration options.

#### Constructor

```typescript
constructor(config: ScheduleConfig)
```

#### ScheduleConfig Interface

```typescript
interface ScheduleConfig {
    s?: string;    // Second (0-59)
    m?: string;    // Minute (0-59)
    h?: string;    // Hour (0-23)
    D?: string;    // Day of month (1-31)
    M?: string;    // Month (1-12)
    dow?: string;  // Day of week (0-7, 0 and 7 are Sunday)
    Y?: string;    // Year
    tz?: string;   // Timezone (IANA format)
}
```

#### Static Methods

##### `parse(cronExpression: string): Schedule`
Parses a standard cron expression into a Schedule object.

```typescript
const schedule = Schedule.parse("0 9 * * 1-5");
```

### Utility Functions

##### `withRetries(maxRetries: number, delayMs: number): JobOption`
Creates a retry policy for jobs.

```typescript
const retryPolicy = withRetries(3, 1000); // 3 retries, 1 second delay
```

### Interfaces

#### ILogger Interface

```typescript
interface ILogger {
    info(obj: object, msg?: string): void;
    warn(obj: object, msg?: string): void;
    error(obj: object, msg?: string): void;
}
```

#### IJob Interface

```typescript
interface IJob {
    run(): void | Promise<void>;
}
```

## JCRON Format Specification

JCRON supports both standard cron expressions and advanced scheduling patterns.

### Standard Cron Format

#### 5-Field Format (Vixie cron)
```
┌───────────── minute (0 - 59)
│ ┌─────────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌─────── month (1 - 12)
│ │ │ │ ┌───── day of week (0 - 7) (0 or 7 are Sunday)
│ │ │ │ │
* * * * *
```

#### 6-Field Format (with seconds)
```
┌─────────────── second (0 - 59)
│ ┌───────────── minute (0 - 59)
│ │ ┌─────────── hour (0 - 23)
│ │ │ ┌───────── day of month (1 - 31)
│ │ │ │ ┌─────── month (1 - 12)
│ │ │ │ │ ┌───── day of week (0 - 7)
│ │ │ │ │ │
* * * * * *
```

### Advanced Schedule Configuration

For advanced scheduling that is not covered by the standard cron syntax, you can build a `Schedule` object manually.

| Field | Description | Allowed Values | Examples |
|-------|-------------|----------------|----------|
| `s` | Second | `0-59` and `* , - /` | `"30"`, `"0/15"`, `"10,20,30"` |
| `m` | Minute | `0-59` and `* , - /` | `"5"`, `"0-29"`, `"*/10"` |
| `h` | Hour | `0-23` and `* , - /` | `"9"`, `"9-17"`, `"*/2"` |
| `D` | Day of Month | `1-31` and `* , - / ? L` | `"15"`, `"L"`, `"1-15"` |
| `M` | Month | `1-12` and `* , - /` | `"10"`, `"6-8"`, `"1,6,12"` |
| `dow` | Day of Week | `0-7` and `* , - / ? L #` | `"1"`, `"1-5"`, `"5L"`, `"1#3"` |
| `Y` | Year | `YYYY` and `* , -` | `"2025"`, `"2025-2030"` |
| `tz` | Timezone | IANA Format | `"Europe/Istanbul"`, `"America/New_York"` |

**Defaults:** If a field is not specified, it defaults to `*` (every), except for `s` (second), which defaults to `0`.

### Special Characters

#### Basic Operators
- `*` - Wildcard (every value)
- `,` - List separator (e.g., `1,15,30`)
- `-` - Range (e.g., `1-5`)
- `/` - Step values (e.g., `*/15`, `2-10/2`)

#### Advanced Operators
- `?` - No specific value (used for day/month independence)
- `L` - Last (e.g., `L` = last day of month, `5L` = last Friday)
- `#` - Nth occurrence (e.g., `1#3` = third Monday of month)

### Examples

#### Classic Cron Patterns (100% Compatible)

```typescript
// Standard Unix cron patterns work exactly as expected
runner.addFuncCron("0 9 * * *", dailyTask);        // Every day at 9 AM
runner.addFuncCron("0 0 * * 0", weeklyTask);       // Every Sunday at midnight
runner.addFuncCron("0 0 1 * *", monthlyTask);      // First day of every month
runner.addFuncCron("*/15 * * * *", frequentTask);  // Every 15 minutes
runner.addFuncCron("0 */2 * * *", biHourlyTask);   // Every 2 hours
runner.addFuncCron("0 9-17 * * 1-5", businessTask);// Business hours, weekdays

// Classic cron shortcuts
runner.addFuncCron("@daily", dailyTask);           // Same as "0 0 * * *"
runner.addFuncCron("@hourly", hourlyTask);         // Same as "0 * * * *"
runner.addFuncCron("@weekly", weeklyTask);         // Same as "0 0 * * 0"
runner.addFuncCron("@monthly", monthlyTask);       // Same as "0 0 1 * *"
runner.addFuncCron("@yearly", yearlyTask);         // Same as "0 0 1 1 *"

// Textual month and day names (case-insensitive)
runner.addFuncCron("0 9 * JAN *", januaryTask);    // Every day in January at 9 AM
runner.addFuncCron("0 9 * * MON", mondayTask);     // Every Monday at 9 AM
runner.addFuncCron("0 9 1 jan-mar *", quarterTask);// First day of Q1 months
runner.addFuncCron("0 17 * * fri", fridayTask);    // Every Friday at 5 PM

// 6-field format with seconds
runner.addFuncCron("30 0 9 * * *", task);          // 9:00:30 AM every day
runner.addFuncCron("0,30 * * * * *", task);        // Every 30 seconds
```

#### Advanced Extensions (Beyond Classic Cron)

```typescript
// Every 30 seconds
"*/30 * * * * *"

// At 9:30 AM every weekday
"0 30 9 * * 1-5"

// Last day of every month at midnight
"0 0 0 L * ?"

// First Monday of every month at 9 AM
"0 0 9 ? * 1#1"

// Every 2 hours during business days
"0 0 */2 * * 1-5"

// Complex schedule with timezone
const schedule = new Schedule({
    m: "0",
    h: "9,17",
    D: "1-15",
    dow: "1-5",
    tz: "America/New_York"
});
```

## Advanced Features

### Timezone Support

JCRON-node provides comprehensive timezone support with automatic DST handling:

```typescript
// Schedule a job in a specific timezone
const schedule = new Schedule({
    m: "0",
    h: "9",
    tz: "America/New_York" // 9 AM in New York time
});

// The job will automatically adjust for DST
runner.addJob(schedule, myJob);

// You can also use cron expressions with timezone context
const engine = new Engine(Schedule.parse("0 9 * * *"));
const nextInUTC = engine.next(new Date());
```

### Error Handling and Retries

Configure sophisticated retry policies for fault-tolerant job execution:

```typescript
// Retry with exponential backoff
const retryPolicy = withRetries(5, 1000); // 5 retries, starting with 1 second

// Custom error handling
runner.addFuncCron("0 */5 * * * *", async () => {
    try {
        await riskyOperation();
    } catch (error) {
        logger.error({ error }, "Job failed");
        throw error; // Will trigger retry policy
    }
}, retryPolicy);
```

### Complex Scheduling Patterns

#### Last Day Patterns
```typescript
// Last day of month
"0 0 0 L * ?"

// Last Friday of month
"0 0 18 ? * 5L"

// Last business day of month
const schedule = new Schedule({
    h: "17",
    m: "0",
    D: "L",
    dow: "1-5" // Monday-Friday
});
```

#### Nth Occurrence Patterns
```typescript
// First Monday of every month
"0 0 9 ? * 1#1"

// Third Thursday of every month
"0 0 15 ? * 4#3"

// Second and fourth Tuesday
const schedule = new Schedule({
    h: "10",
    m: "30",
    dow: "2#2,2#4"
});
```

#### Complex Time Ranges
```typescript
// Business hours only (9 AM to 5 PM, Monday-Friday)
"0 */30 9-17 * * 1-5"

// Multiple time slots
"0 0 6,12,18 * * *" // 6 AM, noon, and 6 PM

// Quarterly schedule
"0 0 0 1 */3 *" // First day of every quarter
```

### Performance Optimization

#### Caching Strategy
JCRON-node uses aggressive caching for optimal performance:

```typescript
// Schedules are parsed once and cached
const schedule1 = Schedule.parse("0 9 * * *");
const schedule2 = Schedule.parse("0 9 * * *"); // Uses cached result

// Engine calculations are optimized with mathematical algorithms
const engine = new Engine(schedule1);
const next1 = engine.next(new Date()); // Calculates
const next2 = engine.next(new Date()); // Fast mathematical calculation
```

#### Memory Management
```typescript
// Remove unused jobs to free memory
const jobId = runner.addFuncCron("0 0 * * *", myJob);
// ... later
runner.removeJob(jobId); // Immediately frees resources
```

## Testing and Benchmarks

### Running Tests

The project includes comprehensive test suites covering various scenarios:

```bash
# Install dependencies (using Bun for optimal performance)
bun install

# Run all tests
bun test

# Run specific test suites
bun test tests/engine.test.ts           # Core engine tests
bun test tests/engine.performance.test.ts # Performance benchmarks
bun test tests/schedule.parsing.test.ts   # Parsing tests
bun test tests/runner.test.ts             # Runner integration tests
bun test tests/engine.fixed.test.ts      # Edge case tests
```

### Test Coverage

The test suite includes 116+ test cases covering:

#### Core Functionality (engine.test.ts)
- 40+ "next" execution time calculations
- 20+ "prev" execution time calculations  
- Standard cron patterns (`* * * * *`, `* * * * * *`)
- Complex expressions with ranges, lists, and steps
- Edge cases and boundary conditions

#### Parsing Tests (schedule.parsing.test.ts)
- Cron expression parsing and validation
- Field expansion and normalization
- Error handling for invalid expressions
- Special character handling

#### Performance Tests (engine.performance.test.ts)
- Execution speed benchmarks
- Memory usage analysis
- Cache efficiency testing
- High-frequency scheduling performance
- Large date range calculations

#### Edge Cases (engine.fixed.test.ts)
- Leap year handling
- Timezone transitions
- DST boundary conditions
- Last day (`L`) pattern edge cases

### Benchmark Results

Performance benchmarks show excellent results:

```typescript
// Example benchmark output
✓ Simple pattern performance (500000 iterations) - avg: 0.002ms
✓ Complex pattern performance (100000 iterations) - avg: 0.008ms
✓ Timezone calculations (50000 iterations) - avg: 0.015ms
✓ Cache efficiency test - 99.8% cache hit rate
✓ High-frequency scheduling (100000 jobs) - memory stable
```

### Custom Testing

You can also run your own performance tests:

```typescript
import { Engine, Schedule } from 'jcron-ts';

// Performance test example
const schedule = Schedule.parse("0 9 * * 1-5");
const engine = new Engine(schedule);
const start = Date.now();

for (let i = 0; i < 100000; i++) {
    engine.next(new Date());
}

const duration = Date.now() - start;
console.log(`100,000 calculations in ${duration}ms`);
```

## Differences from Go Version

While JCRON-node maintains API compatibility with the Go version, there are some differences due to platform characteristics:

### JavaScript/Node.js Specific
1. **Date Handling**: Uses JavaScript Date objects instead of Go's time.Time
2. **Timezone Support**: Leverages date-fns-tz instead of Go's timezone package
3. **Precision**: Millisecond precision (vs. nanosecond in Go)
4. **Memory Management**: Automatic garbage collection instead of manual memory management

### API Differences
1. **Promise-based**: Async operations use Promises instead of Go channels
2. **Type System**: TypeScript interfaces instead of Go structs
3. **Error Handling**: JavaScript Error objects instead of Go error interface
4. **Logging**: Flexible logger interface compatible with popular Node.js loggers

### Performance Characteristics
1. **Single-threaded**: Node.js event loop instead of Go goroutines
2. **V8 Optimization**: Benefits from JavaScript engine optimizations
3. **Startup Time**: Faster startup compared to Go compilation
4. **Memory Usage**: Generally lower memory footprint for small workloads

### Behavioral Differences
1. **Leap Year Handling**: Minor differences in edge cases around February 29
2. **DST Transitions**: Uses date-fns-tz DST logic instead of Go's timezone package
3. **L Pattern**: Simplified last-day calculations for complex scenarios
4. **Precision**: Some prev() calculations may differ by milliseconds

### Compatibility Notes
- All standard cron expressions work identically
- Basic L and # patterns are fully compatible
- Complex multi-pattern expressions may have minor differences
- Timezone handling is equivalent for practical purposes

## Performance Considerations

### CPU Usage
- **Idle Efficiency**: Near-zero CPU usage when no jobs are scheduled to run
- **Mathematical Calculations**: Uses algorithmic time calculation instead of polling
- **Batch Processing**: Efficiently handles multiple jobs scheduled for the same time

### Memory Usage
- **Aggressive Caching**: Parsed schedules are cached to avoid re-parsing
- **Automatic Cleanup**: Completed jobs are automatically removed from memory
- **Efficient Data Structures**: Uses optimized internal representations

### Scalability
- **Thousands of Jobs**: Can handle thousands of concurrent scheduled jobs
- **Long-term Scheduling**: Efficient calculation of execution times months in advance
- **Large Date Ranges**: Fast calculation across years of scheduling

### Best Practices
1. **Reuse Schedules**: Create Schedule objects once and reuse them
2. **Remove Unused Jobs**: Call `removeJob()` for one-time or cancelled jobs
3. **Use Appropriate Precision**: Avoid second-level precision if not needed
4. **Batch Operations**: Group related jobs to reduce overhead

```typescript
// Good: Reuse schedule objects
const dailySchedule = Schedule.parse("0 9 * * *");
runner.addJob(dailySchedule, job1);
runner.addJob(dailySchedule, job2);

// Good: Remove completed jobs
const oneTimeJobId = runner.addFuncCron("0 9 15 12 *", oneTimeTask);
// After December 15th...
runner.removeJob(oneTimeJobId);
```

## Logging

JCRON is designed to integrate with your existing logging solution. You can pass any object that conforms to the `ILogger` interface to the `Runner`'s constructor. This gives you full control over the log level, format (Text or JSON), and output destination.

### Custom Logger Implementation

```typescript
import type { ILogger } from 'jcron-ts';

// Example: Create a simple custom logger
const myLogger: ILogger = {
    info(obj: object, msg?: string) { console.log(`[INFO] ${msg}`, obj); },
    warn(obj: object, msg?: string) { console.warn(`[WARN] ${msg}`, obj); },
    error(obj: object, msg?: string) { console.error(`[ERROR] ${msg}`, obj); },
};

const runner = new Runner(myLogger);
```

### Popular Logger Integration

#### Pino Logger
```typescript
import pino from 'pino';
const logger = pino({ level: 'info' });
const runner = new Runner(logger);
```

#### Winston Logger
```typescript
import winston from 'winston';
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
});
const runner = new Runner(logger);
```

#### Console Logger (Default)
```typescript
// Uses console by default if no logger provided
const runner = new Runner(); // Equivalent to new Runner(console)
```

### Log Levels
- **Info**: Job execution starts, completions, and general status
- **Warn**: Job failures that will be retried, performance warnings
- **Error**: Fatal job errors, configuration problems, system issues

## Troubleshooting

### Common Issues

#### Job Not Running
```typescript
// Check if runner is started
runner.start(); // Make sure this is called

// Verify cron expression
const schedule = Schedule.parse("0 9 * * *");
const engine = new Engine(schedule);
const nextRun = engine.next(new Date());
console.log('Next execution:', nextRun);

// Check timezone settings
const scheduleWithTz = new Schedule({
    h: "9",
    m: "0",
    tz: "America/New_York"
});
```

#### Timezone Issues
```typescript
// Always use IANA timezone names
const schedule = new Schedule({
    h: "9",
    tz: "America/New_York" // ✓ Correct
    // tz: "EST" // ✗ Avoid abbreviations
});

// Test timezone calculations
const engine = new Engine(schedule);
const next = engine.next(new Date());
console.log('Next run (UTC):', next.toISOString());
```

#### Memory Leaks
```typescript
// Always remove completed or cancelled jobs
const jobIds = [];
jobIds.push(runner.addFuncCron("0 9 * * *", job1));
jobIds.push(runner.addFuncCron("0 17 * * *", job2));

// Later, clean up
jobIds.forEach(id => runner.removeJob(id));

// Stop runner when application shuts down
process.on('SIGTERM', () => {
    runner.stop();
});
```

#### Performance Issues
```typescript
// Use caching effectively
const schedule = Schedule.parse("0 9 * * *"); // Parse once
const engine = new Engine(schedule); // Create once

// Avoid recreating objects in loops
// Bad:
setInterval(() => {
    const newSchedule = Schedule.parse("0 9 * * *"); // Don't do this
}, 1000);

// Good:
const cachedSchedule = Schedule.parse("0 9 * * *"); // Cache it
```

### Debug Mode

Enable verbose logging to troubleshoot issues:

```typescript
import pino from 'pino';
const logger = pino({ level: 'debug' });
const runner = new Runner(logger);

// This will log detailed information about job scheduling and execution
```

### Validation Helpers

```typescript
// Validate cron expressions before using them
function validateCronExpression(expr: string): boolean {
    try {
        Schedule.parse(expr);
        return true;
    } catch (error) {
        console.error('Invalid cron expression:', expr, error);
        return false;
    }
}

// Test schedule calculations
function testSchedule(expr: string, fromDate: Date = new Date()): void {
    const schedule = Schedule.parse(expr);
    const engine = new Engine(schedule);
    
    console.log('Expression:', expr);
    console.log('Next 5 executions:');
    
    let current = fromDate;
    for (let i = 0; i < 5; i++) {
        current = engine.next(current);
        if (current) {
            console.log(`  ${i + 1}. ${current.toISOString()}`);
            current = new Date(current.getTime() + 1000); // Add 1 second
        } else {
            console.log('  No more executions found');
            break;
        }
    }
}
```

## Concurrency

The JCRON `Runner` and `Engine` are designed to be fully safe for concurrent operations within Node.js's single-threaded, event-driven environment. All access to the shared job list is synchronous, and job executions are spawned as independent `async` operations that never block the main event loop. You can safely call `addJob`, `removeJob`, etc., from multiple `async` functions concurrently.

### Thread Safety
- **Job Management**: Adding/removing jobs is atomic and safe
- **Execution**: Jobs run in separate async contexts
- **State Management**: Internal state is protected from race conditions
- **Event Loop**: Never blocks the main event loop

### Best Practices for Concurrent Usage
```typescript
// Safe: Multiple async operations modifying jobs
async function setupJobs() {
    const promises = [
        setupDailyJobs(),
        setupHourlyJobs(),
        setupWeeklyJobs()
    ];
    await Promise.all(promises);
}

async function setupDailyJobs() {
    runner.addFuncCron("0 9 * * *", dailyTask1);
    runner.addFuncCron("0 17 * * *", dailyTask2);
}

// Safe: Jobs can modify the runner
runner.addFuncCron("0 0 * * 0", () => {
    // A job that manages other jobs
    const tempJobId = runner.addFuncCron("*/5 * * * * *", tempTask);
    
    setTimeout(() => {
        runner.removeJob(tempJobId); // Safe to remove from within a job
    }, 60000);
});
```

## Contributing

We welcome contributions to JCRON-node! Please follow these guidelines:

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd jcron-node-port

# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build
```

### Testing Guidelines
- Add tests for new features in the appropriate test file
- Ensure all existing tests pass: `bun test`
- Include performance tests for algorithmic changes
- Test edge cases, especially around timezones and DST

### Code Style
- Use TypeScript with strict type checking
- Follow existing code formatting and naming conventions
- Add JSDoc comments for public APIs
- Include comprehensive error handling

### Submitting Changes
1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request with a clear description

## License

JCRON-node is released under the MIT License.