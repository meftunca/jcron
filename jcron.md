# JCRON - Advanced High-Performance Job Scheduler

JCRON is a cutting-edge, high-performance job scheduling library available for both **Go** and **TypeScript/Node.js**. It's designed to be a flexible and efficient alternative to standard cron libraries, incorporating advanced scheduling features inspired by the Quartz Scheduler while maintaining a simple and developer-friendly API.

Its core philosophy is built on **performance**, **readability**, **robustness**, and **cross-platform compatibility**.

## 🚀 Key Features

### **Core Scheduling**
- **Standard & Advanced Cron Syntax:** Fully compatible with 5-field (`* * * * *`) and 6-field (`* * * * * *`) Vixie-cron formats
- **Second-level Precision:** Support for sub-minute scheduling with second field
- **Enhanced Scheduling Rules:** Supports advanced, Quartz-like specifiers for complex schedules:
    - `L`: For the "last" day of the month or week (e.g., `L` for the last day of the month, `5L` for the last Friday)
    - `#`: For the "Nth" day of the week in a month (e.g., `1#3` for the third Monday)
    - `W`: Nearest weekday to a given date

### **Advanced Time Management**
- **EOD (End of Duration) System:** Revolutionary time-range scheduling with expressions like:
  - `E1W` - End of current week
  - `E2D` - End of next day  
  - `E1M` - End of current month
  - Complex durations: `E1DT12H30M` - End of day plus 12 hours 30 minutes
- **Timezone Support:** Full timezone handling with `TZ:America/New_York` syntax
- **Year Specification:** Schedule jobs for specific years or year ranges
- **Week of Year (WOY):** Advanced week-based scheduling

### **Performance & Reliability**
- **High-Performance "Next Jump" Algorithm:** Mathematically calculates next valid run time instead of tick-by-tick checking
- **Aggressive Caching:** Cron expressions parsed once, cached as optimized integer representations
- **Thread-Safe:** Designed for concurrent use across multiple goroutines/threads
- **Built-in Error Handling & Retries:** Configurable retry policies with exponential backoff
- **Panic Recovery:** Jobs that panic don't crash the scheduler
- **Structured Logging:** Uses `log/slog` (Go) and configurable loggers (TypeScript)

### **Cross-Platform Support**
- **Go Implementation:** Native Go library with full feature set
- **TypeScript/Node.js Port:** Complete feature parity with Go version
- **Consistent API:** Same syntax and behavior across both platforms

## 📦 Installation

### Go
```bash
go get github.com/meftunca/jcron
```

### TypeScript/Node.js
```bash
npm install jcron
# or
yarn add jcron
# or
bun add jcron
```

## 🚀 Quick Start

### Go Example

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
	// 1. Create a structured logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// 2. Initialize the runner with the logger
	runner := jcron.NewRunner(logger)

	// 3. Add jobs using the familiar cron syntax
	// This job runs every 5 seconds.
	_, err := runner.AddFuncCron("*/5 * * * * *", func() error {
		fmt.Println("-> Simple job running every 5 seconds!")
		return nil
	})
	if err != nil {
		logger.Error("Failed to add job", "error", err)
		return
	}

	// 4. Add a job with EOD (End of Duration) - runs Mon-Fri at 9 AM until end of week
	_, err = runner.AddFuncCron("0 0 9 * * 1-5 EOD:E1W", func() error {
		fmt.Println("-> Weekday job running until end of week!")
		return nil
	})
	if err != nil {
		logger.Error("Failed to add EOD job", "error", err)
		return
	}

	// 5. Start the runner
	runner.Start()
	defer runner.Stop()

	// Keep the program running
	time.Sleep(30 * time.Second)
}
```

### TypeScript/Node.js Example

```typescript
import { Schedule, getNext } from 'jcron';

// Create a schedule with EOD support
const schedule = new Schedule("0 0 9 * * 1-5", "E1W"); // Mon-Fri 9 AM until end of week

// Get next execution time
const nextRun = getNext(schedule, new Date());
console.log('Next run:', nextRun);

// Get end time for the schedule
const endTime = schedule.endOf(new Date());
console.log('End time:', endTime);

// Check if we're in the active range
const isActive = schedule.isRangeNow(new Date());
console.log('Currently active:', isActive);
```

## 🕒 EOD (End of Duration) System

One of JCRON's most powerful features is the **EOD (End of Duration)** system, which allows you to create time-bounded schedules that automatically stop at calculated end points.

### EOD Syntax
```
EOD:[S|E][number][UNIT][T[time_component]]
```

- **S**: Start reference (from start of period)
- **E**: End reference (to end of period) 
- **Units**: `D` (day), `W` (week), `M` (month), `Q` (quarter), `Y` (year)
- **Time components**: `H` (hours), `M` (minutes), `S` (seconds)

### EOD Examples

| Expression | Meaning |
|------------|---------|
| `E1W` | Until end of current week |
| `E2W` | Until end of next week |
| `E1D` | Until end of current day |
| `E1M` | Until end of current month |
| `S30M` | For 30 minutes from start |
| `E1DT12H` | Until end of day + 12 hours |
| `E1WT8H30M` | Until end of week + 8h 30m |

### Real-World EOD Use Cases

```go
// 1. Weekday backup job - runs Mon-Fri 9 AM until end of week
runner.AddFuncCron("0 0 9 * * 1-5 EOD:E1W", backupJob)

// 2. Month-end reporting - runs daily at 6 PM until end of month
runner.AddFuncCron("0 0 18 * * * EOD:E1M", monthEndReport)

// 3. Flash sale monitoring - runs every 10 minutes for 2 hours
runner.AddFuncCron("0 */10 * * * * EOD:S2H", flashSaleMonitor)

// 4. Daily maintenance window - runs hourly until end of day + 6 hours
runner.AddFuncCron("0 0 * * * * EOD:E1DT6H", maintenanceCheck)
```

### EOD Schedule Methods

```go
// Check if schedule has EOD
if schedule.HasEOD() {
    // Get the end time for current execution
    endTime := schedule.EndOf(time.Now())
    
    // Check if we're currently in the active time range
    isActive := schedule.IsRangeNow(time.Now())
    
    // Get start time of the range
    startTime := schedule.StartOf(time.Now())
}
```

## 🌐 Advanced Features

### Timezone Support
```go
// Run daily at 2 PM New York time
"0 0 14 * * * TZ:America/New_York"

// Run weekly on Monday 9 AM London time  
"0 0 9 * * 1 TZ:Europe/London"
```

### Week of Year (WOY)
```go
// Run only in specific weeks of the year
"0 0 12 * * * WOY:1,26,52"  // Week 1, 26, and 52

// Run in quarter weeks
"0 0 9 * * 1 WOY:*/13"      // Every 13th week (quarterly)
```

### Complex Combinations
```go
// Complex schedule: Mon-Fri 9 AM EST, weeks 10-40, until end of each week
"0 0 9 * * 1-5 WOY:10-40 TZ:America/New_York EOD:E1W"

// Year-specific holiday schedule
"0 0 12 25 12 * 2024-2026"  // Christmas noon, 2024-2026 only
```
}
```

## Core Concepts


### The `Runner`

The `Runner` is the heart of the scheduler. It manages the entire lifecycle of all jobs. You create a single `Runner` instance for your application.

```go
// The runner requires a *slog.Logger for structured logging.
logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
runner := jcron.NewRunner(logger)

// Start and Stop the runner's background goroutine.
runner.Start()
defer runner.Stop()
```

### The `Job` Interface

Any task you want to schedule must implement the `Job` interface. The `Run` method must return an `error`. If the job is successful, return `nil`.

```go
type Job interface {
    Run() error
}
```

For convenience, you can use the `JobFunc` type to adapt any function with the signature `func() error` into a `Job`.

### Scheduling a Job

The easiest way to schedule a job is with `AddFuncCron`, which accepts the standard cron string format.

```go
id, err := runner.AddFuncCron(
    "0 17 * * 5", // Run at 5:00 PM every Friday
    func() error {
        fmt.Println("It's Friday at 5 PM! Time to go home.")
        return nil
    },
)
if err != nil {
    log.Fatal("Failed to add job:", err)
}
```

### Advanced Options: Retry Policies

You can pass additional options when scheduling a job. The most common is setting a retry policy. The `WithRetries` option uses the "Functional Options Pattern".

```go
import (
    "errors"
    "time"
    
    "github.com/meftunca/jcron"
)

// This job will be retried up to 3 times, with a 5-second delay between each attempt.
id, err := runner.AddFuncCron(
    "*/15 * * * * *", // Trigger every 15 seconds
    myFailingJob,
    jcron.WithRetries(3, 5*time.Second),
)
if err != nil {
    log.Fatal("Failed to add job:", err)
}

func myFailingJob() error {
    // ... logic that might fail ...
    return errors.New("something went wrong")
}
```

## JCRON Format Specification (v1.1)

For advanced scheduling that is not covered by the standard cron syntax, you can build a `jcron.Schedule` struct manually.

| Key | Description | Allowed Values | Example |
| `s` | Second | `0-59` and `* , - /` | `"30"`, `"0/15"` |
| `m` | Minute | `0-59` and `* , - /` | `"5"`, `"0-29"` |
| `h` | Hour | `0-23` and `* , - /` | `"9"`, `"9-17"` |
| `D` | Day of Month | `1-31` and `* , - / ? L` | `"15"`, `"L"` |
| `M` | Month | `1-12` and `* , - /` | `"10"`, `"6-8"` |
| `dow` | Day of Week | `0-7` (0 or 7 is Sun) and `* , - / ? L #` | `"1"`, `"1-5"`, `"5L"` |
| `Y` | Year | `YYYY` and `* , -` | `"2025"`, `"2025-2030"` |
| `tz` | Timezone | IANA Format | `"Europe/Istanbul"`, `"America/New_York"` |

E-Tablolar'a aktar

**Defaults:** If a key is not specified, it defaults to `*` (every), except for `s` (second), which defaults to `0`.

## PostgreSQL Integration

JCRON also provides a PostgreSQL implementation that allows you to store and manage jobs directly in your database. This is particularly useful for distributed systems where multiple instances need to share the same job schedule.

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

// Connect to your PostgreSQL database
db, err := sql.Open("postgres", "user=username dbname=mydb sslmode=disable")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Add a job using SQL
_, err = db.Exec(`
    SELECT jcron.add_job_from_cron(
        'daily_backup',           -- Job name
        '@daily',                 -- Cron expression
        'pg_dump mydatabase',     -- Command to execute
        'UTC'                     -- Timezone
    )
`)
if err != nil {
    log.Fatal("Failed to add job:", err)
}

// Get the next execution time
var nextRun time.Time
err = db.QueryRow(`
    SELECT jcron.next_jump(
        '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5"}'::jsonb,
        NOW()
    )
`).Scan(&nextRun)
if err != nil {
    log.Fatal("Failed to get next run time:", err)
}

fmt.Printf("Next execution: %s\n", nextRun.Format(time.RFC3339))
```

## Advanced Examples

### Complex Scheduling with Retries

```go
package main

import (
    "context"
    "fmt"
    "log/slog"
    "os"
    "time"

    "github.com/meftunca/jcron"
)

type DatabaseBackupJob struct {
    dbName string
    logger *slog.Logger
}

func (j *DatabaseBackupJob) Run() error {
    j.logger.Info("Starting database backup", "database", j.dbName)
    
    // Simulate backup process
    time.Sleep(2 * time.Second)
    
    // Simulate occasional failure (20% chance)
    if time.Now().Unix()%5 == 0 {
        return fmt.Errorf("backup failed for database: %s", j.dbName)
    }
    
    j.logger.Info("Database backup completed successfully", "database", j.dbName)
    return nil
}

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    
    runner := jcron.NewRunner(logger)
    
    // Add a complex job with retries
    backupJob := &DatabaseBackupJob{
        dbName: "production_db",
        logger: logger,
    }
    
    jobID, err := runner.AddJobCron(
        "0 2 * * *", // Every day at 2 AM
        backupJob,
        jcron.WithRetries(3, 30*time.Second), // Retry 3 times with 30s delay
        jcron.WithTimeout(10*time.Minute),    // 10 minute timeout
    )
    if err != nil {
        logger.Error("Failed to add backup job", "error", err)
        return
    }
    
    logger.Info("Backup job scheduled", "jobID", jobID)
    
    // Add a monitoring job
    _, err = runner.AddFuncCron("*/30 * * * * *", func() error {
        logger.Info("System health check", "timestamp", time.Now())
        return nil
    })
    if err != nil {
        logger.Error("Failed to add monitoring job", "error", err)
        return
    }
    
    runner.Start()
    defer runner.Stop()
    
    // Graceful shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    select {
    case <-ctx.Done():
        logger.Info("Application shutting down")
    }
}
```

### Dynamic Job Management

```go
// Add jobs dynamically based on configuration
type JobConfig struct {
    Name        string `json:"name"`
    Schedule    string `json:"schedule"`
    Command     string `json:"command"`
    MaxRetries  int    `json:"max_retries"`
    RetryDelay  string `json:"retry_delay"`
}

func loadJobsFromConfig(runner *jcron.Runner, configFile string) error {
    var configs []JobConfig
    
    data, err := os.ReadFile(configFile)
    if err != nil {
        return err
    }
    
    if err := json.Unmarshal(data, &configs); err != nil {
        return err
    }
    
    for _, config := range configs {
        retryDelay, _ := time.ParseDuration(config.RetryDelay)
        
        _, err := runner.AddFuncCron(
            config.Schedule,
            func() error {
                // Execute the command
                cmd := exec.Command("sh", "-c", config.Command)
                return cmd.Run()
            },
            jcron.WithRetries(config.MaxRetries, retryDelay),
        )
        if err != nil {
            return fmt.Errorf("failed to add job %s: %w", config.Name, err)
        }
    }
    
    return nil
}
```

## Logging

JCRON uses the standard library's structured logger, `log/slog`. You are required to pass a `*slog.Logger` instance to the `NewRunner`. This gives you full control over the log level, format (Text or JSON), and output destination, ensuring JCRON's logs integrate perfectly with your application's.

```go
// Example: Create a JSON logger that logs to stderr.
logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
runner := jcron.NewRunner(logger)
```

## Thread Safety

The JCRON `Runner` and `Engine` are designed to be fully thread-safe. All access to shared internal state (the job list and the schedule cache) is protected by mutexes. You can safely call `AddJob`, `RemoveJob`, etc., from multiple goroutines concurrently.

## Performance Benchmarks

JCRON is designed for high performance. Here are some benchmark results:

```
BenchmarkEngineNext_Simple         	 1000000	      1.2 μs/op	       0 allocs/op
BenchmarkEngineNext_Complex        	  500000	      2.4 μs/op	       0 allocs/op
BenchmarkEngineNext_SpecialChars   	  300000	      4.1 μs/op	       0 allocs/op
BenchmarkCacheHit                  	 2000000	      0.6 μs/op	       0 allocs/op
```

The "next jump" algorithm provides sub-microsecond performance for most schedule calculations.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/meftunca/jcron.git
cd jcron
```

2. Run tests:
```bash
go test -v ./...
```

3. Run benchmarks:
```bash
go test -bench=. -benchmem
```

4. Test PostgreSQL integration (requires Docker):
```bash
docker-compose up -d postgres
go test -v ./sql-ports/...
```

## License

JCRON is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the [Quartz Scheduler](http://www.quartz-scheduler.org/) for Java
- Thanks to the Go community for excellent tooling and libraries
- Special thanks to all contributors who have helped improve this project