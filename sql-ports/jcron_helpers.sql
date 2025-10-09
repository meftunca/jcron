-- =====================================================
-- 🛠️ JCRON HELPER FUNCTIONS
-- =====================================================
-- Additional utility functions for easier JCRON usage
-- Version: 1.0.0
-- Requires: jcron.sql (core functions)
-- =====================================================

-- =====================================================
-- 📅 SCHEDULE MANAGEMENT HELPERS
-- =====================================================

-- Get next N execution times for a pattern
-- Returns an array of timestamps showing when the pattern will execute
CREATE OR REPLACE FUNCTION jcron.next_n_times(
    pattern TEXT,
    n INTEGER DEFAULT 10,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ[] AS $$
DECLARE
    results TIMESTAMPTZ[] := ARRAY[]::TIMESTAMPTZ[];
    cursor_time TIMESTAMPTZ := from_time;
    next_time TIMESTAMPTZ;
    i INTEGER := 0;
BEGIN
    IF n <= 0 THEN
        RAISE EXCEPTION 'n must be greater than 0, got: %', n;
    END IF;
    
    IF n > 1000 THEN
        RAISE EXCEPTION 'n is too large (max 1000), got: %', n;
    END IF;
    
    WHILE i < n LOOP
        next_time := jcron.next_time(pattern, cursor_time);
        
        IF next_time IS NULL THEN
            EXIT; -- No more matches found
        END IF;
        
        results := array_append(results, next_time);
        cursor_time := next_time + interval '1 second';
        i := i + 1;
    END LOOP;
    
    RETURN results;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get previous N execution times for a pattern
-- Returns an array of timestamps showing when the pattern executed in the past
CREATE OR REPLACE FUNCTION jcron.prev_n_times(
    pattern TEXT,
    n INTEGER DEFAULT 10,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ[] AS $$
DECLARE
    results TIMESTAMPTZ[] := ARRAY[]::TIMESTAMPTZ[];
    cursor_time TIMESTAMPTZ := from_time;
    prev_time TIMESTAMPTZ;
    i INTEGER := 0;
BEGIN
    IF n <= 0 THEN
        RAISE EXCEPTION 'n must be greater than 0, got: %', n;
    END IF;
    
    IF n > 1000 THEN
        RAISE EXCEPTION 'n is too large (max 1000), got: %', n;
    END IF;
    
    WHILE i < n LOOP
        prev_time := jcron.prev_time(pattern, cursor_time);
        
        IF prev_time IS NULL THEN
            EXIT; -- No more matches found
        END IF;
        
        results := array_append(results, prev_time);
        cursor_time := prev_time - interval '1 second';
        i := i + 1;
    END LOOP;
    
    RETURN results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all execution times between two dates
-- Returns a table of timestamps for easier querying
CREATE OR REPLACE FUNCTION jcron.schedule_between(
    pattern TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
) RETURNS TABLE(execution_time TIMESTAMPTZ, sequence_number INTEGER) AS $$
DECLARE
    cursor_time TIMESTAMPTZ := start_time;
    next_time TIMESTAMPTZ;
    seq_num INTEGER := 1;
    max_iterations INTEGER := 100000; -- Safety limit
    iteration_count INTEGER := 0;
BEGIN
    IF end_time <= start_time THEN
        RAISE EXCEPTION 'end_time must be after start_time';
    END IF;
    
    LOOP
        next_time := jcron.next_time(pattern, cursor_time);
        
        -- Exit conditions
        IF next_time IS NULL OR next_time > end_time THEN
            EXIT;
        END IF;
        
        iteration_count := iteration_count + 1;
        IF iteration_count > max_iterations THEN
            RAISE EXCEPTION 'Too many iterations (>100k). Pattern might be too frequent or date range too large.';
        END IF;
        
        execution_time := next_time;
        sequence_number := seq_num;
        RETURN NEXT;
        
        cursor_time := next_time + interval '1 second';
        seq_num := seq_num + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate if a pattern is valid
-- Returns TRUE if pattern can be parsed and executed
CREATE OR REPLACE FUNCTION jcron.is_valid_pattern(
    pattern TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    test_result TIMESTAMPTZ;
BEGIN
    -- Try to execute the pattern
    BEGIN
        test_result := jcron.next_time(pattern, NOW());
        RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get time remaining until next execution
-- Returns interval showing how long until next run
CREATE OR REPLACE FUNCTION jcron.time_until_next(
    pattern TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS INTERVAL AS $$
DECLARE
    next_time TIMESTAMPTZ;
BEGIN
    next_time := jcron.next_time(pattern, from_time);
    
    IF next_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN next_time - from_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 📊 TIME ANALYSIS HELPERS
-- =====================================================

-- Detect pattern frequency (hourly, daily, weekly, monthly, etc.)
-- Returns a text description of the pattern's frequency
CREATE OR REPLACE FUNCTION jcron.get_frequency(
    pattern TEXT,
    sample_size INTEGER DEFAULT 10
) RETURNS TEXT AS $$
DECLARE
    times TIMESTAMPTZ[];
    intervals INTERVAL[];
    avg_interval INTERVAL;
    i INTEGER;
BEGIN
    -- Get sample execution times
    times := jcron.next_n_times(pattern, sample_size + 1);
    
    IF array_length(times, 1) < 2 THEN
        RETURN 'unknown';
    END IF;
    
    -- Calculate intervals between executions
    FOR i IN 2..array_length(times, 1) LOOP
        intervals := array_append(intervals, times[i] - times[i-1]);
    END LOOP;
    
    -- Calculate average interval
    avg_interval := intervals[1];
    FOR i IN 2..array_length(intervals, 1) LOOP
        avg_interval := avg_interval + intervals[i];
    END LOOP;
    avg_interval := avg_interval / array_length(intervals, 1);
    
    -- Classify frequency
    IF avg_interval < interval '1 minute' THEN
        RETURN 'every-second';
    ELSIF avg_interval < interval '2 minutes' THEN
        RETURN 'every-minute';
    ELSIF avg_interval < interval '1 hour' THEN
        RETURN format('every-%s-minutes', ROUND(EXTRACT(epoch FROM avg_interval) / 60));
    ELSIF avg_interval < interval '2 hours' THEN
        RETURN 'hourly';
    ELSIF avg_interval < interval '1 day' THEN
        RETURN format('every-%s-hours', ROUND(EXTRACT(epoch FROM avg_interval) / 3600));
    ELSIF avg_interval < interval '2 days' THEN
        RETURN 'daily';
    ELSIF avg_interval < interval '7 days' THEN
        RETURN format('every-%s-days', ROUND(EXTRACT(epoch FROM avg_interval) / 86400));
    ELSIF avg_interval < interval '14 days' THEN
        RETURN 'weekly';
    ELSIF avg_interval < interval '60 days' THEN
        RETURN 'monthly';
    ELSIF avg_interval < interval '180 days' THEN
        RETURN 'quarterly';
    ELSE
        RETURN 'yearly-or-rare';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate average interval between executions
-- Returns the average time between runs
CREATE OR REPLACE FUNCTION jcron.avg_interval(
    pattern TEXT,
    sample_size INTEGER DEFAULT 20
) RETURNS INTERVAL AS $$
DECLARE
    times TIMESTAMPTZ[];
    total_interval INTERVAL := interval '0';
    i INTEGER;
    count INTEGER := 0;
BEGIN
    times := jcron.next_n_times(pattern, sample_size + 1);
    
    IF array_length(times, 1) < 2 THEN
        RETURN NULL;
    END IF;
    
    FOR i IN 2..array_length(times, 1) LOOP
        total_interval := total_interval + (times[i] - times[i-1]);
        count := count + 1;
    END LOOP;
    
    RETURN total_interval / count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get comprehensive statistics about a pattern's execution schedule
-- Returns detailed information about frequency, intervals, and distribution
CREATE OR REPLACE FUNCTION jcron.pattern_stats(
    pattern TEXT,
    days INTEGER DEFAULT 30
) RETURNS TABLE(
    metric TEXT,
    value TEXT
) AS $$
DECLARE
    start_time TIMESTAMPTZ := NOW();
    end_time TIMESTAMPTZ := NOW() + (days || ' days')::INTERVAL;
    exec_times TIMESTAMPTZ[];
    exec_count INTEGER;
    first_exec TIMESTAMPTZ;
    last_exec TIMESTAMPTZ;
    min_interval INTERVAL;
    max_interval INTERVAL;
    avg_int INTERVAL;
    frequency_label TEXT;
BEGIN
    -- Get executions in the time range (limit to 10000 for safety)
    SELECT array_agg(execution_time ORDER BY execution_time)
    INTO exec_times
    FROM (
        SELECT execution_time
        FROM jcron.schedule_between(pattern, start_time, end_time)
        LIMIT 10000
    ) limited;
    
    exec_count := array_length(exec_times, 1);
    
    IF exec_count IS NULL OR exec_count = 0 THEN
        metric := 'error';
        value := 'No executions found in date range';
        RETURN NEXT;
        RETURN;
    END IF;
    
    first_exec := exec_times[1];
    last_exec := exec_times[exec_count];
    
    -- Basic stats
    metric := 'pattern';
    value := pattern;
    RETURN NEXT;
    
    metric := 'analysis_period';
    value := format('%s days', days);
    RETURN NEXT;
    
    metric := 'total_executions';
    value := exec_count::TEXT;
    RETURN NEXT;
    
    metric := 'first_execution';
    value := first_exec::TEXT;
    RETURN NEXT;
    
    metric := 'last_execution';
    value := last_exec::TEXT;
    RETURN NEXT;
    
    -- Calculate interval stats
    IF exec_count >= 2 THEN
        DECLARE
            intervals INTERVAL[];
            i INTEGER;
        BEGIN
            FOR i IN 2..exec_count LOOP
                intervals := array_append(intervals, exec_times[i] - exec_times[i-1]);
            END LOOP;
            
            min_interval := intervals[1];
            max_interval := intervals[1];
            avg_int := interval '0';
            
            FOREACH avg_int IN ARRAY intervals LOOP
                IF avg_int < min_interval THEN
                    min_interval := avg_int;
                END IF;
                IF avg_int > max_interval THEN
                    max_interval := avg_int;
                END IF;
            END LOOP;
            
            avg_int := (last_exec - first_exec) / (exec_count - 1);
            
            metric := 'min_interval';
            value := min_interval::TEXT;
            RETURN NEXT;
            
            metric := 'max_interval';
            value := max_interval::TEXT;
            RETURN NEXT;
            
            metric := 'avg_interval';
            value := avg_int::TEXT;
            RETURN NEXT;
        END;
    END IF;
    
    -- Frequency detection
    frequency_label := jcron.get_frequency(pattern);
    metric := 'frequency';
    value := frequency_label;
    RETURN NEXT;
    
    -- Executions per day
    metric := 'executions_per_day';
    value := ROUND(exec_count::NUMERIC / days, 2)::TEXT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 🐛 DEBUG & MONITORING HELPERS
-- =====================================================

-- Explain pattern in human-readable format
-- Converts cron pattern to natural language description
CREATE OR REPLACE FUNCTION jcron.explain_pattern(
    pattern TEXT
) RETURNS TEXT AS $$
DECLARE
    parts TEXT[];
    sec TEXT;
    min TEXT;
    hour TEXT;
    day TEXT;
    month TEXT;
    dow TEXT;
    description TEXT := '';
    frequency TEXT;
BEGIN
    -- Handle multi-pattern (pipe operator)
    IF pattern ~ '\|' THEN
        RETURN 'Multi-pattern: ' || pattern || ' (combined schedule with OR logic)';
    END IF;
    
    -- Handle special modifiers
    IF pattern ~ '^E\d*[WMDH]$' THEN
        RETURN 'End of period: ' || pattern;
    END IF;
    
    IF pattern ~ '^S\d*[WMDH]$' THEN
        RETURN 'Start of period: ' || pattern;
    END IF;
    
    -- Parse standard cron pattern
    parts := string_to_array(pattern, ' ');
    
    IF array_length(parts, 1) < 6 THEN
        RETURN 'Invalid pattern: ' || pattern;
    END IF;
    
    sec := parts[1];
    min := parts[2];
    hour := parts[3];
    day := parts[4];
    month := parts[5];
    dow := parts[6];
    
    -- Detect frequency
    frequency := jcron.get_frequency(pattern, 5);
    
    -- Build description
    description := 'Runs ';
    
    -- Frequency hint
    IF frequency != 'unknown' THEN
        description := description || frequency || ' ';
    END IF;
    
    -- Time of day
    IF hour = '*' AND min = '*' AND sec = '*' THEN
        description := description || 'every second';
    ELSIF hour = '*' AND min = '*' THEN
        description := description || 'every minute';
    ELSIF hour = '*' THEN
        description := description || 'every hour';
    ELSE
        IF hour != '*' THEN
            description := description || 'at hour ' || hour;
        END IF;
        IF min != '*' AND min != '0' THEN
            description := description || ':' || min;
        END IF;
    END IF;
    
    -- Day of week
    IF dow != '*' THEN
        description := description || ' on ';
        IF dow ~ 'L' THEN
            description := description || 'last ' || substring(dow from '^\d+') || ' of month';
        ELSIF dow ~ '#' THEN
            description := description || substring(dow from '#(\d+)$') || 'th occurrence of weekday ' || substring(dow from '^(\d+)');
        ELSIF dow ~ ',' THEN
            description := description || 'weekdays ' || dow;
        ELSE
            description := description || 'weekday ' || dow;
        END IF;
    END IF;
    
    -- Day of month
    IF day != '*' AND dow = '*' THEN
        IF day = 'L' THEN
            description := description || ' on last day of month';
        ELSIF day ~ ',' THEN
            description := description || ' on days ' || day;
        ELSE
            description := description || ' on day ' || day;
        END IF;
    END IF;
    
    -- Month
    IF month != '*' THEN
        description := description || ' in month(s) ' || month;
    END IF;
    
    -- Add modifiers if present
    IF array_length(parts, 1) >= 7 AND parts[7] IS NOT NULL THEN
        description := description || ' [' || parts[7] || ']';
    END IF;
    
    RETURN description;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compare two patterns and show their differences
-- Returns a table showing when each pattern executes
CREATE OR REPLACE FUNCTION jcron.compare_patterns(
    pattern1 TEXT,
    pattern2 TEXT,
    sample_size INTEGER DEFAULT 10
) RETURNS TABLE(
    comparison_type TEXT,
    pattern1_time TIMESTAMPTZ,
    pattern2_time TIMESTAMPTZ,
    time_diff INTERVAL
) AS $$
DECLARE
    times1 TIMESTAMPTZ[];
    times2 TIMESTAMPTZ[];
    i INTEGER;
BEGIN
    times1 := jcron.next_n_times(pattern1, sample_size);
    times2 := jcron.next_n_times(pattern2, sample_size);
    
    -- Side-by-side comparison
    FOR i IN 1..GREATEST(array_length(times1, 1), array_length(times2, 1)) LOOP
        comparison_type := 'execution_' || i;
        pattern1_time := CASE WHEN i <= array_length(times1, 1) THEN times1[i] ELSE NULL END;
        pattern2_time := CASE WHEN i <= array_length(times2, 1) THEN times2[i] ELSE NULL END;
        
        IF pattern1_time IS NOT NULL AND pattern2_time IS NOT NULL THEN
            time_diff := pattern2_time - pattern1_time;
        ELSE
            time_diff := NULL;
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 💼 BUSINESS LOGIC HELPERS
-- =====================================================

-- Get standard business hours pattern (Mon-Fri, 9am-5pm)
-- Returns a pattern for typical office hours
CREATE OR REPLACE FUNCTION jcron.business_hours(
    start_hour INTEGER DEFAULT 9,
    end_hour INTEGER DEFAULT 17
) RETURNS TEXT AS $$
BEGIN
    IF start_hour < 0 OR start_hour > 23 OR end_hour < 0 OR end_hour > 23 THEN
        RAISE EXCEPTION 'Hours must be between 0 and 23';
    END IF;
    
    IF end_hour <= start_hour THEN
        RAISE EXCEPTION 'end_hour must be greater than start_hour';
    END IF;
    
    RETURN format('0 0 %s-%s * * 1-5 *', start_hour, end_hour - 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get business days pattern (Mon-Fri at specific time)
-- Returns a pattern for weekdays only
CREATE OR REPLACE FUNCTION jcron.business_days(
    hour INTEGER DEFAULT 9,
    minute INTEGER DEFAULT 0
) RETURNS TEXT AS $$
BEGIN
    IF hour < 0 OR hour > 23 OR minute < 0 OR minute > 59 THEN
        RAISE EXCEPTION 'Invalid time: hour must be 0-23, minute must be 0-59';
    END IF;
    
    RETURN format('0 %s %s * * 1-5 *', minute, hour);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Round a timestamp to nearest business hour
-- If outside business hours, returns next business hour
CREATE OR REPLACE FUNCTION jcron.round_to_business_hours(
    input_time TIMESTAMPTZ,
    start_hour INTEGER DEFAULT 9,
    end_hour INTEGER DEFAULT 17
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    day_of_week INTEGER;
    hour_of_day INTEGER;
    result_time TIMESTAMPTZ;
BEGIN
    day_of_week := EXTRACT(DOW FROM input_time)::INTEGER;
    hour_of_day := EXTRACT(HOUR FROM input_time)::INTEGER;
    
    -- If weekend, move to Monday
    IF day_of_week = 0 THEN -- Sunday
        result_time := date_trunc('day', input_time) + interval '1 day' + (start_hour || ' hours')::INTERVAL;
    ELSIF day_of_week = 6 THEN -- Saturday
        result_time := date_trunc('day', input_time) + interval '2 days' + (start_hour || ' hours')::INTERVAL;
    -- If weekday but outside business hours
    ELSIF hour_of_day < start_hour THEN
        result_time := date_trunc('day', input_time) + (start_hour || ' hours')::INTERVAL;
    ELSIF hour_of_day >= end_hour THEN
        -- Move to next business day
        IF day_of_week = 5 THEN -- Friday
            result_time := date_trunc('day', input_time) + interval '3 days' + (start_hour || ' hours')::INTERVAL;
        ELSE
            result_time := date_trunc('day', input_time) + interval '1 day' + (start_hour || ' hours')::INTERVAL;
        END IF;
    ELSE
        -- Already in business hours
        result_time := input_time;
    END IF;
    
    RETURN result_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 🔧 MAINTENANCE HELPERS
-- =====================================================

-- Simplify a pattern by detecting common patterns
-- Converts verbose patterns to shorter equivalents (e.g., 0,5,10,15... to */5)
CREATE OR REPLACE FUNCTION jcron.simplify_pattern(
    pattern TEXT
) RETURNS TEXT AS $$
DECLARE
    parts TEXT[];
    simplified_parts TEXT[];
    part TEXT;
    i INTEGER;
BEGIN
    -- Handle multi-pattern
    IF pattern ~ '\|' THEN
        RETURN pattern; -- Cannot simplify multi-patterns automatically
    END IF;
    
    parts := string_to_array(pattern, ' ');
    
    IF array_length(parts, 1) < 6 THEN
        RETURN pattern;
    END IF;
    
    -- Simplify each field
    FOR i IN 1..6 LOOP
        part := parts[i];
        
        -- Detect step patterns in lists
        IF part ~ '^[0-9,]+$' AND part ~ ',' THEN
            DECLARE
                values INTEGER[];
                value_arr TEXT[];
                step INTEGER;
                is_step_pattern BOOLEAN := TRUE;
                j INTEGER;
            BEGIN
                value_arr := string_to_array(part, ',');
                
                IF array_length(value_arr, 1) >= 3 THEN
                    -- Convert to integers
                    FOREACH part IN ARRAY value_arr LOOP
                        values := array_append(values, part::INTEGER);
                    END LOOP;
                    
                    -- Check if it's a step pattern
                    step := values[2] - values[1];
                    
                    FOR j IN 2..array_length(values, 1) LOOP
                        IF values[j] - values[j-1] != step THEN
                            is_step_pattern := FALSE;
                            EXIT;
                        END IF;
                    END LOOP;
                    
                    IF is_step_pattern AND step > 1 THEN
                        IF values[1] = 0 THEN
                            simplified_parts[i] := '*/' || step;
                        ELSE
                            simplified_parts[i] := values[1] || '-' || values[array_length(values, 1)] || '/' || step;
                        END IF;
                    ELSE
                        simplified_parts[i] := parts[i];
                    END IF;
                ELSE
                    simplified_parts[i] := parts[i];
                END IF;
            END;
        ELSE
            simplified_parts[i] := parts[i];
        END IF;
    END LOOP;
    
    -- Reconstruct pattern
    RETURN array_to_string(simplified_parts, ' ') || 
           CASE WHEN array_length(parts, 1) > 6 THEN ' ' || array_to_string(parts[7:array_length(parts, 1)], ' ') ELSE '' END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Optimize pattern (currently an alias for simplify, but can be extended)
-- Future: Could add more optimization strategies
CREATE OR REPLACE FUNCTION jcron.optimize_pattern(
    pattern TEXT
) RETURNS TEXT AS $$
BEGIN
    -- For now, just simplify
    -- Future optimizations could include:
    -- - Removing redundant ranges
    -- - Merging overlapping patterns
    -- - Converting complex patterns to simpler equivalents
    RETURN jcron.simplify_pattern(pattern);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 📝 HELPER METADATA
-- =====================================================

-- Get list of all available helper functions
CREATE OR REPLACE FUNCTION jcron.list_helpers()
RETURNS TABLE(
    category TEXT,
    function_name TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
        ('Schedule Management', 'next_n_times(pattern, n, from_time)', 'Get next N execution times'),
        ('Schedule Management', 'prev_n_times(pattern, n, from_time)', 'Get previous N execution times'),
        ('Schedule Management', 'schedule_between(pattern, start, end)', 'Get all executions in date range'),
        ('Schedule Management', 'is_valid_pattern(pattern)', 'Validate if pattern is correct'),
        ('Schedule Management', 'time_until_next(pattern, from_time)', 'Time remaining until next execution'),
        ('Time Analysis', 'get_frequency(pattern, sample_size)', 'Detect pattern frequency (hourly/daily/etc)'),
        ('Time Analysis', 'avg_interval(pattern, sample_size)', 'Calculate average interval between runs'),
        ('Time Analysis', 'pattern_stats(pattern, days)', 'Get comprehensive pattern statistics'),
        ('Debug & Monitoring', 'explain_pattern(pattern)', 'Convert pattern to human-readable text'),
        ('Debug & Monitoring', 'compare_patterns(pattern1, pattern2, n)', 'Compare two patterns side-by-side'),
        ('Business Logic', 'business_hours(start_hour, end_hour)', 'Generate business hours pattern'),
        ('Business Logic', 'business_days(hour, minute)', 'Generate weekday pattern'),
        ('Business Logic', 'round_to_business_hours(time, start, end)', 'Round time to nearest business hour'),
        ('Maintenance', 'simplify_pattern(pattern)', 'Simplify verbose patterns'),
        ('Maintenance', 'optimize_pattern(pattern)', 'Optimize pattern for better performance'),
        ('WHERE Clause Helpers', 'is_in_schedule(pattern, time)', 'Check if time matches pattern schedule'),
        ('WHERE Clause Helpers', 'is_business_hours(time, start, end)', 'Check if time is within business hours'),
        ('WHERE Clause Helpers', 'is_business_day(time)', 'Check if time is a business day (Mon-Fri)'),
        ('WHERE Clause Helpers', 'is_weekend(time)', 'Check if time is weekend (Sat-Sun)'),
        ('WHERE Clause Helpers', 'should_run_now(pattern, tolerance)', 'Check if pattern should execute now'),
        ('WHERE Clause Helpers', 'was_missed(pattern, last_run, grace)', 'Check if a scheduled run was missed'),
        ('WHERE Clause Helpers', 'is_overdue(pattern, last_run, time)', 'Check if execution is overdue'),
        ('WHERE Clause Helpers', 'time_since_last(pattern, time)', 'Get interval since last execution'),
        ('WHERE Clause Helpers', 'is_month_end(time)', 'Check if time is last day of month'),
        ('WHERE Clause Helpers', 'is_month_start(time)', 'Check if time is first day of month'),
        ('WHERE Clause Helpers', 'is_quarter_end(time)', 'Check if time is last day of quarter'),
        ('WHERE Clause Helpers', 'get_day_name(time)', 'Get day of week name (Monday, Tuesday, etc)'),
        ('Metadata', 'list_helpers()', 'Show all available helper functions');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 🔍 WHERE CLAUSE HELPERS
-- =====================================================

-- Check if a time matches a cron pattern schedule
CREATE OR REPLACE FUNCTION jcron.is_in_schedule(
    pattern TEXT,
    check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN jcron.match_time(pattern, check_time);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if time is within business hours
CREATE OR REPLACE FUNCTION jcron.is_business_hours(
    check_time TIMESTAMPTZ,
    start_hour INTEGER DEFAULT 9,
    end_hour INTEGER DEFAULT 17
) RETURNS BOOLEAN AS $$
DECLARE
    hour_of_day INTEGER;
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_time)::INTEGER;
    hour_of_day := EXTRACT(HOUR FROM check_time)::INTEGER;
    
    -- Weekend check
    IF day_of_week = 0 OR day_of_week = 6 THEN
        RETURN FALSE;
    END IF;
    
    -- Hour check
    RETURN hour_of_day >= start_hour AND hour_of_day < end_hour;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if time is a business day (Monday-Friday)
CREATE OR REPLACE FUNCTION jcron.is_business_day(
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_time)::INTEGER;
    RETURN day_of_week >= 1 AND day_of_week <= 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if time is weekend (Saturday-Sunday)
CREATE OR REPLACE FUNCTION jcron.is_weekend(
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_time)::INTEGER;
    RETURN day_of_week = 0 OR day_of_week = 6;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if pattern should execute now (within tolerance)
CREATE OR REPLACE FUNCTION jcron.should_run_now(
    pattern TEXT,
    tolerance_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    next_run TIMESTAMPTZ;
    now_time TIMESTAMPTZ := NOW();
BEGIN
    next_run := jcron.next_time(pattern, now_time - (tolerance_seconds || ' seconds')::INTERVAL);
    
    IF next_run IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if next run is within tolerance window
    RETURN next_run <= now_time AND next_run >= (now_time - (tolerance_seconds || ' seconds')::INTERVAL);
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if a scheduled run was missed
CREATE OR REPLACE FUNCTION jcron.was_missed(
    pattern TEXT,
    last_run_at TIMESTAMPTZ,
    grace_period INTERVAL DEFAULT '5 minutes'
) RETURNS BOOLEAN AS $$
DECLARE
    expected_run TIMESTAMPTZ;
    now_time TIMESTAMPTZ := NOW();
BEGIN
    IF last_run_at IS NULL THEN
        RETURN FALSE; -- Never run before
    END IF;
    
    -- Get next expected run after last execution
    expected_run := jcron.next_time(pattern, last_run_at);
    
    IF expected_run IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if we're past the expected run + grace period
    RETURN now_time > (expected_run + grace_period);
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if execution is overdue
CREATE OR REPLACE FUNCTION jcron.is_overdue(
    pattern TEXT,
    last_run_at TIMESTAMPTZ,
    check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
    next_expected TIMESTAMPTZ;
BEGIN
    IF last_run_at IS NULL THEN
        RETURN TRUE; -- Never run = overdue
    END IF;
    
    next_expected := jcron.next_time(pattern, last_run_at);
    
    IF next_expected IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN check_time > next_expected;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get time interval since last execution
CREATE OR REPLACE FUNCTION jcron.time_since_last(
    pattern TEXT,
    check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS INTERVAL AS $$
DECLARE
    prev_run TIMESTAMPTZ;
BEGIN
    prev_run := jcron.prev_time(pattern, check_time);
    
    IF prev_run IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN check_time - prev_run;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if time is last day of month
CREATE OR REPLACE FUNCTION jcron.is_month_end(
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN DATE_TRUNC('day', check_time) = 
           DATE_TRUNC('day', (DATE_TRUNC('month', check_time) + INTERVAL '1 month - 1 day'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if time is first day of month
CREATE OR REPLACE FUNCTION jcron.is_month_start(
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXTRACT(DAY FROM check_time)::INTEGER = 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if time is last day of quarter (Mar 31, Jun 30, Sep 30, Dec 31)
CREATE OR REPLACE FUNCTION jcron.is_quarter_end(
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
    month_num INTEGER;
BEGIN
    IF NOT jcron.is_month_end(check_time) THEN
        RETURN FALSE;
    END IF;
    
    month_num := EXTRACT(MONTH FROM check_time)::INTEGER;
    RETURN month_num IN (3, 6, 9, 12);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get day of week name
CREATE OR REPLACE FUNCTION jcron.get_day_name(
    check_time TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(check_time, 'Day');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 🎉 INSTALLATION COMPLETE
-- =====================================================
-- Run this file after jcron.sql to add helper functions
-- Usage: psql -d your_database -f jcron_helpers.sql
-- =====================================================
