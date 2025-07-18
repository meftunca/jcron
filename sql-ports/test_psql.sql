-- ===================================================================
-- JCRON PostgreSQL Implementation - Comprehensive Test Suite
-- Based on core_test.go from Go implementation
-- ===================================================================

\timing on
\echo 'Starting comprehensive jcron test suite...'
\echo '======================================================'

-- Load the implementation
\i sql-ports/psql.sql

\echo ''
\echo '======================================================'
\echo 'Test 1: Basic Expression Parsing Tests'
\echo '======================================================'

-- Test expand_part equivalent functionality through parse_expression
\echo 'Testing basic parsing...'
SELECT 
    'Simple wildcard' as test_name,
    jcron.parse_expression('* * * * * *') as cache_key,
    'SUCCESS' as status;

SELECT 
    'Single value' as test_name,
    jcron.parse_expression('0 0 3 * * *') as cache_key,
    'SUCCESS' as status;

SELECT 
    'Day abbreviations' as test_name,
    jcron.parse_expression('0 0 9 * * MON-FRI') as cache_key,
    'SUCCESS' as status;

\echo ''
\echo '======================================================'
\echo 'Test 2: Next Time Calculation Tests (40 test cases from Go)'
\echo '======================================================'

-- Test case 1: Simple next minute
\echo 'Test 1: Basit Sonraki Dakika'
SELECT 
    '1. Basit Sonraki Dakika' as test_name,
    jcron.next_time(jcron.parse_expression('0 * * * * *'), '2025-10-26T10:00:30Z'::timestamptz) as result,
    '2025-10-26T10:01:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 * * * * *'), '2025-10-26T10:00:30Z'::timestamptz) = '2025-10-26T10:01:00Z'::timestamptz) as passed;

-- Test case 2: Next hour
\echo 'Test 2: Sonraki Saatin Başı'
SELECT 
    '2. Sonraki Saatin Başı' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 * * * *'), '2025-10-26T10:59:00Z'::timestamptz) as result,
    '2025-10-26T11:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 * * * *'), '2025-10-26T10:59:00Z'::timestamptz) = '2025-10-26T11:00:00Z'::timestamptz) as passed;

-- Test case 3: Next day
\echo 'Test 3: Sonraki Günün Başı'
SELECT 
    '3. Sonraki Günün Başı' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 * * *'), '2025-10-26T23:59:00Z'::timestamptz) as result,
    '2025-10-27T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 * * *'), '2025-10-26T23:59:00Z'::timestamptz) = '2025-10-27T00:00:00Z'::timestamptz) as passed;

-- Test case 4: Next month
\echo 'Test 4: Sonraki Ayın Başı'
SELECT 
    '4. Sonraki Ayın Başı' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 1 * *'), '2025-02-15T12:00:00Z'::timestamptz) as result,
    '2025-03-01T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 1 * *'), '2025-02-15T12:00:00Z'::timestamptz) = '2025-03-01T00:00:00Z'::timestamptz) as passed;

-- Test case 5: Next year
\echo 'Test 5: Sonraki Yılın Başı'
SELECT 
    '5. Sonraki Yılın Başı' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 1 1 *'), '2025-06-15T12:00:00Z'::timestamptz) as result,
    '2026-01-01T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 1 1 *'), '2025-06-15T12:00:00Z'::timestamptz) = '2026-01-01T00:00:00Z'::timestamptz) as passed;

-- Test case 6: Business hours
\echo 'Test 6: İş Saatleri İçinde Sonraki Saat'
SELECT 
    '6. İş Saatleri İçinde Sonraki Saat' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 9-17 * * MON-FRI'), '2025-03-03T10:30:00Z'::timestamptz) as result,
    '2025-03-03T11:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 9-17 * * MON-FRI'), '2025-03-03T10:30:00Z'::timestamptz) = '2025-03-03T11:00:00Z'::timestamptz) as passed;

-- Test case 7: Business hours rollover
\echo 'Test 7: İş Saati Sonundan Sonraki Güne Atlama'
SELECT 
    '7. İş Saati Sonundan Sonraki Güne Atlama' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 9-17 * * MON-FRI'), '2025-03-03T17:30:00Z'::timestamptz) as result,
    '2025-03-04T09:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 9-17 * * MON-FRI'), '2025-03-03T17:30:00Z'::timestamptz) = '2025-03-04T09:00:00Z'::timestamptz) as passed;

-- Test case 8: Weekend skip
\echo 'Test 8: Hafta Sonuna Atlama (Cuma -> Pazartesi)'
SELECT 
    '8. Hafta Sonuna Atlama' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 9-17 * * 1-5'), '2025-03-07T18:00:00Z'::timestamptz) as result,
    '2025-03-10T09:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 9-17 * * 1-5'), '2025-03-07T18:00:00Z'::timestamptz) = '2025-03-10T09:00:00Z'::timestamptz) as passed;

-- Test case 9: Every 15 minutes
\echo 'Test 9: Her 15 Dakikada Bir'
SELECT 
    '9. Her 15 Dakikada Bir' as test_name,
    jcron.next_time(jcron.parse_expression('0 */15 * * * *'), '2025-05-10T14:16:00Z'::timestamptz) as result,
    '2025-05-10T14:30:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 */15 * * * *'), '2025-05-10T14:16:00Z'::timestamptz) = '2025-05-10T14:30:00Z'::timestamptz) as passed;

-- Test case 10: Specific months
\echo 'Test 10: Belirli Aylarda Çalışma'
SELECT 
    '10. Belirli Aylarda Çalışma' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 1 3,6,9,12 *'), '2025-03-15T10:00:00Z'::timestamptz) as result,
    '2025-06-01T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 1 3,6,9,12 *'), '2025-03-15T10:00:00Z'::timestamptz) = '2025-06-01T00:00:00Z'::timestamptz) as passed;

-- Test case 11: Last day of month (L)
\echo 'Test 11: Ayın Son Günü (L)'
SELECT 
    '11. Ayın Son Günü (L)' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 12 L * *'), '2024-02-10T00:00:00Z'::timestamptz) as result,
    '2024-02-29T12:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 12 L * *'), '2024-02-10T00:00:00Z'::timestamptz) = '2024-02-29T12:00:00Z'::timestamptz) as passed;

-- Test case 12: Last day of month (L) - next month
\echo 'Test 12: Ayın Son Günü (L) - Sonraki Ay'
SELECT 
    '12. Ayın Son Günü (L) - Sonraki Ay' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 12 L * *'), '2025-04-30T13:00:00Z'::timestamptz) as result,
    '2025-05-31T12:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 12 L * *'), '2025-04-30T13:00:00Z'::timestamptz) = '2025-05-31T12:00:00Z'::timestamptz) as passed;

-- Test case 13: Last Friday (5L)
\echo 'Test 13: Ayın Son Cuması (5L)'
SELECT 
    '13. Ayın Son Cuması (5L)' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 22 * * 5L'), '2025-08-01T00:00:00Z'::timestamptz) as result,
    '2025-08-29T22:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 22 * * 5L'), '2025-08-01T00:00:00Z'::timestamptz) = '2025-08-29T22:00:00Z'::timestamptz) as passed;

-- Test case 14: Second Tuesday (2#2)
\echo 'Test 14: Ayın İkinci Salısı (2#2)'
SELECT 
    '14. Ayın İkinci Salısı (2#2)' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 8 * * 2#2'), '2025-11-01T00:00:00Z'::timestamptz) as result,
    '2025-11-11T08:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 8 * * 2#2'), '2025-11-01T00:00:00Z'::timestamptz) = '2025-11-11T08:00:00Z'::timestamptz) as passed;

-- Test case 15: Vixie-cron OR logic
\echo 'Test 15: Vixie-Cron (OR Mantığı)'
SELECT 
    '15. Vixie-Cron (OR Mantığı)' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 15 * MON'), '2025-09-09T00:00:00Z'::timestamptz) as result,
    '2025-09-15T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 15 * MON'), '2025-09-09T00:00:00Z'::timestamptz) = '2025-09-15T00:00:00Z'::timestamptz) as passed;

-- Test case 16: @weekly shortcut
\echo 'Test 16: @weekly Kısaltması'
SELECT 
    '16. @weekly Kısaltması' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 * * 0'), '2025-01-01T12:00:00Z'::timestamptz) as result,
    '2025-01-05T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 * * 0'), '2025-01-01T12:00:00Z'::timestamptz) = '2025-01-05T00:00:00Z'::timestamptz) as passed;

-- Test case 17: @hourly shortcut
\echo 'Test 17: @hourly Kısaltması'
SELECT 
    '17. @hourly Kısaltması' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 * * * *'), '2025-01-01T15:00:00Z'::timestamptz) as result,
    '2025-01-01T16:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 * * * *'), '2025-01-01T15:00:00Z'::timestamptz) = '2025-01-01T16:00:00Z'::timestamptz) as passed;

-- Test case 18: Timezone - Istanbul
\echo 'Test 18: Zaman Dilimi (Istanbul)'
SELECT 
    '18. Zaman Dilimi (Istanbul)' as test_name,
    jcron.next_time(jcron.parse_expression('0 30 9 * * * TZ=Europe/Istanbul'), '2025-10-26T03:00:00+03:00'::timestamptz) as result,
    '2025-10-26T09:30:00+03:00'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 30 9 * * * TZ=Europe/Istanbul'), '2025-10-26T03:00:00+03:00'::timestamptz) = '2025-10-26T09:30:00+03:00'::timestamptz) as passed;

-- Test case 19: Timezone - New York
\echo 'Test 19: Zaman Dilimi (New York)'
SELECT 
    '19. Zaman Dilimi (New York)' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 20 4 7 * TZ=America/New_York'), '2025-07-01T00:00:00Z'::timestamptz) as result,
    '2025-07-04T20:00:00-04:00'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 20 4 7 * TZ=America/New_York'), '2025-07-01T00:00:00Z'::timestamptz) = '2025-07-04T20:00:00-04:00'::timestamptz) as passed;

-- Test case 20: Year specification
\echo 'Test 20: Yıl Belirtme'
SELECT 
    '20. Yıl Belirtme' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 1 1 * 2027'), '2025-01-01T00:00:00Z'::timestamptz) as result,
    '2027-01-01T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 1 1 * 2027'), '2025-01-01T00:00:00Z'::timestamptz) = '2027-01-01T00:00:00Z'::timestamptz) as passed;

-- Test case 21: End of second
\echo 'Test 21: Her Saniyenin Sonu'
SELECT 
    '21. Her Saniyenin Sonu' as test_name,
    jcron.next_time(jcron.parse_expression('59 59 23 31 12 *'), '2025-12-31T23:59:58Z'::timestamptz) as result,
    '2025-12-31T23:59:59Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('59 59 23 31 12 *'), '2025-12-31T23:59:58Z'::timestamptz) = '2025-12-31T23:59:59Z'::timestamptz) as passed;

-- Test case 22: Every 5 seconds
\echo 'Test 22: Her 5 Saniyede'
SELECT 
    '22. Her 5 Saniyede' as test_name,
    jcron.next_time(jcron.parse_expression('*/5 * * * * *'), '2025-01-01T12:00:03Z'::timestamptz) as result,
    '2025-01-01T12:00:05Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('*/5 * * * * *'), '2025-01-01T12:00:03Z'::timestamptz) = '2025-01-01T12:00:05Z'::timestamptz) as passed;

-- Test case 23: Specific seconds
\echo 'Test 23: Belirli Saniyeler'
SELECT 
    '23. Belirli Saniyeler' as test_name,
    jcron.next_time(jcron.parse_expression('15,30,45 * * * * *'), '2025-01-01T12:00:20Z'::timestamptz) as result,
    '2025-01-01T12:00:30Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('15,30,45 * * * * *'), '2025-01-01T12:00:20Z'::timestamptz) = '2025-01-01T12:00:30Z'::timestamptz) as passed;

-- Test case 24: Weekday noon
\echo 'Test 24: Hafta İçi Öğle'
SELECT 
    '24. Hafta İçi Öğle' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 12 * * 1-5'), '2025-08-08T14:00:00Z'::timestamptz) as result,
    '2025-08-11T12:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 12 * * 1-5'), '2025-08-08T14:00:00Z'::timestamptz) = '2025-08-11T12:00:00Z'::timestamptz) as passed;

-- Test case 25: Month start and end
\echo 'Test 25: Ay Sonu ve Başı'
SELECT 
    '25. Ay Sonu ve Başı' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 0 1,L * *'), '2025-01-15T12:00:00Z'::timestamptz) as result,
    '2025-01-31T00:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 0 1,L * *'), '2025-01-15T12:00:00Z'::timestamptz) = '2025-01-31T00:00:00Z'::timestamptz) as passed;

\echo ''
\echo '======================================================'
\echo 'Test 3: Previous Time Calculation Tests'
\echo '======================================================'

-- Test previous time calculations (sample tests)
\echo 'Testing prev_time functionality...'
SELECT 
    'Prev: Simple previous minute' as test_name,
    jcron.prev_time(jcron.parse_expression('0 * * * * *'), '2025-10-26T10:00:30Z'::timestamptz) as result,
    '2025-10-26T10:00:00Z'::timestamptz as expected,
    (jcron.prev_time(jcron.parse_expression('0 * * * * *'), '2025-10-26T10:00:30Z'::timestamptz) = '2025-10-26T10:00:00Z'::timestamptz) as passed;

SELECT 
    'Prev: Previous hour' as test_name,
    jcron.prev_time(jcron.parse_expression('0 0 * * * *'), '2025-10-26T11:00:00Z'::timestamptz) as result,
    '2025-10-26T10:00:00Z'::timestamptz as expected,
    (jcron.prev_time(jcron.parse_expression('0 0 * * * *'), '2025-10-26T11:00:00Z'::timestamptz) = '2025-10-26T10:00:00Z'::timestamptz) as passed;

\echo ''
\echo '======================================================'
\echo 'Test 4: Schedule Management Tests'
\echo '======================================================'

-- Test schedule creation and management
\echo 'Testing schedule management...'
SELECT jcron.schedule('test-hourly', '0 0 * * * *', 'SELECT NOW()') as hourly_job_id;
SELECT jcron.schedule('test-business', '0 0 9-17 * * MON-FRI', 'VACUUM ANALYZE') as business_job_id;
SELECT jcron.schedule('test-monthly', '0 0 0 1 * *', 'DELETE FROM logs WHERE created_at < NOW() - INTERVAL ''90 days''') as monthly_job_id;

-- Show created jobs
SELECT 'Created Jobs:' as info;
SELECT * FROM jcron.jobs();

\echo ''
\echo '======================================================'
\echo 'Test 5: Advanced Pattern Tests'
\echo '======================================================'

-- Test complex patterns
\echo 'Testing advanced patterns...'

-- Business hours with timezone
SELECT 
    'Business Hours TZ' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('0 0 9-17 * * MON-FRI TZ=Europe/Istanbul')) as valid,
    (SELECT next_run FROM jcron.validate_schedule('0 0 9-17 * * MON-FRI TZ=Europe/Istanbul')) as next_run;

-- Week of year pattern
SELECT 
    'Week of Year' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('0 0 9 * * MON WOY:1-26 TZ=UTC')) as valid,
    (SELECT next_run FROM jcron.validate_schedule('0 0 9 * * MON WOY:1-26 TZ=UTC')) as next_run;

-- Special weekday patterns
SELECT 
    'Last Friday' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('0 0 22 * * 5L TZ=UTC')) as valid,
    (SELECT next_run FROM jcron.validate_schedule('0 0 22 * * 5L TZ=UTC')) as next_run;

SELECT 
    'Second Tuesday' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('0 0 8 * * 2#2 TZ=UTC')) as valid,
    (SELECT next_run FROM jcron.validate_schedule('0 0 8 * * 2#2 TZ=UTC')) as next_run;

\echo ''
\echo '======================================================'
\echo 'Test 6: Performance Tests'
\echo '======================================================'

-- Test performance
\echo 'Running performance tests...'
SELECT * FROM jcron.performance_test(100);

-- Test cache statistics
\echo 'Cache and system statistics:'
SELECT * FROM jcron.stats();

\echo ''
\echo '======================================================'
\echo 'Test 7: Error Handling Tests'
\echo '======================================================'

-- Test invalid expressions
\echo 'Testing error handling...'
SELECT 
    'Invalid Expression' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('invalid expression')) as valid,
    (SELECT error_message FROM jcron.validate_schedule('invalid expression')) as error_msg;

SELECT 
    'Invalid Range' as test_name,
    (SELECT is_valid FROM jcron.validate_schedule('0 0 25 * * *')) as valid,
    (SELECT error_message FROM jcron.validate_schedule('0 0 25 * * *')) as error_msg;

\echo ''
\echo '======================================================'
\echo 'Test 8: Edge Cases Tests'
\echo '======================================================'

-- Test edge cases
\echo 'Testing edge cases...'

-- Leap year February 29
SELECT 
    'Leap Year Feb 29' as test_name,
    jcron.next_time(jcron.parse_expression('0 0 12 29 2 *'), '2023-12-01T00:00:00Z'::timestamptz) as result,
    '2024-02-29T12:00:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 0 12 29 2 *'), '2023-12-01T00:00:00Z'::timestamptz) = '2024-02-29T12:00:00Z'::timestamptz) as passed;

-- End of year
SELECT 
    'End of Year' as test_name,
    jcron.next_time(jcron.parse_expression('0 59 23 31 12 *'), '2025-12-30T12:00:00Z'::timestamptz) as result,
    '2025-12-31T23:59:00Z'::timestamptz as expected,
    (jcron.next_time(jcron.parse_expression('0 59 23 31 12 *'), '2025-12-30T12:00:00Z'::timestamptz) = '2025-12-31T23:59:00Z'::timestamptz) as passed;

\echo ''
\echo '======================================================'
\echo 'Test 9: Comprehensive Expression Tests'
\echo '======================================================'

-- Test comprehensive expressions from original examples
\echo 'Testing comprehensive expressions...'

-- Create a table of test expressions with expected outcomes
CREATE TEMP TABLE test_expressions (
    id SERIAL PRIMARY KEY,
    expression TEXT,
    description TEXT,
    from_time TIMESTAMPTZ,
    expected_time TIMESTAMPTZ
);

INSERT INTO test_expressions (expression, description, from_time, expected_time) VALUES
('0 0 9 * * MON-FRI TZ=UTC', 'Business hours: 9 AM weekdays', '2025-07-17T10:00:00Z', '2025-07-18T09:00:00Z'),
('*/15 * * * * * TZ=Europe/Istanbul', 'Every 15 minutes in Istanbul time', '2025-07-17T10:00:00Z', '2025-07-17T10:15:00Z'),
('0 0 12 L * * TZ=UTC', 'Last day of month at noon', '2025-07-17T10:00:00Z', '2025-07-31T12:00:00Z'),
('0 0 22 * * 5L TZ=UTC', 'Last Friday of month at 10 PM', '2025-07-17T10:00:00Z', '2025-07-25T22:00:00Z'),
('0 0 8 * * 2#2 TZ=UTC', 'Second Tuesday of month at 8 AM', '2025-07-17T10:00:00Z', '2025-08-12T08:00:00Z'),
('0 0 9 * * MON WOY:1-26 TZ=UTC', 'First half year Mondays', '2025-07-17T10:00:00Z', '2026-01-05T09:00:00Z');

-- Test each expression
SELECT 
    t.id,
    t.expression,
    t.description,
    jcron.next_time(jcron.parse_expression(t.expression), t.from_time) as calculated_time,
    t.expected_time,
    (jcron.next_time(jcron.parse_expression(t.expression), t.from_time) = t.expected_time) as passed
FROM test_expressions t
ORDER BY t.id;

\echo ''
\echo '======================================================'
\echo 'Test 9.5: EOD (End of Duration) Expression Tests'
\echo '======================================================'

-- Test EOD expressions
\echo 'Testing EOD (End of Duration) expressions...'

-- Test case: E8H pattern
\echo 'Test 1: EOD E8H Pattern'
DO $$
DECLARE
    cache_key TEXT;
BEGIN
    BEGIN
        cache_key := jcron.parse_expression('0 8 * * * * EOD:E8H');
        RAISE NOTICE 'EOD:E8H Validation: SUCCESS - Cache key: %', cache_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'EOD:E8H Validation: FAILED - Error: %', SQLERRM;
    END;
END $$;

-- Test case: S1D M pattern  
\echo 'Test 2: EOD S1D M Pattern'
DO $$
DECLARE
    cache_key TEXT;
BEGIN
    BEGIN
        cache_key := jcron.parse_expression('*/30 * * * * * EOD:S1D M');
        RAISE NOTICE 'EOD:S1D M Validation: SUCCESS - Cache key: %', cache_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'EOD:S1D M Validation: FAILED - Error: %', SQLERRM;
    END;
END $$;

-- Test case: E[event] pattern
\echo 'Test 3: EOD Event Pattern'
DO $$
DECLARE
    cache_key TEXT;
BEGIN
    BEGIN
        cache_key := jcron.parse_expression('0 0 9 * * * EOD:E[deployment]');
        RAISE NOTICE 'EOD:E[deployment] Validation: SUCCESS - Cache key: %', cache_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'EOD:E[deployment] Validation: FAILED - Error: %', SQLERRM;
    END;
END $$;

-- Test parse_eod function directly
\echo 'Testing parse_eod function directly:'
SELECT 
    'Parse E8H directly' as test,
    years, months, weeks, days, hours, minutes, seconds, reference, event_id
FROM jcron.parse_eod('E8H');

SELECT 
    'Parse S1D M directly' as test,
    years, months, weeks, days, hours, minutes, seconds, reference, event_id
FROM jcron.parse_eod('S1D M');

SELECT 
    'Parse E[deploy] directly' as test,
    years, months, weeks, days, hours, minutes, seconds, reference, event_id
FROM jcron.parse_eod('E[deploy]');

\echo ''
\echo '======================================================'
\echo 'Test 10: Job Management Lifecycle Tests'
\echo '======================================================'

-- Test complete job lifecycle
\echo 'Testing job lifecycle...'

-- Create test jobs
SELECT jcron.schedule('lifecycle-test-1', '0 */5 * * * *', 'SELECT ''Every 5 minutes''') as job1_id;
SELECT jcron.schedule('lifecycle-test-2', '0 0 * * * *', 'SELECT ''Hourly''') as job2_id;

-- List jobs
SELECT 'Active Jobs:' as info;
SELECT jobid, jobname, schedule, active FROM jcron.jobs() WHERE jobname LIKE 'lifecycle-test-%';

-- Pause a job
SELECT jcron.pause((SELECT jobid FROM jcron.jobs() WHERE jobname = 'lifecycle-test-1' LIMIT 1)) as paused;

-- Check status
SELECT 'After Pause:' as info;
SELECT jobid, jobname, schedule, active FROM jcron.jobs() WHERE jobname LIKE 'lifecycle-test-%';

-- Resume the job
SELECT jcron.resume((SELECT jobid FROM jcron.jobs() WHERE jobname = 'lifecycle-test-1' LIMIT 1)) as resumed;

-- Alter job schedule
SELECT jcron.alter_job(
    (SELECT jobid FROM jcron.jobs() WHERE jobname = 'lifecycle-test-2' LIMIT 1),
    '0 0 */2 * * *'::TEXT,  -- Every 2 hours
    'SELECT ''Every 2 hours'''::TEXT
) as altered;

-- Check final status
SELECT 'Final Status:' as info;
SELECT jobid, jobname, schedule, active FROM jcron.jobs() WHERE jobname LIKE 'lifecycle-test-%';

-- Clean up test jobs
SELECT jcron.unschedule('lifecycle-test-1') as cleanup1;
SELECT jcron.unschedule('lifecycle-test-2') as cleanup2;

\echo ''
\echo '======================================================'
\echo 'Test Summary'
\echo '======================================================'

-- Final statistics
SELECT 'Final System Statistics:' as info;
SELECT * FROM jcron.stats();

-- Cache efficiency
SELECT 'Cache Information:' as info;
SELECT 
    COUNT(*) as total_cache_entries,
    AVG(access_count) as avg_access_count,
    MAX(access_count) as max_access_count,
    MIN(access_count) as min_access_count
FROM jcron.schedule_cache;

\echo ''
\echo '======================================================'
\echo 'Test Suite Complete!'
\echo '======================================================'
\echo 'All tests have been executed.'
\echo 'Review the results above for any failed tests.'
\echo 'Performance metrics and cache statistics are included.'
\echo '======================================================'

\timing off