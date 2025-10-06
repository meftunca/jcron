# JCRON SQL - Job Scheduler Guide

Complete guide for building production-ready job schedulers with JCRON SQL.

## Table of Contents

- [Quick Start](#quick-start)
- [Database Schema](#database-schema)
- [Job Management](#job-management)
- [Execution Engine](#execution-engine)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Quick Start

### 1. Create Job Table

```sql
CREATE TABLE scheduled_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_pattern VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_jobs_next_run ON scheduled_jobs(next_run) 
WHERE enabled = TRUE AND next_run IS NOT NULL;
```

### 2. Add Jobs

```sql
INSERT INTO scheduled_jobs (name, description, cron_pattern, timezone)
VALUES 
    ('Daily Backup', 'Backup database', '0 0 2 * * *', 'UTC'),
    ('Hourly Sync', 'Sync data', '0 0 * * * *', 'UTC'),
    ('Weekly Report', 'Generate report', '0 0 9 * * 1', 'America/New_York');
```

### 3. Calculate Next Runs

```sql
UPDATE scheduled_jobs
SET next_run = jcron.next_time(cron_pattern, COALESCE(last_run, NOW()))
WHERE enabled = TRUE;
```

## Database Schema

### Complete Job Table

```sql
CREATE TABLE scheduled_jobs (
    -- Identity
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    
    -- Schedule
    cron_pattern VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Execution tracking
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Error handling
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Configuration
    timeout_seconds INTEGER DEFAULT 300,
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_next_run ON scheduled_jobs(next_run) 
WHERE enabled = TRUE;

CREATE INDEX idx_jobs_enabled ON scheduled_jobs(enabled);

CREATE INDEX idx_jobs_category ON scheduled_jobs(category) 
WHERE category IS NOT NULL;
```

### Execution History Table

```sql
CREATE TABLE job_execution_history (
    id BIGSERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
    
    -- Execution details
    scheduled_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    execution_duration_ms NUMERIC,
    
    -- Result
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED'
    error_message TEXT,
    output TEXT,
    
    -- Context
    executed_by VARCHAR(100),
    server_name VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_history_job_id ON job_execution_history(job_id);
CREATE INDEX idx_history_status ON job_execution_history(status);
CREATE INDEX idx_history_scheduled_time ON job_execution_history(scheduled_time);

-- Partition by month (optional, for large datasets)
-- CREATE TABLE job_execution_history_2025_10 
-- PARTITION OF job_execution_history 
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

## Job Management

### Add Job

```sql
CREATE OR REPLACE FUNCTION add_job(
    p_name VARCHAR,
    p_pattern VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_timezone VARCHAR DEFAULT 'UTC'
)
RETURNS INTEGER AS $$
DECLARE
    v_job_id INTEGER;
BEGIN
    -- Validate pattern
    PERFORM jcron.next_time(p_pattern, NOW());
    
    -- Insert job
    INSERT INTO scheduled_jobs (name, cron_pattern, description, timezone)
    VALUES (p_name, p_pattern, p_description, p_timezone)
    RETURNING id INTO v_job_id;
    
    -- Calculate first run
    UPDATE scheduled_jobs
    SET next_run = jcron.next_time(cron_pattern, NOW())
    WHERE id = v_job_id;
    
    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT add_job('My Job', '0 0 9 * * *', 'Description', 'UTC');
```

### Update Job

```sql
CREATE OR REPLACE FUNCTION update_job_pattern(
    p_job_id INTEGER,
    p_new_pattern VARCHAR
)
RETURNS VOID AS $$
BEGIN
    -- Validate pattern
    PERFORM jcron.next_time(p_new_pattern, NOW());
    
    -- Update job
    UPDATE scheduled_jobs
    SET 
        cron_pattern = p_new_pattern,
        next_run = jcron.next_time(p_new_pattern, COALESCE(last_run, NOW())),
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;
```

### Enable/Disable Job

```sql
-- Disable job
UPDATE scheduled_jobs
SET enabled = FALSE, updated_at = NOW()
WHERE id = 123;

-- Enable job and recalculate next_run
UPDATE scheduled_jobs
SET 
    enabled = TRUE,
    next_run = jcron.next_time(cron_pattern, NOW()),
    updated_at = NOW()
WHERE id = 123;
```

### Get Due Jobs

```sql
CREATE OR REPLACE FUNCTION get_due_jobs()
RETURNS TABLE(
    job_id INTEGER,
    job_name VARCHAR,
    pattern VARCHAR,
    next_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        name,
        cron_pattern,
        next_run
    FROM scheduled_jobs
    WHERE enabled = TRUE
      AND next_run <= NOW()
    ORDER BY next_run
    FOR UPDATE SKIP LOCKED; -- Prevent concurrent execution
END;
$$ LANGUAGE plpgsql;
```

## Execution Engine

### Simple Executor

```sql
CREATE OR REPLACE FUNCTION execute_job(p_job_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_job RECORD;
BEGIN
    -- Get job details
    SELECT * INTO v_job FROM scheduled_jobs WHERE id = p_job_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job % not found', p_job_id;
    END IF;
    
    v_start_time := clock_timestamp();
    
    BEGIN
        -- Execute job logic here
        -- Example: PERFORM my_job_function(p_job_id);
        
        v_end_time := clock_timestamp();
        
        -- Update job
        UPDATE scheduled_jobs
        SET 
            last_run = v_start_time,
            next_run = jcron.next_time(cron_pattern, v_start_time),
            run_count = run_count + 1,
            success_count = success_count + 1,
            last_error = NULL,
            retry_count = 0,
            updated_at = NOW()
        WHERE id = p_job_id;
        
        -- Log execution
        INSERT INTO job_execution_history 
            (job_id, scheduled_time, actual_start_time, actual_end_time, 
             execution_duration_ms, status)
        VALUES 
            (p_job_id, v_job.next_run, v_start_time, v_end_time,
             jcron.fast_time_diff_ms(v_end_time, v_start_time), 'SUCCESS');
             
    EXCEPTION WHEN OTHERS THEN
        -- Handle error
        UPDATE scheduled_jobs
        SET 
            error_count = error_count + 1,
            last_error = SQLERRM,
            last_error_at = NOW(),
            retry_count = retry_count + 1,
            next_run = CASE 
                WHEN retry_count < max_retries THEN
                    NOW() + (power(2, retry_count) || ' minutes')::INTERVAL
                ELSE
                    jcron.next_time(cron_pattern, NOW())
                END,
            updated_at = NOW()
        WHERE id = p_job_id;
        
        -- Log error
        INSERT INTO job_execution_history 
            (job_id, scheduled_time, actual_start_time, actual_end_time,
             execution_duration_ms, status, error_message)
        VALUES 
            (p_job_id, v_job.next_run, v_start_time, clock_timestamp(),
             jcron.fast_time_diff_ms(clock_timestamp(), v_start_time),
             'FAILED', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;
```

### Batch Executor

```sql
CREATE OR REPLACE FUNCTION execute_due_jobs()
RETURNS TABLE(
    job_id INTEGER,
    job_name VARCHAR,
    status TEXT,
    execution_time_ms NUMERIC
) AS $$
DECLARE
    v_job RECORD;
BEGIN
    FOR v_job IN SELECT * FROM get_due_jobs()
    LOOP
        BEGIN
            PERFORM execute_job(v_job.job_id);
            
            RETURN QUERY SELECT 
                v_job.job_id,
                v_job.job_name,
                'SUCCESS'::TEXT,
                0::NUMERIC;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                v_job.job_id,
                v_job.job_name,
                'ERROR: ' || SQLERRM,
                0::NUMERIC;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Auto-Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_job_schedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate next_run when pattern or enabled changes
    IF NEW.cron_pattern IS DISTINCT FROM OLD.cron_pattern 
       OR NEW.enabled IS DISTINCT FROM OLD.enabled THEN
        
        IF NEW.enabled THEN
            NEW.next_run := jcron.next_time(
                NEW.cron_pattern,
                COALESCE(NEW.last_run, NOW())
            );
        ELSE
            NEW.next_run := NULL;
        END IF;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_job_schedule
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_job_schedule();
```

## Monitoring

### Job Status Dashboard

```sql
CREATE OR REPLACE FUNCTION get_job_status()
RETURNS TABLE(
    job_id INTEGER,
    job_name VARCHAR,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    success_rate NUMERIC,
    avg_duration_ms NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.name,
        j.last_run,
        j.next_run,
        CASE WHEN j.run_count > 0 THEN
            (j.success_count::NUMERIC / j.run_count * 100)
        ELSE 0 END as success_rate,
        (SELECT AVG(execution_duration_ms) 
         FROM job_execution_history 
         WHERE job_id = j.id 
           AND status = 'SUCCESS' 
           AND actual_start_time > NOW() - INTERVAL '7 days') as avg_duration,
        CASE 
            WHEN NOT j.enabled THEN 'DISABLED'
            WHEN j.next_run IS NULL THEN 'NOT_SCHEDULED'
            WHEN j.next_run <= NOW() THEN 'DUE'
            WHEN j.last_error IS NOT NULL THEN 'ERROR'
            ELSE 'OK'
        END as status
    FROM scheduled_jobs j
    ORDER BY j.next_run NULLS LAST;
END;
$$ LANGUAGE plpgsql;
```

### Failed Jobs

```sql
CREATE OR REPLACE FUNCTION get_failed_jobs(days INTEGER DEFAULT 1)
RETURNS TABLE(
    job_id INTEGER,
    job_name VARCHAR,
    error_count INTEGER,
    last_error TEXT,
    last_error_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        name,
        error_count,
        last_error,
        last_error_at
    FROM scheduled_jobs
    WHERE enabled = TRUE
      AND error_count > 0
      AND last_error_at > NOW() - (days || ' days')::INTERVAL
    ORDER BY error_count DESC, last_error_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### Performance Metrics

```sql
CREATE OR REPLACE FUNCTION get_job_metrics(p_job_id INTEGER)
RETURNS TABLE(
    metric VARCHAR,
    value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_runs'::VARCHAR, COUNT(*)::NUMERIC
    FROM job_execution_history
    WHERE job_id = p_job_id
    
    UNION ALL
    
    SELECT 'success_rate', 
           (COUNT(*) FILTER (WHERE status = 'SUCCESS')::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100)
    FROM job_execution_history
    WHERE job_id = p_job_id
    
    UNION ALL
    
    SELECT 'avg_duration_ms', AVG(execution_duration_ms)
    FROM job_execution_history
    WHERE job_id = p_job_id AND status = 'SUCCESS'
    
    UNION ALL
    
    SELECT 'max_duration_ms', MAX(execution_duration_ms)
    FROM job_execution_history
    WHERE job_id = p_job_id AND status = 'SUCCESS'
    
    UNION ALL
    
    SELECT 'min_duration_ms', MIN(execution_duration_ms)
    FROM job_execution_history
    WHERE job_id = p_job_id AND status = 'SUCCESS';
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

### 1. Pattern Validation

Always validate patterns before saving:

```sql
CREATE OR REPLACE FUNCTION validate_pattern(pattern TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM jcron.next_time(pattern, NOW());
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Use in check constraint
ALTER TABLE scheduled_jobs
ADD CONSTRAINT chk_valid_pattern 
CHECK (validate_pattern(cron_pattern));
```

### 2. Prevent Concurrent Execution

Use `FOR UPDATE SKIP LOCKED`:

```sql
SELECT * FROM scheduled_jobs
WHERE enabled = TRUE AND next_run <= NOW()
FOR UPDATE SKIP LOCKED;
```

### 3. Timeout Protection

```sql
-- Set statement timeout
SET statement_timeout = '5min';

-- Or use pg_cancel_backend() from another connection
```

### 4. Cleanup Old History

```sql
-- Delete old history (keep last 90 days)
DELETE FROM job_execution_history
WHERE created_at < NOW() - INTERVAL '90 days';

-- Or use partitioning for automatic cleanup
```

### 5. Monitoring Alerts

```sql
-- Jobs that haven't run in expected time
SELECT 
    name,
    last_run,
    next_run,
    NOW() - last_run as time_since_last_run
FROM scheduled_jobs
WHERE enabled = TRUE
  AND last_run IS NOT NULL
  AND NOW() - last_run > INTERVAL '24 hours'
  AND cron_pattern NOT LIKE '%* * * *%'; -- Exclude frequent jobs
```

---

**Next:** [README](README.md) | [API Reference](API.md) | [Syntax Guide](SYNTAX.md)
