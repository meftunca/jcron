-- =====================================================
-- 🗓️ JCRON SCHEDULER - Job Management System
-- =====================================================
-- Complete job scheduling and management system
-- Compatible with pg_cron architecture but enhanced
-- Version: 1.0.0
-- Requires: jcron.sql, jcron_helpers.sql
-- =====================================================

-- =====================================================
-- 📋 CORE TABLES
-- =====================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS jcron_scheduler;

-- Main jobs table (similar to pg_cron.job)
CREATE TABLE IF NOT EXISTS jcron_scheduler.jobs (
    job_id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL UNIQUE,
    schedule TEXT NOT NULL,  -- JCRON pattern
    command TEXT NOT NULL,   -- SQL command to execute
    nodename TEXT NOT NULL DEFAULT 'localhost',
    nodeport INTEGER NOT NULL DEFAULT 5432,
    database TEXT NOT NULL DEFAULT current_database(),
    username TEXT NOT NULL DEFAULT current_user,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metadata
    description TEXT,
    tags TEXT[],
    max_run_duration INTERVAL DEFAULT '1 hour',
    retry_attempts INTEGER DEFAULT 0,
    retry_delay INTERVAL DEFAULT '5 minutes',
    
    -- Scheduling metadata
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    next_run_at TIMESTAMPTZ,
    run_count BIGINT DEFAULT 0,
    success_count BIGINT DEFAULT 0,
    failure_count BIGINT DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_schedule CHECK (jcron.is_valid_pattern(schedule)),
    CONSTRAINT valid_retry_attempts CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
    CONSTRAINT valid_status CHECK (last_run_status IS NULL OR last_run_status IN ('success', 'failed', 'running', 'timeout', 'cancelled'))
);

-- Job execution history
CREATE TABLE IF NOT EXISTS jcron_scheduler.job_runs (
    run_id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jcron_scheduler.jobs(job_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration INTERVAL,
    return_message TEXT,
    error_message TEXT,
    
    -- Retry information
    attempt_number INTEGER DEFAULT 1,
    is_retry BOOLEAN DEFAULT FALSE,
    parent_run_id BIGINT REFERENCES jcron_scheduler.job_runs(run_id),
    
    CONSTRAINT valid_run_status CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout', 'cancelled'))
);

-- Job dependencies (run job B after job A succeeds)
CREATE TABLE IF NOT EXISTS jcron_scheduler.job_dependencies (
    dependency_id SERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jcron_scheduler.jobs(job_id) ON DELETE CASCADE,
    depends_on_job_id BIGINT NOT NULL REFERENCES jcron_scheduler.jobs(job_id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'success',  -- 'success', 'completion', 'time_based'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT no_self_dependency CHECK (job_id != depends_on_job_id),
    CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('success', 'completion', 'time_based'))
);

-- Job configuration/parameters
CREATE TABLE IF NOT EXISTS jcron_scheduler.job_config (
    config_id SERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jcron_scheduler.jobs(job_id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(job_id, config_key)
);

-- Job execution log (for auditing)
CREATE TABLE IF NOT EXISTS jcron_scheduler.job_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    job_id BIGINT REFERENCES jcron_scheduler.jobs(job_id) ON DELETE SET NULL,
    action TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'executed', 'paused', 'resumed'
    performed_by TEXT NOT NULL DEFAULT current_user,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB,
    notes TEXT
);

-- =====================================================
-- 📊 INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jobs_active ON jcron_scheduler.jobs(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON jcron_scheduler.jobs(next_run_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON jcron_scheduler.jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON jcron_scheduler.job_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON jcron_scheduler.job_runs(status);
CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON jcron_scheduler.job_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_job_id ON jcron_scheduler.job_dependencies(job_id);
CREATE INDEX IF NOT EXISTS idx_job_audit_log_job_id ON jcron_scheduler.job_audit_log(job_id);

-- =====================================================
-- 🔧 CORE FUNCTIONS
-- =====================================================

-- Schedule a new job
CREATE OR REPLACE FUNCTION jcron_scheduler.schedule_job(
    p_job_name TEXT,
    p_schedule TEXT,
    p_command TEXT,
    p_description TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_database TEXT DEFAULT current_database(),
    p_username TEXT DEFAULT current_user
) RETURNS BIGINT AS $$
DECLARE
    v_job_id BIGINT;
    v_next_run TIMESTAMPTZ;
BEGIN
    -- Validate schedule
    IF NOT jcron.is_valid_pattern(p_schedule) THEN
        RAISE EXCEPTION 'Invalid cron pattern: %', p_schedule;
    END IF;
    
    -- Calculate next run
    v_next_run := jcron.next_time(p_schedule);
    
    -- Insert job
    INSERT INTO jcron_scheduler.jobs (
        job_name, schedule, command, description, tags,
        database, username, next_run_at
    ) VALUES (
        p_job_name, p_schedule, p_command, p_description, p_tags,
        p_database, p_username, v_next_run
    )
    RETURNING job_id INTO v_job_id;
    
    -- Audit log
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, new_values, notes)
    VALUES (v_job_id, 'created', jsonb_build_object(
        'job_name', p_job_name,
        'schedule', p_schedule,
        'next_run', v_next_run
    ), format('Job "%s" scheduled', p_job_name));
    
    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Unschedule (delete) a job
CREATE OR REPLACE FUNCTION jcron_scheduler.unschedule_job(
    p_job_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_job_id BIGINT;
BEGIN
    SELECT job_id INTO v_job_id
    FROM jcron_scheduler.jobs
    WHERE job_name = p_job_name;
    
    IF v_job_id IS NULL THEN
        RAISE EXCEPTION 'Job not found: %', p_job_name;
    END IF;
    
    -- Audit log
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, notes)
    VALUES (v_job_id, 'deleted', format('Job "%s" deleted', p_job_name));
    
    DELETE FROM jcron_scheduler.jobs WHERE job_id = v_job_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update job schedule
CREATE OR REPLACE FUNCTION jcron_scheduler.alter_job(
    p_job_name TEXT,
    p_schedule TEXT DEFAULT NULL,
    p_command TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_job_id BIGINT;
    v_next_run TIMESTAMPTZ;
    v_old_values JSONB;
    v_new_values JSONB := '{}'::JSONB;
BEGIN
    SELECT job_id, 
           jsonb_build_object('schedule', schedule, 'command', command, 'description', description)
    INTO v_job_id, v_old_values
    FROM jcron_scheduler.jobs
    WHERE job_name = p_job_name;
    
    IF v_job_id IS NULL THEN
        RAISE EXCEPTION 'Job not found: %', p_job_name;
    END IF;
    
    -- Update schedule if provided
    IF p_schedule IS NOT NULL THEN
        IF NOT jcron.is_valid_pattern(p_schedule) THEN
            RAISE EXCEPTION 'Invalid cron pattern: %', p_schedule;
        END IF;
        
        v_next_run := jcron.next_time(p_schedule);
        v_new_values := v_new_values || jsonb_build_object('schedule', p_schedule, 'next_run', v_next_run);
        
        UPDATE jcron_scheduler.jobs
        SET schedule = p_schedule,
            next_run_at = v_next_run,
            updated_at = NOW()
        WHERE job_id = v_job_id;
    END IF;
    
    -- Update command if provided
    IF p_command IS NOT NULL THEN
        v_new_values := v_new_values || jsonb_build_object('command', p_command);
        UPDATE jcron_scheduler.jobs
        SET command = p_command, updated_at = NOW()
        WHERE job_id = v_job_id;
    END IF;
    
    -- Update description if provided
    IF p_description IS NOT NULL THEN
        v_new_values := v_new_values || jsonb_build_object('description', p_description);
        UPDATE jcron_scheduler.jobs
        SET description = p_description, updated_at = NOW()
        WHERE job_id = v_job_id;
    END IF;
    
    -- Audit log
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, old_values, new_values, notes)
    VALUES (v_job_id, 'updated', v_old_values, v_new_values, format('Job "%s" updated', p_job_name));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Pause a job (set active = false)
CREATE OR REPLACE FUNCTION jcron_scheduler.pause_job(
    p_job_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_job_id BIGINT;
BEGIN
    UPDATE jcron_scheduler.jobs
    SET active = FALSE, updated_at = NOW()
    WHERE job_name = p_job_name
    RETURNING job_id INTO v_job_id;
    
    IF v_job_id IS NULL THEN
        RAISE EXCEPTION 'Job not found: %', p_job_name;
    END IF;
    
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, notes)
    VALUES (v_job_id, 'paused', format('Job "%s" paused', p_job_name));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Resume a job (set active = true)
CREATE OR REPLACE FUNCTION jcron_scheduler.resume_job(
    p_job_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_job_id BIGINT;
    v_next_run TIMESTAMPTZ;
BEGIN
    SELECT job_id, jcron.next_time(schedule)
    INTO v_job_id, v_next_run
    FROM jcron_scheduler.jobs
    WHERE job_name = p_job_name;
    
    IF v_job_id IS NULL THEN
        RAISE EXCEPTION 'Job not found: %', p_job_name;
    END IF;
    
    UPDATE jcron_scheduler.jobs
    SET active = TRUE, next_run_at = v_next_run, updated_at = NOW()
    WHERE job_id = v_job_id;
    
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, notes)
    VALUES (v_job_id, 'resumed', format('Job "%s" resumed', p_job_name));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Execute a job immediately (manual trigger)
CREATE OR REPLACE FUNCTION jcron_scheduler.run_job_now(
    p_job_name TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_job_id BIGINT;
    v_command TEXT;
    v_run_id BIGINT;
    v_result TEXT;
    v_error TEXT;
    v_started_at TIMESTAMPTZ := NOW();
    v_finished_at TIMESTAMPTZ;
BEGIN
    -- Get job details
    SELECT job_id, command INTO v_job_id, v_command
    FROM jcron_scheduler.jobs
    WHERE job_name = p_job_name;
    
    IF v_job_id IS NULL THEN
        RAISE EXCEPTION 'Job not found: %', p_job_name;
    END IF;
    
    -- Create run record
    INSERT INTO jcron_scheduler.job_runs (job_id, status, started_at)
    VALUES (v_job_id, 'running', v_started_at)
    RETURNING run_id INTO v_run_id;
    
    -- Execute command
    BEGIN
        EXECUTE v_command;
        v_result := 'success';
        v_error := NULL;
    EXCEPTION WHEN OTHERS THEN
        v_result := 'failed';
        v_error := SQLERRM;
    END;
    
    v_finished_at := NOW();
    
    -- Update run record
    UPDATE jcron_scheduler.job_runs
    SET status = v_result,
        finished_at = v_finished_at,
        duration = v_finished_at - v_started_at,
        return_message = CASE WHEN v_result = 'success' THEN 'Job executed successfully' ELSE NULL END,
        error_message = v_error
    WHERE run_id = v_run_id;
    
    -- Update job stats
    UPDATE jcron_scheduler.jobs
    SET last_run_at = v_started_at,
        last_run_status = v_result,
        run_count = run_count + 1,
        success_count = success_count + CASE WHEN v_result = 'success' THEN 1 ELSE 0 END,
        failure_count = failure_count + CASE WHEN v_result = 'failed' THEN 1 ELSE 0 END
    WHERE job_id = v_job_id;
    
    -- Audit log
    INSERT INTO jcron_scheduler.job_audit_log (job_id, action, notes)
    VALUES (v_job_id, 'executed', format('Job "%s" manually executed: %s', p_job_name, v_result));
    
    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Get jobs that should run now
CREATE OR REPLACE FUNCTION jcron_scheduler.get_pending_jobs(
    tolerance_seconds INTEGER DEFAULT 60
) RETURNS TABLE(
    job_id BIGINT,
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    next_run_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.job_id,
        j.job_name,
        j.schedule,
        j.command,
        j.next_run_at
    FROM jcron_scheduler.jobs j
    WHERE j.active = TRUE
      AND j.next_run_at IS NOT NULL
      AND j.next_run_at <= NOW()
      AND (j.last_run_status IS NULL OR j.last_run_status != 'running')
    ORDER BY j.next_run_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update next_run_at for all jobs
CREATE OR REPLACE FUNCTION jcron_scheduler.refresh_schedules()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_job RECORD;
    v_next_run TIMESTAMPTZ;
BEGIN
    FOR v_job IN 
        SELECT job_id, schedule, last_run_at
        FROM jcron_scheduler.jobs
        WHERE active = TRUE
    LOOP
        v_next_run := jcron.next_time(v_job.schedule, COALESCE(v_job.last_run_at, NOW()));
        
        UPDATE jcron_scheduler.jobs
        SET next_run_at = v_next_run,
            updated_at = NOW()
        WHERE job_id = v_job.job_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 📊 MONITORING & REPORTING FUNCTIONS
-- =====================================================

-- Get job status overview
CREATE OR REPLACE FUNCTION jcron_scheduler.job_status()
RETURNS TABLE(
    job_name TEXT,
    active BOOLEAN,
    schedule TEXT,
    schedule_description TEXT,
    last_run TIMESTAMPTZ,
    last_status TEXT,
    next_run TIMESTAMPTZ,
    time_until_next INTERVAL,
    total_runs BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.job_name,
        j.active,
        j.schedule,
        jcron.explain_pattern(j.schedule) as schedule_description,
        j.last_run_at,
        j.last_run_status,
        j.next_run_at,
        j.next_run_at - NOW() as time_until_next,
        j.run_count,
        CASE 
            WHEN j.run_count > 0 
            THEN ROUND((j.success_count::NUMERIC / j.run_count::NUMERIC) * 100, 2)
            ELSE NULL
        END as success_rate
    FROM jcron_scheduler.jobs j
    ORDER BY j.next_run_at NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get failed jobs that need attention
CREATE OR REPLACE FUNCTION jcron_scheduler.failed_jobs()
RETURNS TABLE(
    job_name TEXT,
    last_run TIMESTAMPTZ,
    error_message TEXT,
    failure_count BIGINT,
    consecutive_failures BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.job_name,
        j.last_run_at,
        r.error_message,
        j.failure_count,
        (SELECT COUNT(*) 
         FROM jcron_scheduler.job_runs jr
         WHERE jr.job_id = j.job_id 
           AND jr.status = 'failed'
           AND jr.started_at > (
               SELECT MAX(started_at) 
               FROM jcron_scheduler.job_runs 
               WHERE job_id = j.job_id AND status = 'success'
           )
        ) as consecutive_failures
    FROM jcron_scheduler.jobs j
    LEFT JOIN LATERAL (
        SELECT error_message
        FROM jcron_scheduler.job_runs
        WHERE job_id = j.job_id
        ORDER BY started_at DESC
        LIMIT 1
    ) r ON TRUE
    WHERE j.last_run_status = 'failed'
    ORDER BY j.last_run_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get job execution history
CREATE OR REPLACE FUNCTION jcron_scheduler.job_history(
    p_job_name TEXT,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    run_id BIGINT,
    status TEXT,
    started_at TIMESTAMPTZ,
    duration INTERVAL,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.run_id,
        r.status,
        r.started_at,
        r.duration,
        r.error_message
    FROM jcron_scheduler.job_runs r
    JOIN jcron_scheduler.jobs j ON r.job_id = j.job_id
    WHERE j.job_name = p_job_name
    ORDER BY r.started_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 🔔 TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION jcron_scheduler.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_update_timestamp
    BEFORE UPDATE ON jcron_scheduler.jobs
    FOR EACH ROW
    EXECUTE FUNCTION jcron_scheduler.update_timestamp();

-- Validate schedule on insert/update
CREATE OR REPLACE FUNCTION jcron_scheduler.validate_job_schedule()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT jcron.is_valid_pattern(NEW.schedule) THEN
        RAISE EXCEPTION 'Invalid cron pattern: %', NEW.schedule;
    END IF;
    
    -- Calculate next run
    NEW.next_run_at := jcron.next_time(NEW.schedule, COALESCE(NEW.last_run_at, NOW()));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_validate_schedule
    BEFORE INSERT OR UPDATE OF schedule ON jcron_scheduler.jobs
    FOR EACH ROW
    EXECUTE FUNCTION jcron_scheduler.validate_job_schedule();

-- =====================================================
-- 📝 VIEWS
-- =====================================================

-- Active jobs view
CREATE OR REPLACE VIEW jcron_scheduler.v_active_jobs AS
SELECT 
    job_id,
    job_name,
    schedule,
    jcron.explain_pattern(schedule) as schedule_description,
    command,
    description,
    tags,
    last_run_at,
    last_run_status,
    next_run_at,
    next_run_at - NOW() as time_until_next,
    run_count,
    success_count,
    failure_count,
    CASE 
        WHEN run_count > 0 
        THEN ROUND((success_count::NUMERIC / run_count::NUMERIC) * 100, 2)
        ELSE NULL
    END as success_rate_pct
FROM jcron_scheduler.jobs
WHERE active = TRUE
ORDER BY next_run_at NULLS LAST;

-- Recent runs view
CREATE OR REPLACE VIEW jcron_scheduler.v_recent_runs AS
SELECT 
    r.run_id,
    j.job_name,
    r.status,
    r.started_at,
    r.finished_at,
    r.duration,
    r.error_message,
    r.attempt_number
FROM jcron_scheduler.job_runs r
JOIN jcron_scheduler.jobs j ON r.job_id = j.job_id
WHERE r.started_at > NOW() - INTERVAL '24 hours'
ORDER BY r.started_at DESC;

-- =====================================================
-- 🎉 INSTALLATION COMPLETE
-- =====================================================
-- Job scheduler system ready!
-- Compatible with pg_cron architecture
-- Enhanced with JCRON features
-- 
-- Quick start:
--   SELECT jcron_scheduler.schedule_job('daily-backup', '0 0 2 * * * *', 'CALL backup_database()');
--   SELECT * FROM jcron_scheduler.job_status();
-- =====================================================
