# JCRON PostgreSQL Extension

High-performance cron scheduling extension for PostgreSQL using JCRON C library.

## Features

- 🚀 **High Performance**: 16-18M operations/sec using SIMD optimizations
- 📅 **Full Cron Syntax**: Standard cron expressions with advanced features
- 🔧 **EOD/SOD Support**: End/Start of Day/Month/Week/Year modifiers
- 🎯 **PostgreSQL Native**: C extension with SQL interface
- 🔄 **Background Processing**: Automatic job execution via background workers
- 🛡️ **Security**: Privilege dropping and safe job execution
- 📊 **Monitoring**: Job statistics and logging

## Installation

### Prerequisites

- PostgreSQL 12+ (with development headers)
- JCRON C library (built and installed)
- GCC with AVX2/NEON support

### Build and Install

```bash
# Build JCRON library first
cd ../
make clean && make
sudo make install

# Build PostgreSQL extension
cd pg-extension
make clean && make
sudo make install

# Create extension in database
psql -d your_database -c "CREATE EXTENSION jcron;"
```

## Usage

### Basic Scheduling

```sql
-- Schedule a job to run every 5 minutes
SELECT jcron.schedule('*/5 * * * *', 'SELECT my_maintenance_function()');

-- Schedule with specific database/user
SELECT jcron.schedule(
    '0 2 * * *',  -- Daily at 2 AM
    'VACUUM ANALYZE',
    'mydatabase',
    'postgres'
);

-- Schedule with EOD modifier (End of Month)
SELECT jcron.schedule(
    '0 0 E0M * *',  -- End of every month at midnight
    'SELECT generate_monthly_report()'
);
```

### Job Management

```sql
-- List all active jobs
SELECT * FROM jcron.list_jobs();

-- Unschedule a job
SELECT jcron.unschedule(123);

-- Get next run time for a schedule
SELECT jcron.next_time('0 9 * * 1-5');
```

### Convenience Functions

```sql
-- Simple scheduling (uses current database/user)
SELECT cron.schedule('*/15 * * * *', 'SELECT update_cache()');

-- List jobs
SELECT * FROM cron.list();

-- Unschedule
SELECT cron.unschedule(123);
```

## Cron Syntax

JCRON supports full cron syntax with extensions:

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ Second (0-59)
│ │ │ │ └─── Day of Week (0-6, 0=Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Advanced Features

- **Ranges**: `1-5` (1,2,3,4,5)
- **Steps**: `*/15` (every 15 units)
- **Lists**: `1,3,5` (1 or 3 or 5)
- **EOD/SOD**: `E0D` (End of Day), `S1M` (Start of Month)
- **Week of Year**: `WOY 1-10` (Weeks 1 through 10)
- **OR operator**: `0 9|17 * * *` (9 AM or 5 PM)
- **Nth Weekday**: `1#1` (First Monday), `5L` (Last Friday)

### JCRON Advanced Features

#### EOD/SOD Modifiers

```sql
-- End of Day (last minute of business hours)
SELECT jcron.schedule('0 17 * * 1-5 EOD', 'SELECT send_daily_summary()');

-- Start of Month
SELECT jcron.schedule('0 9 1 * * SOM', 'SELECT process_monthly_billing()');

-- End of Week (Friday)
SELECT jcron.schedule('0 18 * * 5 EOW', 'SELECT generate_weekly_report()');

-- Parse EOD pattern
SELECT * FROM jcron.parse_eod('0 17 * * 1-5 EOD');
-- Returns: (EOD, 0)

-- Parse SOD pattern
SELECT * FROM jcron.parse_sod('0 9 1 * * SOM');
-- Returns: (SOM, 0)
```

#### Week of Year (WOY) Scheduling

```sql
-- First week of every quarter
SELECT jcron.schedule('0 9 * * * WOY 1,14,27,40', 'SELECT quarterly_review()');

-- Business weeks only (weeks 1-52, excluding holidays)
SELECT jcron.schedule('0 9 * * 1-5 WOY 1-52', 'SELECT process_business_logic()');
```

#### Nth Weekday Patterns

```sql
-- First Monday of every month
SELECT jcron.schedule('0 9 * * 1#1', 'SELECT monthly_meeting()');

-- Last Friday of every month
SELECT jcron.schedule('0 9 * * 5L', 'SELECT monthly_payroll()');

-- Third Wednesday
SELECT jcron.schedule('0 15 * * 3#3', 'SELECT team_standup()');

-- Calculate nth weekday
SELECT jcron.get_nth_weekday(2024, 1, 1, 1); -- First Monday of January 2024
-- Returns: 1

SELECT jcron.get_nth_weekday(2024, 1, 5, -1); -- Last Friday of January 2024
-- Returns: 26
```

#### Pattern Analysis

```sql
-- Analyze pattern complexity
SELECT * FROM jcron.analyze_pattern_complexity('0 9 * * 1-5 EOD');
-- Returns: (complexity_score, has_eod, has_woy, has_nth, estimated_ops)

-- Validate pattern
SELECT jcron.validate_pattern('0 9 * * 1#1'); -- true
SELECT jcron.validate_pattern('invalid pattern'); -- false

-- Check business hours
SELECT jcron.is_business_hours('0 9 * * 1-5'); -- true
SELECT jcron.is_business_hours('0 2 * * *'); -- false
```

#### Batch Operations

```sql
-- Schedule multiple jobs at once
SELECT * FROM jcron.batch_schedule(
    ARRAY[
        '0 9 * * 1-5',           -- Business hours
        '0 17 * * 1-5 EOD',      -- End of business day
        '0 9 * * 1#1'            -- First Monday
    ],
    '2024-01-01 00:00:00'::timestamp,
    10  -- Get next 10 occurrences
);

-- Get job statistics
SELECT * FROM jcron.get_job_stats();
-- Returns: (total_jobs, active_jobs, avg_complexity, last_execution_time)
```

## Architecture

```
PostgreSQL Extension
├── jcron.c              # Main extension code
├── jcron_job_executor.c # Job execution worker
├── jcron.control        # Extension metadata
├── jcron--1.0.sql       # SQL definitions
└── Makefile            # Build configuration

Background Workers
├── Scheduler Worker     # Checks and schedules jobs
└── Job Executor Worker  # Executes individual jobs

Database Schema
└── jcron.jobs           # Job definitions table
    ├── job_id
    ├── schedule
    ├── command
    ├── database
    ├── username
    ├── active
    ├── created_at
    ├── last_run
    └── next_run
```

## Configuration

### GUC Variables

```sql
-- Maximum number of jobs (default: 1000)
SET jcron.max_jobs = 5000;

-- Job check interval in seconds (default: 60)
SET jcron.check_interval = 30;
```

### Database Permissions

```sql
-- Grant usage to specific user
GRANT USAGE ON SCHEMA jcron TO myuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON jcron.jobs TO myuser;
```

## Monitoring

### System Logs

```bash
# View PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log | grep JCRON
```

### Job Statistics

```sql
-- View job execution history
SELECT job_id, schedule, last_run,
       EXTRACT(epoch FROM (now() - last_run))/60 AS minutes_since_last_run
FROM jcron.jobs
WHERE active = true
ORDER BY last_run DESC NULLS LAST;
```

## Examples

### Database Maintenance

```sql
-- Daily VACUUM at 2 AM
SELECT cron.schedule('0 2 * * *', 'VACUUM ANALYZE');

-- Weekly REINDEX on Sundays at 3 AM
SELECT cron.schedule('0 3 * * 0', 'REINDEX DATABASE postgres');

-- Monthly partition cleanup (end of month)
SELECT cron.schedule('0 0 E0M * *', 'SELECT cleanup_old_partitions()');
```

### Business Logic

```sql
-- Hourly cache refresh
SELECT cron.schedule('0 * * * *', 'SELECT refresh_application_cache()');

-- Daily report generation
SELECT cron.schedule('0 6 * * 1-5', 'SELECT generate_daily_reports()');

-- Weekly data aggregation
SELECT cron.schedule('0 2 * * 0', 'SELECT aggregate_weekly_stats()');
```

### Development/Testing

```sql
-- Test job every minute
SELECT cron.schedule('* * * * *', 'SELECT test_cron_function()');

-- Clean up test data daily
SELECT cron.schedule('0 1 * * *', 'DELETE FROM test_logs WHERE created_at < now() - interval ''30 days''');
```

## Performance

- **Scheduling**: 16-18M operations/sec
- **Parsing**: 7-11M operations/sec
- **Memory**: 288 bytes per job (stack-only)
- **CPU**: Minimal overhead with SIMD acceleration

## Troubleshooting

### Common Issues

1. **Extension not found**
   ```sql
   -- Check if extension is installed
   SELECT * FROM pg_extension WHERE extname = 'jcron';
   ```

2. **Jobs not running**
   ```sql
   -- Check background workers
   SELECT * FROM pg_stat_activity WHERE backend_type = 'background worker';
   ```

3. **Permission errors**
   ```sql
   -- Check permissions
   \dp jcron.jobs
   ```

### Debug Logging

```sql
-- Enable debug logging
SET log_statement = 'all';
SET log_min_messages = 'debug1';

-- View job execution logs
SELECT * FROM pg_log WHERE message LIKE '%JCRON%';
```

## Security Considerations

- Jobs run with the privileges of the specified user
- Commands are executed via SPI (safe SQL execution)
- Background workers are isolated processes
- No shell access (prevents command injection)

## Compatibility

- **PostgreSQL**: 12, 13, 14, 15, 16
- **Operating Systems**: Linux, macOS, Windows (with WSL)
- **Architectures**: x86_64 (AVX2), ARM64 (NEON)

## License

MIT License - see LICENSE file