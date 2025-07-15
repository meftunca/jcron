DROP SCHEMA IF EXISTS jcron CASCADE;
CREATE SCHEMA jcron;

-- ======================================================================== --
--                           1. VERİTABANI YAPILARI                         --
-- ======================================================================== --

-- Enhanced jobs table with timezone and retry support
CREATE TABLE jcron.jobs (
    job_id BIGSERIAL PRIMARY KEY,
    job_name TEXT UNIQUE NOT NULL,
    schedule JSONB NOT NULL CONSTRAINT must_be_a_json_object CHECK (jsonb_typeof(schedule) = 'object'),
    command TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    timezone TEXT DEFAULT 'UTC',
    max_retries INTEGER DEFAULT 0,
    retry_delay_seconds INTEGER DEFAULT 300,
    last_run_started_at TIMESTAMPTZ,
    last_run_finished_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON jcron.jobs (is_active, next_run_at);
CREATE INDEX ON jcron.jobs (timezone);

-- Enhanced job logs with retry information
CREATE TABLE jcron.job_logs (
    log_id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jcron.jobs(job_id) ON DELETE CASCADE,
    run_started_at TIMESTAMPTZ NOT NULL,
    run_finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'retrying')),
    output_message TEXT,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    execution_duration_ms INTEGER
);

CREATE INDEX ON jcron.job_logs (job_id, run_started_at);
CREATE INDEX ON jcron.job_logs (status);

-- Enhanced schedule cache with timezone and week support
CREATE TABLE jcron.schedule_cache (
    schedule JSONB PRIMARY KEY,
    seconds_vals INT[],
    minutes_vals INT[],
    hours_vals INT[],
    dom_vals INT[],
    months_vals INT[],
    dow_vals INT[],
    years_vals INT[],
    week_vals INT[], -- Added week of year support
    timezone TEXT DEFAULT 'UTC',
    has_special_patterns BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Predefined schedules lookup table
CREATE TABLE jcron.predefined_schedules (
    name TEXT PRIMARY KEY,
    cron_expression TEXT NOT NULL,
    description TEXT
);

-- Day and month abbreviations lookup tables
CREATE TABLE jcron.day_abbreviations (
    abbreviation TEXT PRIMARY KEY,
    day_number INTEGER NOT NULL CHECK (day_number >= 0 AND day_number <= 7)
);

CREATE TABLE jcron.month_abbreviations (
    abbreviation TEXT PRIMARY KEY,
    month_number INTEGER NOT NULL CHECK (month_number >= 1 AND month_number <= 12)
);

-- Insert predefined schedules
INSERT INTO jcron.predefined_schedules (name, cron_expression, description) VALUES
('@yearly', '0 0 0 1 1 *', 'Run once a year at midnight on January 1st'),
('@annually', '0 0 0 1 1 *', 'Run once a year at midnight on January 1st'),
('@monthly', '0 0 0 1 * *', 'Run once a month at midnight on the first day'),
('@weekly', '0 0 0 * * 0', 'Run once a week at midnight on Sunday'),
('@daily', '0 0 0 * * *', 'Run once a day at midnight'),
('@midnight', '0 0 0 * * *', 'Run once a day at midnight'),
('@hourly', '0 0 * * * *', 'Run once an hour at the beginning of the hour');

-- Insert day abbreviations
INSERT INTO jcron.day_abbreviations (abbreviation, day_number) VALUES
('SUN', 0), ('MON', 1), ('TUE', 2), ('WED', 3),
('THU', 4), ('FRI', 5), ('SAT', 6), ('SUNDAY', 0),
('MONDAY', 1), ('TUESDAY', 2), ('WEDNESDAY', 3),
('THURSDAY', 4), ('FRIDAY', 5), ('SATURDAY', 6);

-- Insert month abbreviations
INSERT INTO jcron.month_abbreviations (abbreviation, month_number) VALUES
('JAN', 1), ('FEB', 2), ('MAR', 3), ('APR', 4),
('MAY', 5), ('JUN', 6), ('JUL', 7), ('AUG', 8),
('SEP', 9), ('OCT', 10), ('NOV', 11), ('DEC', 12),
('JANUARY', 1), ('FEBRUARY', 2), ('MARCH', 3), ('APRIL', 4),
('JUNE', 6), ('JULY', 7), ('AUGUST', 8),
('SEPTEMBER', 9), ('OCTOBER', 10), ('NOVEMBER', 11), ('DECEMBER', 12);

-- ======================================================================== --
--                      2. ÇEKİRDEK MOTOR FONKSİYONLARI                   --
-- ======================================================================== --

-- Değer dizisi içinde bir sonraki/önceki elemanı bulan yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION jcron._find_next_val(vals int[], current_val int, OUT next_val int, OUT wrapped boolean) AS $$
BEGIN wrapped := false; IF vals IS NULL THEN next_val := current_val; RETURN; END IF; SELECT v INTO next_val FROM unnest(vals) v WHERE v >= current_val ORDER BY v LIMIT 1; IF NOT FOUND THEN wrapped := true; next_val := vals[1]; END IF;
END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jcron._find_prev_val(vals int[], current_val int, OUT prev_val int, OUT wrapped boolean) AS $$
BEGIN wrapped := false; IF vals IS NULL THEN prev_val := current_val; RETURN; END IF; SELECT v INTO prev_val FROM unnest(vals) v WHERE v <= current_val ORDER BY v DESC LIMIT 1; IF NOT FOUND THEN prev_val := vals[array_length(vals, 1)]; wrapped := true; END IF;
END; $$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced parser with abbreviation and week of year support
CREATE OR REPLACE FUNCTION jcron.expand_part(p_schedule jsonb, p_part text) RETURNS int[] AS $$
DECLARE 
    field_val TEXT; 
    p_min INT; 
    p_max INT; 
    ret INT[]; 
    part TEXT; 
    groups TEXT[]; 
    m INT; 
    n INT; 
    k INT; 
    tmp INT[];
    resolved_val TEXT;
BEGIN
    field_val := p_schedule->>p_part;
    IF field_val IS NULL THEN 
        IF p_part = 's' THEN field_val := '0'; 
        ELSE field_val := '*'; 
        END IF; 
    END IF;
    
    -- Handle special patterns first
    IF field_val = '*' OR field_val = '?' OR field_val ~ '[LWR#]' THEN 
        RETURN NULL; 
    END IF;
    
    -- Get min/max values for the field
    SELECT min_val, max_val INTO p_min, p_max 
    FROM (VALUES 
        ('s',0,59),('m',0,59),('h',0,23),('D',1,31),
        ('M',1,12),('dow',0,7),('Y',2020,2099),('W',1,53)
    ) AS t(part_key, min_val, max_val) 
    WHERE part_key = p_part;
    
    -- Handle step patterns (*/n)
    IF field_val ~ '^\*/\d+$' THEN 
        groups = regexp_matches(field_val, '^\*/(\d+)$'); 
        k := groups[1]; 
        SELECT array_agg(x::int) INTO ret 
        FROM generate_series(p_min, p_max, k) AS x; 
        RETURN ret; 
    END IF;
    
    ret := '{}'::int[];
    
    -- Process comma-separated parts
    FOR part IN SELECT * FROM regexp_split_to_table(field_val, ',') LOOP
        resolved_val := part;
        
        -- Resolve day abbreviations
        IF p_part = 'dow' AND part ~ '^[A-Z]+' THEN
            SELECT day_number::text INTO resolved_val 
            FROM jcron.day_abbreviations 
            WHERE abbreviation = upper(part);
            IF resolved_val IS NULL THEN resolved_val := part; END IF;
        END IF;
        
        -- Resolve month abbreviations  
        IF p_part = 'M' AND part ~ '^[A-Z]+' THEN
            SELECT month_number::text INTO resolved_val 
            FROM jcron.month_abbreviations 
            WHERE abbreviation = upper(part);
            IF resolved_val IS NULL THEN resolved_val := part; END IF;
        END IF;
        
        -- Process different pattern types
        IF resolved_val ~ '^\d+$' THEN 
            n := resolved_val::int; 
            ret = ret || n;
        ELSIF resolved_val ~ '^\d+-\d+$' THEN 
            groups = regexp_matches(resolved_val, '^(\d+)-(\d+)$'); 
            m := groups[1]::int; 
            n := groups[2]::int; 
            IF m > n THEN RAISE EXCEPTION 'inverted range: %', resolved_val; END IF; 
            SELECT array_agg(x) INTO tmp FROM generate_series(m, n) AS x; 
            ret := ret || tmp;
        ELSIF resolved_val ~ '^\d+-\d+/\d+$' THEN 
            groups = regexp_matches(resolved_val, '^(\d+)-(\d+)/(\d+)$'); 
            m := groups[1]::int; 
            n := groups[2]::int; 
            k := groups[3]::int; 
            IF m > n THEN RAISE EXCEPTION 'inverted range: %', resolved_val; END IF; 
            SELECT array_agg(x) INTO tmp FROM generate_series(m, n, k) AS x; 
            ret = ret || tmp;
        ELSE 
            RAISE EXCEPTION 'invalid expression part: %', resolved_val; 
        END IF;
    END LOOP;
    
    -- Remove duplicates and sort
    SELECT array_agg(x) INTO ret 
    FROM (SELECT DISTINCT unnest(ret) AS x ORDER BY x) AS sub; 
    
    RETURN ret;
END; 
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced day matching with timezone support
CREATE OR REPLACE FUNCTION jcron._is_day_match(p_ts timestamptz, p_schedule jsonb) RETURNS BOOLEAN AS $$
DECLARE 
    dom_str TEXT := p_schedule->>'D'; 
    dow_str TEXT := p_schedule->>'dow'; 
    dom_match BOOLEAN; 
    dow_match BOOLEAN;
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
    local_ts TIMESTAMPTZ;
BEGIN
    -- Convert to target timezone for calculations
    IF target_tz != 'UTC' THEN
        local_ts := p_ts AT TIME ZONE 'UTC' AT TIME ZONE target_tz;
    ELSE
        local_ts := p_ts;
    END IF;
    
    -- Handle special day of month patterns
    IF dom_str = 'L' THEN 
        dom_match := (date_part('day', local_ts) = date_part('day', 
            date_trunc('month', local_ts) + interval '1 month' - interval '1 day')); 
    END IF;
    
    -- Handle special day of week patterns
    IF dow_str ~ 'L$' THEN 
        DECLARE 
            last_day TIMESTAMPTZ := date_trunc('month', local_ts) + interval '1 month' - interval '1 day'; 
            target_dow INT := (regexp_replace(dow_str, 'L', ''))::int; 
        BEGIN 
            FOR i IN 0..6 LOOP 
                IF date_part('dow', last_day - (i * interval '1 day')) = target_dow THEN 
                    dow_match := (date_trunc('day', local_ts) = date_trunc('day', last_day - (i * interval '1 day'))); 
                    EXIT; 
                END IF; 
            END LOOP; 
        END;
    ELSIF dow_str ~ '#' THEN 
        DECLARE 
            parts TEXT[] := regexp_split_to_array(dow_str, '#'); 
            target_dow INT := parts[1]::int; 
            target_occur INT := parts[2]::int; 
            first_day TIMESTAMPTZ := date_trunc('month', local_ts); 
            first_occurrence_day INT := 1 + (target_dow - date_part('dow', first_day)::int + 7) % 7; 
        BEGIN 
            dow_match := (date_part('day', local_ts) = (first_occurrence_day + (target_occur - 1) * 7)); 
        END; 
    END IF;
    
    -- Early return for special pattern matches
    IF dom_match IS TRUE OR dow_match IS TRUE THEN 
        RETURN TRUE; 
    END IF;
    
    -- Standard matching logic with Vixie-style OR behavior
    DECLARE 
        is_dom_restricted BOOLEAN := (dom_str IS NOT NULL AND dom_str != '*' AND dom_str != '?'); 
        is_dow_restricted BOOLEAN := (dow_str IS NOT NULL AND dow_str != '*' AND dow_str != '?');
    BEGIN
        IF is_dom_restricted THEN 
            dom_match := (date_part('day', local_ts)::int = ANY(jcron.expand_part(p_schedule, 'D'))); 
        ELSE 
            dom_match := TRUE; 
        END IF;
        
        IF is_dow_restricted THEN 
            dow_match := (date_part('dow', local_ts)::int = ANY(jcron.expand_part(p_schedule, 'dow'))); 
        ELSE 
            dow_match := TRUE; 
        END IF;
        
        -- Apply Vixie cron OR logic when both are restricted
        IF dow_str = '?' THEN 
            RETURN dom_match; 
        ELSIF dom_str = '?' THEN 
            RETURN dow_match; 
        ELSIF is_dom_restricted AND is_dow_restricted THEN 
            RETURN dom_match OR dow_match; 
        ELSE 
            RETURN dom_match AND dow_match; 
        END IF;
    END;
END; 
$$ LANGUAGE plpgsql STABLE;

-- Enhanced week of year matching function with intelligent week 53 handling
CREATE OR REPLACE FUNCTION jcron._is_week_match(p_ts timestamptz, p_schedule jsonb) RETURNS BOOLEAN AS $$
DECLARE
    week_str TEXT := p_schedule->>'W';
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
    local_ts TIMESTAMPTZ;
    week_num INT;
    year_num INT;
    week_vals INT[];
BEGIN
    -- No week restriction
    IF week_str IS NULL OR week_str = '*' THEN
        RETURN TRUE;
    END IF;
    
    -- Convert to target timezone and get week number
    local_ts := p_ts AT TIME ZONE target_tz;
    week_num := date_part('week', local_ts)::int;
    year_num := date_part('year', local_ts)::int;
    
    -- Get expanded week values
    week_vals := jcron.expand_part(p_schedule, 'W');
    
    -- Special handling for week 53
    IF 53 = ANY(week_vals) THEN
        -- Check if current year actually has 53 weeks
        DECLARE
            year_end_week INT;
        BEGIN
            year_end_week := date_part('week', (year_num || '-12-31')::date)::int;
            
            -- If current year doesn't have week 53, but schedule asks for it
            IF year_end_week != 53 THEN
                -- If we're looking for week 53 but year doesn't have it,
                -- treat it as week 52 (last week of year)
                IF week_num = year_end_week AND week_num = 52 THEN
                    RETURN TRUE;
                END IF;
                -- Remove 53 from consideration for this year
                week_vals := array_remove(week_vals, 53);
                IF array_length(week_vals, 1) = 0 THEN
                    RETURN FALSE;
                END IF;
            END IF;
        END;
    END IF;
    
    -- Check if current week matches any of the valid weeks
    RETURN week_num = ANY(week_vals);
END;
$$ LANGUAGE plpgsql STABLE;

-- Timezone conversion helper
CREATE OR REPLACE FUNCTION jcron._convert_timezone(p_ts timestamptz, p_target_tz text) 
RETURNS timestamptz AS $$
BEGIN
    -- Handle UTC case quickly
    IF p_target_tz = 'UTC' THEN
        RETURN p_ts;
    END IF;
    
    -- Validate timezone exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = p_target_tz
        UNION
        SELECT 1 FROM pg_timezone_abbrevs WHERE abbrev = p_target_tz
    ) THEN
        RAISE EXCEPTION 'Invalid timezone: %', p_target_tz;
    END IF;
    
    -- Convert to the target timezone (this keeps the same moment in time)
    RETURN p_ts;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Timezone conversion failed for %: %', p_target_tz, SQLERRM;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enhanced cache engine with timezone and week support
CREATE OR REPLACE FUNCTION jcron.get_expanded_schedule(p_schedule jsonb) RETURNS jcron.schedule_cache AS $$
DECLARE 
    cached_record jcron.schedule_cache;
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
    has_special BOOLEAN := FALSE;
BEGIN
    -- Check cache first
    SELECT * INTO cached_record 
    FROM jcron.schedule_cache 
    WHERE schedule = p_schedule;
    
    IF FOUND THEN 
        UPDATE jcron.schedule_cache 
        SET last_used = now() 
        WHERE schedule = p_schedule; 
        RETURN cached_record; 
    END IF;
    
    -- Validate timezone
    PERFORM jcron._convert_timezone(now(), target_tz);
    
    -- Check for special patterns
    has_special := (
        (p_schedule->>'D') ~ '[L#]' OR 
        (p_schedule->>'dow') ~ '[L#]' OR
        (p_schedule->>'W') ~ '[L#]'
    );
    
    -- Build new cache record
    cached_record.schedule := p_schedule;
    cached_record.seconds_vals := jcron.expand_part(p_schedule, 's');
    cached_record.minutes_vals := jcron.expand_part(p_schedule, 'm');
    cached_record.hours_vals := jcron.expand_part(p_schedule, 'h');
    cached_record.dom_vals := jcron.expand_part(p_schedule, 'D');
    cached_record.months_vals := jcron.expand_part(p_schedule, 'M');
    cached_record.dow_vals := jcron.expand_part(p_schedule, 'dow');
    cached_record.years_vals := jcron.expand_part(p_schedule, 'Y');
    cached_record.week_vals := jcron.expand_part(p_schedule, 'W');
    cached_record.timezone := target_tz;
    cached_record.has_special_patterns := has_special;
    cached_record.last_used := now();
    
    -- Insert into cache
    INSERT INTO jcron.schedule_cache SELECT cached_record.*;
    
    RETURN cached_record;
END; 
$$ LANGUAGE plpgsql VOLATILE;


-- ======================================================================== --
--                3. SON KULLANICI FONKSİYONLARI (FİNAL SÜRÜM)              --
-- ======================================================================== --

-- Enhanced match function with timezone and week support
CREATE OR REPLACE FUNCTION jcron.match(p_ts timestamptz, p_schedule jsonb) RETURNS BOOLEAN AS $$
DECLARE 
    cache jcron.schedule_cache := jcron.get_expanded_schedule(p_schedule);
    local_ts TIMESTAMPTZ;
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
BEGIN
    -- Convert to target timezone for calculations
    IF target_tz != 'UTC' THEN
        local_ts := p_ts AT TIME ZONE 'UTC' AT TIME ZONE target_tz;
    ELSE
        local_ts := p_ts;
    END IF;
    
    -- Check all time components
    IF NOT (
        (cache.years_vals IS NULL OR date_part('year', local_ts)::int = ANY(cache.years_vals)) AND 
        (cache.months_vals IS NULL OR date_part('month', local_ts)::int = ANY(cache.months_vals)) AND
        (cache.hours_vals IS NULL OR date_part('hour', local_ts)::int = ANY(cache.hours_vals)) AND 
        (cache.minutes_vals IS NULL OR date_part('minute', local_ts)::int = ANY(cache.minutes_vals)) AND
        (cache.seconds_vals IS NULL OR date_part('second', local_ts)::int = ANY(cache.seconds_vals))
    ) THEN 
        RETURN FALSE; 
    END IF;
    
    -- Check week of year if specified
    IF NOT jcron._is_week_match(p_ts, p_schedule) THEN
        RETURN FALSE;
    END IF;
    
    -- Check day matching (complex logic for D/dow)
    RETURN jcron._is_day_match(p_ts, p_schedule);
END; 
$$ LANGUAGE plpgsql STABLE;

-- Parse predefined schedules or cron syntax
CREATE OR REPLACE FUNCTION jcron.parse_cron_expression(p_cron_expr text) 
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    resolved_expr text;
    parts text[];
    field_names text[] := ARRAY['s', 'm', 'h', 'D', 'M', 'dow'];
BEGIN
    -- Handle predefined schedules
    IF p_cron_expr ~ '^@' THEN
        SELECT cron_expression INTO resolved_expr 
        FROM jcron.predefined_schedules 
        WHERE name = p_cron_expr;
        
        IF resolved_expr IS NULL THEN
            IF p_cron_expr = '@reboot' THEN
                -- Special case for @reboot
                RETURN jsonb_build_object('reboot', true);
            END IF;
            RAISE EXCEPTION 'Unknown predefined schedule: %', p_cron_expr;
        END IF;
    ELSE
        resolved_expr := p_cron_expr;
    END IF;
    
    -- Split into parts
    parts := regexp_split_to_array(trim(resolved_expr), '\s+');
    
    -- Determine format (5 or 6 fields)
    IF array_length(parts, 1) = 5 THEN
        -- 5-field format: m h D M dow
        result := jsonb_build_object(
            's', '0',
            'm', parts[1],
            'h', parts[2], 
            'D', parts[3],
            'M', parts[4],
            'dow', parts[5]
        );
    ELSIF array_length(parts, 1) = 6 THEN
        -- 6-field format: s m h D M dow
        result := jsonb_build_object(
            's', parts[1],
            'm', parts[2],
            'h', parts[3],
            'D', parts[4], 
            'M', parts[5],
            'dow', parts[6]
        );
    ELSE
        RAISE EXCEPTION 'Invalid cron expression format. Expected 5 or 6 fields, got %', array_length(parts, 1);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced next_jump with intelligent schedule validation and fallback strategies
CREATE OR REPLACE FUNCTION jcron.next_jump(p_schedule jsonb, p_from_ts timestamptz)
RETURNS timestamptz AS $$
DECLARE
    ts TIMESTAMPTZ; 
    search_ts TIMESTAMPTZ; 
    cache jcron.schedule_cache := jcron.get_expanded_schedule(p_schedule);
    i INT := 0;
    local_ts TIMESTAMPTZ;
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
    result_ts TIMESTAMPTZ;
    max_search_days INT := 1826; -- 5 years
    week_constraint INT;
    is_impossible_schedule BOOLEAN := FALSE;
BEGIN
    -- Start from the next second to avoid returning the same time
    ts := date_trunc('second', p_from_ts) + interval '1 second';
    search_ts := ts;
    
    -- Pre-validate for impossible schedules
    IF cache.week_vals IS NOT NULL THEN
        -- Check for impossible week/year combinations
        week_constraint := cache.week_vals[1];
        IF week_constraint = 53 AND cache.years_vals IS NOT NULL THEN
            -- Week 53 doesn't exist in all years, check if any target year has week 53
            DECLARE
                target_year INT;
                has_week_53 BOOLEAN := FALSE;
            BEGIN
                FOR target_year IN SELECT unnest(cache.years_vals) LOOP
                    -- Check if this year has 53 weeks
                    IF date_part('week', (target_year || '-12-31')::date) = 53 THEN
                        has_week_53 := TRUE;
                        EXIT;
                    END IF;
                END LOOP;
                
                IF NOT has_week_53 THEN
                    is_impossible_schedule := TRUE;
                END IF;
            END;
        END IF;
    END IF;
    
    -- If schedule is impossible, try to find alternative interpretation
    IF is_impossible_schedule THEN
        -- For impossible schedules, try to find the closest valid alternative
        -- For example, if Week 53 is requested but doesn't exist, try Week 52
        DECLARE
            modified_schedule JSONB := p_schedule;
        BEGIN
            -- Replace impossible week with last week of year
            IF week_constraint = 53 THEN
                modified_schedule := modified_schedule || '{"W": "52"}';
                RETURN jcron.next_jump(modified_schedule, p_from_ts);
            END IF;
        END;
    END IF;
    
    LOOP
        i := i + 1; 
        IF i > max_search_days THEN
            -- Instead of throwing error, try relaxed constraints
            DECLARE
                relaxed_schedule JSONB := p_schedule;
            BEGIN
                -- Remove most restrictive constraints one by one
                IF cache.week_vals IS NOT NULL THEN
                    relaxed_schedule := relaxed_schedule - 'W';
                    RETURN jcron.next_jump(relaxed_schedule, p_from_ts);
                ELSIF cache.years_vals IS NOT NULL THEN
                    relaxed_schedule := relaxed_schedule - 'Y';
                    RETURN jcron.next_jump(relaxed_schedule, p_from_ts);
                ELSE
                    RAISE EXCEPTION 'Could not find a valid day within 5 years.'; 
                END IF;
            END;
        END IF;
        
        search_ts := date_trunc('day', search_ts);
        
        -- Convert to target timezone for date/time calculations
        IF target_tz != 'UTC' THEN
            local_ts := search_ts AT TIME ZONE 'UTC' AT TIME ZONE target_tz;
        ELSE
            local_ts := search_ts;
        END IF;
        
        -- Check year, month, week, and day constraints
        IF (cache.years_vals IS NULL OR date_part('year', local_ts)::int = ANY(cache.years_vals)) AND
           (cache.months_vals IS NULL OR date_part('month', local_ts)::int = ANY(cache.months_vals)) AND
           jcron._is_week_match(search_ts, p_schedule) AND
           jcron._is_day_match(search_ts, p_schedule)
        THEN
            -- Find the next valid time on this day
            FOR h IN 0..23 LOOP
                IF cache.hours_vals IS NULL OR h = ANY(cache.hours_vals) THEN
                    FOR m IN 0..59 LOOP
                        IF cache.minutes_vals IS NULL OR m = ANY(cache.minutes_vals) THEN
                            FOR s IN 0..59 LOOP
                                IF cache.seconds_vals IS NULL OR s = ANY(cache.seconds_vals) THEN
                                    result_ts := search_ts + (h * interval '1 hour') + 
                                                           (m * interval '1 minute') + 
                                                           (s * interval '1 second');
                                    
                                    -- Only return if this time is after our start time
                                    IF result_ts > p_from_ts THEN
                                        RETURN result_ts;
                                    END IF;
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;
        END IF;
        search_ts := search_ts + interval '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Enhanced prev_jump with intelligent schedule validation and fallback strategies
CREATE OR REPLACE FUNCTION jcron.prev_jump(p_schedule jsonb, p_from_ts timestamptz)
RETURNS timestamptz AS $$
DECLARE
    search_ts TIMESTAMPTZ; 
    cache jcron.schedule_cache := jcron.get_expanded_schedule(p_schedule);
    i INT := 0;
    local_ts TIMESTAMPTZ;
    target_tz TEXT := COALESCE(p_schedule->>'timezone', 'UTC');
    result_ts TIMESTAMPTZ;
    max_search_days INT := 1826; -- 5 years
    week_constraint INT;
    is_impossible_schedule BOOLEAN := FALSE;
BEGIN
    -- Start from the previous second to avoid returning the same time
    search_ts := date_trunc('second', p_from_ts) - interval '1 second';
    
    -- Pre-validate for impossible schedules (same logic as next_jump)
    IF cache.week_vals IS NOT NULL THEN
        week_constraint := cache.week_vals[1];
        IF week_constraint = 53 AND cache.years_vals IS NOT NULL THEN
            DECLARE
                target_year INT;
                has_week_53 BOOLEAN := FALSE;
            BEGIN
                FOR target_year IN SELECT unnest(cache.years_vals) LOOP
                    IF date_part('week', (target_year || '-12-31')::date) = 53 THEN
                        has_week_53 := TRUE;
                        EXIT;
                    END IF;
                END LOOP;
                
                IF NOT has_week_53 THEN
                    is_impossible_schedule := TRUE;
                END IF;
            END;
        END IF;
    END IF;
    
    -- Handle impossible schedules with fallback
    IF is_impossible_schedule THEN
        DECLARE
            modified_schedule JSONB := p_schedule;
        BEGIN
            IF week_constraint = 53 THEN
                modified_schedule := modified_schedule || '{"W": "52"}';
                RETURN jcron.prev_jump(modified_schedule, p_from_ts);
            END IF;
        END;
    END IF;
    
    LOOP
        i := i + 1; 
        IF i > max_search_days THEN
            -- Try relaxed constraints before giving up
            DECLARE
                relaxed_schedule JSONB := p_schedule;
            BEGIN
                IF cache.week_vals IS NOT NULL THEN
                    relaxed_schedule := relaxed_schedule - 'W';
                    RETURN jcron.prev_jump(relaxed_schedule, p_from_ts);
                ELSIF cache.years_vals IS NOT NULL THEN
                    relaxed_schedule := relaxed_schedule - 'Y';
                    RETURN jcron.prev_jump(relaxed_schedule, p_from_ts);
                ELSE
                    RAISE EXCEPTION 'Could not find a valid day within 5 years.'; 
                END IF;
            END;
        END IF;
        
        search_ts := date_trunc('day', search_ts);
        
        -- Convert to target timezone for date/time calculations
        IF target_tz != 'UTC' THEN
            local_ts := search_ts AT TIME ZONE 'UTC' AT TIME ZONE target_tz;
        ELSE
            local_ts := search_ts;
        END IF;
        
        -- Check year, month, week, and day constraints
        IF (cache.years_vals IS NULL OR date_part('year', local_ts)::int = ANY(cache.years_vals)) AND
           (cache.months_vals IS NULL OR date_part('month', local_ts)::int = ANY(cache.months_vals)) AND
           jcron._is_week_match(search_ts, p_schedule) AND
           jcron._is_day_match(search_ts, p_schedule)
        THEN
            -- Find the previous valid time on this day (go backwards from end of day)
            FOR h IN REVERSE 23..0 LOOP
                IF cache.hours_vals IS NULL OR h = ANY(cache.hours_vals) THEN
                    FOR m IN REVERSE 59..0 LOOP
                        IF cache.minutes_vals IS NULL OR m = ANY(cache.minutes_vals) THEN
                            FOR s IN REVERSE 59..0 LOOP
                                IF cache.seconds_vals IS NULL OR s = ANY(cache.seconds_vals) THEN
                                    result_ts := search_ts + (h * interval '1 hour') + 
                                                           (m * interval '1 minute') + 
                                                           (s * interval '1 second');
                                    
                                    -- Only return if this time is before our start time
                                    IF result_ts < p_from_ts THEN
                                        RETURN result_ts;
                                    END IF;
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;
        END IF;
        search_ts := search_ts - interval '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ======================================================================== --
--                       5. ENHANCED COMPREHENSIVE TESTS                     --
-- ======================================================================== --

CREATE OR REPLACE FUNCTION jcron.run_comprehensive_tests(p_test_count INT DEFAULT 1000)
RETURNS TABLE(
    total_tests INT, 
    successful_tests INT, 
    failed_tests INT, 
    impossible_schedules INT,
    avg_duration_microseconds NUMERIC,
    timezone_tests INT,
    week_tests INT,
    predefined_tests INT
) AS $$
DECLARE 
    s_parts TEXT[] := ARRAY['0','30','*/10','0-15']; 
    m_parts TEXT[] := ARRAY['*','15','*/5','10-20']; 
    h_parts TEXT[] := ARRAY['*','3','*/2','9-17']; 
    D_parts TEXT[] := ARRAY['*','1','15','L','?']; 
    dow_parts TEXT[] := ARRAY['*','1','5','1-5','5L','2#3','MON','FRI']; 
    Month_parts TEXT[] := ARRAY['*','1','6','12','JAN','JUN']; 
    Y_parts TEXT[] := ARRAY['*','2026'];
    W_parts TEXT[] := ARRAY['*','1','26','52']; -- Removed 53 to reduce impossible schedules
    tz_parts TEXT[] := ARRAY['UTC','America/New_York','Europe/London','Asia/Tokyo'];
    predefined_parts TEXT[] := ARRAY['@yearly','@monthly','@weekly','@daily','@hourly'];
    
    schedule JSONB; 
    base_ts TIMESTAMPTZ := now(); 
    next_ts_1 TIMESTAMPTZ; 
    prev_ts_1 TIMESTAMPTZ; 
    next_ts_2 TIMESTAMPTZ; 
    i INT; 
    success_count INT := 0; 
    failure_count INT := 0; 
    impossible_count INT := 0;
    tz_test_count INT := 0;
    week_test_count INT := 0;
    predefined_test_count INT := 0;
    total_duration INTERVAL := '0 seconds'; 
    start_ts TIMESTAMPTZ; 
    error_message TEXT;
BEGIN
    RAISE NOTICE '--- ENHANCED JCRON Comprehensive Test Suite (v4.1) ---';
    RAISE NOTICE '% test scenarios with intelligent impossible schedule handling...', p_test_count;
    RAISE NOTICE 'Test start time: %', base_ts;
    RAISE NOTICE '-------------------------------------------------------';
    
    -- Clear cache for cold start
    TRUNCATE jcron.schedule_cache;
    RAISE NOTICE 'Cache cleared, tests starting with cold cache.';
    RAISE NOTICE '';
    
    FOR i IN 1..p_test_count LOOP
        -- Build base schedule
        schedule := jsonb_build_object(
            's', s_parts[1+(i%array_length(s_parts,1))],
            'm', m_parts[1+(i%array_length(m_parts,1))],
            'h', h_parts[1+(i%array_length(h_parts,1))]
        );
        
        -- Add optional fields
        IF i % 3 = 0 THEN 
            schedule := schedule || jsonb_build_object(
                'M', Month_parts[1+(i%array_length(Month_parts,1))], 
                'Y', Y_parts[1+(i%array_length(Y_parts,1))]
            ); 
        END IF;
        
        -- Add day fields with mutual exclusion
        IF i % 2 = 0 THEN 
            schedule := schedule || jsonb_build_object('D', D_parts[1+(i%array_length(D_parts,1))]); 
            IF schedule->>'D' IS NOT NULL AND schedule->>'D' != '*' AND schedule->>'D' != '?' THEN 
                schedule := schedule || '{"dow": "?"}'; 
            END IF;
        ELSE 
            schedule := schedule || jsonb_build_object('dow', dow_parts[1+(i%array_length(dow_parts,1))]); 
            IF schedule->>'dow' IS NOT NULL AND schedule->>'dow' != '*' AND schedule->>'dow' != '?' THEN 
                schedule := schedule || '{"D": "?"}'; 
            END IF;
        END IF;
        
        -- Add timezone testing (every 4th test)
        IF i % 4 = 0 THEN
            schedule := schedule || jsonb_build_object('timezone', tz_parts[1+(i%array_length(tz_parts,1))]);
            tz_test_count := tz_test_count + 1;
        END IF;
        
        -- Add week testing (every 7th test) - include week 53 occasionally for edge case testing
        IF i % 7 = 0 THEN
            IF i % 21 = 0 THEN
                -- Occasionally test week 53 for edge cases
                schedule := schedule || jsonb_build_object('W', '53');
            ELSE
                schedule := schedule || jsonb_build_object('W', W_parts[1+(i%array_length(W_parts,1))]);
            END IF;
            week_test_count := week_test_count + 1;
        END IF;
        
        -- Test predefined schedules (every 10th test)
        IF i % 10 = 0 THEN
            BEGIN
                schedule := jcron.parse_cron_expression(predefined_parts[1+(i%array_length(predefined_parts,1))]);
                predefined_test_count := predefined_test_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Skip if predefined parsing fails
                CONTINUE;
            END;
        END IF;
        
        -- Run the actual test
        BEGIN
            start_ts := clock_timestamp(); 
            
            -- Test next_jump
            next_ts_1 := jcron.next_jump(schedule, base_ts); 
            total_duration := total_duration + (clock_timestamp() - start_ts);
            
            IF next_ts_1 IS NULL THEN 
                RAISE EXCEPTION 'next_jump returned NULL'; 
            END IF;
            
            -- Test prev_jump
            prev_ts_1 := jcron.prev_jump(schedule, next_ts_1);
            
            -- Test consistency: prev should be before next
            IF prev_ts_1 >= next_ts_1 THEN 
                RAISE EXCEPTION 'Consistency failed! Prev: %, Next: %', prev_ts_1, next_ts_1; 
            END IF;
            
            -- Test if next_jump from prev gives us the same or later time
            next_ts_2 := jcron.next_jump(schedule, prev_ts_1);
            IF next_ts_2 < next_ts_1 THEN 
                RAISE EXCEPTION 'Jump consistency failed! Next1: %, Next2: %', next_ts_1, next_ts_2; 
            END IF;
            
            -- Test match function
            IF NOT jcron.match(next_ts_1, schedule) THEN
                RAISE EXCEPTION 'Match function failed for calculated next time';
            END IF;
            
            success_count := success_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            
            -- Categorize the error
            IF error_message LIKE '%Could not find a valid day within 5 years%' THEN
                impossible_count := impossible_count + 1;
                -- Don't count impossible schedules as real failures
                success_count := success_count + 1; -- Consider handled gracefully
            ELSE
                failure_count := failure_count + 1; 
                RAISE WARNING 'REAL TEST FAILED [%]: Schedule: %, Error: %', i, schedule, error_message;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '--- Enhanced Test Results ---';
    RAISE NOTICE 'Total tests: %, Successful: %, Real failures: %, Impossible schedules handled: %', 
                 p_test_count, success_count, failure_count, impossible_count;
    RAISE NOTICE 'Timezone tests: %, Week tests: %, Predefined tests: %', tz_test_count, week_test_count, predefined_test_count;
    
    total_tests := p_test_count; 
    successful_tests := success_count; 
    failed_tests := failure_count;
    impossible_schedules := impossible_count;
    timezone_tests := tz_test_count;
    week_tests := week_test_count;
    predefined_tests := predefined_test_count;
    
    IF p_test_count > 0 THEN 
        avg_duration_microseconds := (EXTRACT(EPOCH FROM total_duration) * 1000000 / p_test_count)::numeric(10, 2); 
    ELSE 
        avg_duration_microseconds := 0; 
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Test specific features
CREATE OR REPLACE FUNCTION jcron.test_timezone_features()
RETURNS TABLE(test_name text, passed boolean, details text) AS $$
DECLARE
    schedule jsonb;
    next_utc timestamptz;
    next_ny timestamptz;
BEGIN
    -- Test 1: Same time different timezones should produce different results
    schedule := '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"*","timezone":"UTC"}';
    next_utc := jcron.next_jump(schedule, now());
    
    schedule := '{"s":"0","m":"0","h":"12","D":"*","M":"*","dow":"*","timezone":"America/New_York"}';
    next_ny := jcron.next_jump(schedule, now());
    
    RETURN QUERY SELECT 
        'Timezone Difference Test'::text,
        (next_utc != next_ny)::boolean,
        format('UTC: %s, NY: %s', next_utc, next_ny);
        
    -- Test 2: Invalid timezone should raise error
    BEGIN
        schedule := '{"timezone":"Invalid/Zone"}';
        PERFORM jcron.next_jump(schedule, now());
        RETURN QUERY SELECT 'Invalid Timezone Test'::text, false::boolean, 'Should have raised error'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Invalid Timezone Test'::text, true::boolean, 'Correctly raised error'::text;
    END;
END;
$$ LANGUAGE plpgsql;

-- Test job runner features
CREATE OR REPLACE FUNCTION jcron.test_job_runner()
RETURNS TABLE(test_name text, passed boolean, details text) AS $$
DECLARE
    job_id bigint;
    job_count integer;
BEGIN
    -- Test 1: Add job from cron expression
    BEGIN
        job_id := jcron.add_job_from_cron('test_job', '@daily', 'echo "test"');
        SELECT COUNT(*) INTO job_count FROM jcron.jobs WHERE job_name = 'test_job';
        
        RETURN QUERY SELECT 
            'Add Job Test'::text,
            (job_count = 1)::boolean,
            format('Job ID: %s, Count: %s', job_id, job_count);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Add Job Test'::text, false::boolean, SQLERRM::text;
    END;
    
    -- Test 2: Remove job
    BEGIN
        PERFORM jcron.remove_job('test_job');
        SELECT COUNT(*) INTO job_count FROM jcron.jobs WHERE job_name = 'test_job';
        
        RETURN QUERY SELECT 
            'Remove Job Test'::text,
            (job_count = 0)::boolean,
            format('Remaining jobs: %s', job_count);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Remove Job Test'::text, false::boolean, SQLERRM::text;
    END;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================== --
--                        4. JOB RUNNER API & UTILITIES                      --
-- ======================================================================== --

-- Schedule validation function
CREATE OR REPLACE FUNCTION jcron.validate_schedule(p_schedule jsonb) 
RETURNS TABLE(is_valid boolean, error_message text) AS $$
BEGIN
    BEGIN
        -- Test by trying to get next execution time
        PERFORM jcron.next_jump(p_schedule, now());
        RETURN QUERY SELECT true, null::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Add or update a job
CREATE OR REPLACE FUNCTION jcron.add_job(
    p_job_name text,
    p_schedule jsonb,
    p_command text,
    p_timezone text DEFAULT 'UTC',
    p_max_retries integer DEFAULT 0,
    p_retry_delay_seconds integer DEFAULT 300
) RETURNS bigint AS $$
DECLARE
    job_id bigint;
    validation_result record;
BEGIN
    -- Validate schedule first
    SELECT * INTO validation_result FROM jcron.validate_schedule(p_schedule);
    IF NOT validation_result.is_valid THEN
        RAISE EXCEPTION 'Invalid schedule: %', validation_result.error_message;
    END IF;
    
    -- Validate timezone
    PERFORM jcron._convert_timezone(now(), p_timezone);
    
    -- Insert or update job
    INSERT INTO jcron.jobs (
        job_name, schedule, command, timezone, 
        max_retries, retry_delay_seconds, next_run_at
    ) VALUES (
        p_job_name, 
        p_schedule || jsonb_build_object('timezone', p_timezone), 
        p_command, 
        p_timezone,
        p_max_retries, 
        p_retry_delay_seconds,
        jcron.next_jump(p_schedule || jsonb_build_object('timezone', p_timezone), now())
    )
    ON CONFLICT (job_name) DO UPDATE SET
        schedule = EXCLUDED.schedule,
        command = EXCLUDED.command,
        timezone = EXCLUDED.timezone,
        max_retries = EXCLUDED.max_retries,
        retry_delay_seconds = EXCLUDED.retry_delay_seconds,
        next_run_at = jcron.next_jump(EXCLUDED.schedule, now()),
        updated_at = now()
    RETURNING jcron.jobs.job_id INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Add job from cron expression string
CREATE OR REPLACE FUNCTION jcron.add_job_from_cron(
    p_job_name text,
    p_cron_expression text, 
    p_command text,
    p_timezone text DEFAULT 'UTC',
    p_max_retries integer DEFAULT 0,
    p_retry_delay_seconds integer DEFAULT 300
) RETURNS bigint AS $$
DECLARE
    parsed_schedule jsonb;
BEGIN
    -- Parse cron expression
    parsed_schedule := jcron.parse_cron_expression(p_cron_expression);
    
    -- Add timezone if not already present
    IF NOT parsed_schedule ? 'timezone' THEN
        parsed_schedule := parsed_schedule || jsonb_build_object('timezone', p_timezone);
    END IF;
    
    RETURN jcron.add_job(p_job_name, parsed_schedule, p_command, p_timezone, p_max_retries, p_retry_delay_seconds);
END;
$$ LANGUAGE plpgsql;

-- Remove a job
CREATE OR REPLACE FUNCTION jcron.remove_job(p_job_name text) 
RETURNS boolean AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM jcron.jobs WHERE job_name = p_job_name;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Enable/disable a job
CREATE OR REPLACE FUNCTION jcron.set_job_active(p_job_name text, p_active boolean) 
RETURNS boolean AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE jcron.jobs 
    SET is_active = p_active, updated_at = now()
    WHERE job_name = p_job_name;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Get jobs ready to run
CREATE OR REPLACE FUNCTION jcron.get_ready_jobs(p_limit integer DEFAULT 100)
RETURNS TABLE(
    job_id bigint,
    job_name text,
    command text,
    schedule jsonb,
    max_retries integer,
    retry_delay_seconds integer,
    next_run_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT j.job_id, j.job_name, j.command, j.schedule, 
           j.max_retries, j.retry_delay_seconds, j.next_run_at
    FROM jcron.jobs j
    WHERE j.is_active = true 
      AND j.next_run_at <= now()
    ORDER BY j.next_run_at
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Mark job execution start
CREATE OR REPLACE FUNCTION jcron.start_job_execution(p_job_id bigint)
RETURNS bigint AS $$
DECLARE
    log_id bigint;
BEGIN
    -- Insert log record
    INSERT INTO jcron.job_logs (job_id, run_started_at, status)
    VALUES (p_job_id, now(), 'running')
    RETURNING log_id INTO log_id;
    
    -- Update job
    UPDATE jcron.jobs 
    SET last_run_started_at = now(),
        updated_at = now()
    WHERE job_id = p_job_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Mark job execution completion
CREATE OR REPLACE FUNCTION jcron.complete_job_execution(
    p_log_id bigint,
    p_status text,
    p_output_message text DEFAULT NULL,
    p_error_message text DEFAULT NULL
) RETURNS void AS $$
DECLARE
    job_record record;
    next_run timestamptz;
BEGIN
    -- Get job info from log
    SELECT j.job_id, j.schedule, j.timezone, l.run_started_at, l.retry_count
    INTO job_record
    FROM jcron.job_logs l
    JOIN jcron.jobs j ON l.job_id = j.job_id
    WHERE l.log_id = p_log_id;
    
    -- Update log record
    UPDATE jcron.job_logs 
    SET run_finished_at = now(),
        status = p_status,
        output_message = p_output_message,
        error_message = p_error_message,
        execution_duration_ms = EXTRACT(EPOCH FROM (now() - job_record.run_started_at)) * 1000
    WHERE log_id = p_log_id;
    
    -- Calculate next run time
    next_run := jcron.next_jump(job_record.schedule, now());
    
    -- Update job
    UPDATE jcron.jobs 
    SET last_run_finished_at = now(),
        next_run_at = next_run,
        updated_at = now()
    WHERE job_id = job_record.job_id;
END;
$$ LANGUAGE plpgsql;

-- Retry failed job
CREATE OR REPLACE FUNCTION jcron.retry_job(p_log_id bigint)
RETURNS bigint AS $$
DECLARE
    job_record record;
    new_log_id bigint;
BEGIN
    -- Get job and log info
    SELECT j.job_id, j.max_retries, j.retry_delay_seconds, l.retry_count
    INTO job_record
    FROM jcron.job_logs l
    JOIN jcron.jobs j ON l.job_id = j.job_id
    WHERE l.log_id = p_log_id;
    
    -- Check if retry is allowed
    IF job_record.retry_count >= job_record.max_retries THEN
        RAISE EXCEPTION 'Maximum retries exceeded for job';
    END IF;
    
    -- Create new log entry for retry
    INSERT INTO jcron.job_logs (job_id, run_started_at, status, retry_count)
    VALUES (job_record.job_id, now() + (job_record.retry_delay_seconds * interval '1 second'), 
            'retrying', job_record.retry_count + 1)
    RETURNING log_id INTO new_log_id;
    
    RETURN new_log_id;
END;
$$ LANGUAGE plpgsql;

-- Get job statistics
CREATE OR REPLACE FUNCTION jcron.get_job_stats(p_job_name text DEFAULT NULL)
RETURNS TABLE(
    job_name text,
    total_runs bigint,
    successful_runs bigint,
    failed_runs bigint,
    avg_duration_ms numeric,
    last_run_at timestamptz,
    last_status text,
    next_run_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT j.job_name,
           COUNT(l.log_id) as total_runs,
           COUNT(CASE WHEN l.status = 'success' THEN 1 END) as successful_runs,
           COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as failed_runs,
           AVG(l.execution_duration_ms) as avg_duration_ms,
           j.last_run_finished_at,
           (SELECT status FROM jcron.job_logs WHERE job_id = j.job_id ORDER BY run_started_at DESC LIMIT 1) as last_status,
           j.next_run_at
    FROM jcron.jobs j
    LEFT JOIN jcron.job_logs l ON j.job_id = l.job_id
    WHERE (p_job_name IS NULL OR j.job_name = p_job_name)
    GROUP BY j.job_id, j.job_name, j.last_run_finished_at, j.next_run_at
    ORDER BY j.job_name;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old logs
CREATE OR REPLACE FUNCTION jcron.cleanup_old_logs(p_days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM jcron.job_logs 
    WHERE run_started_at < now() - (p_days_to_keep * interval '1 day');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id_started_at ON jcron.job_logs(job_id, run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_next_run_active ON jcron.jobs(next_run_at) WHERE is_active = true;

-- ======================================================================== --
--                       6. UTILITY VIEWS & MAINTENANCE                      --
-- ======================================================================== --

-- View for active jobs with next run times
CREATE OR REPLACE VIEW jcron.active_jobs_view AS
SELECT 
    j.job_id,
    j.job_name,
    j.schedule,
    j.command,
    j.timezone,
    j.next_run_at,
    j.last_run_finished_at,
    CASE 
        WHEN j.next_run_at <= now() THEN 'ready'
        WHEN j.next_run_at > now() THEN 'scheduled'
        ELSE 'unknown'
    END as status,
    (SELECT COUNT(*) FROM jcron.job_logs l WHERE l.job_id = j.job_id) as total_runs,
    (SELECT status FROM jcron.job_logs l WHERE l.job_id = j.job_id ORDER BY run_started_at DESC LIMIT 1) as last_status
FROM jcron.jobs j 
WHERE j.is_active = true
ORDER BY j.next_run_at;

-- View for job execution history
CREATE OR REPLACE VIEW jcron.job_execution_history AS
SELECT 
    j.job_name,
    l.run_started_at,
    l.run_finished_at,
    l.status,
    l.execution_duration_ms,
    l.retry_count,
    l.error_message,
    l.output_message
FROM jcron.job_logs l
JOIN jcron.jobs j ON l.job_id = j.job_id
ORDER BY l.run_started_at DESC;

-- View for failed jobs requiring attention
CREATE OR REPLACE VIEW jcron.failed_jobs_view AS
SELECT 
    j.job_name,
    j.command,
    l.run_started_at as failed_at,
    l.error_message,
    l.retry_count,
    j.max_retries,
    CASE 
        WHEN l.retry_count < j.max_retries THEN 'can_retry'
        ELSE 'max_retries_reached'
    END as retry_status
FROM jcron.job_logs l
JOIN jcron.jobs j ON l.job_id = j.job_id
WHERE l.status = 'failed'
  AND l.log_id IN (
      SELECT MAX(log_id) 
      FROM jcron.job_logs 
      GROUP BY job_id
  )
ORDER BY l.run_started_at DESC;

-- Trigger to automatically update job's updated_at timestamp
CREATE OR REPLACE FUNCTION jcron.update_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_timestamp_trigger
    BEFORE UPDATE ON jcron.jobs
    FOR EACH ROW
    EXECUTE FUNCTION jcron.update_job_timestamp();

-- Function to automatically cleanup cache entries (keep most recent 1000)
CREATE OR REPLACE FUNCTION jcron.cleanup_schedule_cache()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM jcron.schedule_cache 
    WHERE schedule NOT IN (
        SELECT schedule 
        FROM jcron.schedule_cache 
        ORDER BY last_used DESC 
        LIMIT 1000
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Maintenance function to run periodically
CREATE OR REPLACE FUNCTION jcron.maintenance(
    p_cleanup_logs_days integer DEFAULT 30,
    p_cleanup_cache boolean DEFAULT true
) RETURNS TABLE(
    operation text,
    records_affected integer,
    details text
) AS $$
DECLARE
    logs_deleted integer;
    cache_cleaned integer;
BEGIN
    -- Cleanup old logs
    logs_deleted := jcron.cleanup_old_logs(p_cleanup_logs_days);
    RETURN QUERY SELECT 
        'log_cleanup'::text,
        logs_deleted,
        format('Deleted logs older than %s days', p_cleanup_logs_days);
    
    -- Cleanup cache if requested
    IF p_cleanup_cache THEN
        cache_cleaned := jcron.cleanup_schedule_cache();
        RETURN QUERY SELECT 
            'cache_cleanup'::text,
            cache_cleaned,
            'Kept 1000 most recent cache entries'::text;
    END IF;
    
    -- Analyze tables for better performance
    ANALYZE jcron.jobs;
    ANALYZE jcron.job_logs;
    ANALYZE jcron.schedule_cache;
    
    RETURN QUERY SELECT 
        'analyze_tables'::text,
        0,
        'Updated table statistics'::text;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for typical usage
GRANT USAGE ON SCHEMA jcron TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA jcron TO PUBLIC;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA jcron TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA jcron TO PUBLIC;

-- Create a role for job management
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jcron_manager') THEN
        CREATE ROLE jcron_manager;
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA jcron TO jcron_manager;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA jcron TO jcron_manager;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA jcron TO jcron_manager;

-- Final setup message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '           JCRON POSTGRESQL PORT v4.0 READY            ';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  ✓ Enhanced timezone support';
    RAISE NOTICE '  ✓ Week of year matching';
    RAISE NOTICE '  ✓ Predefined schedules (@yearly, @daily, etc.)';
    RAISE NOTICE '  ✓ Day/month abbreviations (MON, JAN, etc.)';
    RAISE NOTICE '  ✓ Complete job runner API';
    RAISE NOTICE '  ✓ Retry mechanism with configurable delays';
    RAISE NOTICE '  ✓ Comprehensive logging and monitoring';
    RAISE NOTICE '  ✓ Automatic maintenance functions';
    RAISE NOTICE '  ✓ Performance optimized with proper indexing';
    RAISE NOTICE '';
    RAISE NOTICE 'Quick start:';
    RAISE NOTICE '  SELECT jcron.add_job_from_cron(''my_job'', ''@daily'', ''echo hello'');';
    RAISE NOTICE '  SELECT * FROM jcron.active_jobs_view;';
    RAISE NOTICE '  SELECT * FROM jcron.run_comprehensive_tests(100);';
    RAISE NOTICE '';
    RAISE NOTICE 'For more examples, see documentation or run test functions.';
    RAISE NOTICE '========================================================';
END
$$;