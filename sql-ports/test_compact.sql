-- ===================================================================
-- JCRON PostgreSQL Implementation - Comprehensive Test Suite
-- All core_test.go + eod_test.go tests in a single result table
-- Tests: 40 Next + 21 Prev + 24 EOD = 85 total test scenarios
-- ===================================================================

\timing on
\echo 'Running comprehensive jcron test suite (85 tests) in compact format...'

-- Load the implementation

-- Create temporary table for all test results
CREATE TEMP TABLE if not exists test_results (
    test_id INTEGER,
    test_name TEXT,
    expression TEXT,
    from_time TEXT,
    expected_result TEXT,
    actual_result TEXT,
    passed BOOLEAN,
    error_message TEXT
);

-- Insert all test cases (40 Next tests + 21 Prev tests + 24 EOD tests = 85 total)
INSERT INTO test_results (test_id, test_name, expression, from_time, expected_result, actual_result, passed, error_message)
SELECT * FROM (
    VALUES
    -- === NEXT TIME TESTS (1-40) ===
    -- Basic tests
    (1, 'Basit Sonraki Dakika', '0 * * * * *', '2025-10-26T10:00:30Z', '2025-10-26T10:01:00Z', '', false, ''),
    (2, 'Sonraki Saatin Başı', '0 0 * * * *', '2025-10-26T10:59:00Z', '2025-10-26T11:00:00Z', '', false, ''),
    (3, 'Sonraki Günün Başı', '0 0 0 * * *', '2025-10-26T23:59:00Z', '2025-10-27T00:00:00Z', '', false, ''),
    (4, 'Sonraki Ayın Başı', '0 0 0 1 * *', '2025-02-15T12:00:00Z', '2025-03-01T00:00:00Z', '', false, ''),
    (5, 'Sonraki Yılın Başı', '0 0 0 1 1 *', '2025-06-15T12:00:00Z', '2026-01-01T00:00:00Z', '', false, ''),

    -- Range and step tests
    (6, 'İş Saatleri İçinde', '0 0 9-17 * * MON-FRI', '2025-03-03T10:30:00Z', '2025-03-03T11:00:00Z', '', false, ''),
    (7, 'İş Saati Sonu Atlama', '0 0 9-17 * * MON-FRI', '2025-03-03T17:30:00Z', '2025-03-04T09:00:00Z', '', false, ''),
    (8, 'Hafta Sonu Atlama', '0 0 9-17 * * 1-5', '2025-03-07T18:00:00Z', '2025-03-10T09:00:00Z', '', false, ''),
    (9, 'Her 15 Dakikada', '0 */15 * * * *', '2025-05-10T14:16:00Z', '2025-05-10T14:30:00Z', '', false, ''),
    (10, 'Belirli Aylarda', '0 0 0 1 3,6,9,12 *', '2025-03-15T10:00:00Z', '2025-06-01T00:00:00Z', '', false, ''),

    -- Special patterns (L, #)
    (11, 'Ayın Son Günü (L) Artık', '0 0 12 L * *', '2024-02-10T00:00:00Z', '2024-02-29T12:00:00Z', '', false, ''),
    (12, 'Ayın Son Günü (L) Normal', '0 0 12 L * *', '2025-04-30T13:00:00Z', '2025-05-31T12:00:00Z', '', false, ''),
    (13, 'Ayın Son Cuması (5L)', '0 0 22 * * 5L', '2025-08-01T00:00:00Z', '2025-08-29T22:00:00Z', '', false, ''),
    (14, 'Ayın İkinci Salısı (2#2)', '0 0 8 * * 2#2', '2025-11-01T00:00:00Z', '2025-11-11T08:00:00Z', '', false, ''),
    (15, 'Vixie-Cron OR Mantığı', '0 0 0 15 * MON', '2025-09-09T00:00:00Z', '2025-09-15T00:00:00Z', '', false, ''),

    -- Shortcuts and timezone
    (16, '@weekly Kısaltması', '0 0 0 * * 0', '2025-01-01T12:00:00Z', '2025-01-05T00:00:00Z', '', false, ''),
    (17, '@hourly Kısaltması', '0 0 * * * *', '2025-01-01T15:00:00Z', '2025-01-01T16:00:00Z', '', false, ''),
    (18, 'Yıl Belirtme', '0 0 0 1 1 * 2027', '2025-01-01T00:00:00Z', '2027-01-01T00:00:00Z', '', false, ''),
    (19, 'Her Saniyenin Sonu', '59 59 23 31 12 *', '2025-12-31T23:59:58Z', '2025-12-31T23:59:59Z', '', false, ''),

    -- Additional comprehensive tests
    (20, 'Her 5 Saniyede', '*/5 * * * * *', '2025-01-01T12:00:03Z', '2025-01-01T12:00:05Z', '', false, ''),
    (21, 'Belirli Saniyeler', '15,30,45 * * * * *', '2025-01-01T12:00:20Z', '2025-01-01T12:00:30Z', '', false, ''),
    (22, 'Hafta İçi Öğle', '0 0 12 * * 1-5', '2025-08-08T14:00:00Z', '2025-08-11T12:00:00Z', '', false, ''),
    (23, 'Ay Sonu ve Başı', '0 0 0 1,L * *', '2025-01-15T12:00:00Z', '2025-01-31T00:00:00Z', '', false, ''),
    (24, 'Çeyrek Saatler', '0 0,15,30,45 * * * *', '2025-01-01T10:20:00Z', '2025-01-01T10:30:00Z', '', false, ''),
    (25, 'Artık Yıl Şubat 29', '0 0 12 29 2 *', '2023-12-01T00:00:00Z', '2024-02-29T12:00:00Z', '', false, ''),
    (26, 'Ayın 1. ve 3. Pazartesi', '0 0 9 * * 1#1,1#3', '2025-01-07T10:00:00Z', '2025-01-20T09:00:00Z', '', false, ''),
    (27, 'Yılın Son Günü', '59 59 23 31 12 *', '2025-12-30T12:00:00Z', '2025-12-31T23:59:59Z', '', false, ''),
    (28, 'Karma Özel Karakterler', '0 0 12 L * 5L', '2025-01-01T00:00:00Z', '2025-01-31T12:00:00Z', '', false, ''),
    (29, 'Çoklu # Patterns', '0 0 14 * * 1#2,3#3,5#4', '2025-01-01T00:00:00Z', '2025-01-13T14:00:00Z', '', false, ''),
    (30, 'Saniye Seviyesi Adım', '*/10 */5 * * * *', '2025-01-01T12:05:25Z', '2025-01-01T12:05:30Z', '', false, ''),
    (31, 'Gece Yarısı Geçişi', '30 59 23 * * *', '2025-12-31T23:59:25Z', '2025-12-31T23:59:30Z', '', false, ''),
    (32, 'Şubat 29 Normal Yıl', '0 0 12 29 2 *', '2025-01-01T00:00:00Z', '2028-02-29T12:00:00Z', '', false, ''),
    (33, 'Hafta İçi + Belirli Gün', '0 0 9 15 * 1-5', '2025-01-10T00:00:00Z', '2025-01-10T09:00:00Z', '', false, ''),
    (34, 'Maksimum Değerler', '59 59 23 31 12 *', '2025-12-31T23:59:58Z', '2025-12-31T23:59:59Z', '', false, ''),
    (35, 'Minimum Değerler', '0 0 0 1 1 *', '2024-12-31T23:59:59Z', '2025-01-01T00:00:00Z', '', false, ''),
    (36, 'Karma Liste ve Aralık', '0 0,30 8-12,14-18 1,15 1,6,12 *', '2025-01-01T08:15:00Z', '2025-01-01T08:30:00Z', '', false, ''),

    -- Range and step value tests
    (37, 'Dakika Aralığı', '0 10-15 * * * *', '2025-10-26T14:08:00Z', '2025-10-26T14:10:00Z', '', false, ''),
    (38, 'Saat Aralığı', '0 0 9-17 * * *', '2025-10-26T18:00:00Z', '2025-10-27T09:00:00Z', '', false, ''),
    (39, 'Gün Aralığı', '0 0 12 10-20 * *', '2025-10-26T13:00:00Z', '2025-11-10T12:00:00Z', '', false, ''),
    (40, 'Her 5 Günde', '0 0 0 */5 * *', '2025-10-26T01:00:00Z', '2025-10-31T00:00:00Z', '', false, ''),

    -- === PREV TIME TESTS (41-61) ===
    (41, 'Prev: Basit Önceki Dakika', '0 * * * * *', '2025-10-26T10:00:30Z', '2025-10-26T10:00:00Z', '', false, ''),
    (42, 'Prev: Önceki Saatin Başı', '0 0 * * * *', '2025-10-26T11:00:00Z', '2025-10-26T10:00:00Z', '', false, ''),
    (43, 'Prev: Önceki Günün Başı', '0 0 0 * * *', '2025-10-27T00:00:00Z', '2025-10-26T00:00:00Z', '', false, ''),
    (44, 'Prev: Önceki Ayın Başı', '0 0 0 1 * *', '2025-03-15T12:00:00Z', '2025-03-01T00:00:00Z', '', false, ''),
    (45, 'Prev: Önceki Yılın Başı', '0 0 0 1 1 *', '2026-06-15T12:00:00Z', '2026-01-01T00:00:00Z', '', false, ''),
    (46, 'Prev: İş Saatleri İçinde', '0 0 9-17 * * MON-FRI', '2025-03-03T10:30:00Z', '2025-03-03T10:00:00Z', '', false, ''),
    (47, 'Prev: İş Saati Başından Atlama', '0 0 9-17 * * MON-FRI', '2025-03-04T09:00:00Z', '2025-03-03T17:00:00Z', '', false, ''),
    (48, 'Prev: Hafta Başına Atlama', '0 0 9-17 * * 1-5', '2025-03-10T08:00:00Z', '2025-03-07T17:00:00Z', '', false, ''),
    (49, 'Prev: Her 15 Dakikada', '0 */15 * * * *', '2025-05-10T14:31:00Z', '2025-05-10T14:30:00Z', '', false, ''),
    (50, 'Prev: Belirli Aylarda', '0 0 0 1 3,6,9,12 *', '2025-05-15T10:00:00Z', '2025-03-01T00:00:00Z', '', false, ''),
    (51, 'Prev: Ayın Son Günü (L)', '0 0 12 L * *', '2024-03-10T00:00:00Z', '2024-02-29T12:00:00Z', '', false, ''),
    (52, 'Prev: Ayın Son Günü Normal', '0 0 12 L * *', '2025-05-31T11:00:00Z', '2025-04-30T12:00:00Z', '', false, ''),
    (53, 'Prev: Ayın Son Cuması', '0 0 22 * * 5L', '2025-09-01T00:00:00Z', '2025-08-29T22:00:00Z', '', false, ''),
    (54, 'Prev: Ayın İkinci Salısı', '0 0 8 * * 2#2', '2025-11-20T00:00:00Z', '2025-11-11T08:00:00Z', '', false, ''),
    (55, 'Prev: Vixie-Cron OR', '0 0 0 15 * MON', '2025-09-17T00:00:00Z', '2025-09-15T00:00:00Z', '', false, ''),
    (56, 'Prev: @weekly', '0 0 0 * * 0', '2025-01-08T12:00:00Z', '2025-01-05T00:00:00Z', '', false, ''),
    (57, 'Prev: @hourly', '0 0 * * * *', '2025-01-01T15:00:00Z', '2025-01-01T14:00:00Z', '', false, ''),
    (58, 'Prev: Yıl Belirtme', '0 0 0 1 1 * 2025', '2027-01-01T00:00:00Z', '2025-01-01T00:00:00Z', '', false, ''),
    (59, 'Prev: Her Saniyenin Başı', '0 0 0 1 1 *', '2025-01-01T00:00:01Z', '2025-01-01T00:00:00Z', '', false, ''),
    (60, 'Prev: Maksimum Test', '59 59 23 31 12 *', '2026-01-01T00:00:00Z', '2025-12-31T23:59:59Z', '', false, ''),
    (61, 'Prev: Minimum Test', '0 0 0 1 1 *', '2025-01-01T00:00:01Z', '2025-01-01T00:00:00Z', '', false, ''),

    -- === EOD (End of Duration) TESTS (62-85) ===
    -- Basic EOD pattern tests
    (62, 'EOD: Basit 8 Saat', '0 9 * * 1-5 EOD:E8H', '2025-01-15T10:00:00Z', '2025-01-15T18:00:00Z', '', false, ''),
    (63, 'EOD: 30 Dakika', '0 30 14 * * * EOD:E30M', '2025-01-15T14:30:00Z', '2025-01-15T15:00:00Z', '', false, ''),
    (64, 'EOD: Karmaşık Süre', '0 0 9 * * * EOD:E1DT12H', '2025-01-15T09:00:00Z', '2025-01-16T21:00:00Z', '', false, ''),
    (65, 'EOD: Gün Sonu Referansı', '0 9 * * 1-5 EOD:E2H D', '2025-01-15T09:00:00Z', '2025-01-15T23:59:59Z', '', false, ''),
    (66, 'EOD: Hafta Sonu Referansı', '0 0 9 * * 1 EOD:E1DT12H W', '2025-01-13T09:00:00Z', '2025-01-19T23:59:59Z', '', false, ''),
    (67, 'EOD: Ay Sonu Referansı', '0 0 0 1 * * EOD:E5D M', '2025-01-01T00:00:00Z', '2025-01-31T23:59:59Z', '', false, ''),
    (68, 'EOD: Çeyrek Sonu Referansı', '0 0 12 1 1,4,7,10 * EOD:E10H Q', '2025-01-01T12:00:00Z', '2025-03-31T23:59:59Z', '', false, ''),
    (69, 'EOD: Yıl Sonu Referansı', '0 0 0 1 1 * EOD:E1Y Y', '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z', '', false, ''),

    -- Start reference tests
    (70, 'EOD: Başlangıç Referansı', '0 9 * * 1-5 EOD:S8H', '2025-01-15T10:00:00Z', '2025-01-15T18:00:00Z', '', false, ''),
    (71, 'EOD: Başlangıç 30 Dakika', '0 30 14 * * * EOD:S30M', '2025-01-15T14:30:00Z', '2025-01-15T15:00:00Z', '', false, ''),
    (72, 'EOD: Başlangıçtan Kompleks', '0 0 9 * * * EOD:S2DT4H', '2025-01-15T09:00:00Z', '2025-01-17T13:00:00Z', '', false, ''),

    -- Event identifier tests
    (73, 'EOD: Proje Deadline', '0 9 * * 1-5 EOD:E8H E[project_deadline]', '2025-01-15T09:00:00Z', '2025-01-15T17:00:00Z', '', false, ''),
    (74, 'EOD: Sprint Bitişi', '0 0 9 * * 1 EOD:E2W E[sprint_end]', '2025-01-13T09:00:00Z', '2025-01-27T09:00:00Z', '', false, ''),
    (75, 'EOD: Etkinlik Tamamlama', '0 30 14 * * * EOD:E30M E[event_completion]', '2025-01-15T14:30:00Z', '2025-01-15T15:00:00Z', '', false, ''),

    -- Complex duration combinations
    (76, 'EOD: Yıl+Ay+Gün+Saat', '0 0 0 1 1 * EOD:E1Y6M2DT4H', '2025-01-01T00:00:00Z', '2026-08-03T04:00:00Z', '', false, ''),
    (77, 'EOD: Hafta+Gün+Saat+Dakika', '0 0 9 * * 1 EOD:E2W3DT6H30M', '2025-01-13T09:00:00Z', '2025-02-03T15:30:00Z', '', false, ''),
    (78, 'EOD: Saniye Dahil', '0 0 12 * * * EOD:E2H30M45S', '2025-01-15T12:00:00Z', '2025-01-15T14:30:45Z', '', false, ''),

    -- Edge cases and validation
    (79, 'EOD: Sıfır Değerler', '0 0 0 * * * EOD:E0H', '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z', '', false, ''),
    (80, 'EOD: Büyük Değerler', '0 0 0 1 * * EOD:E25H', '2025-01-01T00:00:00Z', '2025-01-02T01:00:00Z', '', false, ''),
    (81, 'EOD: Ay Sınırı Geçişi', '0 0 0 28 2 * EOD:E5D', '2025-02-28T00:00:00Z', '2025-03-05T00:00:00Z', '', false, ''),
    (82, 'EOD: Artık Yıl Şubat', '0 0 0 28 2 * EOD:E2D', '2024-02-28T00:00:00Z', '2024-03-01T00:00:00Z', '', false, ''),
    (83, 'EOD: Yıl Geçişi', '0 0 0 30 12 * EOD:E3D', '2025-12-30T00:00:00Z', '2026-01-02T00:00:00Z', '', false, ''),
    (84, 'EOD: Hafta Geçişi', '0 0 18 * * 5 EOD:E3D', '2025-01-17T18:00:00Z', '2025-01-20T18:00:00Z', '', false, ''),
    (85, 'EOD: DST Geçişi', '0 0 1 * * * TZ:Europe/Istanbul EOD:E25H', '2025-03-30T01:00:00Z', '2025-03-31T03:00:00Z', '', false, '')
) AS t(test_id, test_name, expression, from_time, expected_result, actual_result, passed, error_message);

-- Update actual results and pass/fail status
DO $$
DECLARE
    test_row RECORD;
    actual_time TIMESTAMPTZ;
    error_msg TEXT;
BEGIN
    FOR test_row IN SELECT * FROM test_results ORDER BY test_id LOOP
        BEGIN
            -- Calculate actual result
            IF test_row.test_id <= 40 THEN
                -- Next time tests
                actual_time := jcron.next_time(
                    jcron.parse_expression(test_row.expression),
                    test_row.from_time::timestamptz
                );
            ELSIF test_row.test_id <= 61 THEN
                -- Prev time tests
                actual_time := jcron.prev_time(
                    jcron.parse_expression(test_row.expression),
                    test_row.from_time::timestamptz
                );
            ELSE
                -- EOD tests (62-85) - Use direct EOD calculation
                IF test_row.expression LIKE '%EOD:%' THEN
                    -- Calculate EOD end time directly from from_time (matches Go's schedule.EndOf behavior)
                    actual_time := jcron.eod_time(
                        test_row.expression,
                        test_row.from_time::timestamptz
                    );
                ELSE
                    actual_time := jcron.next_time(
                        jcron.parse_expression(test_row.expression),
                        test_row.from_time::timestamptz
                    );
                END IF;
            END IF;

            -- Update result
            UPDATE test_results
            SET actual_result = actual_time::text,
                passed = (actual_time = test_row.expected_result::timestamptz),
                error_message = ''
            WHERE test_id = test_row.test_id;

        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
            UPDATE test_results
            SET actual_result = 'ERROR',
                passed = false,
                error_message = SQLERRM
            WHERE test_id = test_row.test_id;
        END;
    END LOOP;
END $$;

-- Display results in a nice format
\echo ''
\echo '======================================================'
\echo 'JCRON PostgreSQL Test Results Summary'
\echo '======================================================'

SELECT
    CASE
        WHEN passed THEN '✅'
        ELSE '❌'
    END as status,
    LPAD(test_id::text, 2, '0') as id,
    LEFT(test_name, 25) as test_name,
    LEFT(expression, 20) as expression,
    CASE
        WHEN passed THEN 'PASS'
        WHEN error_message != '' THEN 'ERROR'
        ELSE 'FAIL'
    END as result,
    CASE
        WHEN NOT passed AND error_message = '' THEN
            'Expected: ' || expected_result || ', Got: ' || actual_result
        WHEN error_message != '' THEN
            LEFT(error_message, 50)
        ELSE ''
    END as details
FROM test_results
ORDER BY test_id;

-- Summary statistics
\echo ''
\echo '======================================================'
\echo 'Test Summary'
\echo '======================================================'

SELECT
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE passed) as passed_tests,
    COUNT(*) FILTER (WHERE NOT passed AND error_message = '') as failed_tests,
    COUNT(*) FILTER (WHERE error_message != '') as error_tests,
    ROUND(100.0 * COUNT(*) FILTER (WHERE passed) / COUNT(*), 1) as pass_percentage
FROM test_results;

-- Show only failures for quick debugging
SELECT
    'Failed Tests:' as info;

SELECT
    test_id,
    test_name,
    expression,
    expected_result,
    actual_result,
    error_message
FROM test_results
WHERE NOT passed
ORDER BY test_id;

\timing off

-- Debug EOD Functions in One Query
SELECT 
    -- Test 1: Hour test (working)
    'E8H Test' as test_name,
    'E8H' as eod_expr,
    '2025-01-15T10:00:00Z'::timestamptz as input_time,
    (SELECT years FROM jcron.parse_eod('E8H')) as parsed_years,
    (SELECT months FROM jcron.parse_eod('E8H')) as parsed_months,
    (SELECT hours FROM jcron.parse_eod('E8H')) as parsed_hours,
    (SELECT minutes FROM jcron.parse_eod('E8H')) as parsed_minutes,
    (SELECT reference_point FROM jcron.parse_eod('E8H')) as parsed_ref,
    jcron.eod_time('0 9 * * 1-5 EOD:E8H', '2025-01-15T10:00:00Z'::timestamptz) as actual_result,
    '2025-01-15T18:00:00Z'::timestamptz as expected_result,
    jcron.eod_time('0 9 * * 1-5 EOD:E8H', '2025-01-15T10:00:00Z'::timestamptz) = '2025-01-15T18:00:00Z'::timestamptz as matches

UNION ALL

SELECT 
    -- Test 2: Minute test (failing)
    'E30M Test' as test_name,
    'E30M' as eod_expr,
    '2025-01-15T14:30:00Z'::timestamptz as input_time,
    (SELECT years FROM jcron.parse_eod('E30M')) as parsed_years,
    (SELECT months FROM jcron.parse_eod('E30M')) as parsed_months,
    (SELECT hours FROM jcron.parse_eod('E30M')) as parsed_hours,
    (SELECT minutes FROM jcron.parse_eod('E30M')) as parsed_minutes,
    (SELECT reference_point FROM jcron.parse_eod('E30M')) as parsed_ref,
    jcron.eod_time('0 30 14 * * * EOD:E30M', '2025-01-15T14:30:00Z'::timestamptz) as actual_result,
    '2025-01-15T15:00:00Z'::timestamptz as expected_result,
    jcron.eod_time('0 30 14 * * * EOD:E30M', '2025-01-15T14:30:00Z'::timestamptz) = '2025-01-15T15:00:00Z'::timestamptz as matches

ORDER BY test_name;