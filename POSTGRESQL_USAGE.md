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
-- Create a simple job - clean old user sessions
SELECT jcron.add_job_from_cron(
    'session_cleanup',           -- Job name
    '@daily',                    -- Run daily
    'DELETE FROM user_sessions WHERE last_activity < now() - interval ''7 days''', -- SQL command
    'UTC'                        -- Timezone
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

### Week-of-Year (W) Field Specifications

Week-of-year field (W) ISO 8601 hafta numaralandırma standardını kullanır:

- **Hafta 1**: 4 Ocak'ı içeren hafta (yılın ilk Perşembesi)
- **Hafta numaraları**: 1-53 arası
- **Pazartesi**: Haftanın ilk günü (ISO 8601)

#### Week-of-Year Örnekleri

```sql
-- Her yılın 1. haftasında Pazartesi 09:00
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"9","D":"*","M":"*","dow":"1","W":"1","timezone":"UTC"}'::jsonb,
    now()
);

-- Çift haftalarda (2,4,6...) Cuma 17:00
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"17","D":"*","M":"*","dow":"5","W":"2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52","timezone":"UTC"}'::jsonb,
    now()
);

-- Ayda bir (her 4. hafta) Pazartesi 08:00
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"8","D":"*","M":"*","dow":"1","W":"1,5,9,13,17,21,25,29,33,37,41,45,49,53","timezone":"UTC"}'::jsonb,
    now()
);

-- Yılın son haftası (53. hafta varsa) Pazar 23:59
SELECT jcron.next_jump(
    '{"s":"59","m":"59","h":"23","D":"*","M":"*","dow":"0","W":"53","timezone":"UTC"}'::jsonb,
    now()
);
```

#### Week-of-Year Edge Cases

```sql
-- Çift yıllarda sadece 10. hafta
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"10","D":"*","M":"*","dow":"1","Y":"2024,2026,2028","W":"10","timezone":"UTC"}'::jsonb,
    now()
);

-- 53. hafta sadece uzun yıllarda (2020, 2026, 2032...)
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"1","W":"53","timezone":"UTC"}'::jsonb,
    now()
);
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

### Field Specifications

| Field | Range | Description | Special Values |
|-------|-------|-------------|----------------|
| `s` | 0-59 | Seconds | - |
| `m` | 0-59 | Minutes | - |
| `h` | 0-23 | Hours | - |
| `D` | 1-31 | Day of month | `L` (last day) |
| `M` | 1-12 | Month | `JAN-DEC` |
| `dow` | 0-7 | Day of week | `SUN-SAT`, `#`, `L` |
| `Y` | 2020-2099 | Year | - |
| `W` | 1-53 | Week of year (ISO 8601) | - |

### Special Characters

| Character | Field | Description | Example |
|-----------|-------|-------------|---------|
| `L` | D | Last day of month | `"L"` |
| `L` | dow | Last [day] | `"5L"` (last Friday) |
| `#` | dow | Nth [day] | `"1#2"` (2nd Monday) |
| `?` | D/dow | Ignore (other field is used) | `"?"` |

#### Partial Schedule Definitions

When only some fields are provided, JCRON automatically fills missing fields with default values:

```sql
-- Test what happens when only dow is specified
SELECT jcron.next_jump(
    '{"dow":"1"}'::jsonb,
    now()
) as next_monday;

-- This is equivalent to:
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"0","D":"*","M":"*","dow":"1","Y":"*","W":"*","timezone":"UTC"}'::jsonb,
    now()
) as full_schedule_monday;

-- System defaults for missing fields:
-- s (seconds): "0"
-- m (minutes): "0" 
-- h (hours): "0"
-- D (day of month): "*"
-- M (month): "*"
-- Y (year): "*"
-- W (week of year): "*"
-- timezone: "UTC"

-- So {"dow":"1"} means: "Every Monday at 00:00:00 UTC"
```

#### Field Default Values

```sql
-- Test various partial schedules
SELECT 'Only dow=1' as description, jcron.next_jump('{"dow":"1"}'::jsonb, now()) as next_run
UNION ALL
SELECT 'Only h=9' as description, jcron.next_jump('{"h":"9"}'::jsonb, now()) as next_run
UNION ALL  
SELECT 'Only m=30' as description, jcron.next_jump('{"m":"30"}'::jsonb, now()) as next_run
UNION ALL
SELECT 'dow=1, h=9' as description, jcron.next_jump('{"dow":"1","h":"9"}'::jsonb, now()) as next_run;

-- Results:
-- {"dow":"1"} → Every Monday at 00:00:00 UTC
-- {"h":"9"} → Every day at 09:00:00 UTC  
-- {"m":"30"} → Every hour at minute 30 (XX:30:00) UTC
-- {"dow":"1","h":"9"} → Every Monday at 09:00:00 UTC
```

#### Validation of Partial Schedules

```sql
-- All these are valid partial schedules
SELECT * FROM jcron.validate_schedule('{"dow":"1"}'::jsonb);           -- Valid: Monday midnight
SELECT * FROM jcron.validate_schedule('{"h":"9","m":"30"}'::jsonb);     -- Valid: Daily 9:30 AM
SELECT * FROM jcron.validate_schedule('{"D":"1","h":"0"}'::jsonb);      -- Valid: 1st of month midnight
SELECT * FROM jcron.validate_schedule('{"W":"1","dow":"1"}'::jsonb);    -- Valid: First week Monday

-- Empty schedule gets all defaults
SELECT * FROM jcron.validate_schedule('{}'::jsonb);                    -- Valid: Every minute
```

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
-- Simple job addition - daily cleanup
SELECT jcron.add_job_from_cron(
    'daily_cleanup',
    '@daily',
    'DELETE FROM logs WHERE created_at < now() - interval ''7 days'''
);

-- Advanced job addition - business hours statistics
SELECT jcron.add_job_from_cron(
    'business_hours_stats',
    '0 */15 9-17 * * 1-5',  -- Every 15 minutes, business hours, weekdays
    'INSERT INTO hourly_stats SELECT COUNT(*), avg(response_time) FROM requests WHERE created_at > now() - interval ''15 minutes''',
    'Europe/Istanbul',       -- Turkey time
    3,                      -- Retry 3 times
    300                     -- Wait 5 minutes
);
```

#### `jcron.add_job(name, schedule_json, command, timezone, max_retries, retry_delay)`

```sql
-- Adding job with JSON schedule - monthly data archiving
SELECT jcron.add_job(
    'monthly_archive',
    '{"s":"0","m":"0","h":"2","D":"L","M":"*","dow":"?","timezone":"UTC"}'::jsonb,
    'INSERT INTO archive_table SELECT * FROM main_table WHERE created_at < date_trunc(''month'', now()); DELETE FROM main_table WHERE created_at < date_trunc(''month'', now())'
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

### 1. Daily Database Cleanup

```sql
-- Clean old records every night at 02:00
SELECT jcron.add_job_from_cron(
    'nightly_cleanup',
    '0 0 2 * * *',
    'DELETE FROM user_sessions WHERE last_activity < now() - interval ''30 days''; DELETE FROM audit_logs WHERE created_at < now() - interval ''90 days'';',
    'UTC'
);
```

### 2. Business Hours Statistics Update

```sql
-- Update statistics every 10 minutes on weekdays
SELECT jcron.add_job_from_cron(
    'stats_update',
    '0 */10 9-18 * * 1-5',
    'REFRESH MATERIALIZED VIEW daily_stats; UPDATE system_health SET last_check = now() WHERE service_name = ''main_db'';',
    'Europe/Istanbul'
);
```

### 3. Monthly Data Archiving (Last Day of Month)

```sql
-- Archive data on the last day of each month at 23:30
SELECT jcron.add_job(
    'monthly_archive',
    '{"s":"0","m":"30","h":"23","D":"L","M":"*","dow":"?","timezone":"UTC"}'::jsonb,
    'INSERT INTO archived_orders SELECT * FROM orders WHERE created_at < date_trunc(''month'', now()); DELETE FROM orders WHERE created_at < date_trunc(''month'', now());'
);
```

### 4. Monday Cache Refresh (First Monday)

```sql
-- Refresh cache on the first Monday of each month
SELECT jcron.add_job(
    'monthly_cache_refresh',
    '{"s":"0","m":"0","h":"6","D":"?","M":"*","dow":"1#1","timezone":"UTC"}'::jsonb,
    'TRUNCATE TABLE cache_table; INSERT INTO cache_table SELECT * FROM main_view;'
);
```

### 5. Weekend Index Maintenance (Last Saturday)

```sql
-- Index maintenance on the last Saturday of each month
SELECT jcron.add_job(
    'monthly_maintenance',
    '{"s":"0","m":"0","h":"4","D":"?","M":"*","dow":"6L","timezone":"UTC"}'::jsonb,
    'REINDEX DATABASE current_database(); VACUUM ANALYZE;'
);
```

### 6. Week-of-Year Based Scheduling

#### Biweekly Jobs (Every Other Week)

```sql
-- Biweekly team sync on odd weeks, Mondays 10:00
SELECT jcron.add_job(
    'biweekly_stats_odd',
    '{"s":"0","m":"0","h":"10","D":"*","M":"*","dow":"1","W":"1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53","timezone":"UTC"}'::jsonb,
    'INSERT INTO weekly_reports SELECT generate_stats_for_week(extract(week from now()))'
);

-- Biweekly cleanup on even weeks, Fridays 16:00
SELECT jcron.add_job(
    'biweekly_cleanup_even',
    '{"s":"0","m":"0","h":"16","D":"*","M":"*","dow":"5","W":"2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52","timezone":"UTC"}'::jsonb,
    'DELETE FROM temp_data WHERE created_at < now() - interval ''2 weeks''; VACUUM ANALYZE temp_data;'
);
```

#### Quarterly Tasks (Every 13 Weeks)

```sql
-- Quarterly business review - weeks 1, 14, 27, 40
SELECT jcron.add_job(
    'quarterly_aggregation',
    '{"s":"0","m":"0","h":"9","D":"*","M":"*","dow":"1","W":"1,14,27,40","timezone":"UTC"}'::jsonb,
    'INSERT INTO quarterly_summary SELECT quarter, sum(revenue), avg(performance) FROM monthly_data GROUP BY quarter'
);

-- Quarterly index rebuild - weeks 4, 17, 30, 43
SELECT jcron.add_job(
    'quarterly_index_rebuild',
    '{"s":"0","m":"0","h":"2","D":"*","M":"*","dow":"0","W":"4,17,30,43","timezone":"UTC"}'::jsonb,
    'REINDEX INDEX CONCURRENTLY idx_large_table_created; REINDEX INDEX CONCURRENTLY idx_transactions_date;'
);
```

#### Year-End Tasks

```sql
-- Year-end processing on last week of year (week 52 or 53)
SELECT jcron.add_job(
    'year_end_processing',
    '{"s":"0","m":"0","h":"23","D":"*","M":"*","dow":"5","W":"52,53","timezone":"UTC"}'::jsonb,
    'UPDATE annual_summary SET status = ''closed'', total_sales = (SELECT sum(amount) FROM sales WHERE extract(year from created_at) = extract(year from now()))'
);

-- New year setup on first week
SELECT jcron.add_job(
    'new_year_setup',
    '{"s":"0","m":"0","h":"6","D":"*","M":"*","dow":"1","W":"1","timezone":"UTC"}'::jsonb,
    'INSERT INTO annual_summary (year, status) VALUES (extract(year from now()), ''active''); TRUNCATE TABLE daily_counters;'
);
```

#### Academic Calendar Integration

```sql
-- Academic semester tasks - weeks 1, 16, 32 (roughly 3 times per year)
SELECT jcron.add_job(
    'semester_grades_summary',
    '{"s":"0","m":"0","h":"3","D":"*","M":"*","dow":"0","W":"1,16,32","timezone":"UTC"}'::jsonb,
    'INSERT INTO semester_reports SELECT semester_id, avg(grade), count(*) FROM student_grades WHERE semester_id = get_current_semester() GROUP BY semester_id'
);

-- Mid-semester reports - weeks 8, 24, 40
SELECT jcron.add_job(
    'mid_semester_stats',
    '{"s":"0","m":"30","h":"8","D":"*","M":"*","dow":"1","W":"8,24,40","timezone":"UTC"}'::jsonb,
    'UPDATE semester_progress SET mid_term_avg = (SELECT avg(grade) FROM student_grades WHERE created_at > current_semester_start())'
);
```

#### Payroll and Accounting (Bi-monthly)

```sql
-- Payroll processing every 4 weeks (approximately bi-monthly)
SELECT jcron.add_job(
    'payroll_calculations',
    '{"s":"0","m":"0","h":"8","D":"*","M":"*","dow":"5","W":"2,6,10,14,18,22,26,30,34,38,42,46,50","timezone":"UTC"}'::jsonb,
    'UPDATE employee_payroll SET calculated_salary = base_salary + overtime_hours * hourly_rate WHERE pay_period = get_current_pay_period()'
);
```

### 7. Complex Week-of-Year Combinations

```sql
-- Holiday season special tasks (weeks 50-53 and week 1-2)
SELECT jcron.add_job(
    'holiday_season_monitoring',
    '{"s":"0","m":"0","h":"*/6","D":"*","M":"*","dow":"*","W":"50,51,52,53,1,2","timezone":"UTC"}'::jsonb,
    'UPDATE system_load_stats SET peak_season = true WHERE week_of_year IN (50,51,52,53,1,2); REFRESH MATERIALIZED VIEW holiday_performance;'
);

-- Summer maintenance schedule (weeks 26-35, roughly July-August)
SELECT jcron.add_job(
    'summer_maintenance',
    '{"s":"0","m":"0","h":"6","D":"*","M":"*","dow":"6","W":"26,27,28,29,30,31,32,33,34,35","timezone":"UTC"}'::jsonb,
    'VACUUM FULL low_activity_tables; REINDEX DATABASE current_database();'
);

-- Tax season intensive processing (weeks 10-16)
SELECT jcron.add_job(
    'tax_season_processing',
    '{"s":"0","m":"0","h":"2","D":"*","M":"*","dow":"1-5","W":"10,11,12,13,14,15,16","timezone":"UTC"}'::jsonb,
    'UPDATE tax_calculations SET status = ''processing'' WHERE tax_year = extract(year from now()); REFRESH MATERIALIZED VIEW tax_summary;'
);
    '/scripts/system_maintenance.sh'
);
```

### 6. Regular Database Maintenance

```sql
-- Clean old logs every 15 minutes
SELECT jcron.add_job_from_cron(
    'log_cleanup',
    '0 */15 * * * *',
    'DELETE FROM application_logs WHERE created_at < now() - interval ''7 days''; DELETE FROM error_logs WHERE created_at < now() - interval ''30 days'';',
    'UTC'
);
```

### 7. Year-End Data Archiving

```sql
-- Only on the last day of 2025
SELECT jcron.add_job(
    'year_end_archive',
    '{"s":"0","m":"0","h":"1","D":"31","M":"12","dow":"?","Y":"2025","timezone":"UTC"}'::jsonb,
    'INSERT INTO archive_2025 SELECT * FROM transactions WHERE extract(year from created_at) = 2025; CREATE INDEX IF NOT EXISTS idx_archive_2025_date ON archive_2025(created_at);'
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

### Week-of-Year Performance Considerations

Week-of-year calculations require additional processing for ISO 8601 compliance:

```sql
-- Efficient week-of-year queries
-- ✅ GOOD: Specific week ranges
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"9","D":"*","M":"*","dow":"1","W":"1,14,27,40","timezone":"UTC"}'::jsonb,
    now()
);

-- ❌ AVOID: Large week ranges with many individual values
-- This creates many calculation iterations:
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"9","D":"*","M":"*","dow":"1","W":"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20","timezone":"UTC"}'::jsonb,
    now()
);

-- ✅ BETTER: Use step intervals for large ranges
-- For every 4th week: weeks 1,5,9,13,17,21,25,29,33,37,41,45,49,53
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"9","D":"*","M":"*","dow":"1","W":"1,5,9,13,17,21,25,29,33,37,41,45,49,53","timezone":"UTC"}'::jsonb,
    now()
);
```

#### Week-of-Year Optimization Tips

1. **Use Specific Weeks**: Avoid `W: "*"` when you need specific weeks
2. **Group Related Weeks**: Instead of individual weeks, use logical groupings
3. **Consider Year Boundaries**: Week 53 only exists in some years (52-53 week years)
4. **Cache Results**: Week-of-year calculations are computationally expensive

```sql
-- Check if current year has 53 weeks (leap week year)
SELECT EXTRACT(week FROM date_trunc('year', now()) + interval '51 weeks 6 days') as max_weeks;

-- Optimized biweekly pattern using mathematical approach
-- Instead of listing all odd weeks: 1,3,5,7,9,11,13...
-- Use modulo in application logic or create helper function
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

#### 5. Week-of-Year Troubleshooting

```sql
-- Debug week-of-year calculations
-- Check what week number the current date is
SELECT EXTRACT(week FROM now()) as current_week;

-- Check if a specific year has 53 weeks
SELECT EXTRACT(week FROM ('2024-12-31'::date)) as weeks_in_2024;
SELECT EXTRACT(week FROM ('2025-12-31'::date)) as weeks_in_2025;

-- Test week-of-year schedule validity
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"1","W":"53","timezone":"UTC"}'::jsonb,
    '2024-01-01'::timestamp
) as next_week_53;

-- Verify ISO 8601 week calculation
-- Week 1 should contain January 4th
SELECT 
    date_trunc('week', '2024-01-04'::date) as week_1_start,
    EXTRACT(week FROM '2024-01-04'::date) as should_be_week_1,
    EXTRACT(week FROM '2024-01-01'::date) as jan_1_week;

-- Check if week-of-year pattern will ever match
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"1","W":"54","timezone":"UTC"}'::jsonb,
    now()
) as never_matches; -- Should return error or very far future

-- Validate biweekly patterns
-- This should alternate between weeks
SELECT 
    jcron.next_jump('{"W":"1,3,5,7,9"}'::jsonb, '2024-01-01'::timestamp) as odd_week,
    jcron.next_jump('{"W":"2,4,6,8,10"}'::jsonb, '2024-01-08'::timestamp) as even_week;
```

#### 6. Common Week-of-Year Mistakes

```sql
-- ❌ MISTAKE: Using week 0 (doesn't exist)
SELECT jcron.validate_schedule('{"W":"0"}'::jsonb);
-- Error: Week must be 1-53

-- ❌ MISTAKE: Using week 54 (doesn't exist)
SELECT jcron.validate_schedule('{"W":"54"}'::jsonb);
-- Error: Week must be 1-53

-- ❌ MISTAKE: Expecting week 53 to exist in all years
-- Check if week 53 exists before scheduling
SELECT 
    EXTRACT(year FROM now()) as current_year,
    CASE 
        WHEN EXTRACT(week FROM (EXTRACT(year FROM now())::text || '-12-31')::date) = 53 
        THEN 'Has week 53' 
        ELSE 'Only 52 weeks' 
    END as week_53_status;

-- ✅ SOLUTION: Use year-aware week-53 scheduling
SELECT jcron.next_jump(
    '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"0","W":"53","Y":"2020,2026,2032,2037,2043","timezone":"UTC"}'::jsonb,
    now()
) as safe_week_53_schedule;
```

#### 7. Partial Schedule Confusion

```sql
-- ❌ COMMON CONFUSION: Thinking {"dow":"1"} means "once on Monday"
-- Actually means: "Every Monday at 00:00:00 UTC"
SELECT jcron.next_jump('{"dow":"1"}'::jsonb, now()) as every_monday_midnight;

-- ❌ THINKING: {"h":"9"} means "at 9 AM once"  
-- Actually means: "Every day at 09:00:00 UTC"
SELECT jcron.next_jump('{"h":"9"}'::jsonb, now()) as every_day_9am;

-- ✅ TO GET SPECIFIC TIME: Include all relevant fields
SELECT jcron.next_jump('{"s":"0","m":"0","h":"9","D":"15","M":"7","dow":"?","Y":"2025"}'::jsonb, now()) as july_15_2025_9am;

-- ✅ DEBUGGING: Check what defaults are applied
SELECT jcron.validate_schedule('{"dow":"1"}'::jsonb) as partial_validation;

-- ✅ UNDERSTANDING: Compare partial vs full schedule
SELECT 
    'Partial' as type,
    jcron.next_jump('{"dow":"1"}'::jsonb, '2025-07-14 15:30:00'::timestamp) as next_time
UNION ALL
SELECT 
    'Full equivalent' as type,
    jcron.next_jump('{"s":"0","m":"0","h":"0","D":"*","M":"*","dow":"1","timezone":"UTC"}'::jsonb, '2025-07-14 15:30:00'::timestamp) as next_time;
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
-- Secure command examples (SQL commands are safer than shell commands)
SELECT jcron.add_job_from_cron(
    'safe_cleanup',
    '@daily',
    'DELETE FROM temp_table WHERE created_at < now() - interval ''1 day'''
);

-- ❌ Insecure (shell injection risk if external commands were used)
-- '/bin/sh -c "rm -rf /tmp/$(whoami)/*"'

-- ✅ Secure alternative - pure SQL
-- 'DELETE FROM user_sessions WHERE last_activity < now() - interval ''30 days'''
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

## 📅 Week-of-Year Reference

### ISO 8601 Week Numbering

| Year | Week 1 Starts | Week 1 Contains | Max Weeks | Week 53 Years |
|------|---------------|-----------------|-----------|---------------|
| 2020 | Dec 30, 2019  | Jan 4, 2020     | 53        | ✅ |
| 2021 | Jan 4, 2021   | Jan 4, 2021     | 52        | ❌ |
| 2022 | Jan 3, 2022   | Jan 4, 2022     | 52        | ❌ |
| 2023 | Jan 2, 2023   | Jan 4, 2023     | 52        | ❌ |
| 2024 | Jan 1, 2024   | Jan 4, 2024     | 52        | ❌ |
| 2025 | Dec 30, 2024  | Jan 4, 2025     | 52        | ❌ |
| 2026 | Dec 29, 2025  | Jan 4, 2026     | 53        | ✅ |

### Common Week Patterns

```sql
-- Biweekly patterns
-- Odd weeks (1,3,5,7...): "W":"1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53"
-- Even weeks (2,4,6,8...): "W":"2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52"

-- Monthly (every 4 weeks): "W":"1,5,9,13,17,21,25,29,33,37,41,45,49,53"
-- Quarterly (every 13 weeks): "W":"1,14,27,40"
-- Semi-annual (every 26 weeks): "W":"1,27"

-- Seasonal patterns
-- Spring (weeks 10-22): "W":"10,11,12,13,14,15,16,17,18,19,20,21,22"
-- Summer (weeks 23-35): "W":"23,24,25,26,27,28,29,30,31,32,33,34,35"
-- Fall (weeks 36-48): "W":"36,37,38,39,40,41,42,43,44,45,46,47,48"
-- Winter (weeks 49-52,1-9): "W":"49,50,51,52,1,2,3,4,5,6,7,8,9"
```

### Week-of-Year Functions

```sql
-- Helper functions for week calculations
SELECT EXTRACT(week FROM now()) as current_week;
SELECT EXTRACT(week FROM date_trunc('year', now()) + interval '51 weeks 6 days') as max_week_in_year;
SELECT to_char(now(), 'IYYY-IW') as iso_week_format; -- 2025-W29

-- Check if date falls in specific week
SELECT EXTRACT(week FROM '2025-07-15'::date) = 29 as is_week_29;

-- Get first and last day of current week  
SELECT 
    date_trunc('week', now()) as week_start,
    date_trunc('week', now()) + interval '6 days' as week_end;
```

This guide will help you effectively use the JCRON PostgreSQL implementation with comprehensive week-of-year support. For more information, please refer to the function documentation and test files.
