-- test_cases.sql - PostgreSQL Test Cases for JCRON
-- Auto-generated from Go core_test.go and eod_test.go

-- Create schemas and tables
CREATE SCHEMA IF NOT EXISTS jcron_test;

-- Test cases table to store all test scenarios
CREATE TABLE IF NOT EXISTS jcron_test.test_cases (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- JCRON schedule components
    second VARCHAR(100),
    minute VARCHAR(100),
    hour VARCHAR(100),
    day_of_month VARCHAR(100),
    month VARCHAR(100),
    day_of_week VARCHAR(100),
    year VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- EOD components
    eod_expression VARCHAR(200),
    
    -- Test data
    from_time TIMESTAMPTZ,
    expected_next_time TIMESTAMPTZ,
    expected_prev_time TIMESTAMPTZ,
    
    -- Test metadata
    should_pass BOOLEAN DEFAULT TRUE,
    test_type VARCHAR(20) DEFAULT 'next', -- 'next', 'prev', 'parse', 'match', 'eod'
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing test data
TRUNCATE TABLE jcron_test.test_cases RESTART IDENTITY;

-- ===== CORE JCRON TEST CASES =====

-- Basic tests from core_test.go
INSERT INTO jcron_test.test_cases 
(category, test_name, description, second, minute, hour, day_of_month, month, day_of_week, year, timezone, from_time, expected_next_time, test_type)
VALUES 
-- Basic next time tests
('core', 'basit_sonraki_dakika', 'Basit Sonraki Dakika', '0', '*', '*', '*', '*', '*', '*', 'UTC', 
 '2025-10-26T10:00:30Z', '2025-10-26T10:01:00Z', 'next'),

('core', 'sonraki_saat_basi', 'Sonraki Saatin Başı', '0', '0', '*', '*', '*', '*', '*', 'UTC', 
 '2025-10-26T10:59:00Z', '2025-10-26T11:00:00Z', 'next'),

('core', 'sonraki_gun_basi', 'Sonraki Günün Başı', '0', '0', '0', '*', '*', '*', '*', 'UTC', 
 '2025-10-26T23:59:00Z', '2025-10-27T00:00:00Z', 'next'),

('core', 'sonraki_ay_basi', 'Sonraki Ayın Başı', '0', '0', '0', '1', '*', '*', '*', 'UTC', 
 '2025-02-15T12:00:00Z', '2025-03-01T00:00:00Z', 'next'),

('core', 'sonraki_yil_basi', 'Sonraki Yılın Başı', '0', '0', '0', '1', '1', '*', '*', 'UTC', 
 '2025-06-15T12:00:00Z', '2026-01-01T00:00:00Z', 'next'),

-- Range, step and list tests
('core', 'is_saatleri_icinde', 'İş Saatleri İçinde Sonraki Saat', '0', '0', '9-17', '*', '*', 'MON-FRI', '*', 'UTC', 
 '2025-03-03T10:30:00Z', '2025-03-03T11:00:00Z', 'next'),

('core', 'is_saati_sonrasi_atlama', 'İş Saati Sonundan Sonraki Güne Atlama', '0', '0', '9-17', '*', '*', 'MON-FRI', '*', 'UTC', 
 '2025-03-03T17:30:00Z', '2025-03-04T09:00:00Z', 'next'),

('core', 'hafta_sonu_atlama', 'Hafta Sonuna Atlama (Cuma -> Pazartesi)', '0', '0', '9-17', '*', '*', '1-5', '*', 'UTC', 
 '2025-03-07T18:00:00Z', '2025-03-10T09:00:00Z', 'next'),

('core', 'her_15_dakika', 'Her 15 Dakikada Bir', '0', '*/15', '*', '*', '*', '*', '*', 'UTC', 
 '2025-05-10T14:16:00Z', '2025-05-10T14:30:00Z', 'next'),

('core', 'belirli_aylarda', 'Belirli Aylarda Çalışma', '0', '0', '0', '1', '3,6,9,12', '*', '*', 'UTC', 
 '2025-03-15T10:00:00Z', '2025-06-01T00:00:00Z', 'next'),

-- Special characters (L, #) tests
('core', 'ayin_son_gunu_L', 'Ayın Son Günü (L)', '0', '0', '12', 'L', '*', '*', '*', 'UTC', 
 '2024-02-10T00:00:00Z', '2024-02-29T12:00:00Z', 'next'),

('core', 'ayin_son_gunu_L_sonraki', 'Ayın Son Günü (L) - Sonraki Ay', '0', '0', '12', 'L', '*', '*', '*', 'UTC', 
 '2025-04-30T13:00:00Z', '2025-05-31T12:00:00Z', 'next'),

('core', 'ayin_son_cumasi', 'Ayın Son Cuması (5L)', '0', '0', '22', '*', '*', '5L', '*', 'UTC', 
 '2025-08-01T00:00:00Z', '2025-08-29T22:00:00Z', 'next'),

('core', 'ayin_ikinci_salisi', 'Ayın İkinci Salısı (2#2)', '0', '0', '8', '*', '*', '2#2', '*', 'UTC', 
 '2025-11-01T00:00:00Z', '2025-11-11T08:00:00Z', 'next'),

('core', 'vixie_cron_or_mantigi', 'Vixie-Cron (OR Mantığı)', '0', '0', '0', '15', '*', 'MON', '*', 'UTC', 
 '2025-09-09T00:00:00Z', '2025-09-15T00:00:00Z', 'next'),

-- Shortcuts and timezone tests
('core', 'kisaltma_weekly', 'Kısaltma (@weekly)', '0', '0', '0', '*', '*', '0', '*', 'UTC', 
 '2025-01-01T12:00:00Z', '2025-01-05T00:00:00Z', 'next'),

('core', 'kisaltma_hourly', 'Kısaltma (@hourly)', '0', '0', '*', '*', '*', '*', '*', 'UTC', 
 '2025-01-01T15:00:00Z', '2025-01-01T16:00:00Z', 'next'),

('core', 'zaman_dilimi_istanbul', 'Zaman Dilimi (Istanbul)', '0', '30', '9', '*', '*', '*', '*', 'Europe/Istanbul', 
 '2025-10-26T03:00:00+03:00', '2025-10-26T09:30:00+03:00', 'next'),

('core', 'zaman_dilimi_newyork', 'Zaman Dilimi (New York)', '0', '0', '20', '4', '7', '*', '*', 'America/New_York', 
 '2025-07-01T00:00:00Z', '2025-07-04T20:00:00-04:00', 'next'),

('core', 'yil_belirtme', 'Yıl Belirtme', '0', '0', '0', '1', '1', '*', '2027', 'UTC', 
 '2025-01-01T00:00:00Z', '2027-01-01T00:00:00Z', 'next'),

('core', 'her_saniye_sonu', 'Her Saniyenin Sonu', '59', '59', '23', '31', '12', '*', '*', 'UTC', 
 '2025-12-31T23:59:58Z', '2025-12-31T23:59:59Z', 'next'),

-- Additional comprehensive tests
('core', 'her_5_saniye', 'Her 5 Saniyede', '*/5', '*', '*', '*', '*', '*', '*', 'UTC', 
 '2025-01-01T12:00:03Z', '2025-01-01T12:00:05Z', 'next'),

('core', 'belirli_saniyeler', 'Belirli Saniyeler', '15,30,45', '*', '*', '*', '*', '*', '*', 'UTC', 
 '2025-01-01T12:00:20Z', '2025-01-01T12:00:30Z', 'next'),

('core', 'hafta_ici_ogle', 'Hafta İçi Öğle', '0', '0', '12', '*', '*', '1-5', '*', 'UTC', 
 '2025-08-08T14:00:00Z', '2025-08-11T12:00:00Z', 'next'),

('core', 'ay_sonu_ve_basi', 'Ay Sonu ve Başı', '0', '0', '0', '1,L', '*', '*', '*', 'UTC', 
 '2025-01-15T12:00:00Z', '2025-01-31T00:00:00Z', 'next'),

('core', 'ceyrek_saatler', 'Çeyrek Saatler', '0', '0,15,30,45', '*', '*', '*', '*', '*', 'UTC', 
 '2025-01-01T10:20:00Z', '2025-01-01T10:30:00Z', 'next'),

('core', 'artik_yil_subat_29', 'Artık Yıl Şubat 29', '0', '0', '12', '29', '2', '*', '*', 'UTC', 
 '2023-12-01T00:00:00Z', '2024-02-29T12:00:00Z', 'next'),

('core', 'ayin_1_ve_3_pazartesi', 'Ayın 1. ve 3. Pazartesi', '0', '0', '9', '*', '*', '1#1,1#3', '*', 'UTC', 
 '2025-01-07T10:00:00Z', '2025-01-20T09:00:00Z', 'next'),

('core', 'zaman_dilimi_farki', 'Zaman Dilimi Farkı', '0', '0', '12', '*', '*', '*', '*', 'America/New_York', 
 '2025-01-01T10:00:00-05:00', '2025-01-01T12:00:00-05:00', 'next'),

('core', 'yilin_son_gunu', 'Yılın Son Günü', '59', '59', '23', '31', '12', '*', '*', 'UTC', 
 '2025-12-30T12:00:00Z', '2025-12-31T23:59:59Z', 'next');

-- ===== PREV FUNCTION TEST CASES =====

INSERT INTO jcron_test.test_cases 
(category, test_name, description, second, minute, hour, day_of_month, month, day_of_week, year, timezone, from_time, expected_prev_time, test_type)
VALUES 
-- Basic prev time tests
('core', 'basit_onceki_dakika', 'Basit Önceki Dakika', '0', '*', '*', '*', '*', '*', '*', 'UTC', 
 '2025-10-26T10:00:30Z', '2025-10-26T10:00:00Z', 'prev'),

('core', 'onceki_saat_basi', 'Önceki Saatin Başı', '0', '0', '*', '*', '*', '*', '*', 'UTC', 
 '2025-10-26T11:00:00Z', '2025-10-26T10:00:00Z', 'prev'),

('core', 'onceki_gun_basi', 'Önceki Günün Başı', '0', '0', '0', '*', '*', '*', '*', 'UTC', 
 '2025-10-27T00:00:00Z', '2025-10-26T00:00:00Z', 'prev'),

('core', 'onceki_ay_basi', 'Önceki Ayın Başı', '0', '0', '0', '1', '*', '*', '*', 'UTC', 
 '2025-03-15T12:00:00Z', '2025-03-01T00:00:00Z', 'prev'),

('core', 'onceki_yil_basi', 'Önceki Yılın Başı', '0', '0', '0', '1', '1', '*', '*', 'UTC', 
 '2026-06-15T12:00:00Z', '2026-01-01T00:00:00Z', 'prev'),

-- Range and list tests for prev
('core', 'is_saatleri_onceki', 'İş Saatleri İçinde Önceki Saat', '0', '0', '9-17', '*', '*', 'MON-FRI', '*', 'UTC', 
 '2025-03-03T10:30:00Z', '2025-03-03T10:00:00Z', 'prev'),

('core', 'is_saati_basindan_onceki', 'İş Saati Başından Önceki Güne Atlama', '0', '0', '9-17', '*', '*', 'MON-FRI', '*', 'UTC', 
 '2025-03-04T09:00:00Z', '2025-03-03T17:00:00Z', 'prev'),

('core', 'hafta_basina_atlama', 'Hafta Başına Atlama (Pazartesi -> Cuma)', '0', '0', '9-17', '*', '*', '1-5', '*', 'UTC', 
 '2025-03-10T08:00:00Z', '2025-03-07T17:00:00Z', 'prev'),

('core', 'her_15_dakika_prev', 'Her 15 Dakikada Bir (Prev)', '0', '*/15', '*', '*', '*', '*', '*', 'UTC', 
 '2025-05-10T14:31:00Z', '2025-05-10T14:30:00Z', 'prev'),

('core', 'belirli_aylarda_prev', 'Belirli Aylarda Çalışma (Prev)', '0', '0', '0', '1', '3,6,9,12', '*', '*', 'UTC', 
 '2025-05-15T10:00:00Z', '2025-03-01T00:00:00Z', 'prev');

-- ===== EOD TEST CASES =====

INSERT INTO jcron_test.test_cases 
(category, test_name, description, eod_expression, test_type, notes)
VALUES 
-- EOD parsing tests
('eod', 'simple_end_reference', 'Simple end reference parsing', 'E8H', 'parse', 'Should parse 8 hours with end reference'),
('eod', 'start_reference', 'Start reference parsing', 'S30M', 'parse', 'Should parse 30 minutes with start reference'),
('eod', 'complex_duration', 'Complex duration parsing', 'E1DT12H', 'parse', 'Should parse 1 day 12 hours with end reference'),
('eod', 'end_of_month', 'Until end of month', 'E2DT4H M', 'parse', 'Should parse 2 days 4 hours until end of month'),
('eod', 'end_of_quarter', 'Until end of quarter', 'E1Y6M Q', 'parse', 'Should parse 1 year 6 months until end of quarter'),
('eod', 'with_event_identifier', 'With event identifier', 'E30M E[event_completion]', 'parse', 'Should parse with event identifier'),
('eod', 'invalid_format', 'Invalid format', 'INVALID', 'parse', 'Should fail parsing'),
('eod', 'empty_string', 'Empty string', '', 'parse', 'Should fail parsing'),
('eod', 'no_duration_components', 'No duration components', 'E', 'parse', 'Should fail parsing');

-- EOD validation tests
INSERT INTO jcron_test.test_cases 
(category, test_name, description, eod_expression, test_type, should_pass, notes)
VALUES 
('eod', 'valid_e8h', 'Valid E8H', 'E8H', 'validate', TRUE, 'Should validate successfully'),
('eod', 'valid_s30m', 'Valid S30M', 'S30M', 'validate', TRUE, 'Should validate successfully'),
('eod', 'valid_e1dt12h', 'Valid E1DT12H', 'E1DT12H', 'validate', TRUE, 'Should validate successfully'),
('eod', 'valid_e2dt4h_m', 'Valid E2DT4H M', 'E2DT4H M', 'validate', TRUE, 'Should validate successfully'),
('eod', 'invalid_format', 'Invalid format', 'INVALID', 'validate', FALSE, 'Should fail validation'),
('eod', 'empty_string_val', 'Empty string validation', '', 'validate', FALSE, 'Should fail validation'),
('eod', 'valid_e25h', 'Valid E25H (unusual but valid)', 'E25H', 'validate', TRUE, 'Should validate even if unusual');

-- EOD calculation tests with specific times
INSERT INTO jcron_test.test_cases 
(category, test_name, description, eod_expression, from_time, expected_next_time, test_type, notes)
VALUES 
('eod', 'simple_duration_calc', 'Simple duration calculation', 'E2H', 
 '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z', 'eod', 'Should add 2 hours to start time'),

('eod', 'end_of_day_calc', 'End of day calculation', 'E2H D', 
 '2024-01-15T10:00:00Z', '2024-01-15T23:59:59Z', 'eod', 'Should calculate end of day'),

('eod', 'end_of_month_calc', 'End of month calculation', 'E5D M', 
 '2024-01-15T10:00:00Z', '2024-01-31T23:59:59Z', 'eod', 'Should calculate end of month');

-- ===== SPECIAL CHARACTER TESTS =====

INSERT INTO jcron_test.test_cases 
(category, test_name, description, second, minute, hour, day_of_month, month, day_of_week, year, timezone, test_type, notes)
VALUES 
('special', 'L_pattern_last_day', 'L pattern for last day of month', '0', '0', '12', 'L', '*', '*', '*', 'UTC', 'parse', 'Should handle L pattern correctly'),
('special', 'hash_pattern_nth_weekday', 'Hash pattern for nth weekday', '0', '0', '8', '*', '*', '2#2', '*', 'UTC', 'parse', 'Should handle 2#2 pattern correctly'),
('special', 'last_weekday_pattern', 'Last weekday pattern', '0', '0', '22', '*', '*', '5L', '*', 'UTC', 'parse', 'Should handle 5L pattern correctly'),
('special', 'complex_special_mix', 'Complex special character mix', '0', '0', '12', 'L', '*', '5L', '*', 'UTC', 'parse', 'Should handle mixed special patterns'),
('special', 'multiple_hash_patterns', 'Multiple hash patterns', '0', '0', '14', '*', '*', '1#2,3#3,5#4', '*', 'UTC', 'parse', 'Should handle multiple # patterns');

-- ===== PERFORMANCE TEST BENCHMARKS =====

INSERT INTO jcron_test.test_cases 
(category, test_name, description, second, minute, hour, day_of_month, month, day_of_week, year, timezone, test_type, notes)
VALUES 
('performance', 'simple_hourly', 'Simple hourly schedule', '0', '0', '*', '*', '*', '*', '*', 'UTC', 'benchmark', 'Every hour benchmark'),
('performance', 'complex_business_hours', 'Complex business hours', '0', '5,15,25,35,45,55', '8-17', '*', '*', '1-5', '*', 'UTC', 'benchmark', 'Business hours with multiple minutes'),
('performance', 'special_chars_benchmark', 'Special characters benchmark', '0', '0', '12', 'L', '*', '5#3', '*', 'UTC', 'benchmark', 'Special patterns performance'),
('performance', 'timezone_benchmark', 'Timezone benchmark', '0', '30', '9', '*', '*', '1-5', '*', 'America/New_York', 'benchmark', 'Timezone performance'),
('performance', 'frequent_execution', 'Frequent execution', '*/5', '*', '*', '*', '*', '*', '*', 'UTC', 'benchmark', 'Every 5 seconds'),
('performance', 'rare_execution', 'Rare execution', '0', '0', '0', '1', '1', '*', '*', 'UTC', 'benchmark', 'Once a year');

-- ===== TEST RUNNER FUNCTIONS =====

-- Function to run core JCRON tests
CREATE OR REPLACE FUNCTION jcron_test.run_core_tests()
RETURNS TABLE (
    test_id INTEGER,
    test_name VARCHAR,
    category VARCHAR,
    test_type VARCHAR,
    status VARCHAR,
    actual_result TIMESTAMPTZ,
    expected_result TIMESTAMPTZ,
    execution_time_ms NUMERIC,
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    test_record RECORD;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    actual_time TIMESTAMPTZ;
    test_status VARCHAR := 'PASS';
    error_msg TEXT := NULL;
BEGIN
    FOR test_record IN 
        SELECT * FROM jcron_test.test_cases 
        WHERE category = 'core' AND test_type IN ('next', 'prev')
        ORDER BY id
    LOOP
        BEGIN
            start_time := clock_timestamp();
            
            IF test_record.test_type = 'next' THEN
                SELECT jcron.next_time(
                    test_record.second, test_record.minute, test_record.hour,
                    test_record.day_of_month, test_record.month, test_record.day_of_week,
                    test_record.year, test_record.timezone, test_record.from_time
                ) INTO actual_time;
                
                IF actual_time != test_record.expected_next_time THEN
                    test_status := 'FAIL';
                ELSE
                    test_status := 'PASS';
                END IF;
                
            ELSIF test_record.test_type = 'prev' THEN
                SELECT jcron.prev_time(
                    test_record.second, test_record.minute, test_record.hour,
                    test_record.day_of_month, test_record.month, test_record.day_of_week,
                    test_record.year, test_record.timezone, test_record.from_time
                ) INTO actual_time;
                
                IF actual_time != test_record.expected_prev_time THEN
                    test_status := 'FAIL';
                ELSE
                    test_status := 'PASS';
                END IF;
            END IF;
            
            end_time := clock_timestamp();
            
        EXCEPTION WHEN OTHERS THEN
            test_status := 'ERROR';
            error_msg := SQLERRM;
            actual_time := NULL;
            end_time := clock_timestamp();
        END;
        
        RETURN QUERY SELECT 
            test_record.id,
            test_record.test_name,
            test_record.category,
            test_record.test_type,
            test_status,
            actual_time,
            COALESCE(test_record.expected_next_time, test_record.expected_prev_time),
            EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
            error_msg;
            
        -- Reset variables
        test_status := 'PASS';
        error_msg := NULL;
    END LOOP;
END;
$$;

-- Function to run EOD tests
CREATE OR REPLACE FUNCTION jcron_test.run_eod_tests()
RETURNS TABLE (
    test_id INTEGER,
    test_name VARCHAR,
    category VARCHAR,
    test_type VARCHAR,
    status VARCHAR,
    actual_result TEXT,
    expected_result TEXT,
    execution_time_ms NUMERIC,
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    test_record RECORD;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    test_status VARCHAR := 'PASS';
    error_msg TEXT := NULL;
    parse_result RECORD;
    is_valid BOOLEAN;
    actual_result_text TEXT;
    expected_result_text TEXT;
BEGIN
    FOR test_record IN 
        SELECT * FROM jcron_test.test_cases 
        WHERE category = 'eod'
        ORDER BY id
    LOOP
        BEGIN
            start_time := clock_timestamp();
            
            IF test_record.test_type = 'parse' THEN
                BEGIN
                    SELECT * FROM jcron.parse_eod(test_record.eod_expression) INTO parse_result;
                    
                    IF test_record.should_pass THEN
                        test_status := 'PASS';
                        actual_result_text := 'PARSED_OK';
                        expected_result_text := 'PARSED_OK';
                    ELSE
                        test_status := 'FAIL';
                        actual_result_text := 'PARSED_OK';
                        expected_result_text := 'SHOULD_FAIL';
                    END IF;
                    
                EXCEPTION WHEN OTHERS THEN
                    IF test_record.should_pass THEN
                        test_status := 'FAIL';
                        actual_result_text := 'PARSE_ERROR';
                        expected_result_text := 'PARSED_OK';
                    ELSE
                        test_status := 'PASS';
                        actual_result_text := 'PARSE_ERROR';
                        expected_result_text := 'PARSE_ERROR';
                    END IF;
                END;
                
            ELSIF test_record.test_type = 'validate' THEN
                SELECT jcron.is_valid_eod(test_record.eod_expression) INTO is_valid;
                
                IF is_valid = test_record.should_pass THEN
                    test_status := 'PASS';
                ELSE
                    test_status := 'FAIL';
                END IF;
                
                actual_result_text := is_valid::TEXT;
                expected_result_text := test_record.should_pass::TEXT;
                
            ELSIF test_record.test_type = 'eod' THEN
                -- EOD calculation tests would go here
                -- This requires implementing EOD calculation functions
                test_status := 'SKIP';
                actual_result_text := 'NOT_IMPLEMENTED';
                expected_result_text := 'NOT_IMPLEMENTED';
            END IF;
            
            end_time := clock_timestamp();
            
        EXCEPTION WHEN OTHERS THEN
            test_status := 'ERROR';
            error_msg := SQLERRM;
            actual_result_text := 'ERROR';
            expected_result_text := 'UNKNOWN';
            end_time := clock_timestamp();
        END;
        
        RETURN QUERY SELECT 
            test_record.id,
            test_record.test_name,
            test_record.category,
            test_record.test_type,
            test_status,
            actual_result_text,
            expected_result_text,
            EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
            error_msg;
            
        -- Reset variables
        test_status := 'PASS';
        error_msg := NULL;
    END LOOP;
END;
$$;

-- Function to run all tests
CREATE OR REPLACE FUNCTION jcron_test.run_all_tests()
RETURNS TABLE (
    test_id INTEGER,
    test_name VARCHAR,
    category VARCHAR,
    test_type VARCHAR,
    status VARCHAR,
    actual_result TEXT,
    expected_result TEXT,
    execution_time_ms NUMERIC,
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Run core tests
    RETURN QUERY 
    SELECT 
        t.test_id, t.test_name, t.category, t.test_type, t.status,
        t.actual_result::TEXT, t.expected_result::TEXT,
        t.execution_time_ms, t.error_message
    FROM jcron_test.run_core_tests() t;
    
    -- Run EOD tests
    RETURN QUERY 
    SELECT * FROM jcron_test.run_eod_tests();
END;
$$;

-- Function to get test summary
CREATE OR REPLACE FUNCTION jcron_test.get_test_summary()
RETURNS TABLE (
    category VARCHAR,
    total_tests BIGINT,
    passed_tests BIGINT,
    failed_tests BIGINT,
    error_tests BIGINT,
    skipped_tests BIGINT,
    pass_rate NUMERIC,
    avg_execution_time_ms NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH test_results AS (
        SELECT * FROM jcron_test.run_all_tests()
    )
    SELECT 
        r.category,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE r.status = 'PASS') as passed_tests,
        COUNT(*) FILTER (WHERE r.status = 'FAIL') as failed_tests,
        COUNT(*) FILTER (WHERE r.status = 'ERROR') as error_tests,
        COUNT(*) FILTER (WHERE r.status = 'SKIP') as skipped_tests,
        ROUND(
            (COUNT(*) FILTER (WHERE r.status = 'PASS')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
        ) as pass_rate,
        ROUND(AVG(r.execution_time_ms), 3) as avg_execution_time_ms
    FROM test_results r
    GROUP BY r.category
    ORDER BY r.category;
END;
$$;

-- Create performance benchmark function
CREATE OR REPLACE FUNCTION jcron_test.run_performance_benchmark(iterations INTEGER DEFAULT 1000)
RETURNS TABLE (
    operation VARCHAR,
    total_time_ms NUMERIC,
    avg_time_us NUMERIC,
    ops_per_sec INTEGER,
    total_operations INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration_ms NUMERIC;
    test_time TIMESTAMPTZ := '2025-01-01T12:00:00Z';
    i INTEGER;
BEGIN
    -- Benchmark next_time function
    start_time := clock_timestamp();
    FOR i IN 1..iterations LOOP
        PERFORM jcron.next_time('0', '0', '*', '*', '*', '*', '*', 'UTC', test_time);
    END LOOP;
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Next Time'::VARCHAR,
        duration_ms,
        (duration_ms * 1000) / iterations,
        (iterations / (duration_ms / 1000))::INTEGER,
        iterations;
    
    -- Benchmark prev_time function
    start_time := clock_timestamp();
    FOR i IN 1..iterations LOOP
        PERFORM jcron.prev_time('0', '0', '*', '*', '*', '*', '*', 'UTC', test_time);
    END LOOP;
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Prev Time'::VARCHAR,
        duration_ms,
        (duration_ms * 1000) / iterations,
        (iterations / (duration_ms / 1000))::INTEGER,
        iterations;
    
    -- Benchmark is_match function
    start_time := clock_timestamp();
    FOR i IN 1..iterations LOOP
        PERFORM jcron.is_match('0', '0', '*', '*', '*', '*', '*', 'UTC', test_time);
    END LOOP;
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Is Match'::VARCHAR,
        duration_ms,
        (duration_ms * 1000) / iterations,
        (iterations / (duration_ms / 1000))::INTEGER,
        iterations;
    
    -- Benchmark parse_expression function
    start_time := clock_timestamp();
    FOR i IN 1..iterations LOOP
        PERFORM jcron.parse_expression('0', '0', '*', '*', '*', '*', '*', 'UTC');
    END LOOP;
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Parse Expression'::VARCHAR,
        duration_ms,
        (duration_ms * 1000) / iterations,
        (iterations / (duration_ms / 1000))::INTEGER,
        iterations;
        
    -- Benchmark EOD parsing if available
    BEGIN
        start_time := clock_timestamp();
        FOR i IN 1..iterations LOOP
            PERFORM jcron.is_valid_eod('E8H');
        END LOOP;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY SELECT 
            'EOD Validation'::VARCHAR,
            duration_ms,
            (duration_ms * 1000) / iterations,
            (iterations / (duration_ms / 1000))::INTEGER,
            iterations;
    EXCEPTION WHEN OTHERS THEN
        -- EOD functions not available, skip
        NULL;
    END;
END;
$$;

-- Usage examples and documentation
COMMENT ON TABLE jcron_test.test_cases IS 'Comprehensive test cases for JCRON functionality based on Go test files';
COMMENT ON FUNCTION jcron_test.run_core_tests() IS 'Run core JCRON next/prev time calculation tests';
COMMENT ON FUNCTION jcron_test.run_eod_tests() IS 'Run End of Duration (EOD) parsing and validation tests';
COMMENT ON FUNCTION jcron_test.run_all_tests() IS 'Run all test categories and return unified results';
COMMENT ON FUNCTION jcron_test.get_test_summary() IS 'Get summary statistics for all test categories';
COMMENT ON FUNCTION jcron_test.run_performance_benchmark(INTEGER) IS 'Run performance benchmarks for JCRON operations';

-- Example usage:
/*
-- Run all tests and get summary
SELECT * FROM jcron_test.get_test_summary();

-- Run specific core tests
SELECT * FROM jcron_test.run_core_tests() WHERE status != 'PASS';

-- Run EOD tests
SELECT * FROM jcron_test.run_eod_tests();

-- Run performance benchmark
SELECT * FROM jcron_test.run_performance_benchmark(10000);

-- Get specific test cases
SELECT * FROM jcron_test.test_cases WHERE category = 'core' AND test_type = 'next' LIMIT 5;

-- Get failing tests only
SELECT test_name, category, status, error_message 
FROM jcron_test.run_all_tests() 
WHERE status IN ('FAIL', 'ERROR');
*/
