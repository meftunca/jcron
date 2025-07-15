# JCRON PostgreSQL Usage Guide

This document provides detailed instructions for using the JCRON PostgreSQL implementation.

## 📋 Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Schedule Format](#schedule-format)
- [Functions](#functions)
- [Job Management](#job-management)
- [Examples](#examples)
- [Performance and Optimization](#performance-and-optimization)
- [Troubleshooting](#troubleshooting)

## 🚀 Installation

### 1. PostgreSQL Database Setup

```sql
-- Create database (if needed)
CREATE DATABASE jcron_db;

-- Connect to database
\c jcron_db;
```

### 2. Load JCRON Schema

```bash
# Load SQL file
psql -U postgres -d jcron_db -f sql-ports/psql.sql
```

### 3. Verify Permissions

```sql
-- Check if JCRON functions are accessible
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'jcron' 
ORDER BY routine_name;
```

## 📖 Basic Usage

### Quick Start

```sql
-- Create a simple job
SELECT jcron.add_job_from_cron(
    'daily_backup',           -- Job name
    '@daily',                 -- Run daily
    'pg_dump mydatabase',     -- Command
    'UTC'                     -- Timezone
);

-- List active jobs
SELECT * FROM jcron.active_jobs_view;

-- Calculate next execution time
SELECT jcron.next_jump(
    '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5"}'::jsonb,
    now()
) as next_run;
```

## 🕐 Schedule Format

JCRON, JSON formatında esnek schedule tanımlaması kullanır:

### Temel Format

```json
{
  "s": "0",          // Saniye (0-59)
  "m": "30",         // Dakika (0-59)
  "h": "9",          // Saat (0-23)
  "D": "*",          // Ayın günü (1-31, L)
  "M": "*",          // Ay (1-12, JAN-DEC)
  "dow": "1-5",      // Haftanın günü (0-7, SUN-SAT, #, L)
  "Y": "*",          // Yıl (2020-2099)
  "W": "*",          // Yılın haftası (1-53)
  "timezone": "UTC"  // Zaman dilimi
}
```

### Value Types

| Type | Description | Examples |
|------|-------------|----------|
| `*` | Any value | `"*"` |
| Single value | Specific value | `"15"` |
| List | Multiple values | `"1,15,30"` |
| Range | Value range | `"9-17"` |
| Step | Specific intervals | `"*/5"`, `"9-17/2"` |
| Abbreviations | Month/day abbreviations | `"MON-FRI"`, `"JAN,JUN"` |

### Special Characters

| Character | Field | Description | Example |
|-----------|-------|-------------|---------|
| `L` | D | Last day of month | `"L"` |
| `L` | dow | Last [day] | `"5L"` (last Friday) |
| `#` | dow | Nth [day] | `"1#2"` (2nd Monday) |
| `?` | D/dow | Ignore (other field is used) | `"?"` |

## 🔧 Functions

### Core Calculation Functions

#### `jcron.next_jump(schedule, from_time)`
Calculates the next execution time.

```sql
-- Next time for a job running weekdays at 9:30
SELECT jcron.next_jump(
    '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5","timezone":"UTC"}'::jsonb,
    '2025-07-15 12:00:00'::timestamptz
);
-- Result: 2025-07-16 09:30:00+00
```

#### `jcron.prev_jump(schedule, from_time)`
Calculates the previous execution time.

```sql
-- Previous execution time for the same job
SELECT jcron.prev_jump(
    '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5","timezone":"UTC"}'::jsonb,
    '2025-07-15 12:00:00'::timestamptz
);
-- Result: 2025-07-15 09:30:00+00
```

#### `jcron.match(timestamp, schedule)`
Checks if a specific time matches the schedule.

```sql
-- Check if July 15, 2025 Tuesday 09:30 matches the schedule
SELECT jcron.match(
    '2025-07-15 09:30:00'::timestamptz,
    '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5","timezone":"UTC"}'::jsonb
);
-- Result: true
```

### Helper Functions

#### `jcron.parse_cron_expression(cron_expr)`
Converts standard cron expressions to JSON format.

```sql
-- Parse cron expression
SELECT jcron.parse_cron_expression('@daily');
-- Result: {"s": "0", "m": "0", "h": "0", "D": "*", "M": "*", "dow": "*"}

SELECT jcron.parse_cron_expression('30 9 * * 1-5');
-- Result: {"s": "0", "m": "30", "h": "9", "D": "*", "M": "*", "dow": "1-5"}
```

#### `jcron.validate_schedule(schedule)`
Validates if the schedule is valid.

```sql
-- Schedule validation
SELECT * FROM jcron.validate_schedule('{"s":"0","m":"30","h":"9"}'::jsonb);
-- Result: is_valid: true, error_message: null
```

## 👔 Job Management

### Adding Jobs

#### `jcron.add_job_from_cron(name, cron_expr, command, timezone, max_retries, retry_delay)`

```sql
-- Simple job addition
SELECT jcron.add_job_from_cron(
    'backup_job',
    '@daily',
    'pg_dump -h localhost mydb > /backup/daily.sql'
);

-- Advanced job addition
SELECT jcron.add_job_from_cron(
    'business_hours_job',
    '0 */15 9-17 * * 1-5',  -- Every 15 minutes, business hours, weekdays
    'python /scripts/check_health.py',
    'Europe/Istanbul',       -- Turkey time
    3,                      -- Retry 3 times
    300                     -- Wait 5 minutes
);
```

#### `jcron.add_job(name, schedule_json, command, timezone, max_retries, retry_delay)`

```sql
-- Adding job with JSON schedule
SELECT jcron.add_job(
    'monthly_report',
    '{"s":"0","m":"0","h":"8","D":"L","M":"*","dow":"?","timezone":"UTC"}'::jsonb,
    'python /reports/monthly.py'
);
```

### Job Management

```sql
-- Enable/disable job
SELECT jcron.set_job_active('backup_job', false);  -- Stop
SELECT jcron.set_job_active('backup_job', true);   -- Start

-- Remove job
SELECT jcron.remove_job('old_job');

-- Get jobs ready to run
SELECT * FROM jcron.get_ready_jobs(10);
```

### Job Execution Cycle

```sql
-- Start job execution
WITH ready_job AS (
    SELECT * FROM jcron.get_ready_jobs(1) LIMIT 1
)
SELECT jcron.start_job_execution(job_id) as log_id
FROM ready_job;

-- Complete job (successful)
SELECT jcron.complete_job_execution(
    123,                -- log_id
    'success',          -- status
    'Backup completed successfully',  -- output
    null               -- error
);

-- Complete job (failed)
SELECT jcron.complete_job_execution(
    124,
    'failed',
    null,
    'Connection timeout'
);
```

## 📊 Monitoring and Views

### Active Jobs

```sql
-- List all active jobs
SELECT 
    job_name,
    next_run_at,
    status,
    total_runs,
    last_status
FROM jcron.active_jobs_view
ORDER BY next_run_at;
```

### Job Statistics

```sql
-- Job performance statistics
SELECT * FROM jcron.get_job_stats('backup_job');

-- All jobs statistics
SELECT * FROM jcron.get_job_stats();
```

### Failed Jobs

```sql
-- Failed jobs requiring attention
SELECT 
    job_name,
    failed_at,
    error_message,
    retry_status
FROM jcron.failed_jobs_view;
```

### Execution History

```sql
-- Executions in the last 24 hours
SELECT 
    job_name,
    run_started_at,
    run_finished_at,
    status,
    execution_duration_ms
FROM jcron.job_execution_history
WHERE run_started_at > now() - interval '24 hours'
ORDER BY run_started_at DESC;
```

## 🎯 Examples

### 1. Daily Backup Job

```sql
-- Take backup every night at 02:00
SELECT jcron.add_job_from_cron(
    'nightly_backup',
    '0 0 2 * * *',
    'pg_dump -h localhost -U postgres myapp > /backups/nightly_$(date +\%Y\%m\%d).sql',
    'UTC'
);
```

### 2. Business Hours Health Check

```sql
-- System check every 10 minutes on weekdays
SELECT jcron.add_job_from_cron(
    'health_check',
    '0 */10 9-18 * * 1-5',
    'curl -f http://localhost:8080/health || echo "Service down" | mail admin@company.com',
    'Europe/Istanbul'
);
```

### 3. Monthly Report (Last Day of Month)

```sql
-- Generate report on the last day of each month at 23:30
SELECT jcron.add_job(
    'monthly_report',
    '{"s":"0","m":"30","h":"23","D":"L","M":"*","dow":"?","timezone":"UTC"}'::jsonb,
    'python /scripts/generate_monthly_report.py'
);
```

### 4. Monday Cleanup (First Monday)

```sql
-- Cleanup on the first Monday of each month
SELECT jcron.add_job(
    'monthly_cleanup',
    '{"s":"0","m":"0","h":"6","D":"?","M":"*","dow":"1#1","timezone":"UTC"}'::jsonb,
    '/scripts/cleanup_logs.sh'
);
```

### 5. Weekend Maintenance (Last Saturday)

```sql
-- Maintenance on the last Saturday of each month
SELECT jcron.add_job(
    'monthly_maintenance',
    '{"s":"0","m":"0","h":"4","D":"?","M":"*","dow":"6L","timezone":"UTC"}'::jsonb,
    '/scripts/system_maintenance.sh'
);
```

### 6. Quarterly Log Cleanup

```sql
-- Clean old logs every 15 minutes
SELECT jcron.add_job_from_cron(
    'log_cleanup',
    '0 */15 * * * *',
    'find /var/log/myapp -name "*.log" -mtime +7 -delete',
    'UTC'
);
```

### 7. Year-End Archiving

```sql
-- Only on the last day of 2025
SELECT jcron.add_job(
    'year_end_archive',
    '{"s":"0","m":"0","h":"1","D":"31","M":"12","dow":"?","Y":"2025","timezone":"UTC"}'::jsonb,
    'python /scripts/archive_year_end.py'
);
```

## 🏎️ Performance and Optimization

### Cache Management

```sql
-- Check cache status
SELECT 
    schedule,
    last_used,
    has_special_patterns
FROM jcron.schedule_cache
ORDER BY last_used DESC
LIMIT 10;

-- Manual cache cleanup
SELECT jcron.cleanup_schedule_cache();
```

### Testing and Benchmarking

```sql
-- Run comprehensive test suite
SELECT * FROM jcron.run_comprehensive_tests(100);

-- Test timezone features
SELECT * FROM jcron.test_timezone_features();

-- Test job runner
SELECT * FROM jcron.test_job_runner();
```

### Maintenance

```sql
-- Automatic maintenance (cleanup old logs + cache cleanup)
SELECT * FROM jcron.maintenance(30, true);

-- Only cleanup old logs (30 days)
SELECT jcron.cleanup_old_logs(30);
```

## 🐛 Troubleshooting

### Common Problems

#### 1. Job Not Running

```sql
-- Check if job is active
SELECT job_name, is_active, next_run_at 
FROM jcron.jobs 
WHERE job_name = 'my_job';

-- Check job's last execution status
SELECT * FROM jcron.job_execution_history 
WHERE job_name = 'my_job' 
ORDER BY run_started_at DESC 
LIMIT 5;
```

#### 2. Schedule Validation

```sql
-- Test if schedule is valid
SELECT * FROM jcron.validate_schedule(
    '{"s":"0","m":"30","h":"25","D":"*","M":"*","dow":"*"}'::jsonb
);
-- Error: Hour 25 is invalid (must be 0-23)
```

#### 3. Timezone Issues

```sql
-- Compare next execution times in different timezones
SELECT 
    'UTC' as timezone,
    jcron.next_jump('{"s":"0","m":"0","h":"12","timezone":"UTC"}'::jsonb, now()) as next_utc
UNION ALL
SELECT 
    'Istanbul' as timezone,
    jcron.next_jump('{"s":"0","m":"0","h":"12","timezone":"Europe/Istanbul"}'::jsonb, now()) as next_istanbul;
```

#### 4. Performance Monitoring

```sql
-- Find slowest running jobs
SELECT 
    job_name,
    AVG(execution_duration_ms) as avg_duration_ms,
    COUNT(*) as run_count
FROM jcron.job_execution_history
WHERE run_finished_at > now() - interval '7 days'
GROUP BY job_name
ORDER BY avg_duration_ms DESC;
```

### Log Analysis

```sql
-- Analyze error messages
SELECT 
    error_message,
    COUNT(*) as error_count,
    array_agg(DISTINCT job_name) as affected_jobs
FROM jcron.job_execution_history
WHERE status = 'failed' 
  AND run_started_at > now() - interval '24 hours'
GROUP BY error_message
ORDER BY error_count DESC;
```

## 🔒 Security and Permissions

### Role-Based Access

```sql
-- Add user to JCRON manager role
GRANT jcron_manager TO my_cron_user;

-- Read-only access
GRANT USAGE ON SCHEMA jcron TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA jcron TO readonly_user;
```

### Command Security

```sql
-- Secure command examples (to protect against shell injection)
SELECT jcron.add_job_from_cron(
    'safe_backup',
    '@daily',
    '/usr/bin/pg_dump --host=localhost --username=backup_user --no-password mydb'
);

-- ❌ Insecure (shell injection risk)
-- '/bin/sh -c "pg_dump mydb > /tmp/$(whoami).sql"'

-- ✅ Secure alternative
-- Use parameterized script
-- '/scripts/safe_backup.sh mydb /backup/location'
```

## 📈 Advanced Usage

### Custom Schedule Validation

```sql
-- Complex business rule validation
CREATE OR REPLACE FUNCTION validate_business_schedule(schedule_json jsonb)
RETURNS boolean AS $$
DECLARE
    hour_val text;
    dow_val text;
BEGIN
    hour_val := schedule_json->>'h';
    dow_val := schedule_json->>'dow';
    
    -- Don't allow running outside business hours and on weekends
    IF hour_val ~ '^([0-8]|1[9-9]|2[0-3])$' AND dow_val ~ '[0,6]' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### Batch Job Processing

```sql
-- Batch job execution
WITH ready_jobs AS (
    SELECT job_id, job_name, command 
    FROM jcron.get_ready_jobs(100)
)
SELECT 
    job_name,
    jcron.start_job_execution(job_id) as log_id,
    command
FROM ready_jobs;
```

### Dynamic Schedule Adjustment

```sql
-- Dynamic schedule adjustment for load balancing
UPDATE jcron.jobs 
SET schedule = schedule || '{"s": "' || (random() * 59)::int || '"}'::jsonb
WHERE job_name LIKE 'batch_%';
```

## 🤝 Integration Examples

### Application Integration (Python)

```python
import psycopg2
import json
from datetime import datetime

def add_dynamic_job(db_conn, name, schedule_dict, command):
    """Add job from Python application"""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT jcron.add_job(%s, %s, %s)
        """, (name, json.dumps(schedule_dict), command))
        job_id = cur.fetchone()[0]
        db_conn.commit()
        return job_id

def get_next_runs(db_conn, job_names):
    """Get next execution times for jobs"""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT job_name, next_run_at 
            FROM jcron.active_jobs_view 
            WHERE job_name = ANY(%s)
        """, (job_names,))
        return cur.fetchall()
```

### Monitoring Integration (Prometheus)

```sql
-- Metrics view for Prometheus
CREATE OR REPLACE VIEW jcron.prometheus_metrics AS
SELECT 
    'jcron_jobs_total' as metric_name,
    COUNT(*)::text as value,
    'Total number of jobs' as help
FROM jcron.jobs
UNION ALL
SELECT 
    'jcron_jobs_active' as metric_name,
    COUNT(*)::text as value,
    'Number of active jobs' as help
FROM jcron.jobs WHERE is_active = true
UNION ALL
SELECT 
    'jcron_executions_total' as metric_name,
    COUNT(*)::text as value,
    'Total job executions in last 24h' as help
FROM jcron.job_logs 
WHERE run_started_at > now() - interval '24 hours';
```

This guide will help you effectively use the JCRON PostgreSQL implementation. For more information, please refer to the function documentation and test files.
