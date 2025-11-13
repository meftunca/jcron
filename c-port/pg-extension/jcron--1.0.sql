-- JCRON PostgreSQL Extension SQL Script

-- Create schema
CREATE SCHEMA IF NOT EXISTS jcron;

-- Create jobs table
CREATE TABLE IF NOT EXISTS jcron.jobs (
    job_id BIGSERIAL PRIMARY KEY,
    schedule TEXT NOT NULL,
    command TEXT NOT NULL,
    database TEXT NOT NULL,
    username TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE
);

-- Create index for active jobs
CREATE INDEX IF NOT EXISTS idx_jcron_jobs_active ON jcron.jobs(active) WHERE active = true;

-- Create index for next_run
CREATE INDEX IF NOT EXISTS idx_jcron_jobs_next_run ON jcron.jobs(next_run);

-- Grant permissions
GRANT USAGE ON SCHEMA jcron TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON jcron.jobs TO PUBLIC;
GRANT USAGE ON SEQUENCE jcron.jobs_job_id_seq TO PUBLIC;

-- SQL Functions (implemented in C)

-- Schedule a cron job
CREATE OR REPLACE FUNCTION jcron.schedule(
    schedule TEXT,
    command TEXT,
    database TEXT DEFAULT current_database(),
    username TEXT DEFAULT current_user
) RETURNS BIGINT
AS '$libdir/jcron', 'jcron_schedule'
LANGUAGE C STRICT;

-- Unschedule a cron job
CREATE OR REPLACE FUNCTION jcron.unschedule(
    job_id BIGINT
) RETURNS BOOLEAN
AS '$libdir/jcron', 'jcron_unschedule'
LANGUAGE C STRICT;

-- Get next run time for a schedule
CREATE OR REPLACE FUNCTION jcron.next_time(
    schedule TEXT
) RETURNS TIMESTAMP WITH TIME ZONE
AS '$libdir/jcron', 'jcron_next_time'
LANGUAGE C STRICT;

-- List all active jobs
CREATE OR REPLACE FUNCTION jcron.list_jobs()
RETURNS TABLE (
    job_id BIGINT,
    schedule TEXT,
    command TEXT,
    database TEXT,
    username TEXT,
    next_run TIMESTAMP WITH TIME ZONE
)
AS '$libdir/jcron', 'jcron_list_jobs'
LANGUAGE C STRICT;

-- Convenience functions

-- Schedule a job (simple version)
CREATE OR REPLACE FUNCTION cron.schedule(
    schedule TEXT,
    command TEXT
) RETURNS BIGINT
AS $$
    SELECT jcron.schedule(schedule, command);
$$ LANGUAGE SQL;

-- Unschedule a job
CREATE OR REPLACE FUNCTION cron.unschedule(
    job_id BIGINT
) RETURNS BOOLEAN
AS $$
    SELECT jcron.unschedule(job_id);
$$ LANGUAGE SQL;

-- List jobs
CREATE OR REPLACE FUNCTION cron.list()
RETURNS TABLE (
    job_id BIGINT,
    schedule TEXT,
    command TEXT,
    database TEXT,
    username TEXT,
    next_run TIMESTAMP WITH TIME ZONE
)
AS $$
    SELECT * FROM jcron.list_jobs();
$$ LANGUAGE SQL;

-- Update next_run timestamps (maintenance function)
CREATE OR REPLACE FUNCTION jcron.update_next_runs()
RETURNS INTEGER
AS $$
DECLARE
    job_record RECORD;
    next_time TIMESTAMP WITH TIME ZONE;
    updated_count INTEGER := 0;
BEGIN
    FOR job_record IN
        SELECT job_id, schedule FROM jcron.jobs WHERE active = true
    LOOP
        BEGIN
            SELECT jcron.next_time(job_record.schedule) INTO next_time;
            UPDATE jcron.jobs SET next_run = next_time WHERE job_id = job_record.job_id;
            updated_count := updated_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Skip invalid schedules
            RAISE WARNING 'Invalid schedule for job %: %', job_record.job_id, job_record.schedule;
        END;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize extension
DO $$
BEGIN
    -- Update next_run for existing jobs
    PERFORM jcron.update_next_runs();

    RAISE NOTICE 'JCRON extension initialized successfully';
END;
$$;

-- JCRON Advanced Features for PostgreSQL

-- Parse EOD pattern
CREATE OR REPLACE FUNCTION jcron.parse_eod(pattern TEXT)
RETURNS TABLE(type TEXT, modifier INTEGER)
AS 'MODULE_PATHNAME', 'jcron_parse_eod'
LANGUAGE C IMMUTABLE STRICT;

-- Parse SOD pattern
CREATE OR REPLACE FUNCTION jcron.parse_sod(pattern TEXT)
RETURNS TABLE(type TEXT, modifier INTEGER)
AS 'MODULE_PATHNAME', 'jcron_parse_sod'
LANGUAGE C IMMUTABLE STRICT;

-- Get nth weekday of month
CREATE OR REPLACE FUNCTION jcron.get_nth_weekday(year INTEGER, month INTEGER, weekday INTEGER, n INTEGER)
RETURNS INTEGER
AS 'MODULE_PATHNAME', 'jcron_get_nth_weekday'
LANGUAGE C IMMUTABLE STRICT;

-- Advanced scheduling with EOD/SOD
CREATE OR REPLACE FUNCTION jcron.schedule_eod(
    eod_pattern TEXT,
    command TEXT,
    database TEXT DEFAULT current_database(),
    username TEXT DEFAULT current_user
) RETURNS BIGINT
AS $$
DECLARE
    cron_schedule TEXT;
BEGIN
    -- Convert EOD pattern to cron schedule
    -- This is a simplified implementation
    -- Full implementation would parse EOD and generate appropriate cron expression
    CASE eod_pattern
        WHEN 'E0D' THEN cron_schedule := '0 0 * * *';  -- End of Day
        WHEN 'E1M' THEN cron_schedule := '0 0 1 * *';  -- End of Month
        WHEN 'S0W' THEN cron_schedule := '0 0 * * 0';  -- Start of Week
        ELSE
            RAISE EXCEPTION 'Unsupported EOD pattern: %', eod_pattern;
    END CASE;

    RETURN jcron.schedule(cron_schedule, command, database, username);
END;
$$ LANGUAGE plpgsql;

-- WOY (Week of Year) support
CREATE OR REPLACE FUNCTION jcron.schedule_woy(
    woy_pattern TEXT,  -- e.g., "WOY 1-10"
    command TEXT,
    database TEXT DEFAULT current_database(),
    username TEXT DEFAULT current_user
) RETURNS BIGINT
AS $$
DECLARE
    cron_schedule TEXT;
    woy_part TEXT;
    week_numbers INTEGER[];
BEGIN
    -- Parse WOY pattern (simplified)
    -- Full implementation would properly parse WOY syntax
    woy_part := split_part(woy_pattern, ' ', 2);

    -- Convert WOY to cron day-of-year (simplified)
    -- This is a basic implementation - full WOY support would be more complex
    IF woy_part LIKE '%-%' THEN
        -- Range like "1-10"
        cron_schedule := '0 0 * * *';  -- Placeholder
    ELSE
        -- Single week
        cron_schedule := '0 0 * * *';  -- Placeholder
    END IF;

    -- For now, return basic schedule
    -- Full WOY implementation would require more complex logic
    RETURN jcron.schedule(cron_schedule || ' -- WOY:' || woy_pattern,
                         command, database, username);
END;
$$ LANGUAGE plpgsql;

-- Advanced pattern validation
CREATE OR REPLACE FUNCTION jcron.validate_pattern(pattern TEXT)
RETURNS BOOLEAN
AS $$
BEGIN
    -- Try to parse the pattern
    BEGIN
        PERFORM jcron.next_time(pattern);
        RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Advanced job listing with pattern analysis
CREATE OR REPLACE FUNCTION jcron.analyze_job(job_id BIGINT)
RETURNS TABLE (
    job_id BIGINT,
    schedule TEXT,
    command TEXT,
    next_run TIMESTAMP WITH TIME ZONE,
    pattern_info JSON
)
AS $$
DECLARE
    job_record RECORD;
    pattern_data JSON;
BEGIN
    SELECT * INTO job_record
    FROM jcron.jobs
    WHERE jcron.jobs.job_id = analyze_job.job_id AND active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Analyze pattern (simplified)
    pattern_data := json_build_object(
        'is_valid', jcron.validate_pattern(job_record.schedule),
        'has_eod', job_record.schedule LIKE '%E%D',
        'has_sod', job_record.schedule LIKE '%S%D',
        'has_woy', job_record.schedule LIKE '%WOY%',
        'has_or', job_record.schedule LIKE '%|%',
        'field_count', array_length(string_to_array(job_record.schedule, ' '), 1)
    );

    RETURN QUERY SELECT
        job_record.job_id,
        job_record.schedule,
        job_record.command,
        jcron.next_time(job_record.schedule),
        pattern_data;
END;
$$ LANGUAGE plpgsql;

-- Batch job scheduling
CREATE OR REPLACE FUNCTION jcron.schedule_batch(
    jobs JSON  -- Array of {schedule, command, database?, username?}
) RETURNS TABLE(job_id BIGINT, schedule TEXT, success BOOLEAN)
AS $$
DECLARE
    job_data JSON;
    sched TEXT;
    cmd TEXT;
    db TEXT;
    usr TEXT;
    new_job_id BIGINT;
BEGIN
    FOR job_data IN SELECT * FROM json_array_elements(jobs)
    LOOP
        sched := job_data->>'schedule';
        cmd := job_data->>'command';
        db := COALESCE(job_data->>'database', current_database());
        usr := COALESCE(job_data->>'username', current_user);

        BEGIN
            new_job_id := jcron.schedule(sched, cmd, db, usr);
            RETURN QUERY SELECT new_job_id, sched, TRUE;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT NULL::BIGINT, sched, FALSE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Job execution statistics
CREATE OR REPLACE FUNCTION jcron.job_stats()
RETURNS TABLE (
    total_jobs BIGINT,
    active_jobs BIGINT,
    executed_today BIGINT,
    avg_execution_time INTERVAL,
    failed_jobs BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM jcron.jobs) as total_jobs,
        (SELECT count(*) FROM jcron.jobs WHERE active = true) as active_jobs,
        (SELECT count(*) FROM jcron.jobs WHERE last_run >= current_date) as executed_today,
        (SELECT avg(now() - last_run) FROM jcron.jobs WHERE last_run IS NOT NULL) as avg_execution_time,
        0::BIGINT as failed_jobs; -- Placeholder for failure tracking
END;
$$ LANGUAGE plpgsql;

-- Advanced time calculations
CREATE OR REPLACE FUNCTION jcron.time_until_next(schedule TEXT)
RETURNS INTERVAL
AS $$
DECLARE
    next_time TIMESTAMP WITH TIME ZONE;
BEGIN
    next_time := jcron.next_time(schedule);
    RETURN next_time - now();
END;
$$ LANGUAGE plpgsql;

-- Pattern complexity analysis
CREATE OR REPLACE FUNCTION jcron.analyze_pattern_complexity(schedule TEXT)
RETURNS TABLE (
    pattern TEXT,
    complexity_score INTEGER,
    has_ranges BOOLEAN,
    has_steps BOOLEAN,
    has_lists BOOLEAN,
    has_special BOOLEAN,
    estimated_matches_per_hour NUMERIC
)
AS $$
DECLARE
    score INTEGER := 0;
    ranges BOOLEAN := FALSE;
    steps BOOLEAN := FALSE;
    lists BOOLEAN := FALSE;
    special BOOLEAN := FALSE;
    parts TEXT[];
    part TEXT;
    matches_per_hour NUMERIC := 0;
BEGIN
    -- Split pattern into parts
    parts := string_to_array(schedule, ' ');

    -- Analyze each part
    FOREACH part IN ARRAY parts LOOP
        IF part LIKE '%-%' THEN
            ranges := TRUE;
            score := score + 2;
        END IF;

        IF part LIKE '%/*%' OR part LIKE '%*/%' THEN
            steps := TRUE;
            score := score + 1;
        END IF;

        IF part LIKE '%,%' THEN
            lists := TRUE;
            score := score + 3;
        END IF;

        IF part ~ '[LW#]' THEN
            special := TRUE;
            score := score + 5;
        END IF;
    END LOOP;

    -- Check for JCRON special features
    IF schedule LIKE '%E%D' OR schedule LIKE '%S%D' THEN
        special := TRUE;
        score := score + 10;
    END IF;

    IF schedule LIKE '%WOY%' THEN
        special := TRUE;
        score := score + 15;
    END IF;

    IF schedule LIKE '%|%' THEN
        special := TRUE;
        score := score + 8;
    END IF;

    -- Estimate matches per hour (very rough)
    matches_per_hour := CASE
        WHEN score = 0 THEN 1  -- * * * * *
        WHEN score < 5 THEN 2
        WHEN score < 10 THEN 6
        WHEN score < 20 THEN 24
        ELSE 168  -- Weekly
    END CASE;

    RETURN QUERY SELECT
        schedule,
        score,
        ranges,
        steps,
        lists,
        special,
        matches_per_hour;
END;
$$ LANGUAGE plpgsql;

-- Cron expression builder helper
CREATE OR REPLACE FUNCTION jcron.build_cron(
    minute TEXT DEFAULT '*',
    hour TEXT DEFAULT '*',
    day TEXT DEFAULT '*',
    month TEXT DEFAULT '*',
    weekday TEXT DEFAULT '*',
    second TEXT DEFAULT '*'
) RETURNS TEXT
AS $$
BEGIN
    RETURN format('%s %s %s %s %s %s',
                  minute, hour, day, month, weekday, second);
END;
$$ LANGUAGE plpgsql;

-- Predefined schedule helpers
CREATE OR REPLACE FUNCTION jcron.every_minute() RETURNS TEXT
AS $$ SELECT '*/1 * * * * *'; $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION jcron.every_hour() RETURNS TEXT
AS $$ SELECT '0 * * * * *'; $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION jcron.every_day() RETURNS TEXT
AS $$ SELECT '0 0 * * * *'; $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION jcron.every_week() RETURNS TEXT
AS $$ SELECT '0 0 * * 0 *'; $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION jcron.every_month() RETURNS TEXT
AS $$ SELECT '0 0 1 * * *'; $$ LANGUAGE SQL;

-- Business hours helper
CREATE OR REPLACE FUNCTION jcron.business_hours(
    start_hour INTEGER DEFAULT 9,
    end_hour INTEGER DEFAULT 17,
    days TEXT DEFAULT '1-5'  -- Monday to Friday
) RETURNS TEXT
AS $$
BEGIN
    RETURN format('0 %s-%s * * %s *',
                  start_hour, end_hour - 1, days);
END;
$$ LANGUAGE plpgsql;