-- JCRON UNIFIED API DEMO
-- Demonstrates how all syntax types work through the same functions

-- ===========================================
-- UNIFIED API - ONE FUNCTION RULES THEM ALL
-- ===========================================

SELECT '=== JCRON UNIFIED API DEMONSTRATION ===' as demo_title;

-- All these different syntax types work through jcron.next_time()
SELECT 
    'Traditional Cron' as syntax_type,
    '0 30 14 * * *' as expression,
    'Daily at 14:30' as description,
    jcron.next_time('0 30 14 * * *', '2024-01-15 10:00:00'::timestamptz) as next_execution

UNION ALL

SELECT 
    'EOD Expression' as syntax_type,
    'E0W' as expression,
    'This week end' as description,
    jcron.next_time('E0W', '2024-01-15 10:00:00'::timestamptz) as next_execution

UNION ALL

SELECT 
    'Last Day Syntax' as syntax_type,
    '0 0 17 L * *' as expression,
    'Last day of month at 17:00' as description,
    jcron.next_time('0 0 17 L * *', '2024-01-15 10:00:00'::timestamptz) as next_execution

UNION ALL

SELECT 
    'Nth Occurrence' as syntax_type,
    '0 30 14 * * 2#1' as expression,
    '1st Tuesday at 14:30' as description,
    jcron.next_time('0 30 14 * * 2#1', '2024-01-15 10:00:00'::timestamptz) as next_execution

UNION ALL

SELECT 
    'Hybrid Expression' as syntax_type,
    '0 0 9 * * MON E0M' as expression,
    'Monday 09:00 → this month end' as description,
    jcron.next_time('0 0 9 * * MON E0M', '2024-01-15 10:00:00'::timestamptz) as next_execution

ORDER BY syntax_type;

-- ===========================================
-- BUSINESS SCENARIOS WITH MIXED SYNTAX
-- ===========================================

SELECT '=== REAL-WORLD BUSINESS SCENARIOS ===' as demo_title;

-- Monthly Reports
SELECT 
    'Monthly Financial Report' as scenario,
    '0 0 17 L * *' as expression,
    'Execute on last day of month at 17:00' as business_rule,
    jcron.next_time('0 0 17 L * *', NOW()) as next_execution,
    jcron.is_time_match('0 0 17 L * *', '2024-01-31 17:00:00'::timestamptz, 5) as matches_end_of_january

UNION ALL

-- Payroll Processing
SELECT 
    'Payroll Processing' as scenario,
    '0 0 9 * * 5L' as expression,
    'Process payroll on last Friday of month at 09:00' as business_rule,
    jcron.next_time('0 0 9 * * 5L', NOW()) as next_execution,
    jcron.is_time_match('0 0 9 * * 5L', '2024-01-26 09:00:00'::timestamptz, 5) as matches_last_friday

UNION ALL

-- Team Meetings
SELECT 
    'Team Standup Meeting' as scenario,
    '0 30 10 * * 1#1' as expression,
    'First Monday of month at 10:30' as business_rule,
    jcron.next_time('0 30 10 * * 1#1', NOW()) as next_execution,
    jcron.is_time_match('0 30 10 * * 1#1', '2024-02-05 10:30:00'::timestamptz, 5) as matches_first_monday

UNION ALL

-- Backup Systems
SELECT 
    'Weekly Backup with EOD Calculation' as scenario,
    '0 0 18 * * FRI E1W' as expression,
    'Friday 18:00 → calculate next week end for backup window' as business_rule,
    jcron.next_time('0 0 18 * * FRI E1W', NOW()) as next_execution,
    NULL as matches_time

UNION ALL

-- Tax Deadlines
SELECT 
    'Tax Deadline Reminder' as scenario,
    '0 0 9 L-5 * *' as expression,
    'Remind 5 days before month end at 09:00' as business_rule,
    jcron.next_time('0 0 9 L-5 * *', NOW()) as next_execution,
    jcron.is_time_match('0 0 9 L-5 * *', '2024-01-26 09:00:00'::timestamptz, 5) as matches_reminder_day

ORDER BY scenario;

-- ===========================================
-- SYNTAX COMPLEXITY DEMONSTRATION
-- ===========================================

SELECT '=== SYNTAX COMPLEXITY LEVELS ===' as demo_title;

-- Level 1: Simple
SELECT 
    'Level 1 - Simple' as complexity,
    'E0W' as expression,
    'Basic week end' as description,
    jcron.next_time('E0W', NOW()) as result

UNION ALL

-- Level 2: Traditional Cron
SELECT 
    'Level 2 - Traditional' as complexity,
    '0 30 14 * * *' as expression,
    'Standard cron pattern' as description,
    jcron.next_time('0 30 14 * * *', NOW()) as result

UNION ALL

-- Level 3: Advanced Cron
SELECT 
    'Level 3 - Advanced Cron' as complexity,
    '0 0 17 * * 5L' as expression,
    'Last Friday pattern' as description,
    jcron.next_time('0 0 17 * * 5L', NOW()) as result

UNION ALL

-- Level 4: Sequential EOD
SELECT 
    'Level 4 - Sequential EOD' as complexity,
    'E1M2W3D' as expression,
    'Month + week + day sequence' as description,
    jcron.next_time('E1M2W3D', NOW()) as result

UNION ALL

-- Level 5: Hybrid
SELECT 
    'Level 5 - Hybrid' as complexity,
    '0 0 9 * * 2#1 E0M' as expression,
    'First Tuesday → month end calculation' as description,
    jcron.next_time('0 0 9 * * 2#1 E0M', NOW()) as result

ORDER BY complexity;

-- ===========================================
-- API CONSISTENCY TEST
-- ===========================================

SELECT '=== API CONSISTENCY VERIFICATION ===' as demo_title;

-- Test that all functions work with all syntax types
SELECT 
    'next_time() function' as api_function,
    COUNT(*) as syntax_types_supported
FROM (
    SELECT jcron.next_time('0 30 14 * * *', NOW())     -- Traditional cron
    UNION ALL
    SELECT jcron.next_time('E0W', NOW())                -- EOD
    UNION ALL  
    SELECT jcron.next_time('0 0 17 L * *', NOW())       -- Last syntax
    UNION ALL
    SELECT jcron.next_time('0 30 14 * * 2#1', NOW())    -- Nth occurrence
    UNION ALL
    SELECT jcron.next_time('0 0 9 * * MON E0M', NOW())  -- Hybrid
) as test_results

UNION ALL

SELECT 
    'is_time_match() function' as api_function,
    COUNT(*) as syntax_types_supported
FROM (
    SELECT jcron.is_time_match('0 30 14 * * *', NOW(), 5)     -- Traditional cron
    UNION ALL
    SELECT jcron.is_time_match('E0W', NOW(), 5)                -- EOD
    UNION ALL  
    SELECT jcron.is_time_match('0 0 17 L * *', NOW(), 5)       -- Last syntax
    UNION ALL
    SELECT jcron.is_time_match('0 30 14 * * 2#1', NOW(), 5)    -- Nth occurrence
    UNION ALL
    SELECT jcron.is_time_match('0 0 9 * * MON E0M', NOW(), 5)  -- Hybrid
) as test_results;

-- ===========================================
-- SUMMARY
-- ===========================================

SELECT '=== JCRON UNIFIED API SUMMARY ===' as summary_title;

SELECT 
    '✅ Unified API' as feature,
    'All syntax types work through same functions' as description,
    '5 syntax types supported' as details

UNION ALL

SELECT 
    '✅ Auto-Detection' as feature,
    'Automatic syntax recognition' as description,
    'No manual type specification needed' as details

UNION ALL

SELECT 
    '✅ Comprehensive Coverage' as feature,
    'Traditional + Modern scheduling' as description,
    'Cron + EOD + L + # + Hybrid' as details

UNION ALL

SELECT 
    '✅ Business Ready' as feature,
    'Real-world scheduling scenarios' as description,
    'Payroll, reports, meetings, backups' as details

UNION ALL

SELECT 
    '✅ Performance Optimized' as feature,
    'Each syntax uses optimal processing' as description,
    'No unnecessary overhead' as details

ORDER BY feature;
