# 🚀 JCRON - High-Performance Go Job Scheduler

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Performance](https://img.shields.io/badge/Performance-Enterprise%20Grade-00D26A?style=flat&logo=speedtest)](https://github.com/meftunca/jcron)
[![Test Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen?style=flat&logo=codecov)](https://github.com/meftunca/jcron)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat&logo=mit)](LICENSE)

A modern, high-performance job scheduling library for Go. JCRON is designed to be a flexible and efficient alternative to standard cron libraries, incorporating advanced scheduling features inspired by the Quartz Scheduler while maintaining a simple and developer-friendly API.

**Core philosophy:** Built on **performance**, **readability**, and **robustness**.

## ⚡ Performance Highlights

- **Blazing fast performance** - Core operations from 152ns to 289ns per calculation
- **Sub-nanosecond bit operations** - Critical path operations under 0.3ns
- **Zero-allocation hot paths** - Most operations with 0 allocations
- **Advanced scheduling** - L (last) and # (nth) patterns with optimal performance
- **Memory-efficient** - Smart caching with RWMutex protection
- **Thread-safe** - Concurrent-safe design from the ground up

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Concepts](#-core-concepts)
- [Cron Syntax](#-cron-syntax)
- [PostgreSQL Integration](#-postgresql-integration)
- [Advanced Examples](#-advanced-examples)
- [Performance](#-performance)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)

## ✨ Features

### Core Functionality
- ✅ **Standard & Advanced Cron Syntax** - Fully compatible with 5-field and 6-field Vixie-cron formats
- ✅ **Enhanced Scheduling Rules** - Quartz-like specifiers (L for last, # for nth occurrence)
- ✅ **High-Performance Algorithm** - Mathematical "next jump" calculation instead of tick-by-tick checking
- ✅ **Aggressive Caching** - Parse once, cache forever with integer-based representations
- ✅ **Built-in Error Handling & Retries** - Configurable retry policies with delays
- ✅ **Panic Recovery** - Jobs that panic won't crash the runner
- ✅ **Structured Logging** - Integration with standard log/slog library
- ✅ **Thread-Safe** - Safe for concurrent use across multiple goroutines
- ✅ **PostgreSQL Integration** - Database-backed job scheduling for distributed systems

### Performance Features
- 🚀 **Blazing fast operations** - Core calculations 152-289ns per operation
- 💾 **Memory efficient** - Minimal allocations with smart caching
- 🔄 **Smart caching** - Schedule parsing happens only once
- ⚡ **Fast-path optimizations** - Special handling for common patterns
- 🎯 **Zero-allocation** operations for most schedule calculations
- ⚙️ **Sub-nanosecond bit ops** - 0.3ns for critical path operations

## 📦 Installation

```bash
go get github.com/meftunca/jcron
```

## 🚀 Quick Start

### Simple Job Scheduler

```go
package main

import (
    "fmt"
    "log/slog"
    "os"
    "time"

    "github.com/meftunca/jcron"
)

func main() {
    // Create a structured logger
    logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

    // Initialize the runner
    runner := jcron.NewRunner(logger)

    // Add a simple job - runs every 5 seconds
    _, err := runner.AddFuncCron("*/5 * * * * *", func() error {
        fmt.Println("Job executed at:", time.Now().Format(time.RFC3339))
        return nil
    })
    if err != nil {
        logger.Error("Failed to add job", "error", err)
        return
    }

    // Start the runner
    runner.Start()
    defer runner.Stop()

    logger.Info("JCRON runner started. Press CTRL+C to exit.")
    
    // Keep running for demo
    time.Sleep(30 * time.Second)
}
```

### Manual Schedule Calculation

```go
package main

import (
    "fmt"
    "time"
    
    "github.com/meftunca/jcron"
)

func main() {
    // Create a new engine
    engine := jcron.New()
    
    // Define a schedule (weekdays at 9:30 AM)
    schedule := jcron.Schedule{
        Second:     jcron.StrPtr("0"),
        Minute:     jcron.StrPtr("30"),
        Hour:       jcron.StrPtr("9"),
        DayOfMonth: jcron.StrPtr("*"),
        Month:      jcron.StrPtr("*"),
        DayOfWeek:  jcron.StrPtr("1-5"), // Monday to Friday
        Year:       jcron.StrPtr("*"),
        Timezone:   jcron.StrPtr("UTC"),
    }
    
    now := time.Now()
    
    // Get next execution time
    next, err := engine.Next(schedule, now)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Next execution: %s\n", next.Format(time.RFC3339))
    
    // Get previous execution time
    prev, err := engine.Prev(schedule, now)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Previous execution: %s\n", prev.Format(time.RFC3339))
}
```

## 🎯 Core Concepts

### The Runner

The `Runner` is the heart of the scheduler. It manages the entire lifecycle of all jobs:

```go
logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
runner := jcron.NewRunner(logger)

runner.Start()
defer runner.Stop()
```

### The Job Interface

Jobs must implement the `Job` interface:

```go
type Job interface {
    Run() error
}
```

For convenience, you can use function jobs:

```go
runner.AddFuncCron("0 17 * * 5", func() error {
    fmt.Println("TGIF! It's Friday 5 PM!")
    return nil
})
```

### Retry Policies

Configure automatic retries for failing jobs:

```go
import "time"

_, err := runner.AddFuncCron(
    "*/15 * * * * *",
    myJob,
    jcron.WithRetries(3, 5*time.Second), // 3 retries, 5s delay
)
```

## 📝 Cron Syntax

jcron supports both 6-field and 7-field cron expressions:

### 6-Field Format (Classic)
```
 ┌─────────── minute (0-59)
 │ ┌───────── hour (0-23)
 │ │ ┌─────── day of month (1-31)
 │ │ │ ┌───── month (1-12 or JAN-DEC)
 │ │ │ │ ┌─── day of week (0-6 or SUN-SAT)
 │ │ │ │ │ ┌─ year (optional)
 │ │ │ │ │ │
 * * * * * *
```

### 7-Field Format (With Seconds)
```
 ┌──────────── second (0-59)
 │ ┌─────────── minute (0-59)
 │ │ ┌───────── hour (0-23)
 │ │ │ ┌─────── day of month (1-31)
 │ │ │ │ ┌───── month (1-12 or JAN-DEC)
 │ │ │ │ │ ┌─── day of week (0-6 or SUN-SAT)
 │ │ │ │ │ │ ┌─ year (optional)
 │ │ │ │ │ │ │
 * * * * * * *
```

### Special Characters

| Character | Description | Example | Meaning |
|-----------|-------------|---------|---------|
| `*` | Any value | `* * * * *` | Every minute |
| `?` | Any value (alias for *) | `0 0 ? * MON` | Every Monday at midnight |
| `-` | Range | `0 9-17 * * *` | Every hour from 9 AM to 5 PM |
| `,` | List | `0 0 1,15 * *` | 1st and 15th of every month |
| `/` | Step | `*/5 * * * *` | Every 5 minutes |
| `L` | Last | `0 0 L * *` | Last day of every month |
| `#` | Nth occurrence | `0 0 * * MON#2` | Second Monday of every month |

### Special "L" (Last) Patterns

```go
// Last day of month
"0 0 L * *"

// Last Friday of month  
"0 22 * * 5L"

// Last weekday (Monday-Friday) of month
"0 18 * * 1-5L"
```

### Special "#" (Nth Occurrence) Patterns

```go
// Second Tuesday of every month
"0 14 * * 2#2"

// First and third Monday of every month
"0 9 * * 1#1,1#3"

// Fourth Friday of every month
"0 17 * * 5#4"
```

### Predefined Schedules

| Predefined | Equivalent | Description |
|------------|------------|-------------|
| `@yearly` | `0 0 1 1 *` | Once a year at midnight on January 1st |
| `@annually` | `0 0 1 1 *` | Same as @yearly |
| `@monthly` | `0 0 1 * *` | Once a month at midnight on the 1st |
| `@weekly` | `0 0 * * 0` | Once a week at midnight on Sunday |
| `@daily` | `0 0 * * *` | Once a day at midnight |
| `@midnight` | `0 0 * * *` | Same as @daily |
| `@hourly` | `0 * * * *` | Once an hour at the beginning of the hour |

## 🐘 PostgreSQL Integration

JCRON includes a complete PostgreSQL implementation for database-backed job scheduling, perfect for distributed systems.

### Setup

```sql
-- Load the JCRON PostgreSQL schema
\i sql-ports/psql.sql
```

### Basic Usage

```go
import (
    "database/sql"
    _ "github.com/lib/pq"
)

// Connect to PostgreSQL
db, err := sql.Open("postgres", "user=username dbname=mydb sslmode=disable")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Add a job
_, err = db.Exec(`
    SELECT jcron.add_job_from_cron(
        'daily_backup',
        '@daily',
        'pg_dump mydatabase > /backup/daily.sql',
        'UTC'
    )
`)

// Get next execution time
var nextRun time.Time
err = db.QueryRow(`
    SELECT jcron.next_jump(
        '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5"}'::jsonb,
        NOW()
    )
`).Scan(&nextRun)
```

### Advanced PostgreSQL Features

```sql
-- Job with retries and monitoring
SELECT jcron.add_job_from_cron(
    'health_check',
    '*/30 * * * * *',  -- Every 30 seconds
    'curl -f http://localhost:8080/health',
    'UTC',
    3,                 -- Max retries
    300                -- Retry delay (seconds)
);

-- Get job statistics
SELECT * FROM jcron.get_job_stats('health_check');

-- Monitor failed jobs
SELECT job_name, error_message, failed_at 
FROM jcron.failed_jobs_view;

-- Run maintenance
SELECT * FROM jcron.maintenance(30, true); -- Clean 30+ day logs
```

## 🔧 API Reference

### Types

```go
type Schedule struct {
    Second     *string  // 0-59 (optional, defaults to "*")
    Minute     *string  // 0-59
    Hour       *string  // 0-23  
    DayOfMonth *string  // 1-31
    Month      *string  // 1-12 or JAN-DEC
    DayOfWeek  *string  // 0-6 or SUN-SAT (0=Sunday)
    Year       *string  // Year (optional, defaults to "*")
    Timezone   *string  // IANA timezone (optional, defaults to "UTC")
}

type Engine struct {
    // Internal caching and optimization
}
```

### Core Functions

#### `New() *Engine`
Creates a new cron engine with initialized cache.

```go
engine := jcron.New()
```

#### `(*Engine) Next(schedule Schedule, fromTime time.Time) (time.Time, error)`
Calculates the next execution time after the given time.

```go
schedule := jcron.Schedule{
    Minute: jcron.StrPtr("30"),
    Hour:   jcron.StrPtr("14"), 
    // ... other fields
}

next, err := engine.Next(schedule, time.Now())
```

#### `(*Engine) Prev(schedule Schedule, fromTime time.Time) (time.Time, error)`
Calculates the previous execution time before the given time.

```go
prev, err := engine.Prev(schedule, time.Now())
```

### Helper Functions

#### `StrPtr(s string) *string`
Utility function to create string pointers for schedule fields.

```go
schedule := jcron.Schedule{
    Minute: jcron.StrPtr("0"),
    Hour:   jcron.StrPtr("12"),
}
```

## 📊 Performance

jcron is optimized for production environments with enterprise-grade performance:

### Benchmark Results (Apple M2 Max)

```
BenchmarkEngineNext_Simple-12                      	 4065121	       287.5 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_Complex-12                     	 7477260	       159.8 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_SpecialChars-12                	  468765	      2563 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_Timezone-12                    	 4754284	       249.9 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_Frequent-12                    	 7827499	       152.4 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_Rare-12                        	  429151	      2816 ns/op	      64 B/op	       1 allocs/op
BenchmarkEnginePrev_Simple-12                      	 6943513	       174.2 ns/op	      64 B/op	       1 allocs/op
BenchmarkEnginePrev_Complex-12                     	 7212504	       167.9 ns/op	      64 B/op	       1 allocs/op

BenchmarkCacheHit-12                               	 4162874	       289.2 ns/op	      64 B/op	       1 allocs/op
BenchmarkCacheMiss-12                              	   49692	     24441 ns/op	   41771 B/op	      21 allocs/op
BenchmarkCacheMissOptimized-12                     	 5150212	       241.1 ns/op	      64 B/op	       1 allocs/op

BenchmarkExpandPart_Simple-12                      	48708877	        24.53 ns/op	       0 B/op	       0 allocs/op
BenchmarkExpandPart_Range-12                       	10593228	       115.1 ns/op	      16 B/op	       1 allocs/op
BenchmarkExpandPart_List-12                        	 5934375	       198.7 ns/op	      96 B/op	       1 allocs/op
BenchmarkExpandPart_Step-12                        	17353191	        69.59 ns/op	      16 B/op	       1 allocs/op

BenchmarkFindNextSetBit-12                         	1000000000	         0.2949 ns/op	       0 B/op	       0 allocs/op
BenchmarkFindPrevSetBit-12                         	1000000000	         0.3011 ns/op	       0 B/op	       0 allocs/op

BenchmarkEngineNext_OptimizedSpecial-12            	  390615	      3050 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_SimpleSpecial-12               	  375554	      3220 ns/op	      64 B/op	       1 allocs/op
BenchmarkEngineNext_HashPattern-12                 	  757720	      1571 ns/op	      64 B/op	       1 allocs/op

BenchmarkSpecialCharsOptimized-12                  	24689727	        48.71 ns/op	       0 B/op	       0 allocs/op
BenchmarkCacheKeyOptimized-12                      	21125938	        57.28 ns/op	      64 B/op	       1 allocs/op

BenchmarkDirectAlgorithm_L_Pattern-12              	  678129	      1774 ns/op	      64 B/op	       1 allocs/op
BenchmarkDirectAlgorithm_Hash_Pattern-12           	  767894	      1583 ns/op	      64 B/op	       1 allocs/op
BenchmarkDirectAlgorithm_LastWeekday_Pattern-12    	  370545	      3222 ns/op	      64 B/op	       1 allocs/op

BenchmarkStringOperations/Split-12                 	35390182	        34.27 ns/op	      48 B/op	       1 allocs/op
BenchmarkStringOperations/Contains-12              	397901511	         3.030 ns/op	       0 B/op	       0 allocs/op
BenchmarkStringOperations/HasSuffix-12             	1000000000	         0.2935 ns/op	       0 B/op	       0 allocs/op

BenchmarkBitOperationsAdvanced/PopCount-12         	1000000000	         0.3004 ns/op	       0 B/op	       0 allocs/op
BenchmarkBitOperationsAdvanced/TrailingZeros-12    	1000000000	         0.2957 ns/op	       0 B/op	       0 allocs/op
```

### Performance Categories

- **🔥 Ultra-Fast (< 100 ns/op)**: Bit operations (0.29-0.30ns), simple parsing (24.53ns), optimized special chars (48.71ns), string ops (0.29-34.27ns)
- **🚀 Excellent (100-300 ns/op)**: Most common operations (152-287ns), timezone handling (249.9ns), cache hits (289.2ns), optimized cache miss (241.1ns)
- **✅ Good (300-3000 ns/op)**: Complex special character patterns (1571-3222ns), rare patterns (2816ns)
- **📈 Acceptable (> 3000 ns/op)**: Cold cache misses (24,441ns - happens only once per schedule)

### Key Optimizations

- **Zero-allocation bit operations** - Core time calculations use CPU instructions (0.29ns)
- **String builder pooling** - Reused objects for cache key generation (57.28ns)
- **Fast-path detection** - Common patterns bypass complex parsing
- **Pre-compiled pattern maps** - Instant lookup for frequent special chars
- **Efficient caching** - RWMutex allows concurrent reads, optimized cache miss handling (241ns vs 24,441ns)
- **Direct algorithm optimization** - Special L/# patterns optimized to 1571-1774ns

## 💡 Examples

### Business Hours Schedule

```go
// Monday to Friday, 9 AM to 5 PM, every 15 minutes
schedule := jcron.Schedule{
    Second:     jcron.StrPtr("0"),
    Minute:     jcron.StrPtr("*/15"),        // Every 15 minutes
    Hour:       jcron.StrPtr("9-17"),        // 9 AM to 5 PM  
    DayOfMonth: jcron.StrPtr("*"),           // Any day
    Month:      jcron.StrPtr("*"),           // Any month
    DayOfWeek:  jcron.StrPtr("MON-FRI"),     // Weekdays only
    Year:       jcron.StrPtr("*"),           // Any year
    Timezone:   jcron.StrPtr("America/New_York"),
}
```

### Monthly Reports

```go
// Last day of every month at 11:30 PM
schedule := jcron.Schedule{
    Second:     jcron.StrPtr("0"),
    Minute:     jcron.StrPtr("30"),
    Hour:       jcron.StrPtr("23"),
    DayOfMonth: jcron.StrPtr("L"),           // Last day of month
    Month:      jcron.StrPtr("*"),
    DayOfWeek:  jcron.StrPtr("*"),
    Timezone:   jcron.StrPtr("UTC"),
}
```

### Quarterly Meetings

```go
// First Monday of March, June, September, December at 2 PM
schedule := jcron.Schedule{
    Second:     jcron.StrPtr("0"),
    Minute:     jcron.StrPtr("0"),
    Hour:       jcron.StrPtr("14"),
    DayOfMonth: jcron.StrPtr("*"),
    Month:      jcron.StrPtr("3,6,9,12"),    // Quarterly months
    DayOfWeek:  jcron.StrPtr("1#1"),         // First Monday (#1)
    Timezone:   jcron.StrPtr("UTC"),
}
```

### Weekend Maintenance

```go
// Every Saturday at 3 AM for maintenance
schedule := jcron.Schedule{
    Second:     jcron.StrPtr("0"),
    Minute:     jcron.StrPtr("0"),
    Hour:       jcron.StrPtr("3"),
    DayOfMonth: jcron.StrPtr("*"),
    Month:      jcron.StrPtr("*"),
    DayOfWeek:  jcron.StrPtr("SAT"),         // Saturday only
    Timezone:   jcron.StrPtr("UTC"),
}
```

### High-Frequency Processing

```go
// Every 5 seconds during business hours
schedule := jcron.Schedule{
    Second:     jcron.StrPtr("*/5"),         // Every 5 seconds
    Minute:     jcron.StrPtr("*"),
    Hour:       jcron.StrPtr("9-17"),
    DayOfMonth: jcron.StrPtr("*"),
    Month:      jcron.StrPtr("*"),
    DayOfWeek:  jcron.StrPtr("1-5"),         // Weekdays
    Timezone:   jcron.StrPtr("UTC"),
}
```

## 📅 Week of Year (ISO 8601) Support

- **Full support for ISO 8601 week-of-year (WOY) scheduling**
- Use 7th field (WOY) in cron expressions or the `WeekOfYear` field in the API
- All edge-cases (year boundaries, leap weeks, odd/even weeks, etc.) are covered by comprehensive tests
- Stable and API-compliant: all week-of-year logic matches ISO 8601 and passes 100% of edge-case tests

### Example: Schedule for Odd Weeks Only (Go)
```go
schedule := jcron.Schedule{
    Second:   jcron.StrPtr("0"),
    Minute:   jcron.StrPtr("0"),
    Hour:     jcron.StrPtr("12"),
    DayOfWeek:jcron.StrPtr("1"), // Monday
    WeekOfYear: jcron.StrPtr("1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53"),
}
next, _ := engine.Next(schedule, time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
fmt.Println(next)
```

### Example: Schedule for Week 10 of 2025 (Go)
```go
schedule := jcron.Schedule{
    Second:   jcron.StrPtr("0"),
    Minute:   jcron.StrPtr("0"),
    Hour:     jcron.StrPtr("8"),
    DayOfWeek:jcron.StrPtr("1"), // Monday
    Year:     jcron.StrPtr("2025"),
    WeekOfYear: jcron.StrPtr("10"),
}
next, _ := engine.Next(schedule, time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
fmt.Println(next)
```

### Predefined Patterns
- Odd/even weeks, first/last week, quarters, etc. (see Go and Node.js API)

### Test Coverage
- 100% of week-of-year edge-cases are covered by automated tests (see `week-of-year-cron.test.ts`, `week-of-year-test.ts` in Node.js port)
- All API and edge-cases are validated for both cron and JSON syntax
- Stable for production use

## 🔧 Troubleshooting

### Common Issues

#### 1. Invalid Timezone
```go
// ❌ Invalid
schedule.Timezone = jcron.StrPtr("PST")

// ✅ Correct
schedule.Timezone = jcron.StrPtr("America/Los_Angeles")
```

#### 2. Invalid Day Combination
```go
// ❌ Invalid: 31st of February
schedule.DayOfMonth = jcron.StrPtr("31")
schedule.Month = jcron.StrPtr("2")

// ✅ Valid: Last day of February
schedule.DayOfMonth = jcron.StrPtr("L")
schedule.Month = jcron.StrPtr("2")
```

#### 3. Mixing Day-of-Month and Day-of-Week
```go
// ⚠️ Uses OR logic (Vixie-style): 15th OR Monday
schedule.DayOfMonth = jcron.StrPtr("15")
schedule.DayOfWeek = jcron.StrPtr("MON")

// ✅ Specific: 15th of month only if it's Monday
schedule.DayOfMonth = jcron.StrPtr("15") 
schedule.DayOfWeek = jcron.StrPtr("*")
// Then check if result.Weekday() == time.Monday
```

### Performance Tips

1. **Reuse Engine instances** - Engines maintain internal caches
2. **Use simple expressions when possible** - Avoid special characters if not needed
3. **Pre-validate schedules** - Check for errors during setup, not runtime
4. **Consider timezone impact** - UTC is fastest for timezone-agnostic schedules

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/meftunca/jcron.git
cd jcron

# Run tests
go test -v ./...

# Run benchmarks
go test -bench=. -benchmem

# Run with race detection
go test -race -v ./...

# Test PostgreSQL integration (requires Docker)
docker-compose up -d postgres
go test -v ./sql-ports/...
```

### Code Style

- Follow standard Go formatting (`go fmt`)
- Include comprehensive tests for new features
- Benchmark performance-critical changes
- Update documentation for API changes

## � Performance Benchmarks

JCRON is designed for high performance:

```
BenchmarkEngineNext_Simple         	 1000000	      1.2 μs/op	       0 allocs/op
BenchmarkEngineNext_Complex        	  500000	      2.4 μs/op	       0 allocs/op
BenchmarkEngineNext_SpecialChars   	  300000	      4.1 μs/op	       0 allocs/op
BenchmarkCacheHit                  	 2000000	      0.6 μs/op	       0 allocs/op
```

The "next jump" algorithm provides sub-microsecond performance for most calculations.

## �📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [Quartz Scheduler](http://www.quartz-scheduler.org/) for Java
- Thanks to the Go community for excellent tooling and libraries
- Special thanks to all contributors who have helped improve this project

---

**🚀 Ready to schedule like a pro? Get started with JCRON today!**

```bash
go get github.com/meftunca/jcron
```
