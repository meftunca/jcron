-- JCRON UNIFIED SYNTAX TESTS
-- Test file to verify all syntax types work through main functions

-- Test 1: Regular Cron Expressions
SELECT 'Test 1: Regular Cron Expressions' as test_name;

SELECT 
    'Regular cron' as expression_type,
    '0 30 14 * * *' as expression,
    jcron.next_time('0 30 14 * * *', '2024-01-15 10:00:00'::timestamptz) as next_time,
    jcron.is_time_match('0 30 14 * * *', '2024-01-15 14:30:00'::timestamptz, 1) as matches_time;

SELECT 
    'Cron with lists' as expression_type,
    '0 0,30 9,14,18 * * *' as expression,
    jcron.next_time('0 0,30 9,14,18 * * *', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 2: EOD Expressions  
SELECT 'Test 2: EOD Expressions' as test_name;

SELECT 
    'Week end' as expression_type,
    'E0W' as expression,
    jcron.next_time('E0W', '2024-01-15 10:00:00'::timestamptz) as next_time,
    jcron.is_time_match('E0W', jcron.next_time('E0W', '2024-01-15 10:00:00'::timestamptz), 1) as matches_time;

SELECT 
    'Month + Week end' as expression_type,
    'E1M2W' as expression,
    jcron.next_time('E1M2W', '2024-01-15 10:00:00'::timestamptz) as next_time;

SELECT 
    'Day end' as expression_type,
    'E0D' as expression,
    jcron.next_time('E0D', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 3: L (Last) Syntax
SELECT 'Test 3: L (Last) Syntax' as test_name;

SELECT 
    'Last day of month' as expression_type,
    '0 0 17 L * *' as expression,
    jcron.next_time('0 0 17 L * *', '2024-01-15 10:00:00'::timestamptz) as next_time,
    jcron.is_time_match('0 0 17 L * *', '2024-01-31 17:00:00'::timestamptz, 1) as matches_last_day;

SELECT 
    'Last Friday of month' as expression_type,
    '0 0 17 * * 5L' as expression,
    jcron.next_time('0 0 17 * * 5L', '2024-01-15 10:00:00'::timestamptz) as next_time;

SELECT 
    '5 days before last day' as expression_type,
    '0 0 12 L-5 * *' as expression,
    jcron.next_time('0 0 12 L-5 * *', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 4: # (Nth Occurrence) Syntax
SELECT 'Test 4: # (Nth Occurrence) Syntax' as test_name;

SELECT 
    '1st Tuesday of month' as expression_type,
    '0 0 9 * * 2#1' as expression,
    jcron.next_time('0 0 9 * * 2#1', '2024-01-15 10:00:00'::timestamptz) as next_time,
    jcron.is_time_match('0 0 9 * * 2#1', '2024-02-06 09:00:00'::timestamptz, 1) as matches_first_tuesday;

SELECT 
    '3rd Friday of month' as expression_type,
    '0 30 14 * * 5#3' as expression,
    jcron.next_time('0 30 14 * * 5#3', '2024-01-15 10:00:00'::timestamptz) as next_time;

SELECT 
    '2nd Monday of month' as expression_type,
    '0 0 10 * * 1#2' as expression,
    jcron.next_time('0 0 10 * * 1#2', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 5: Hybrid Expressions (Cron + EOD)
SELECT 'Test 5: Hybrid Expressions (Cron + EOD)' as test_name;

SELECT 
    'Hour 3 reference + 1 week end' as expression_type,
    '* * 3 * * * E1W' as expression,
    jcron.next_time('* * 3 * * * E1W', '2024-01-15 10:00:00'::timestamptz) as next_time,
    jcron.is_time_match('* * 3 * * * E1W', jcron.next_time('* * 3 * * * E1W', '2024-01-15 10:00:00'::timestamptz), 30) as matches_hybrid;

SELECT 
    'Monday 9 AM + this month end' as expression_type,
    '0 0 9 * * MON E0M' as expression,
    jcron.next_time('0 0 9 * * MON E0M', '2024-01-15 10:00:00'::timestamptz) as next_time;

SELECT 
    'Last Friday + 1 week end' as expression_type,
    '0 30 14 * * 5L E1W' as expression,
    jcron.next_time('0 30 14 * * 5L E1W', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 6: Complex Mixed Scenarios
SELECT 'Test 6: Complex Mixed Scenarios' as test_name;

-- Quarterly planning: 3rd Thursday + quarter end
SELECT 
    'Quarterly 3rd Thursday + quarter end' as scenario,
    '0 0 14 * */3 4#3 E0Q' as expression,
    jcron.next_time('0 0 14 * */3 4#3 E0Q', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Monthly payroll: Last Friday + next week end
SELECT 
    'Payroll last Friday + week end' as scenario,
    '0 0 17 * * 5L E1W' as expression,
    jcron.next_time('0 0 17 * * 5L E1W', '2024-01-15 10:00:00'::timestamptz) as next_time;

-- Test 7: Error Handling
SELECT 'Test 7: Error Handling' as test_name;

-- Test invalid expressions
BEGIN;
    SELECT 
        'Invalid empty' as test_case,
        jcron.next_time('', '2024-01-15 10:00:00'::timestamptz) as result;
EXCEPTION WHEN OTHERS THEN
    SELECT 'Empty expression properly rejected' as result;
END;

BEGIN;
    SELECT 
        'Invalid NULL' as test_case,
        jcron.next_time(NULL, '2024-01-15 10:00:00'::timestamptz) as result;
EXCEPTION WHEN OTHERS THEN
    SELECT 'NULL expression properly rejected' as result;
END;

-- Test 8: Performance Comparison
SELECT 'Test 8: Performance Comparison' as test_name;

-- Test performance across different syntax types
SELECT 
    'Performance test start' as marker,
    clock_timestamp() as start_time;

-- Regular cron (baseline)
SELECT jcron.next_time('0 0 9 * * *', generate_series('2024-01-01'::date, '2024-01-07'::date, '1 day'));

-- EOD expressions
SELECT jcron.next_time('E0W', generate_series('2024-01-01'::date, '2024-01-07'::date, '1 day'));

-- L syntax
SELECT jcron.next_time('0 0 9 L * *', generate_series('2024-01-01'::date, '2024-01-07'::date, '1 day'));

-- # syntax  
SELECT jcron.next_time('0 0 9 * * 2#1', generate_series('2024-01-01'::date, '2024-01-07'::date, '1 day'));

-- Hybrid expressions
SELECT jcron.next_time('0 0 9 * * MON E0W', generate_series('2024-01-01'::date, '2024-01-07'::date, '1 day'));

SELECT 
    'Performance test end' as marker,
    clock_timestamp() as end_time;

-- Test 9: Real-World Business Scenarios
SELECT 'Test 9: Real-World Business Scenarios' as test_name;

-- Monthly reports: Last business day
SELECT 
    'Monthly report' as scenario,
    '0 0 17 L * *' as expression,
    'Last day of month at 17:00' as description,
    jcron.next_time('0 0 17 L * *', '2024-01-15 10:00:00'::timestamptz) as next_execution;

-- Payroll: Last Friday
SELECT 
    'Payroll processing' as scenario,
    '0 0 9 * * 5L' as expression,
    'Last Friday of month at 09:00' as description,
    jcron.next_time('0 0 9 * * 5L', '2024-01-15 10:00:00'::timestamptz) as next_execution;

-- Team meeting: 1st Monday
SELECT 
    'Team meeting' as scenario,
    '0 30 10 * * 1#1' as expression,
    '1st Monday of month at 10:30' as description,
    jcron.next_time('0 30 10 * * 1#1', '2024-01-15 10:00:00'::timestamptz) as next_execution;

-- Backup: Friday evening + week end calculation
SELECT 
    'Weekly backup' as scenario,
    '0 0 18 * * FRI E1W' as expression,
    'Friday 18:00 + calculate next week end' as description,
    jcron.next_time('0 0 18 * * FRI E1W', '2024-01-15 10:00:00'::timestamptz) as next_execution;

-- Tax deadline: 5 days before month end
SELECT 
    'Tax deadline reminder' as scenario,
    '0 0 9 L-5 * *' as expression,
    '5 days before last day at 09:00' as description,
    jcron.next_time('0 0 9 L-5 * *', '2024-01-15 10:00:00'::timestamptz) as next_execution;
