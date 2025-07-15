# JCRON - A High-Performance Go Job Scheduler

JCRON is a modern, high-performance job scheduling library for Go. It is designed to be a flexible and efficient alternative to standard cron libraries, incorporating advanced scheduling features inspired by the Quartz Scheduler while maintaining a simple and developer-friendly API.

Its core philosophy is built on **performance**, **readability**, and **robustness**.

## Features

- **Standard & Advanced Cron Syntax:** Fully compatible with the 5-field (`* * * * *`) and 6-field (`* * * * * *`) Vixie-cron formats.
- **Enhanced Scheduling Rules:** Supports advanced, Quartz-like specifiers for complex schedules:
    - `L`: For the "last" day of the month or week (e.g., `L` for the last day of the month, `5L` for the last Friday).
    - `#`: For the "Nth" day of the week in a month (e.g., `1#3` for the third Monday).
- **High-Performance "Next Jump" Algorithm:** Instead of tick-by-tick time checking, JCRON mathematically calculates the next valid run time, providing significant performance gains for long-interval jobs.
- **Aggressive Caching:** Cron expressions are parsed only once and their expanded integer-based representations are cached, making subsequent schedule calculations extremely fast.
- **Built-in Error Handling & Retries:** Jobs can return errors, and you can configure automatic retry policies with delays for each job.
- **Panic Recovery:** A job that panics will not crash the runner. The panic is recovered, logged, and the runner continues to operate smoothly.
- **Structured Logging:** Uses the standard `log/slog` library. Inject your own configured logger to integrate JCRON's logs seamlessly into your application's logging infrastructure.
- **Thread-Safe:** Designed from the ground up to be safe for concurrent use. You can add, remove, and manage jobs from multiple goroutines without data races.

## Installation

```bash
go get github.com/meftunca/jcron
```


## Quick Start

Here is a simple example to get you up and running in minutes.

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

	// This job runs once at the 30th second of every minute.
	_, err = runner.AddFuncCron("30 * * * * *", func() error {
		fmt.Printf("--> It's the 30th second of the minute. Time is %s\n", 
			time.Now().Format("15:04:05"))
		return nil
	})
	if err != nil {
		logger.Error("Failed to add job", "error", err)
		return
	}

	// 4. Start the runner (non-blocking)
	runner.Start()
	logger.Info("JCRON runner has been started. Press CTRL+C to exit.")

	// 5. Wait for the application to be terminated
	// In a real application, this would be your main application loop.
	time.Sleep(1 * time.Minute)

	// 6. Stop the runner gracefully
	runner.Stop()
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