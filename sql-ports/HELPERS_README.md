# 🛠️ JCRON Helper Functions

Additional utility functions to make working with JCRON patterns easier and more intuitive.

## 📦 Installation

```bash
# First install core JCRON
psql -d your_database -f jcron.sql

# Then install helpers
psql -d your_database -f jcron_helpers.sql
```

## 📚 Available Functions (16 Total)

### 📅 Schedule Management (5 functions)

#### `next_n_times(pattern, n, from_time)` 
Get the next N execution times for a pattern.

```sql
-- Get next 10 weekday mornings
SELECT unnest(jcron.next_n_times('0 0 9 * * 1-5 *', 10));
-- Returns: Array of 10 timestamps

-- Next 5 executions from specific time
SELECT unnest(jcron.next_n_times('0 */15 * * * *', 5, '2025-01-01 10:00:00'));
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `n` (INTEGER) - Number of times to return (max 1000, default 10)
- `from_time` (TIMESTAMPTZ) - Starting point (default NOW())

**Returns:** `TIMESTAMPTZ[]` - Array of execution times

---

#### `schedule_between(pattern, start_time, end_time)`
Get all execution times in a date range.

```sql
-- All executions in January 2025
SELECT * FROM jcron.schedule_between(
    '0 0 9 * * 1-5 *',
    '2025-01-01'::timestamptz,
    '2025-02-01'::timestamptz
);
-- Returns: Table with execution_time and sequence_number
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `start_time` (TIMESTAMPTZ) - Range start
- `end_time` (TIMESTAMPTZ) - Range end

**Returns:** TABLE(execution_time TIMESTAMPTZ, sequence_number INTEGER)

**Safety:** Limited to 100,000 iterations to prevent runaway queries.

---

#### `prev_n_times(pattern, n, from_time)`
Get the previous N execution times for a pattern (going backward in time).

```sql
-- Get previous 10 weekday mornings
SELECT unnest(jcron.prev_n_times('0 0 9 * * 1-5 *', 10));
-- Returns: Array of 10 timestamps (most recent first)

-- Previous 5 executions from specific time
SELECT unnest(jcron.prev_n_times('0 */15 * * * *', 5, '2025-01-10 12:00:00'));

-- Compare next vs previous
SELECT 
    'future' as direction,
    unnest(jcron.next_n_times('0 0 12 * * * *', 5)) as time
UNION ALL
SELECT 
    'past' as direction,
    unnest(jcron.prev_n_times('0 0 12 * * * *', 5)) as time
ORDER BY direction, time;
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `n` (INTEGER) - Number of times to return (max 1000, default 10)
- `from_time` (TIMESTAMPTZ) - Starting point (default NOW())

**Returns:** `TIMESTAMPTZ[]` - Array of execution times (most recent first)

**Use Cases:**
- Audit logs: "When did this job last run?"
- History analysis: "Show last 30 executions"
- Debugging: "What was the schedule pattern historically?"

---

#### `is_valid_pattern(pattern)`
Validate if a pattern is syntactically correct.

```sql
-- Validate user input
SELECT jcron.is_valid_pattern('0 0 9 * * 1-5 *');  -- Returns: true
SELECT jcron.is_valid_pattern('INVALID');           -- Returns: false

-- Use in application logic
DO $$
BEGIN
    IF NOT jcron.is_valid_pattern(user_input) THEN
        RAISE EXCEPTION 'Invalid cron pattern';
    END IF;
END $$;
```

**Parameters:**
- `pattern` (TEXT) - Pattern to validate

**Returns:** `BOOLEAN` - true if valid, false otherwise

---

#### `time_until_next(pattern, from_time)`
Get interval until next execution.

```sql
-- How long until next backup?
SELECT jcron.time_until_next('0 0 2 * * * *');
-- Returns: interval '10:30:00' (example)

-- Time remaining for specific pattern
SELECT jcron.time_until_next('0 0 9 * * 1-5 *', NOW());
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `from_time` (TIMESTAMPTZ) - Starting point (default NOW())

**Returns:** `INTERVAL` - Time until next execution

---

### 📊 Time Analysis (3 functions)

#### `get_frequency(pattern, sample_size)`
Detect pattern frequency (hourly, daily, weekly, etc.).

```sql
-- Detect frequency
SELECT jcron.get_frequency('0 */15 * * * *');  -- Returns: 'every-15-minutes'
SELECT jcron.get_frequency('0 0 9 * * 1-5 *'); -- Returns: 'daily'
SELECT jcron.get_frequency('0 0 0 1 * * *');   -- Returns: 'monthly'
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `sample_size` (INTEGER) - Number of samples to analyze (default 10)

**Returns:** `TEXT` - Frequency label:
- `every-second`
- `every-minute` 
- `every-N-minutes`
- `hourly`
- `every-N-hours`
- `daily`
- `every-N-days`
- `weekly`
- `monthly`
- `quarterly`
- `yearly-or-rare`

---

#### `avg_interval(pattern, sample_size)`
Calculate average interval between executions.

```sql
-- Average time between runs
SELECT jcron.avg_interval('0 */30 * * * *');  -- Returns: interval '00:30:00'
SELECT jcron.avg_interval('0 0 9 * * 1-5 *'); -- Returns: interval '1 day'
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `sample_size` (INTEGER) - Number of samples (default 20)

**Returns:** `INTERVAL` - Average time between executions

---

#### `pattern_stats(pattern, days)`
Get comprehensive statistics about pattern execution schedule.

```sql
-- Analyze pattern for next 30 days
SELECT * FROM jcron.pattern_stats('0 0 * * * * *', 30);
```

**Returns:** TABLE with metrics:
- `pattern` - The pattern being analyzed
- `analysis_period` - Days analyzed
- `total_executions` - Total number of runs
- `first_execution` - First scheduled time
- `last_execution` - Last scheduled time
- `min_interval` - Shortest interval between runs
- `max_interval` - Longest interval between runs
- `avg_interval` - Average interval
- `frequency` - Detected frequency label
- `executions_per_day` - Average runs per day

**Parameters:**
- `pattern` (TEXT) - JCRON pattern
- `days` (INTEGER) - Days to analyze (default 30)

---

### 🐛 Debug & Monitoring (2 functions)

#### `explain_pattern(pattern)`
Convert pattern to human-readable description.

```sql
-- Explain patterns for documentation
SELECT jcron.explain_pattern('0 0 9 * * 1-5 *');
-- Returns: 'Runs daily at hour 9 on weekday 1-5 [*]'

SELECT jcron.explain_pattern('0 */30 * * * *');
-- Returns: 'Runs every-30-minutes every hour'

SELECT jcron.explain_pattern('0 0 0 1 * * *');
-- Returns: 'Runs monthly at hour 0 on day 1 [*]'
```

**Parameters:**
- `pattern` (TEXT) - JCRON pattern

**Returns:** `TEXT` - Human-readable description

---

#### `compare_patterns(pattern1, pattern2, sample_size)`
Compare two patterns side-by-side.

```sql
-- Compare morning vs evening shifts
SELECT * FROM jcron.compare_patterns(
    '0 0 9 * * 1-5 *',
    '0 0 17 * * 1-5 *',
    5
);
```

**Returns:** TABLE with:
- `comparison_type` - execution_1, execution_2, etc.
- `pattern1_time` - When pattern1 executes
- `pattern2_time` - When pattern2 executes  
- `time_diff` - Difference between them

**Parameters:**
- `pattern1` (TEXT) - First pattern
- `pattern2` (TEXT) - Second pattern
- `sample_size` (INTEGER) - Number of executions to compare (default 10)

---

### 💼 Business Logic (3 functions)

#### `business_hours(start_hour, end_hour)`
Generate pattern for business hours (Mon-Fri, specific hours).

```sql
-- Standard 9-5 business hours
SELECT jcron.business_hours();            -- Returns: '0 0 9-16 * * 1-5 *'

-- Custom hours (8am-6pm)
SELECT jcron.business_hours(8, 18);       -- Returns: '0 0 8-17 * * 1-5 *'

-- Early morning (6am-2pm)
SELECT jcron.business_hours(6, 14);       -- Returns: '0 0 6-13 * * 1-5 *'
```

**Parameters:**
- `start_hour` (INTEGER) - Start hour 0-23 (default 9)
- `end_hour` (INTEGER) - End hour 0-23 (default 17)

**Returns:** `TEXT` - JCRON pattern

---

#### `business_days(hour, minute)`
Generate pattern for weekdays at specific time.

```sql
-- Every weekday at 9am
SELECT jcron.business_days(9, 0);         -- Returns: '0 0 9 * * 1-5 *'

-- Every weekday at 2:30pm
SELECT jcron.business_days(14, 30);       -- Returns: '0 30 14 * * 1-5 *'
```

**Parameters:**
- `hour` (INTEGER) - Hour 0-23 (default 9)
- `minute` (INTEGER) - Minute 0-59 (default 0)

**Returns:** `TEXT` - JCRON pattern

---

#### `round_to_business_hours(input_time, start_hour, end_hour)`
Round timestamp to nearest business hour.

```sql
-- If before business hours, move to start
SELECT jcron.round_to_business_hours('2025-01-06 08:30:00');
-- Returns: '2025-01-06 09:00:00' (moved to 9am)

-- If during business hours, keep as-is  
SELECT jcron.round_to_business_hours('2025-01-06 14:30:00');
-- Returns: '2025-01-06 14:30:00' (unchanged)

-- If after hours, move to next business day
SELECT jcron.round_to_business_hours('2025-01-06 19:00:00');
-- Returns: '2025-01-07 09:00:00' (next day)

-- If weekend, move to Monday
SELECT jcron.round_to_business_hours('2025-01-05 12:00:00');  -- Sunday
-- Returns: '2025-01-06 09:00:00' (Monday 9am)
```

**Parameters:**
- `input_time` (TIMESTAMPTZ) - Time to round
- `start_hour` (INTEGER) - Business day start (default 9)
- `end_hour` (INTEGER) - Business day end (default 17)

**Returns:** `TIMESTAMPTZ` - Rounded time

**Logic:**
- Weekends → Next Monday at start_hour
- Before start_hour → Same day at start_hour
- After end_hour → Next business day at start_hour
- During hours → Unchanged

---

### 🔧 Maintenance (2 functions)

#### `simplify_pattern(pattern)`
Simplify verbose patterns to shorter equivalents.

```sql
-- Simplify comma lists to step notation
SELECT jcron.simplify_pattern('0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *');
-- Returns: '0 */5 * * * *'

-- Already simple patterns unchanged
SELECT jcron.simplify_pattern('0 0 9 * * 1-5 *');
-- Returns: '0 0 9 * * 1-5 *'
```

**Parameters:**
- `pattern` (TEXT) - Pattern to simplify

**Returns:** `TEXT` - Simplified pattern

**Simplification Rules:**
- Detects evenly-spaced comma lists (0,5,10,15...) → `*/N` notation
- Preserves already-simple patterns
- Cannot simplify multi-patterns (`|` operator)

---

#### `optimize_pattern(pattern)`
Optimize pattern for better performance.

```sql
-- Optimize pattern
SELECT jcron.optimize_pattern('0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *');
-- Returns: '0 */5 * * * *'
```

**Currently:** Alias for `simplify_pattern()`.

**Future:** Will include:
- Removing redundant ranges
- Merging overlapping patterns  
- Converting complex patterns to simpler equivalents

**Parameters:**
- `pattern` (TEXT) - Pattern to optimize

**Returns:** `TEXT` - Optimized pattern

---

### 📝 Metadata (1 function)

#### `list_helpers()`
Get list of all available helper functions.

```sql
-- Show all helpers
SELECT * FROM jcron.list_helpers();

-- Filter by category
SELECT * FROM jcron.list_helpers()
WHERE category = 'Schedule Management';

-- Count helpers by category
SELECT category, COUNT(*) 
FROM jcron.list_helpers()
GROUP BY category;
```

**Returns:** TABLE with:
- `category` (TEXT) - Function category
- `function_name` (TEXT) - Function signature
- `description` (TEXT) - What it does

---

## 🎯 Real-World Examples

### Example 1: Build a Scheduling Dashboard

```sql
-- Show upcoming executions for multiple jobs
CREATE VIEW job_schedule_dashboard AS
SELECT 
    job_name,
    pattern,
    jcron.explain_pattern(pattern) as description,
    jcron.time_until_next(pattern) as next_in,
    (jcron.next_n_times(pattern, 5))[1] as next_run,
    jcron.get_frequency(pattern) as frequency
FROM scheduled_jobs;

-- Query the dashboard
SELECT * FROM job_schedule_dashboard 
ORDER BY next_run;
```

### Example 2: Validate User Input

```sql
-- Validate cron pattern before saving
CREATE OR REPLACE FUNCTION validate_job_pattern()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT jcron.is_valid_pattern(NEW.cron_pattern) THEN
        RAISE EXCEPTION 'Invalid cron pattern: %', NEW.cron_pattern;
    END IF;
    
    -- Store human-readable description
    NEW.pattern_description := jcron.explain_pattern(NEW.cron_pattern);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_cron_pattern
    BEFORE INSERT OR UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION validate_job_pattern();
```

### Example 3: Schedule Analysis Report

```sql
-- Analyze all job patterns
CREATE OR REPLACE FUNCTION analyze_all_schedules()
RETURNS TABLE(
    job_name TEXT,
    pattern TEXT,
    frequency TEXT,
    avg_interval INTERVAL,
    executions_per_day NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.job_name,
        j.cron_pattern,
        jcron.get_frequency(j.cron_pattern),
        jcron.avg_interval(j.cron_pattern),
        (SELECT (metric_value->>'executions_per_day')::NUMERIC
         FROM jcron.pattern_stats(j.cron_pattern, 30)
         WHERE metric_name = 'executions_per_day')
    FROM scheduled_jobs j;
END;
$$ LANGUAGE plpgsql;
```

### Example 4: Auto-optimize Patterns

```sql
-- Optimize all patterns in database
UPDATE scheduled_jobs
SET cron_pattern = jcron.optimize_pattern(cron_pattern)
WHERE cron_pattern ~ '[0-9,]+' -- Has comma lists
  AND jcron.optimize_pattern(cron_pattern) != cron_pattern;

-- Show optimizations made
SELECT 
    job_name,
    cron_pattern as original,
    jcron.optimize_pattern(cron_pattern) as optimized
FROM scheduled_jobs
WHERE jcron.optimize_pattern(cron_pattern) != cron_pattern;
```

### Example 5: Business Hours Enforcement

```sql
-- Ensure all jobs run during business hours
CREATE OR REPLACE FUNCTION enforce_business_hours()
RETURNS TRIGGER AS $$
DECLARE
    next_run TIMESTAMPTZ;
BEGIN
    -- Get next scheduled run
    next_run := jcron.next_time(NEW.cron_pattern, NOW());
    
    -- Round to business hours
    next_run := jcron.round_to_business_hours(next_run);
    
    -- Store adjusted time
    NEW.next_run_at := next_run;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Performance Characteristics

| Function | Complexity | Notes |
|----------|------------|-------|
| `next_n_times()` | O(n) | Fast for n < 100 |
| `schedule_between()` | O(executions) | Limited to 100K iterations |
| `is_valid_pattern()` | O(1) | Just tries to parse |
| `time_until_next()` | O(1) | Single next_time call |
| `get_frequency()` | O(n) | Sample-based analysis |
| `avg_interval()` | O(n) | Sample-based calculation |
| `pattern_stats()` | O(executions) | Limited to 10K executions |
| `explain_pattern()` | O(1) | String parsing only |
| `compare_patterns()` | O(2n) | Two pattern evaluations |
| `business_hours()` | O(1) | String generation |
| `business_days()` | O(1) | String generation |
| `round_to_business_hours()` | O(1) | Date arithmetic |
| `simplify_pattern()` | O(fields) | Pattern analysis |
| `optimize_pattern()` | O(fields) | Same as simplify |
| `list_helpers()` | O(1) | Static table |

---

## 🔒 Safety Features

1. **Iteration Limits**: `schedule_between()` limited to 100K iterations
2. **Size Limits**: `next_n_times()` limited to 1000 results
3. **Stats Limits**: `pattern_stats()` limited to 10K executions per analysis
4. **Validation**: `is_valid_pattern()` catches exceptions safely

---

## 🐛 Troubleshooting

### "Too many iterations" Error

```sql
-- If you get this error:
ERROR:  Too many iterations (>100k)

-- Solution: Reduce date range or use less frequent pattern
SELECT * FROM jcron.schedule_between(
    '0 * * * * *',        -- Every minute (too frequent)
    NOW(),
    NOW() + interval '1 year'  -- Too long range
);

-- Better:
SELECT * FROM jcron.schedule_between(
    '0 0 * * * *',        -- Every hour (better)
    NOW(),
    NOW() + interval '30 days'  -- Shorter range
);
```

### Unexpected Results

```sql
-- Always validate patterns first
SELECT jcron.is_valid_pattern('0 0 9 * * 1-5 *');  -- true

-- Use explain to understand what pattern does
SELECT jcron.explain_pattern('0 0 9 * * 1-5 *');
```

---

## 📈 Version History

- **v1.0.0** (2025-01-09)
  - Initial release
  - 15 helper functions across 6 categories
  - Full test coverage
  - Production-ready

---

## 🤝 Contributing

Have ideas for new helpers? Open an issue or PR!

Useful additions:
- Holiday exclusion helpers
- Timezone-aware helpers
- Pattern merging/combining utilities
- Advanced statistics (percentiles, distributions)
- Pattern visualization helpers

---

## 📄 License

Same license as JCRON core.

---

## 🙏 Credits

Part of the JCRON project - PostgreSQL cron scheduling with advanced syntax support.
