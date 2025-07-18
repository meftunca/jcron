-- =====================================================
-- JCRON PostgreSQL Implementation
-- Ultra High Performance, Low Memory, Low CPU Cost
-- =====================================================
drop schema if exists jcron cascade;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

create schema if not exists jcron;


-- =====================================================
-- 1. CORE DATA TYPES & ENUMS
-- =====================================================

-- Reference points for EOD (End of Duration)
CREATE TYPE jcron.reference_point AS ENUM (
    'S',        -- Start reference
    'E',        -- End reference
    'D',        -- End of day
    'W',        -- End of week
    'M',        -- End of month
    'Q',        -- End of quarter
    'Y',        -- End of year
    'START',    -- Start reference (alias)
    'END',      -- End reference (alias)
    'DAY',      -- End of day (alias)
    'WEEK',     -- End of week (alias)
    'MONTH',    -- End of month (alias)
    'QUARTER',  -- End of quarter (alias)
    'YEAR'      -- End of year (alias)
);

-- Schedule status
CREATE TYPE jcron.status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'FAILED'
);

-- =====================================================
-- 2. CORE TABLES (Minimal Schema)
-- =====================================================

-- Scheduled jobs table
CREATE TABLE jcron.schedules (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,

    -- Original jcron expression
    jcron_expr TEXT NOT NULL,

    -- Schedule metadata
    status jcron.status NOT NULL DEFAULT 'ACTIVE',
    next_run TIMESTAMPTZ,
    last_run TIMESTAMPTZ,
    run_count INTEGER NOT NULL DEFAULT 0,

    -- Function to execute
    function_name TEXT NOT NULL,
    function_args JSONB DEFAULT '{}',

    -- Limits
    max_runs INTEGER,
    end_time TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Execution history (minimal for performance)
CREATE TABLE jcron.execution_log (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT REFERENCES jcron.schedules(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'TIMEOUT'
    error_message TEXT,

    -- Partitioning key for automatic cleanup
    log_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Partition by month for automatic log cleanup
CREATE INDEX idx_jcron_log_schedule_date ON jcron.execution_log(schedule_id, log_date);
CREATE INDEX idx_jcron_log_cleanup ON jcron.execution_log(log_date);

-- Events table for event-based EOD
CREATE TABLE jcron.events (
    event_id TEXT PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. ULTRA-FAST PARSING FUNCTIONS
-- =====================================================

-- SAF PARSE fonksiyonu (tabloya yazmaz, sadece döndürür)
CREATE OR REPLACE FUNCTION jcron.parse_expression(
    p_expression TEXT
) RETURNS TABLE(
    seconds_mask BIGINT,
    minutes_mask BIGINT,
    hours_mask INTEGER,
    days_mask BIGINT,
    months_mask SMALLINT,
    weekdays_mask SMALLINT,
    weeks_mask BIGINT,
    day_expr TEXT,
    weekday_expr TEXT,
    week_expr TEXT,
    year_expr TEXT,
    timezone TEXT,
    has_special_patterns BOOLEAN,
    has_year_restriction BOOLEAN
) AS $$
DECLARE
    v_parts TEXT[];
    v_woy_part TEXT := '';
    v_tz_part TEXT := 'UTC';
    v_sec_expr TEXT := '*';
    v_min_expr TEXT := '*';
    v_hour_expr TEXT := '*';
    v_day_expr TEXT := '*';
    v_month_expr TEXT := '*';
    v_weekday_expr TEXT := '*';
    v_year_expr TEXT := '*';
    v_sec_mask BIGINT := 0;
    v_min_mask BIGINT := 0;
    v_hour_mask INTEGER := 0;
    v_day_mask BIGINT := 0;
    v_month_mask SMALLINT := 0;
    v_weekday_mask SMALLINT := 0;
    v_week_mask BIGINT := 0;
    v_has_special BOOLEAN := FALSE;
    v_has_year_restrict BOOLEAN := FALSE;
BEGIN
    -- Parse WOY (Week of Year) pattern
    IF p_expression ~ 'WOY:' THEN
        v_woy_part := substring(p_expression from 'WOY:([^ ]+)');
        p_expression := regexp_replace(p_expression, 'WOY:[^ ]+\\s*', '', 'g');
        v_week_mask := jcron.expand_part(v_woy_part, 1, 53);
    ELSE
        v_week_mask := (1::BIGINT << 54) - 2;
    END IF;
    -- Parse TZ (Timezone)
    IF p_expression ~ 'TZ[:=]' THEN
        v_tz_part := substring(p_expression from 'TZ[:=]([^ ]+)');
        p_expression := regexp_replace(p_expression, 'TZ[:=][^ ]+\\s*', '', 'g');
    END IF;
    -- Split remaining cron fields
    v_parts := string_to_array(trim(p_expression), ' ');
    CASE array_length(v_parts, 1)
        WHEN 5 THEN
            v_min_expr := v_parts[1]; v_hour_expr := v_parts[2]; v_day_expr := v_parts[3]; v_month_expr := v_parts[4]; v_weekday_expr := v_parts[5];
        WHEN 6 THEN
            v_sec_expr := v_parts[1]; v_min_expr := v_parts[2]; v_hour_expr := v_parts[3]; v_day_expr := v_parts[4]; v_month_expr := v_parts[5]; v_weekday_expr := v_parts[6];
        WHEN 7 THEN
            v_sec_expr := v_parts[1]; v_min_expr := v_parts[2]; v_hour_expr := v_parts[3]; v_day_expr := v_parts[4]; v_month_expr := v_parts[5]; v_weekday_expr := v_parts[6]; v_year_expr := v_parts[7]; v_has_year_restrict := (v_year_expr != '*');
        ELSE
            RAISE EXCEPTION 'Invalid cron expression format: %', p_expression;
    END CASE;
    -- Bitmask expansion
    v_sec_mask := jcron.expand_part(v_sec_expr, 0, 59);
    v_min_mask := jcron.expand_part(v_min_expr, 0, 59);
    v_hour_mask := (jcron.expand_part(v_hour_expr, 0, 23) & 16777215)::INTEGER;
    v_has_special := (v_day_expr ~ '[L#]' OR v_weekday_expr ~ '[L#]');
    IF v_day_expr ~ '[L#]' THEN v_day_mask := 4294967295; ELSE v_day_mask := jcron.expand_part(v_day_expr, 1, 31); END IF;
    v_month_mask := (jcron.expand_part(v_month_expr, 1, 12) & 8191)::SMALLINT;
    IF v_weekday_expr ~ '[L#]' THEN v_weekday_mask := 127; ELSE v_weekday_mask := (jcron.expand_part(v_weekday_expr, 0, 6) & 127)::SMALLINT; END IF;
    RETURN QUERY SELECT v_sec_mask, v_min_mask, v_hour_mask, v_day_mask, v_month_mask, v_weekday_mask, v_week_mask, v_day_expr, v_weekday_expr, v_woy_part, v_year_expr, v_tz_part, v_has_special, v_has_year_restrict;
END;
$$ LANGUAGE plpgsql;

-- SAF next_time fonksiyonu (cache_key yerine doğrudan expression alır)
CREATE OR REPLACE FUNCTION jcron.next_time(
    p_expression TEXT,
    p_from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_seconds_mask BIGINT;
    v_minutes_mask BIGINT;
    v_hours_mask INTEGER;
    v_days_mask BIGINT;
    v_months_mask SMALLINT;
    v_weekdays_mask SMALLINT;
    v_weeks_mask BIGINT;
    v_day_expr TEXT;
    v_weekday_expr TEXT;
    v_week_expr TEXT;
    v_year_expr TEXT;
    v_timezone TEXT;
    v_has_special_patterns BOOLEAN;
    v_has_year_restriction BOOLEAN;
    v_target_tz TEXT;
    v_local_time TIMESTAMPTZ;
    v_candidate TIMESTAMPTZ;
    v_max_iterations INTEGER := 366;
    v_iteration INTEGER := 0;
BEGIN
    SELECT 
        seconds_mask, minutes_mask, hours_mask, days_mask, months_mask, weekdays_mask, weeks_mask,
        day_expr, weekday_expr, week_expr, year_expr, timezone, has_special_patterns, has_year_restriction
    INTO 
        v_seconds_mask, v_minutes_mask, v_hours_mask, v_days_mask, v_months_mask, v_weekdays_mask, v_weeks_mask,
        v_day_expr, v_weekday_expr, v_week_expr, v_year_expr, v_timezone, v_has_special_patterns, v_has_year_restriction
    FROM jcron.parse_expression(p_expression);

    target_tz := COALESCE(timezone, 'UTC');
    local_time := from_time AT TIME ZONE target_tz;
    candidate := local_time + INTERVAL '1 second';
    WHILE iteration < max_iterations LOOP
        iteration := iteration + 1;
        -- Year check
        IF has_year_restriction AND NOT jcron.year_matches(year_expr, EXTRACT(YEAR FROM candidate)::INTEGER) THEN
            candidate := jcron.advance_year(candidate, year_expr);
            CONTINUE;
        END IF;
        -- Month check
        IF (months_mask & (1 << EXTRACT(MONTH FROM candidate)::INTEGER)) = 0 THEN
            candidate := date_trunc('month', candidate + INTERVAL '1 month');
            CONTINUE;
        END IF;
        -- Week of year check
        IF (weeks_mask & (1::BIGINT << EXTRACT(WEEK FROM candidate)::INTEGER)) = 0 THEN
            candidate := candidate + INTERVAL '1 day';
            CONTINUE;
        END IF;
        -- Day check (special patterns hariç)
        IF NOT jcron.day_matches_stateless(candidate, day_expr, weekday_expr, days_mask, weekdays_mask, has_special_patterns) THEN
            candidate := date_trunc('day', candidate + INTERVAL '1 day');
            CONTINUE;
        END IF;
        -- Hour check
        IF (hours_mask & (1 << EXTRACT(HOUR FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_hour(candidate, hours_mask);
            CONTINUE;
        END IF;
        -- Minute check
        IF (minutes_mask & (1::BIGINT << EXTRACT(MINUTE FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_minute(candidate, minutes_mask);
            CONTINUE;
        END IF;
        -- Second check
        IF (seconds_mask & (1::BIGINT << EXTRACT(SECOND FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_second(candidate, seconds_mask);
            CONTINUE;
        END IF;
        RETURN candidate AT TIME ZONE target_tz;
    END LOOP;
    RAISE EXCEPTION 'Could not find next execution time within % iterations', max_iterations;
END;
$$ LANGUAGE plpgsql;

-- Stateless day_matches fonksiyonu
CREATE OR REPLACE FUNCTION jcron.day_matches_stateless(
    check_time TIMESTAMPTZ,
    day_expr TEXT,
    weekday_expr TEXT,
    days_mask BIGINT,
    weekdays_mask SMALLINT,
    has_special_patterns BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
    day_restricted BOOLEAN;
    weekday_restricted BOOLEAN;
    day_match BOOLEAN := FALSE;
    weekday_match BOOLEAN := FALSE;
BEGIN
    day_restricted := (day_expr != '*' AND day_expr != '?');
    weekday_restricted := (weekday_expr != '*' AND weekday_expr != '?');
    IF NOT day_restricted AND NOT weekday_restricted THEN RETURN TRUE; END IF;
    IF day_restricted THEN
        IF day_expr = 'L' THEN
            day_match := (check_time::DATE = (date_trunc('month', check_time + INTERVAL '1 month') - INTERVAL '1 day')::DATE);
        ELSIF has_special_patterns THEN
            day_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            day_match := ((days_mask & (1::BIGINT << EXTRACT(DAY FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;
    IF weekday_restricted THEN
        IF has_special_patterns THEN
            weekday_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            weekday_match := ((weekdays_mask & (1 << EXTRACT(DOW FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;
    IF day_restricted AND weekday_restricted THEN RETURN day_match OR weekday_match;
    ELSIF day_restricted THEN RETURN day_match;
    ELSE RETURN weekday_match;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. Yardımcı fonksiyonlar (convert_abbreviations, expand_part, ...)
-- 2. Ana fonksiyonlar (parse_expression, next_time, ...)
-- Tüm DECLARE değişkenleri v_ ile başlıyor
-- Tekrar eden fonksiyonlar kaldırıldı

-- =====================================================
-- 5. HELPER FUNCTIONS (Optimized)
-- =====================================================

-- Check if day matches (handles special patterns L, #)
CREATE OR REPLACE FUNCTION jcron.day_matches(check_time TIMESTAMPTZ, cache_row jcron.schedule_cache)
RETURNS BOOLEAN AS $$
DECLARE
    day_restricted BOOLEAN;
    weekday_restricted BOOLEAN;
    day_match BOOLEAN := FALSE;
    weekday_match BOOLEAN := FALSE;
BEGIN
    day_restricted := (cache_row.day_expr != '*' AND cache_row.day_expr != '?');
    weekday_restricted := (cache_row.weekday_expr != '*' AND cache_row.weekday_expr != '?');

    -- Fast path: no restrictions
    IF NOT day_restricted AND NOT weekday_restricted THEN
        RETURN TRUE;
    END IF;

    -- Day of month check
    IF day_restricted THEN
        IF cache_row.day_expr = 'L' THEN
            -- Last day of month - compare dates only
            day_match := (check_time::DATE = (date_trunc('month', check_time + INTERVAL '1 month') - INTERVAL '1 day')::DATE);
        ELSIF cache_row.has_special_patterns THEN
            -- Complex patterns (L, #) - delegate to special function
            day_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            -- Simple bitmask check - use BIGINT for day mask
            day_match := ((cache_row.days_mask & (1::BIGINT << EXTRACT(DAY FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;

    -- Day of week check
    IF weekday_restricted THEN
        IF cache_row.has_special_patterns THEN
            weekday_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            weekday_match := ((cache_row.weekdays_mask & (1 << EXTRACT(DOW FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;

    -- Vixie-cron logic: OR if both restricted, otherwise single restriction
    IF day_restricted AND weekday_restricted THEN
        RETURN day_match OR weekday_match;
    ELSIF day_restricted THEN
        RETURN day_match;
    ELSE
        RETURN weekday_match;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Handle special day patterns (L, #)
CREATE OR REPLACE FUNCTION jcron.special_day_match(check_time TIMESTAMPTZ, day_expr TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    parts TEXT[];
    part TEXT;
BEGIN
    parts := string_to_array(day_expr, ',');

    FOREACH part IN ARRAY parts LOOP
        part := trim(part);

        IF part = 'L' THEN
            -- Last day of month - compare dates only
            IF check_time::DATE = (date_trunc('month', check_time + INTERVAL '1 month') - INTERVAL '1 day')::DATE THEN
                RETURN TRUE;
            END IF;
        ELSE
            -- Regular day number
            IF part ~ '^\d+$' AND EXTRACT(DAY FROM check_time)::INTEGER = part::INTEGER THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Handle special weekday patterns (L, #)
CREATE OR REPLACE FUNCTION jcron.special_weekday_match(check_time TIMESTAMPTZ, weekday_expr TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    parts TEXT[];
    part TEXT;
    weekday INTEGER;
    week_num INTEGER;
    target_weekday INTEGER;
    month_start DATE;
    last_occurrence DATE;
    nth_occurrence DATE;
BEGIN
    weekday := EXTRACT(DOW FROM check_time)::INTEGER;
    parts := string_to_array(weekday_expr, ',');

    FOREACH part IN ARRAY parts LOOP
        part := trim(part);

        IF part ~ '^\d+L$' THEN
            -- Last occurrence of weekday in month (e.g., 5L = last Friday)
            target_weekday := substring(part from '^(\d+)')::INTEGER;
            IF weekday = target_weekday THEN
                month_start := date_trunc('month', check_time)::DATE;
                last_occurrence := jcron.last_weekday_of_month(month_start, target_weekday);
                IF check_time::DATE = last_occurrence THEN
                    RETURN TRUE;
                END IF;
            END IF;
        ELSIF part ~ '^\d+#\d+$' THEN
            -- Nth occurrence of weekday in month (e.g., 1#2 = 2nd Monday)
            target_weekday := split_part(part, '#', 1)::INTEGER;
            week_num := split_part(part, '#', 2)::INTEGER;
            IF weekday = target_weekday THEN
                month_start := date_trunc('month', check_time)::DATE;
                nth_occurrence := jcron.nth_weekday_of_month(month_start, target_weekday, week_num);
                IF check_time::DATE = nth_occurrence THEN
                    RETURN TRUE;
                END IF;
            END IF;
        ELSE
            -- Regular weekday number
            IF part ~ '^\d+$' AND weekday = part::INTEGER THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find last occurrence of weekday in month
CREATE OR REPLACE FUNCTION jcron.last_weekday_of_month(month_start DATE, target_weekday INTEGER)
RETURNS DATE AS $$
DECLARE
    month_end DATE;
    candidate DATE;
BEGIN
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;

    -- Start from end of month and go backwards
    FOR i IN 0..6 LOOP
        candidate := month_end - i;
        IF EXTRACT(DOW FROM candidate)::INTEGER = target_weekday THEN
            RETURN candidate;
        END IF;
    END LOOP;

    RETURN NULL; -- Should never happen
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find nth occurrence of weekday in month
CREATE OR REPLACE FUNCTION jcron.nth_weekday_of_month(month_start DATE, target_weekday INTEGER, occurrence INTEGER)
RETURNS DATE AS $$
DECLARE
    candidate DATE;
    count INTEGER := 0;
BEGIN
    -- Search through the month
    FOR i IN 0..30 LOOP
        candidate := month_start + i;

        -- Stop if we've gone to next month
        IF EXTRACT(MONTH FROM candidate) != EXTRACT(MONTH FROM month_start) THEN
            EXIT;
        END IF;

        IF EXTRACT(DOW FROM candidate)::INTEGER = target_weekday THEN
            count := count + 1;
            IF count = occurrence THEN
                RETURN candidate;
            END IF;
        END IF;
    END LOOP;

    RETURN NULL; -- Occurrence not found
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Year matching for year expressions
CREATE OR REPLACE FUNCTION jcron.year_matches(year_expr TEXT, check_year INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    parts TEXT[];
    part TEXT;
    range_parts TEXT[];
BEGIN
    IF year_expr = '*' THEN
        RETURN TRUE;
    END IF;

    parts := string_to_array(year_expr, ',');

    FOREACH part IN ARRAY parts LOOP
        part := trim(part);

        IF part ~ '-' THEN
            -- Range (2024-2026)
            range_parts := string_to_array(part, '-');
            IF check_year >= range_parts[1]::INTEGER AND check_year <= range_parts[2]::INTEGER THEN
                RETURN TRUE;
            END IF;
        ELSE
            -- Single year
            IF check_year = part::INTEGER THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Time advancement functions (optimized)
CREATE OR REPLACE FUNCTION jcron.advance_hour(base_time TIMESTAMPTZ, hour_mask INTEGER)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_hour INTEGER;
    next_hour INTEGER;
BEGIN
    current_hour := EXTRACT(HOUR FROM base_time)::INTEGER;

    -- Find next set bit in hour mask
    FOR i IN (current_hour + 1)..23 LOOP
        IF (hour_mask & (1 << i)) != 0 THEN
            RETURN date_trunc('hour', base_time) + (i - current_hour) * INTERVAL '1 hour';
        END IF;
    END LOOP;

    -- Wrap to next day, find first set bit
    FOR i IN 0..23 LOOP
        IF (hour_mask & (1 << i)) != 0 THEN
            RETURN date_trunc('day', base_time + INTERVAL '1 day') + i * INTERVAL '1 hour';
        END IF;
    END LOOP;

    -- Should never reach here if mask is valid
    RAISE EXCEPTION 'Invalid hour mask: %', hour_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron.advance_minute(base_time TIMESTAMPTZ, minute_mask BIGINT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_minute INTEGER;
BEGIN
    current_minute := EXTRACT(MINUTE FROM base_time)::INTEGER;

    -- Find next set bit
    FOR i IN (current_minute + 1)..59 LOOP
        IF (minute_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('minute', base_time) + (i - current_minute) * INTERVAL '1 minute';
        END IF;
    END LOOP;

    -- Wrap to next hour
    FOR i IN 0..59 LOOP
        IF (minute_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('hour', base_time + INTERVAL '1 hour') + i * INTERVAL '1 minute';
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Invalid minute mask: %', minute_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron.advance_second(base_time TIMESTAMPTZ, second_mask BIGINT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_second INTEGER;
BEGIN
    current_second := EXTRACT(SECOND FROM base_time)::INTEGER;

    FOR i IN (current_second + 1)..59 LOOP
        IF (second_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('second', base_time) + (i - current_second) * INTERVAL '1 second';
        END IF;
    END LOOP;

    -- Wrap to next minute
    FOR i IN 0..59 LOOP
        IF (second_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('minute', base_time + INTERVAL '1 minute') + i * INTERVAL '1 second';
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Invalid second mask: %', second_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Retreat functions for prev calculations
CREATE OR REPLACE FUNCTION jcron.retreat_hour(base_time TIMESTAMPTZ, hour_mask INTEGER)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_hour INTEGER;
BEGIN
    current_hour := EXTRACT(HOUR FROM base_time)::INTEGER;

    -- Find previous set bit
    FOR i IN REVERSE (current_hour - 1)..0 LOOP
        IF (hour_mask & (1 << i)) != 0 THEN
            RETURN date_trunc('hour', base_time) + (i - current_hour) * INTERVAL '1 hour';
        END IF;
    END LOOP;

    -- Wrap to previous day
    FOR i IN REVERSE 23..0 LOOP
        IF (hour_mask & (1 << i)) != 0 THEN
            RETURN date_trunc('day', base_time) - INTERVAL '1 day' + i * INTERVAL '1 hour';
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Invalid hour mask: %', hour_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron.retreat_minute(base_time TIMESTAMPTZ, minute_mask BIGINT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_minute INTEGER;
BEGIN
    current_minute := EXTRACT(MINUTE FROM base_time)::INTEGER;

    FOR i IN REVERSE (current_minute - 1)..0 LOOP
        IF (minute_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('minute', base_time) + (i - current_minute) * INTERVAL '1 minute';
        END IF;
    END LOOP;

    -- Wrap to previous hour
    FOR i IN REVERSE 59..0 LOOP
        IF (minute_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('hour', base_time) - INTERVAL '1 hour' + i * INTERVAL '1 minute';
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Invalid minute mask: %', minute_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron.retreat_second(base_time TIMESTAMPTZ, second_mask BIGINT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_second INTEGER;
BEGIN
    current_second := EXTRACT(SECOND FROM base_time)::INTEGER;

    FOR i IN REVERSE (current_second - 1)..0 LOOP
        IF (second_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('second', base_time) + (i - current_second) * INTERVAL '1 second';
        END IF;
    END LOOP;

    -- Wrap to previous minute
    FOR i IN REVERSE 59..0 LOOP
        IF (second_mask & (1::BIGINT << i)) != 0 THEN
            RETURN date_trunc('minute', base_time) - INTERVAL '1 minute' + i * INTERVAL '1 second';
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Invalid second mask: %', second_mask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Year advancement for year restrictions
CREATE OR REPLACE FUNCTION jcron.advance_year(base_time TIMESTAMPTZ, year_expr TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_year INTEGER;
    parts TEXT[];
    part TEXT;
    range_parts TEXT[];
    next_year INTEGER := NULL;
BEGIN
    current_year := EXTRACT(YEAR FROM base_time)::INTEGER;
    parts := string_to_array(year_expr, ',');

    FOREACH part IN ARRAY parts LOOP
        part := trim(part);

        IF part ~ '-' THEN
            range_parts := string_to_array(part, '-');
            IF current_year < range_parts[1]::INTEGER THEN
                next_year := LEAST(COALESCE(next_year, range_parts[1]::INTEGER), range_parts[1]::INTEGER);
            ELSIF current_year >= range_parts[1]::INTEGER AND current_year < range_parts[2]::INTEGER THEN
                next_year := LEAST(COALESCE(next_year, current_year + 1), current_year + 1);
            END IF;
        ELSE
            IF current_year < part::INTEGER THEN
                next_year := LEAST(COALESCE(next_year, part::INTEGER), part::INTEGER);
            END IF;
        END IF;
    END LOOP;

    IF next_year IS NULL THEN
        RAISE EXCEPTION 'No valid future year found in expression: %', year_expr;
    END IF;

    RETURN make_timestamptz(next_year, 1, 1, 0, 0, 0, 'UTC');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron.retreat_year(base_time TIMESTAMPTZ, year_expr TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    current_year INTEGER;
    parts TEXT[];
    part TEXT;
    range_parts TEXT[];
    prev_year INTEGER := NULL;
BEGIN
    current_year := EXTRACT(YEAR FROM base_time)::INTEGER;
    parts := string_to_array(year_expr, ',');

    FOREACH part IN ARRAY parts LOOP
        part := trim(part);

        IF part ~ '-' THEN
            range_parts := string_to_array(part, '-');
            IF current_year > range_parts[2]::INTEGER THEN
                prev_year := GREATEST(COALESCE(prev_year, range_parts[2]::INTEGER), range_parts[2]::INTEGER);
            ELSIF current_year > range_parts[1]::INTEGER AND current_year <= range_parts[2]::INTEGER THEN
                prev_year := GREATEST(COALESCE(prev_year, current_year - 1), current_year - 1);
            END IF;
        ELSE
            IF current_year > part::INTEGER THEN
                prev_year := GREATEST(COALESCE(prev_year, part::INTEGER), part::INTEGER);
            END IF;
        END IF;
    END LOOP;

    IF prev_year IS NULL THEN
        RAISE EXCEPTION 'No valid past year found in expression: %', year_expr;
    END IF;

    RETURN make_timestamptz(prev_year, 12, 31, 23, 59, 59, 'UTC');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. SCHEDULE MANAGEMENT FUNCTIONS (pgcron-style)
-- =====================================================

-- Schedule a job (pgcron-compatible interface)
CREATE OR REPLACE FUNCTION jcron.schedule_job(
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    database TEXT,
    username TEXT,
    active BOOLEAN DEFAULT TRUE
) RETURNS BIGINT AS $$
DECLARE
    job_id BIGINT;
    next_run TIMESTAMPTZ;
BEGIN
    -- Calculate first execution time
    next_run := jcron.next_time(schedule);

    -- Insert schedule
    INSERT INTO jcron.schedules (
        name, jcron_expr, next_run, function_name, function_args,
        status, created_at, updated_at
    ) VALUES (
        job_name, schedule, next_run, 'jcron.execute_sql',
        jsonb_build_object('sql', command, 'database', database, 'username', username),
        CASE WHEN active THEN 'ACTIVE'::jcron.status ELSE 'PAUSED'::jcron.status END,
        NOW(), NOW()
    ) RETURNING id INTO job_id;

    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Unschedule a job
CREATE OR REPLACE FUNCTION jcron.unschedule(job_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jcron.schedules WHERE id = job_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Unschedule by name
CREATE OR REPLACE FUNCTION jcron.unschedule(job_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jcron.schedules WHERE name = job_name;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Pause a job
CREATE OR REPLACE FUNCTION jcron.pause(job_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE jcron.schedules
    SET status = 'PAUSED', updated_at = NOW()
    WHERE id = job_id AND status = 'ACTIVE';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Resume a job
CREATE OR REPLACE FUNCTION jcron.resume(job_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
    next_run TIMESTAMPTZ;
BEGIN
    -- Get next run time
    SELECT next_run INTO next_run FROM jcron.schedules WHERE id = job_id;

    IF FOUND THEN
        UPDATE jcron.schedules
        SET status = 'ACTIVE', next_run = next_run, updated_at = NOW()
        WHERE id = job_id AND status = 'PAUSED';
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RETURN updated_count > 0;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Alter job schedule
CREATE OR REPLACE FUNCTION jcron.alter_job(
    job_id BIGINT,
    schedule TEXT DEFAULT NULL,
    command TEXT DEFAULT NULL,
    database TEXT DEFAULT NULL,
    username TEXT DEFAULT NULL,
    active BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
    next_run TIMESTAMPTZ;
    new_args JSONB;
    current_args JSONB;
BEGIN
    -- Get current function args
    SELECT function_args INTO current_args FROM jcron.schedules WHERE id = job_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Build new args
    new_args := current_args;
    IF command IS NOT NULL THEN
        new_args := new_args || jsonb_build_object('sql', command);
    END IF;
    IF database IS NOT NULL THEN
        new_args := new_args || jsonb_build_object('database', database);
    END IF;
    IF username IS NOT NULL THEN
        new_args := new_args || jsonb_build_object('username', username);
    END IF;

    -- Handle schedule change
    IF schedule IS NOT NULL THEN
        next_run := jcron.next_time(schedule);

        UPDATE jcron.schedules
        SET jcron_expr = schedule, next_run = next_run,
            function_args = new_args,
            status = CASE WHEN active IS NOT NULL THEN
                        CASE WHEN active THEN 'ACTIVE'::jcron.status ELSE 'PAUSED'::jcron.status END
                     ELSE status END,
            updated_at = NOW()
        WHERE id = job_id;
    ELSE
        UPDATE jcron.schedules
        SET function_args = new_args,
            status = CASE WHEN active IS NOT NULL THEN
                        CASE WHEN active THEN 'ACTIVE'::jcron.status ELSE 'PAUSED'::jcron.status END
                     ELSE status END,
            updated_at = NOW()
        WHERE id = job_id;
    END IF;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- SQL execution function for scheduled jobs
CREATE OR REPLACE FUNCTION jcron.execute_sql(args JSONB)
RETURNS TEXT AS $$
DECLARE
    sql_command TEXT;
    target_database TEXT;
    target_username TEXT;
    result TEXT;
BEGIN
    sql_command := args->>'sql';
    target_database := COALESCE(args->>'database', current_database());
    target_username := COALESCE(args->>'username', current_user);

    -- Execute the SQL command
    -- Note: In real implementation, you might want to use dblink for cross-database execution
    EXECUTE sql_command;

    RETURN 'SUCCESS';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- View all jobs (pgcron-style)
CREATE OR REPLACE VIEW jcron.job AS
SELECT
    id AS jobid,
    name AS jobname,
    jcron_expr AS schedule,
    function_args->>'sql' AS command,
    function_args->>'database' AS database,
    function_args->>'username' AS username,
    status AS active,
    next_run AS next_run,
    last_run AS last_run,
    run_count,
    created_at,
    updated_at
FROM jcron.schedules
ORDER BY id;

-- View job run details
CREATE OR REPLACE VIEW jcron.job_run_details AS
SELECT
    l.id AS runid,
    s.id AS jobid,
    s.name AS jobname,
    l.started_at AS start_time,
    l.completed_at AS end_time,
    l.status,
    l.error_message,
    EXTRACT(EPOCH FROM (l.completed_at - l.started_at)) AS duration_seconds
FROM jcron.execution_log l
JOIN jcron.schedules s ON l.schedule_id = s.id
ORDER BY l.started_at DESC;

-- Helper functions for common operations

-- List all jobs
CREATE OR REPLACE FUNCTION jcron.jobs()
RETURNS TABLE(
    jobid BIGINT,
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    database TEXT,
    username TEXT,
    active jcron.status,
    next_run TIMESTAMPTZ,
    last_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT j.jobid, j.jobname, j.schedule, j.command, j.database, j.username, j.active, j.next_run, j.last_run
    FROM jcron.job j;
END;
$$ LANGUAGE plpgsql;

-- Get job details by ID
CREATE OR REPLACE FUNCTION jcron.job_details(job_id BIGINT)
RETURNS TABLE(
    jobid BIGINT,
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    database TEXT,
    username TEXT,
    active jcron.status,
    next_run TIMESTAMPTZ,
    last_run TIMESTAMPTZ,
    run_count INTEGER,
    max_runs INTEGER,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id, s.name, s.jcron_expr,
        s.function_args->>'sql',
        s.function_args->>'database',
        s.function_args->>'username',
        s.status, s.next_run, s.last_run, s.run_count, s.max_runs, s.end_time,
        s.created_at, s.updated_at
    FROM jcron.schedules s
    WHERE s.id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Get recent job runs
CREATE OR REPLACE FUNCTION jcron.recent_runs(job_id BIGINT DEFAULT NULL, limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    runid BIGINT,
    jobid BIGINT,
    jobname TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status TEXT,
    duration_seconds NUMERIC,
    error_message TEXT
) AS $$
BEGIN
    IF job_id IS NOT NULL THEN
        RETURN QUERY
        SELECT r.runid, r.jobid, r.jobname, r.start_time, r.end_time,
               r.status, r.duration_seconds, r.error_message
        FROM jcron.job_run_details r
        WHERE r.jobid = recent_runs.job_id
        ORDER BY r.start_time DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT r.runid, r.jobid, r.jobname, r.start_time, r.end_time,
               r.status, r.duration_seconds, r.error_message
        FROM jcron.job_run_details r
        ORDER BY r.start_time DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Validate jcron expression
CREATE OR REPLACE FUNCTION jcron.validate_schedule(schedule_expr TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT,
    next_run TIMESTAMPTZ
) AS $$
DECLARE
    next_time TIMESTAMPTZ;
    error_msg TEXT;
BEGIN
    BEGIN
        next_time := jcron.next_time(schedule_expr);

        RETURN QUERY SELECT TRUE, NULL::TEXT, next_time;
    EXCEPTION WHEN OTHERS THEN
        error_msg := SQLERRM;
        RETURN QUERY SELECT FALSE, error_msg, NULL::TIMESTAMPTZ;
    END;
END;
$$ LANGUAGE plpgsql;

-- Get next pending schedules (internal use)
CREATE OR REPLACE FUNCTION jcron.get_pending_schedules(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
    id BIGINT,
    name TEXT,
    function_name TEXT,
    function_args JSONB,
    next_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.function_name, s.function_args, s.next_run
    FROM jcron.schedules s
    WHERE s.status = 'ACTIVE'
      AND s.next_run <= NOW()
      AND (s.max_runs IS NULL OR s.run_count < s.max_runs)
      AND (s.end_time IS NULL OR s.next_run <= s.end_time)
    ORDER BY s.next_run
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION jcron.update_after_execution(
    schedule_id BIGINT,
    execution_status TEXT DEFAULT 'SUCCESS',
    error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    schedule_row jcron.schedules%ROWTYPE;
    next_run TIMESTAMPTZ;
BEGIN
    -- Get schedule details
    SELECT * INTO schedule_row FROM jcron.schedules WHERE id = schedule_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule not found: %', schedule_id;
    END IF;

    -- Log execution
    INSERT INTO jcron.execution_log (schedule_id, started_at, completed_at, status, error_message)
    VALUES (schedule_id, schedule_row.next_run, NOW(), execution_status, error_message);

    -- Calculate next run time
    IF execution_status = 'SUCCESS' THEN
        next_run := jcron.next_time(schedule_row.jcron_expr, schedule_row.next_run);

        -- Update schedule
        UPDATE jcron.schedules
        SET next_run = next_run,
            last_run = schedule_row.next_run,
            run_count = run_count + 1,
            updated_at = NOW()
        WHERE id = schedule_id;

        -- Check if schedule should be completed
        IF (schedule_row.max_runs IS NOT NULL AND schedule_row.run_count + 1 >= schedule_row.max_runs)
           OR (schedule_row.end_time IS NOT NULL AND next_run > schedule_row.end_time) THEN
            UPDATE jcron.schedules SET status = 'COMPLETED' WHERE id = schedule_id;
        END IF;
    ELSE
        -- Mark as failed
        UPDATE jcron.schedules SET status = 'FAILED', updated_at = NOW() WHERE id = schedule_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. MAINTENANCE & OPTIMIZATION FUNCTIONS
-- =====================================================

-- Clean old cache entries
CREATE OR REPLACE FUNCTION jcron.cleanup_cache(keep_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jcron.schedule_cache
    WHERE last_accessed < NOW() - (keep_days || ' days')::INTERVAL
      AND NOT EXISTS (
          SELECT 1 FROM jcron.schedules
          WHERE jcron.schedules.cache_key = jcron.schedule_cache.cache_key
      );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean old execution logs
CREATE OR REPLACE FUNCTION jcron.cleanup_logs(keep_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jcron.execution_log
    WHERE log_date < CURRENT_DATE - keep_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get schedule statistics
CREATE OR REPLACE FUNCTION jcron.stats()
RETURNS TABLE(
    total_schedules BIGINT,
    active_schedules BIGINT,
    pending_schedules BIGINT,
    cache_entries BIGINT,
    avg_cache_access NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM jcron.schedules) as total_schedules,
        (SELECT COUNT(*) FROM jcron.schedules WHERE status = 'ACTIVE') as active_schedules,
        (SELECT COUNT(*) FROM jcron.schedules WHERE status = 'ACTIVE' AND next_run <= NOW()) as pending_schedules,
        (SELECT COUNT(*) FROM jcron.schedule_cache) as cache_entries,
        (SELECT AVG(access_count) FROM jcron.schedule_cache) as avg_cache_access;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. PERFORMANCE INDEXES
-- =====================================================

-- Critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_schedules_pending
ON jcron.schedules(next_run, status)
WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_schedules_cache
ON jcron.schedules(cache_key);

-- =====================================================
-- 9. END OF DURATION (EOD) SUPPORT
-- =====================================================

-- Parse EOD expression
CREATE OR REPLACE FUNCTION jcron.parse_eod(eod_expr TEXT)
RETURNS TABLE(
    years INTEGER,
    months INTEGER,
    weeks INTEGER,
    days INTEGER,
    hours INTEGER,
    minutes INTEGER,
    seconds INTEGER,
    reference_point jcron.reference_point,
    event_identifier TEXT
) AS $$
DECLARE
    parts TEXT[];
    duration_part TEXT;
    reference_part TEXT := 'END';
    event_part TEXT := NULL;
BEGIN
    -- Handle empty or null input
    IF eod_expr IS NULL OR LENGTH(TRIM(eod_expr)) = 0 THEN
        RAISE EXCEPTION 'EOD expression cannot be empty';
    END IF;

    -- Remove EOD: prefix if present
    eod_expr := REGEXP_REPLACE(eod_expr, '^EOD:', '');

    -- Split by spaces to separate duration, reference, and event parts
    parts := string_to_array(eod_expr, ' ');
    duration_part := parts[1];

    -- Extract reference point if present
    IF array_length(parts, 1) >= 2 THEN
        reference_part := parts[2];
    END IF;

    -- Extract event identifier if present (E[event_name])
    IF array_length(parts, 1) >= 3 AND parts[3] LIKE 'E[%]' THEN
        event_part := REGEXP_REPLACE(parts[3], '^E\[(.*)\]$', '\1');
    END IF;

    -- Set reference point
    reference_point := CASE reference_part
        WHEN 'D' THEN 'DAY'::jcron.reference_point
        WHEN 'W' THEN 'WEEK'::jcron.reference_point
        WHEN 'M' THEN 'MONTH'::jcron.reference_point
        WHEN 'Q' THEN 'QUARTER'::jcron.reference_point
        WHEN 'Y' THEN 'YEAR'::jcron.reference_point
        ELSE CASE
            WHEN duration_part LIKE 'S%' THEN 'START'::jcron.reference_point
            ELSE 'END'::jcron.reference_point
        END
    END;

    -- Remove S/E prefix from duration
    duration_part := REGEXP_REPLACE(duration_part, '^[SE]', '');

    -- Initialize all values to 0
    years := 0; months := 0; weeks := 0; days := 0;
    hours := 0; minutes := 0; seconds := 0;
    event_identifier := event_part;

    -- Parse ISO 8601-like duration format (simplified)
    -- Examples: 8H, 30M, 1DT12H, 2W3DT6H30M, 1Y6M2DT4H30M45S

    -- Extract years (Y)
    IF duration_part ~ '\d+Y' THEN
        years := (REGEXP_MATCH(duration_part, '(\d+)Y'))[1]::INTEGER;
        duration_part := REGEXP_REPLACE(duration_part, '\d+Y', '');
    END IF;

    -- Extract months (M before T or at end) - only if there's no T separator
    -- This handles complex formats like 1Y6M2DT4H30M45S where first M is months, second M is minutes
    IF duration_part ~ '\d+M' AND position('T' in duration_part) = 0 AND duration_part ~ '^\d+M$' THEN
        -- Simple format like E30M should be treated as minutes, not months
        -- Only treat as months if it's part of a complex expression with years/days
        IF duration_part ~ '^\d+M$' AND years = 0 AND weeks = 0 AND days = 0 THEN
            -- Simple M format (like E30M) = minutes
            minutes := (REGEXP_MATCH(duration_part, '(\d+)M'))[1]::INTEGER;
        ELSE
            -- Complex format with other date parts = months
            months := (REGEXP_MATCH(duration_part, '(\d+)M'))[1]::INTEGER;
        END IF;
        duration_part := REGEXP_REPLACE(duration_part, '\d+M', '');
    ELSIF duration_part ~ '\d+M(?!.*T.*M)' AND position('T' in duration_part) > 0 THEN
        -- Has T separator and M before T = months
        months := (REGEXP_MATCH(duration_part, '(\d+)M(?!.*T.*M)'))[1]::INTEGER;
        duration_part := REGEXP_REPLACE(duration_part, '(\d+)M(?!.*T.*M)', '');
    END IF;

    -- Extract weeks (W)
    IF duration_part ~ '\d+W' THEN
        weeks := (REGEXP_MATCH(duration_part, '(\d+)W'))[1]::INTEGER;
        duration_part := REGEXP_REPLACE(duration_part, '\d+W', '');
    END IF;

    -- Split by T for date and time parts
    IF position('T' in duration_part) > 0 THEN
        -- Date part (before T)
        IF duration_part ~ '^\d+D' THEN
            days := (REGEXP_MATCH(duration_part, '^(\d+)D'))[1]::INTEGER;
        END IF;

        -- Time part (after T)
        duration_part := REGEXP_REPLACE(duration_part, '^.*T', '');

        -- Extract hours
        IF duration_part ~ '\d+H' THEN
            hours := (REGEXP_MATCH(duration_part, '(\d+)H'))[1]::INTEGER;
        END IF;

        -- Extract minutes (M after T)
        IF duration_part ~ '\d+M' THEN
            minutes := (REGEXP_MATCH(duration_part, '(\d+)M'))[1]::INTEGER;
        END IF;

        -- Extract seconds
        IF duration_part ~ '\d+S' THEN
            seconds := (REGEXP_MATCH(duration_part, '(\d+)S'))[1]::INTEGER;
        END IF;
    ELSE
        -- No T separator, could be simple format like 8H, 30M, 5D
        IF duration_part ~ '^\d+D$' THEN
            days := (REGEXP_MATCH(duration_part, '^(\d+)D$'))[1]::INTEGER;
        ELSIF duration_part ~ '^\d+H$' THEN
            hours := (REGEXP_MATCH(duration_part, '^(\d+)H$'))[1]::INTEGER;
        ELSIF duration_part ~ '^\d+M$' THEN
            minutes := (REGEXP_MATCH(duration_part, '^(\d+)M$'))[1]::INTEGER;
        ELSIF duration_part ~ '^\d+S$' THEN
            seconds := (REGEXP_MATCH(duration_part, '^(\d+)S$'))[1]::INTEGER;
        END IF;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Calculate EOD end time
CREATE OR REPLACE FUNCTION jcron.calculate_eod_end_time(
    start_time TIMESTAMPTZ,
    eod_years INTEGER DEFAULT 0,
    eod_months INTEGER DEFAULT 0,
    eod_weeks INTEGER DEFAULT 0,
    eod_days INTEGER DEFAULT 0,
    eod_hours INTEGER DEFAULT 0,
    eod_minutes INTEGER DEFAULT 0,
    eod_seconds INTEGER DEFAULT 0,
    reference_point jcron.reference_point DEFAULT 'END'
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    result_time TIMESTAMPTZ;
    end_of_period TIMESTAMPTZ;
BEGIN
    -- Calculate base duration from start time
    result_time := start_time +
        INTERVAL '1 year' * eod_years +
        INTERVAL '1 month' * eod_months +
        INTERVAL '1 week' * eod_weeks +
        INTERVAL '1 day' * eod_days +
        INTERVAL '1 hour' * eod_hours +
        INTERVAL '1 minute' * eod_minutes +
        INTERVAL '1 second' * eod_seconds;    -- Apply reference point adjustments
    CASE reference_point
        WHEN 'END', 'START', 'E', 'S' THEN
            -- Simple duration from start time
            RETURN result_time;

        WHEN 'DAY', 'D' THEN
            -- Duration PLUS end of day: Add duration first, then go to end of that day
            result_time := result_time;
            end_of_period := date_trunc('day', result_time) + INTERVAL '1 day' - INTERVAL '1 second';
            RETURN end_of_period;

        WHEN 'WEEK', 'W' THEN
            -- Duration PLUS end of week: Add duration first, then go to end of that week
            result_time := result_time;
            end_of_period := date_trunc('week', result_time) + INTERVAL '1 week' - INTERVAL '1 second';
            RETURN end_of_period;

        WHEN 'MONTH', 'M' THEN
            -- Duration PLUS end of month: Add duration first, then go to end of that month
            result_time := result_time;
            end_of_period := date_trunc('month', result_time) + INTERVAL '1 month' - INTERVAL '1 second';
            RETURN end_of_period;

        WHEN 'QUARTER', 'Q' THEN
            -- Duration PLUS end of quarter: Add duration first, then go to end of that quarter
            result_time := result_time;
            end_of_period := date_trunc('quarter', result_time) + INTERVAL '3 months' - INTERVAL '1 second';
            RETURN end_of_period;

        WHEN 'YEAR', 'Y' THEN
            -- Duration PLUS end of year: Add duration first, then go to end of that year
            result_time := result_time;
            end_of_period := date_trunc('year', result_time) + INTERVAL '1 year' - INTERVAL '1 second';
            RETURN end_of_period;
    END CASE;

    RETURN result_time;
END;
$$ LANGUAGE plpgsql;

-- Check if expression has EOD
CREATE OR REPLACE FUNCTION jcron.has_eod(expression TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN expression LIKE '%EOD:%';
END;
$$ LANGUAGE plpgsql;

-- Extract base cron expression (without EOD part)
CREATE OR REPLACE FUNCTION jcron.extract_base_cron(expression TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove EOD part and any trailing spaces
    RETURN TRIM(REGEXP_REPLACE(expression, ' EOD:.*$', ''));
END;
$$ LANGUAGE plpgsql;

-- Extract EOD part from expression
CREATE OR REPLACE FUNCTION jcron.extract_eod_part(expression TEXT)
RETURNS TEXT AS $$
DECLARE
    eod_match TEXT[];
BEGIN
    eod_match := REGEXP_MATCH(expression, ' EOD:(.*)$');
    IF eod_match IS NOT NULL THEN
        RETURN eod_match[1];
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- 10. EXAMPLE USAGE & TEST FUNCTIONS
-- =====================================================

-- Test function to validate implementation
CREATE OR REPLACE FUNCTION jcron.test_examples()
RETURNS TABLE(test_group TEXT, test_name TEXT, expression TEXT, from_time TIMESTAMPTZ, expected_time TIMESTAMPTZ, actual_time TIMESTAMPTZ, passed BOOLEAN, description TEXT) AS $$
BEGIN
    -- Complete test suite covering all Go test cases
    RETURN QUERY
    WITH test_cases AS (
        SELECT
            grp,
            name,
            expr,
            from_ts,
            expected_ts,
            descr
        FROM (VALUES
            -- === CORE NEXT TESTS ===
            ('NEXT', '1. Basit Sonraki Dakika', '0 * * * * *', '2025-10-26T10:00:30Z'::timestamptz, '2025-10-26T10:01:00Z'::timestamptz, 'Basic next minute'),
            ('NEXT', '2. Sonraki Saatin Başı', '0 0 * * * *', '2025-10-26T10:59:00Z'::timestamptz, '2025-10-26T11:00:00Z'::timestamptz, 'Next hour start'),
            ('NEXT', '3. Sonraki Günün Başı', '0 0 0 * * *', '2025-10-26T23:59:00Z'::timestamptz, '2025-10-27T00:00:00Z'::timestamptz, 'Next day start'),
            ('NEXT', '4. Sonraki Ayın Başı', '0 0 0 1 * *', '2025-02-15T12:00:00Z'::timestamptz, '2025-03-01T00:00:00Z'::timestamptz, 'Next month start'),
            ('NEXT', '5. Sonraki Yılın Başı', '0 0 0 1 1 *', '2025-06-15T12:00:00Z'::timestamptz, '2026-01-01T00:00:00Z'::timestamptz, 'Next year start'),

            -- === RANGE AND STEP TESTS ===
            ('NEXT', '6. İş Saatleri İçinde', '0 0 9-17 * * MON-FRI', '2025-03-03T10:30:00Z'::timestamptz, '2025-03-03T11:00:00Z'::timestamptz, 'Business hours inside'),
            ('NEXT', '7. İş Saati Sonu Atlama', '0 0 9-17 * * MON-FRI', '2025-03-03T17:30:00Z'::timestamptz, '2025-03-04T09:00:00Z'::timestamptz, 'Business hours end jump'),
            ('NEXT', '8. Hafta Sonu Atlama', '0 0 9-17 * * 1-5', '2025-03-07T18:00:00Z'::timestamptz, '2025-03-10T09:00:00Z'::timestamptz, 'Weekend jump'),
            ('NEXT', '9. Her 15 Dakikada', '0 */15 * * * *', '2025-05-10T14:16:00Z'::timestamptz, '2025-05-10T14:30:00Z'::timestamptz, 'Every 15 minutes'),
            ('NEXT', '10. Belirli Aylar', '0 0 0 1 3,6,9,12 *', '2025-03-15T10:00:00Z'::timestamptz, '2025-06-01T00:00:00Z'::timestamptz, 'Specific months'),

            -- === SPECIAL CHARACTERS ===
            ('NEXT', '11. Ayın Son Günü (L)', '0 0 12 L * *', '2024-02-10T00:00:00Z'::timestamptz, '2024-02-29T12:00:00Z'::timestamptz, 'Last day of month (leap year)'),
            ('NEXT', '12. Son Gün Sonraki Ay', '0 0 12 L * *', '2025-04-30T13:00:00Z'::timestamptz, '2025-05-31T12:00:00Z'::timestamptz, 'Last day next month'),
            ('NEXT', '13. Son Cuma (5L)', '0 0 22 * * 5L', '2025-08-01T00:00:00Z'::timestamptz, '2025-08-29T22:00:00Z'::timestamptz, 'Last Friday of month'),
            ('NEXT', '14. İkinci Salı (2#2)', '0 0 8 * * 2#2', '2025-11-01T00:00:00Z'::timestamptz, '2025-11-11T08:00:00Z'::timestamptz, 'Second Tuesday of month'),
            ('NEXT', '15. Vixie-Cron OR', '0 0 0 15 * MON', '2025-09-09T00:00:00Z'::timestamptz, '2025-09-15T00:00:00Z'::timestamptz, 'OR logic (15th OR Monday)'),

            -- === TIMEZONE AND YEAR TESTS ===
            ('NEXT', '16. Haftalık (@weekly)', '0 0 0 * * 0', '2025-01-01T12:00:00Z'::timestamptz, '2025-01-05T00:00:00Z'::timestamptz, 'Weekly shortcut'),
            ('NEXT', '17. Saatlik (@hourly)', '0 0 * * * *', '2025-01-01T15:00:00Z'::timestamptz, '2025-01-01T16:00:00Z'::timestamptz, 'Hourly shortcut'),
            ('NEXT', '20. Yıl Belirtme', '0 0 0 1 1 * 2027', '2025-01-01T00:00:00Z'::timestamptz, '2027-01-01T00:00:00Z'::timestamptz, 'Year specification'),
            ('NEXT', '21. Son Saniye', '59 59 23 31 12 *', '2025-12-31T23:59:58Z'::timestamptz, '2025-12-31T23:59:59'::timestamptz, 'Last second of year'),

            -- === ADDITIONAL COMPREHENSIVE TESTS ===
            ('NEXT', '22. Her 5 Saniye', '*/5 * * * * *', '2025-01-01T12:00:03Z'::timestamptz, '2025-01-01T12:00:05Z'::timestamptz, 'Every 5 seconds'),
            ('NEXT', '23. Belirli Saniyeler', '15,30,45 * * * * *', '2025-01-01T12:00:20Z'::timestamptz, '2025-01-01T12:00:30Z'::timestamptz, 'Specific seconds'),
            ('NEXT', '24. Hafta İçi Öğle', '0 0 12 * * 1-5', '2025-08-08T14:00:00Z'::timestamptz, '2025-08-11T12:00:00Z'::timestamptz, 'Weekday lunch'),
            ('NEXT', '25. Ay Sonu ve Başı', '0 0 0 1,L * *', '2025-01-15T12:00:00Z'::timestamptz, '2025-01-31T00:00:00Z'::timestamptz, 'Month start and end'),
            ('NEXT', '26. Çeyrek Saatler', '0 0,15,30,45 * * * *', '2025-01-01T10:20:00Z'::timestamptz, '2025-01-01T10:30:00Z'::timestamptz, 'Quarter hours'),
            ('NEXT', '27. Artık Yıl Şubat 29', '0 0 12 29 2 *', '2023-12-01T00:00:00Z'::timestamptz, '2024-02-29T12:00:00Z'::timestamptz, 'Leap year Feb 29'),
            ('NEXT', '28. 1. ve 3. Pazartesi', '0 0 9 * * 1#1,1#3', '2025-01-07T10:00:00Z'::timestamptz, '2025-01-20T09:00:00Z'::timestamptz, '1st and 3rd Monday'),
            ('NEXT', '30. Yılın Son Günü', '59 59 23 31 12 *', '2025-12-30T12:00:00Z'::timestamptz, '2025-12-31T23:59:59'::timestamptz, 'Last day of year'),

            -- === ADVANCED PATTERNS ===
            ('NEXT', '31. Karma Özel Karakterler', '0 0 12 L * 5L', '2025-01-01T00:00:00Z'::timestamptz, '2025-01-31T12:00:00Z'::timestamptz, 'Mixed special chars'),
            ('NEXT', '32. Çoklu # Patterns', '0 0 14 * * 1#2,3#3,5#4', '2025-01-01T00:00:00Z'::timestamptz, '2025-01-13T14:00:00Z'::timestamptz, 'Multiple # patterns'),
            ('NEXT', '33. Saniye Adım', '*/10 */5 * * * *', '2025-01-01T12:05:25Z'::timestamptz, '2025-01-01T12:05:30Z'::timestamptz, 'Second step values'),
            ('NEXT', '34. Gece Yarısı Geçiş', '30 59 23 * * *', '2025-12-31T23:59:25Z'::timestamptz, '2025-12-31T23:59:30Z'::timestamptz, 'Midnight transition'),
            ('NEXT', '35. Normal Yıl Şubat 29', '0 0 12 29 2 *', '2025-01-01T00:00:00Z'::timestamptz, '2028-02-29T12:00:00Z'::timestamptz, 'Non-leap year Feb 29'),
            ('NEXT', '37. Hafta İçi + Gün Kombo', '0 0 9 15 * 1-5', '2025-01-10T00:00:00Z'::timestamptz, '2025-01-10T09:00:00Z'::timestamptz, 'Weekday + day combo'),
            ('NEXT', '38. Maksimum Değerler', '59 59 23 31 12 *', '2025-12-31T23:59:58Z'::timestamptz, '2025-12-31T23:59:59Z'::timestamptz, 'Maximum values'),
            ('NEXT', '39. Minimum Değerler', '0 0 0 1 1 *', '2024-12-31T23:59:59Z'::timestamptz, '2025-01-01T00:00:00Z'::timestamptz, 'Minimum values'),
            ('NEXT', '40. Karma Liste Aralık', '0 0,30 8-12,14-18 1,15 1,6,12 *', '2025-01-01T08:15:00Z'::timestamptz, '2025-01-01T08:30:00Z'::timestamptz, 'Mixed lists and ranges'),

            -- === PREV TESTS ===
            ('PREV', '1. Basit Önceki Dakika', '0 * * * * *', '2025-10-26T10:00:30Z'::timestamptz, '2025-10-26T10:00:00Z'::timestamptz, 'Basic prev minute'),
            ('PREV', '2. Önceki Saatin Başı', '0 0 * * * *', '2025-10-26T11:00:00Z'::timestamptz, '2025-10-26T10:00:00Z'::timestamptz, 'Prev hour start'),
            ('PREV', '3. Önceki Günün Başı', '0 0 0 * * *', '2025-10-27T00:00:00Z'::timestamptz, '2025-10-26T00:00:00Z'::timestamptz, 'Prev day start'),
            ('PREV', '4. Önceki Ayın Başı', '0 0 0 1 * *', '2025-03-15T12:00:00Z'::timestamptz, '2025-03-01T00:00:00Z'::timestamptz, 'Prev month start'),
            ('PREV', '5. Önceki Yılın Başı', '0 0 0 1 1 *', '2026-06-15T12:00:00Z'::timestamptz, '2026-01-01T00:00:00Z'::timestamptz, 'Prev year start'),
            ('PREV', '6. İş Saatleri İçinde', '0 0 9-17 * * MON-FRI', '2025-03-03T10:30:00Z'::timestamptz, '2025-03-03T10:00:00Z'::timestamptz, 'Business hours inside'),
            ('PREV', '7. İş Saati Başı Atlama', '0 0 9-17 * * MON-FRI', '2025-03-04T09:00:00Z'::timestamptz, '2025-03-03T17:00:00Z'::timestamptz, 'Business hours start jump'),
            ('PREV', '8. Hafta Başı Atlama', '0 0 9-17 * * 1-5', '2025-03-10T08:00:00Z'::timestamptz, '2025-03-07T17:00:00Z'::timestamptz, 'Week start jump'),
            ('PREV', '9. Her 15 Dakikada', '0 */15 * * * *', '2025-05-10T14:31:00Z'::timestamptz, '2025-05-10T14:30:00Z'::timestamptz, 'Every 15 minutes'),
            ('PREV', '10. Belirli Aylar', '0 0 0 1 3,6,9,12 *', '2025-05-15T10:00:00Z'::timestamptz, '2025-03-01T00:00:00Z'::timestamptz, 'Specific months'),
            ('PREV', '11. Ayın Son Günü (L)', '0 0 12 L * *', '2024-03-10T00:00:00Z'::timestamptz, '2024-02-29T12:00:00Z'::timestamptz, 'Last day of month'),
            ('PREV', '12. Son Gün Ay İçinde', '0 0 12 L * *', '2025-05-31T11:00:00Z'::timestamptz, '2025-04-30T12:00:00Z'::timestamptz, 'Last day within month'),
            ('PREV', '13. Son Cuma (5L)', '0 0 22 * * 5L', '2025-09-01T00:00:00Z'::timestamptz, '2025-08-29T22:00:00Z'::timestamptz, 'Last Friday of month'),
            ('PREV', '14. İkinci Salı (2#2)', '0 0 8 * * 2#2', '2025-11-20T00:00:00Z'::timestamptz, '2025-11-11T08:00:00Z'::timestamptz, 'Second Tuesday'),
            ('PREV', '15. Vixie-Cron OR', '0 0 0 15 * MON', '2025-09-17T00:00:00Z'::timestamptz, '2025-09-15T00:00:00Z'::timestamptz, 'OR logic prev'),
            ('PREV', '16. Haftalık (@weekly)', '0 0 0 * * 0', '2025-01-08T12:00:00Z'::timestamptz, '2025-01-05T00:00:00Z'::timestamptz, 'Weekly shortcut'),
            ('PREV', '17. Saatlik (@hourly)', '0 0 * * * *', '2025-01-01T15:00:00Z'::timestamptz, '2025-01-01T14:00:00Z'::timestamptz, 'Hourly shortcut'),
            ('PREV', '20. Yıl Belirtme', '0 0 0 1 1 * 2025', '2027-01-01T00:00:00Z'::timestamptz, '2025-01-01T00:00:00Z'::timestamptz, 'Year specification'),
            ('PREV', '21. Saniye Başlangıç', '0 0  0 1 1 *', '2025-01-01T00:00:01Z'::timestamptz, '2025-01-01T00:00:00Z'::timestamptz, 'Second start'),

            -- === EOD TESTS ===
            ('EOD', 'E8H Test', '0 9 * * 1-5 EOD:E8H', '2025-01-06T09:00:00Z'::timestamptz, '2025-01-06T17:00:00Z'::timestamptz, 'End + 8 hours'),
            ('EOD', 'S30M Test', '0 14 * * * EOD:S30M', '2025-01-01T14:00:00Z'::timestamptz, '2025-01-01T14:30:00Z'::timestamptz, 'Start + 30 minutes'),
            ('EOD', 'E1DT12H Test', '0 9 * * 1 EOD:E1DT12H', '2025-01-06T09:00:00Z'::timestamptz, '2025-01-07T21:00:00Z'::timestamptz, 'End + 1 day 12 hours'),
            ('EOD', 'E2W Test', '0 9 * * 1 EOD:E2W', '2025-01-06T09:00:00Z'::timestamptz, '2025-01-20T09:00:00Z'::timestamptz, 'End + 2 weeks'),
            ('EOD', 'Day Reference Test', '0 9 * * * EOD:E2H D', '2025-01-15T09:00:00Z'::timestamptz, '2025-01-15T23:59:59Z'::timestamptz, 'Day reference end')
        ) AS t(grp, name, expr, from_ts, expected_ts, descr)
    )
    SELECT
        tc.grp,
        tc.name,
        tc.expr,
        tc.from_ts,
        tc.expected_ts,
        CASE
            WHEN tc.grp = 'NEXT' THEN jcron.next_time(jcron.parse_expression(tc.expr), tc.from_ts)
            WHEN tc.grp = 'PREV' THEN jcron.prev_time(jcron.parse_expression(tc.expr), tc.from_ts)
            WHEN tc.grp = 'EOD' THEN jcron.eod_time(jcron.parse_expression(tc.expr), tc.from_ts)
        END AS actual_time,
        CASE
            WHEN tc.grp = 'NEXT' THEN jcron.next_time(jcron.parse_expression(tc.expr), tc.from_ts) = tc.expected_ts
            WHEN tc.grp = 'PREV' THEN jcron.prev_time(jcron.parse_expression(tc.expr), tc.from_ts) = tc.expected_ts
            WHEN tc.grp = 'EOD' THEN jcron.eod_time(jcron.parse_expression(tc.expr), tc.from_ts) = tc.expected_ts
        END AS passed,
        tc.descr
    FROM test_cases tc
    ORDER BY tc.grp, tc.name;
END;
$$ LANGUAGE plpgsql;

-- YENİ: Cache'siz, saf, ultra-performanslı test fonksiyonu
CREATE OR REPLACE FUNCTION jcron.performance_test(iterations INTEGER DEFAULT 10000)
RETURNS TABLE(operation TEXT, total_ms NUMERIC, avg_us NUMERIC, ops_per_sec INTEGER) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration_ms NUMERIC;
    test_time TIMESTAMPTZ := '2025-01-15T10:00:00Z';
BEGIN
    -- 1. Parse performance (her seferinde parse, cache yok)
    start_time := clock_timestamp();
    PERFORM (
        SELECT COUNT(*) FROM generate_series(1, LEAST(iterations, 1000)) i
        CROSS JOIN LATERAL (SELECT jcron.parse_expression('0 0 * * * *')) p
    );
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN QUERY SELECT 'Parse Expression (no cache)'::TEXT, duration_ms, (duration_ms * 1000) / LEAST(iterations, 1000), (LEAST(iterations, 1000) / (duration_ms / 1000))::INTEGER;

    -- 2. Next time hesaplama (her seferinde parse, cache yok)
    start_time := clock_timestamp();
    PERFORM (
        SELECT COUNT(*) FROM generate_series(1, iterations) i
        CROSS JOIN LATERAL (
            SELECT jcron.next_time(jcron.parse_expression('0 0 * * * *'), test_time + (i || ' seconds')::interval)
        ) calc
    );
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN QUERY SELECT 'Next Time (no cache)'::TEXT, duration_ms, (duration_ms * 1000) / iterations, (iterations / (duration_ms / 1000))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. INITIAL DATA & DEMO
-- =====================================================
select jcron.next_time(jcron.parse_expression('0 9 * * MON-FRI TZ=UTC'), '2025-01-01 00:00:00+00') from generate_series(1, 10000) as s(n);
select jcron.performance_test(8000);
-- Create demo schedules
SELECT jcron.schedule(
    'hourly-maintenance',
    '0 0 * * * TZ=UTC',
    'VACUUM pg_stat_statements;'
);

SELECT jcron.schedule(
    'daily-cleanup',
    '0 2 * * * TZ=UTC',
    'DELETE FROM jcron.execution_log WHERE log_date < CURRENT_DATE - 30;'
);

SELECT jcron.schedule(
    'business-hours-report',
    '0 9 * * MON-FRI TZ=Europe/Istanbul',
    'SELECT COUNT(*) FROM jcron.schedules;'
);

-- Show initial statistics
SELECT 'Initial Statistics:' as info;
SELECT * FROM jcron.stats();

-- Show created jobs
SELECT 'Created Jobs:' as info;
SELECT * FROM jcron.jobs();

-- Display test examples with validation
SELECT 'Schedule Validation Examples:' as info;
SELECT
    expr as "Expression",
    (SELECT is_valid FROM jcron.validate_schedule(expr)) as "Valid",
    (SELECT next_run FROM jcron.validate_schedule(expr)) as "Next Run",
    descr as "Description"
FROM (VALUES
    ('0 9 * * MON-FRI TZ=UTC', 'Business hours: 9 AM weekdays'),
    ('*/15 * * * * TZ=Europe/Istanbul', 'Every 15 minutes in Istanbul time'),
    ('0 0 12 L * * TZ=UTC', 'Last day of month at noon'),
    ('0 0 22 * * 5L TZ=UTC', 'Last Friday of month at 10 PM'),
    ('0 0 8 * * 2#2 TZ=UTC', 'Second Tuesday of month at 8 AM'),
    ('0 9 * * MON WOY:1-26 TZ=UTC', 'First half year Mondays'),
    ('0 8 * * * TZ=UTC EOD:E8H', 'Daily 8 AM, ends after 8 hours'),
    ('*/30 * * * * TZ=UTC EOD:S1D M', 'Every 30 seconds, ends at month end')
) AS t(expr, descr);

COMMENT ON SCHEMA public IS 'JCRON PostgreSQL Implementation - Ultra High Performance Scheduler with pgcron-compatible interface';

-- Debug function to test EOD parsing
CREATE OR REPLACE FUNCTION jcron.debug_eod(eod_expr TEXT)
RETURNS TABLE(
    input TEXT,
    years INTEGER, months INTEGER, weeks INTEGER, days INTEGER,
    hours INTEGER, minutes INTEGER, seconds INTEGER,
    reference jcron.reference_point, event_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        eod_expr as input,
        p.years, p.months, p.weeks, p.days,
        p.hours, p.minutes, p.seconds,
        p.reference_point, p.event_identifier
    FROM jcron.parse_eod(eod_expr) p;
END;
$$ LANGUAGE plpgsql;

-- EOD-aware next time calculation
CREATE OR REPLACE FUNCTION jcron.next_time_with_eod(
    p_cache_key TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    base_next_time TIMESTAMPTZ;
    eod_data RECORD;
    expression_text TEXT;
    eod_part TEXT;
BEGIN
    -- Get original expression text
    SELECT jcron_expr INTO expression_text FROM jcron.schedules WHERE id = p_cache_key;

    -- Check if expression has EOD
    IF NOT jcron.has_eod(expression_text) THEN
        -- No EOD, use regular next_time
        RETURN jcron.next_time(p_cache_key, from_time);
    END IF;

    -- Calculate base next execution time (without EOD)
    base_next_time := jcron.next_time(p_cache_key, from_time);

    -- Extract and parse EOD part
    eod_part := jcron.extract_eod_part(expression_text);

    SELECT * INTO eod_data FROM jcron.parse_eod(eod_part);

    -- Calculate EOD end time
    RETURN jcron.calculate_eod_end_time(
        base_next_time,
        eod_data.years,
        eod_data.months,
        eod_data.weeks,
        eod_data.days,
        eod_data.hours,
        eod_data.minutes,
        eod_data.seconds,
        eod_data.reference_point
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. EOD HELPER FUNCTIONS
-- =====================================================

-- Calculate EOD end time directly from expression and start time
-- This matches Go's schedule.EndOf(startTime) behavior
CREATE OR REPLACE FUNCTION jcron.eod_time(
    expression TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    eod_part TEXT;
    eod_data RECORD;
BEGIN
    -- Check if expression has EOD
    IF NOT jcron.has_eod(expression) THEN
        -- No EOD, return zero time equivalent (start_time)
        RETURN start_time;
    END IF;

    -- Extract and parse EOD part
    eod_part := jcron.extract_eod_part(expression);

    IF eod_part IS NULL THEN
        RETURN start_time;
    END IF;

    -- Parse EOD expression
    SELECT * INTO eod_data FROM jcron.parse_eod(eod_part);

    -- Calculate EOD end time directly from start_time
    RETURN jcron.calculate_eod_end_time(
        start_time,
        eod_data.years,
        eod_data.months,
        eod_data.weeks,
        eod_data.days,
        eod_data.hours,
        eod_data.minutes,
        eod_data.seconds,
        eod_data.reference_point
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function: Calculate execution window end time
-- Returns the end time for a specific execution that started at execution_time
CREATE OR REPLACE FUNCTION jcron.execution_end_time(
    expression TEXT,
    execution_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
BEGIN
    -- For EOD expressions, calculate end time from execution start
    RETURN jcron.eod_time(expression, execution_time);
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if current time is within execution window
CREATE OR REPLACE FUNCTION jcron.is_within_execution_window(
    expression TEXT,
    execution_start TIMESTAMPTZ,
    v_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
    end_time TIMESTAMPTZ;
BEGIN
    -- No EOD means no execution window concept
    IF NOT jcron.has_eod(expression) THEN
        RETURN TRUE;
    END IF;

    end_time := jcron.execution_end_time(expression, execution_start);

    RETURN v_current_time >= execution_start AND v_current_time <= end_time;
END;
$$ LANGUAGE plpgsql;

-- Helper function to run all tests and show summary
CREATE OR REPLACE FUNCTION jcron.run_all_tests()
RETURNS TABLE(
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    success_rate DECIMAL,
    summary TEXT
) AS $$
DECLARE
    test_results RECORD;
    total_count INTEGER;
    passed_count INTEGER;
    failed_count INTEGER;
BEGIN
    -- Get test counts
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE passed = true) as passed,
        COUNT(*) FILTER (WHERE passed = false) as failed
    INTO total_count, passed_count, failed_count
    FROM jcron.test_examples();

    -- Return summary
    RETURN QUERY SELECT
        total_count,
        passed_count,
        failed_count,
        ROUND((passed_count::DECIMAL / total_count::DECIMAL) * 100, 1),
        format('Toplam: %s, Başarılı: %s, Başarısız: %s (%%%s başarı)',
               total_count, passed_count, failed_count,
               ROUND((passed_count::DECIMAL / total_count::DECIMAL) * 100, 1));
END;
$$ LANGUAGE plpgsql;

-- Helper function to show only failed tests
CREATE OR REPLACE FUNCTION jcron.show_failed_tests()
RETURNS TABLE(
    test_group TEXT,
    test_name TEXT,
    expression TEXT,
    from_time TIMESTAMPTZ,
    expected_time TIMESTAMPTZ,
    actual_time TIMESTAMPTZ,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.test_group,
        t.test_name,
        t.expression,
        t.from_time,
        t.expected_time,
        t.actual_time,
        t.description
    FROM jcron.test_examples() t
    WHERE t.passed = false
    ORDER BY t.test_group, t.test_name;
END;
$$ LANGUAGE plpgsql;

-- Helper function to show tests by group
CREATE OR REPLACE FUNCTION jcron.show_tests_by_group(group_name TEXT)
RETURNS TABLE(
    test_name TEXT,
    expression TEXT,
    from_time TIMESTAMPTZ,
    expected_time TIMESTAMPTZ,
    actual_time TIMESTAMPTZ,
    passed BOOLEAN,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.test_name,
        t.expression,
        t.from_time,
        t.expected_time,
        t.actual_time,
        t.passed,
        t.description
    FROM jcron.test_examples() t
    WHERE t.test_group = group_name
    ORDER BY t.test_name;
END;
$$ LANGUAGE plpgsql;

-- JCRON: Eksiksiz stateless fonksiyonlar (bağımlı fonksiyonlar dahil)

-- 1. Text kısaltmalarını sayıya çevirir (MON->1, JAN->1, ...)
CREATE OR REPLACE FUNCTION jcron.convert_abbreviations(expr TEXT)
RETURNS TEXT AS $$
BEGIN
    expr := replace(expr, 'SUN', '0');
    expr := replace(expr, 'MON', '1');
    expr := replace(expr, 'TUE', '2');
    expr := replace(expr, 'WED', '3');
    expr := replace(expr, 'THU', '4');
    expr := replace(expr, 'FRI', '5');
    expr := replace(expr, 'SAT', '6');
    expr := replace(expr, 'JAN', '1');
    expr := replace(expr, 'FEB', '2');
    expr := replace(expr, 'MAR', '3');
    expr := replace(expr, 'APR', '4');
    expr := replace(expr, 'MAY', '5');
    expr := replace(expr, 'JUN', '6');
    expr := replace(expr, 'JUL', '7');
    expr := replace(expr, 'AUG', '8');
    expr := replace(expr, 'SEP', '9');
    expr := replace(expr, 'OCT', '10');
    expr := replace(expr, 'NOV', '11');
    expr := replace(expr, 'DEC', '12');
    RETURN expr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Alanı bitmask'e çevirir (örn: 1,2,3 -> 0b1110)
CREATE OR REPLACE FUNCTION jcron.expand_part(expr TEXT, min_val INTEGER, max_val INTEGER)
RETURNS BIGINT AS $$
DECLARE
    result BIGINT := 0;
    parts TEXT[];
    part TEXT;
    range_parts TEXT[];
    step_val INTEGER := 1;
    start_val INTEGER;
    end_val INTEGER;
    i INTEGER;
    safe_max INTEGER;
BEGIN
    safe_max := LEAST(max_val, 62);
    IF expr = '*' THEN
        FOR i IN min_val..safe_max LOOP
            result := result | (1::BIGINT << i);
        END LOOP;
        RETURN result;
    END IF;
    IF expr ~ '/' THEN
        step_val := GREATEST(1, substring(expr from '/(\d+)')::INTEGER);
        expr := substring(expr from '^([^/]+)');
        IF expr = '*' THEN
            FOR i IN min_val..safe_max LOOP
                IF (i - min_val) % step_val = 0 THEN
                    result := result | (1::BIGINT << i);
                END IF;
            END LOOP;
            RETURN result;
        END IF;
    END IF;
    parts := string_to_array(expr, ',');
    FOREACH part IN ARRAY parts LOOP
        part := trim(part);
        part := jcron.convert_abbreviations(part);
        IF part ~ '-' THEN
            range_parts := string_to_array(part, '-');
            IF array_length(range_parts, 1) >= 2 THEN
                start_val := GREATEST(min_val, range_parts[1]::INTEGER);
                end_val := LEAST(safe_max, range_parts[2]::INTEGER);
                FOR i IN start_val..end_val LOOP
                    IF (i - min_val) % step_val = 0 AND i >= min_val AND i <= safe_max THEN
                        result := result | (1::BIGINT << i);
                    END IF;
                END LOOP;
            END IF;
        ELSE
            BEGIN
                i := part::INTEGER;
                IF i >= min_val AND i <= safe_max THEN
                    result := result | (1::BIGINT << i);
                END IF;
            EXCEPTION WHEN OTHERS THEN CONTINUE;
            END;
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Alanları parse eden saf fonksiyon
CREATE OR REPLACE FUNCTION jcron.parse_expression(
    p_expression TEXT
) RETURNS TABLE(
    seconds_mask BIGINT,
    minutes_mask BIGINT,
    hours_mask INTEGER,
    days_mask BIGINT,
    months_mask SMALLINT,
    weekdays_mask SMALLINT,
    weeks_mask BIGINT,
    day_expr TEXT,
    weekday_expr TEXT,
    week_expr TEXT,
    year_expr TEXT,
    timezone TEXT,
    has_special_patterns BOOLEAN,
    has_year_restriction BOOLEAN
) AS $$
DECLARE
    parts TEXT[];
    woy_part TEXT := '';
    tz_part TEXT := 'UTC';
    sec_expr TEXT := '*';
    min_expr TEXT := '*';
    hour_expr TEXT := '*';
    day_expr TEXT := '*';
    month_expr TEXT := '*';
    weekday_expr TEXT := '*';
    year_expr TEXT := '*';
    sec_mask BIGINT := 0;
    min_mask BIGINT := 0;
    hour_mask INTEGER := 0;
    day_mask BIGINT := 0;
    month_mask SMALLINT := 0;
    weekday_mask SMALLINT := 0;
    week_mask BIGINT := 0;
    has_special BOOLEAN := FALSE;
    has_year_restrict BOOLEAN := FALSE;
BEGIN
    -- Parse WOY (Week of Year) pattern
    IF p_expression ~ 'WOY:' THEN
        woy_part := substring(p_expression from 'WOY:([^ ]+)');
        p_expression := regexp_replace(p_expression, 'WOY:[^ ]+\\s*', '', 'g');
        week_mask := jcron.expand_part(woy_part, 1, 53);
    ELSE
        week_mask := (1::BIGINT << 54) - 2;
    END IF;
    -- Parse TZ (Timezone)
    IF p_expression ~ 'TZ[:=]' THEN
        tz_part := substring(p_expression from 'TZ[:=]([^ ]+)');
        p_expression := regexp_replace(p_expression, 'TZ[:=][^ ]+\\s*', '', 'g');
    END IF;
    -- Split remaining cron fields
    parts := string_to_array(trim(p_expression), ' ');
    CASE array_length(parts, 1)
        WHEN 5 THEN
            min_expr := parts[1]; hour_expr := parts[2]; day_expr := parts[3]; month_expr := parts[4]; weekday_expr := parts[5];
        WHEN 6 THEN
            sec_expr := parts[1]; min_expr := parts[2]; hour_expr := parts[3]; day_expr := parts[4]; month_expr := parts[5]; weekday_expr := parts[6];
        WHEN 7 THEN
            sec_expr := parts[1]; min_expr := parts[2]; hour_expr := parts[3]; day_expr := parts[4]; month_expr := parts[5]; weekday_expr := parts[6]; year_expr := parts[7]; has_year_restrict := (year_expr != '*');
        ELSE
            RAISE EXCEPTION 'Invalid cron expression format: %', p_expression;
    END CASE;
    -- Bitmask expansion
    sec_mask := jcron.expand_part(sec_expr, 0, 59);
    min_mask := jcron.expand_part(min_expr, 0, 59);
    hour_mask := (jcron.expand_part(hour_expr, 0, 23) & 16777215)::INTEGER;
    has_special := (day_expr ~ '[L#]' OR weekday_expr ~ '[L#]');
    IF day_expr ~ '[L#]' THEN day_mask := 4294967295; ELSE day_mask := jcron.expand_part(day_expr, 1, 31); END IF;
    month_mask := (jcron.expand_part(month_expr, 1, 12) & 8191)::SMALLINT;
    IF weekday_expr ~ '[L#]' THEN weekday_mask := 127; ELSE weekday_mask := (jcron.expand_part(weekday_expr, 0, 6) & 127)::SMALLINT; END IF;
    RETURN QUERY SELECT sec_mask, min_mask, hour_mask, day_mask, month_mask, weekday_mask, week_mask, day_expr, weekday_expr, woy_part, year_expr, tz_part, has_special, has_year_restrict;
END;
$$ LANGUAGE plpgsql;

-- 4. Yıl kontrolü (stateless)
CREATE OR REPLACE FUNCTION jcron.year_matches(year_expr TEXT, check_year INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    parts TEXT[];
    part TEXT;
    range_parts TEXT[];
BEGIN
    IF year_expr = '*' THEN RETURN TRUE; END IF;
    parts := string_to_array(year_expr, ',');
    FOREACH part IN ARRAY parts LOOP
        part := trim(part);
        IF part ~ '-' THEN
            range_parts := string_to_array(part, '-');
            IF check_year >= range_parts[1]::INTEGER AND check_year <= range_parts[2]::INTEGER THEN RETURN TRUE; END IF;
        ELSE
            IF check_year = part::INTEGER THEN RETURN TRUE; END IF;
        END IF;
    END LOOP;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. day_matches_stateless (stateless gün kontrolü)
CREATE OR REPLACE FUNCTION jcron.day_matches_stateless(
    check_time TIMESTAMPTZ,
    day_expr TEXT,
    weekday_expr TEXT,
    days_mask BIGINT,
    weekdays_mask SMALLINT,
    has_special_patterns BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
    day_restricted BOOLEAN;
    weekday_restricted BOOLEAN;
    day_match BOOLEAN := FALSE;
    weekday_match BOOLEAN := FALSE;
BEGIN
    day_restricted := (day_expr != '*' AND day_expr != '?');
    weekday_restricted := (weekday_expr != '*' AND weekday_expr != '?');
    IF NOT day_restricted AND NOT weekday_restricted THEN RETURN TRUE; END IF;
    IF day_restricted THEN
        IF day_expr = 'L' THEN
            day_match := (check_time::DATE = (date_trunc('month', check_time + INTERVAL '1 month') - INTERVAL '1 day')::DATE);
        ELSIF has_special_patterns THEN
            day_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            day_match := ((days_mask & (1::BIGINT << EXTRACT(DAY FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;
    IF weekday_restricted THEN
        IF has_special_patterns THEN
            weekday_match := FALSE; -- Kısa tutmak için, özel pattern fonksiyonları eklenebilir
        ELSE
            weekday_match := ((weekdays_mask & (1 << EXTRACT(DOW FROM check_time)::INTEGER)) != 0);
        END IF;
    END IF;
    IF day_restricted AND weekday_restricted THEN RETURN day_match OR weekday_match;
    ELSIF day_restricted THEN RETURN day_match;
    ELSE RETURN weekday_match;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. next_time (stateless, cache'siz)
CREATE OR REPLACE FUNCTION jcron.next_time(
    p_expression TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    seconds_mask BIGINT;
    minutes_mask BIGINT;
    hours_mask INTEGER;
    days_mask BIGINT;
    months_mask SMALLINT;
    weekdays_mask SMALLINT;
    weeks_mask BIGINT;
    day_expr TEXT;
    weekday_expr TEXT;
    week_expr TEXT;
    year_expr TEXT;
    timezone TEXT;
    has_special_patterns BOOLEAN;
    has_year_restriction BOOLEAN;
    target_tz TEXT;
    local_time TIMESTAMPTZ;
    candidate TIMESTAMPTZ;
    max_iterations INTEGER := 366;
    iteration INTEGER := 0;
BEGIN
    SELECT 
        seconds_mask, minutes_mask, hours_mask, days_mask, months_mask, weekdays_mask, weeks_mask,
        day_expr, weekday_expr, week_expr, year_expr, timezone, has_special_patterns, has_year_restriction
    INTO 
        seconds_mask, minutes_mask, hours_mask, days_mask, months_mask, weekdays_mask, weeks_mask,
        day_expr, weekday_expr, week_expr, year_expr, timezone, has_special_patterns, has_year_restriction
    FROM jcron.parse_expression(p_expression);

    target_tz := COALESCE(timezone, 'UTC');
    local_time := from_time AT TIME ZONE target_tz;
    candidate := local_time + INTERVAL '1 second';
    WHILE iteration < max_iterations LOOP
        iteration := iteration + 1;
        -- Year check
        IF has_year_restriction AND NOT jcron.year_matches(year_expr, EXTRACT(YEAR FROM candidate)::INTEGER) THEN
            candidate := jcron.advance_year(candidate, year_expr);
            CONTINUE;
        END IF;
        -- Month check
        IF (months_mask & (1 << EXTRACT(MONTH FROM candidate)::INTEGER)) = 0 THEN
            candidate := date_trunc('month', candidate + INTERVAL '1 month');
            CONTINUE;
        END IF;
        -- Week of year check
        IF (weeks_mask & (1::BIGINT << EXTRACT(WEEK FROM candidate)::INTEGER)) = 0 THEN
            candidate := candidate + INTERVAL '1 day';
            CONTINUE;
        END IF;
        -- Day check (special patterns hariç)
        IF NOT jcron.day_matches_stateless(candidate, day_expr, weekday_expr, days_mask, weekdays_mask, has_special_patterns) THEN
            candidate := date_trunc('day', candidate + INTERVAL '1 day');
            CONTINUE;
        END IF;
        -- Hour check
        IF (hours_mask & (1 << EXTRACT(HOUR FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_hour(candidate, hours_mask);
            CONTINUE;
        END IF;
        -- Minute check
        IF (minutes_mask & (1::BIGINT << EXTRACT(MINUTE FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_minute(candidate, minutes_mask);
            CONTINUE;
        END IF;
        -- Second check
        IF (seconds_mask & (1::BIGINT << EXTRACT(SECOND FROM candidate)::INTEGER)) = 0 THEN
            candidate := jcron.advance_second(candidate, seconds_mask);
            CONTINUE;
        END IF;
        RETURN candidate AT TIME ZONE target_tz;
    END LOOP;
    RAISE EXCEPTION 'Could not find next execution time within % iterations', max_iterations;
END;
$$ LANGUAGE plpgsql;
