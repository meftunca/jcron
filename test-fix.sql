-- Test script to verify the integer overflow fix
-- Run this after starting PostgreSQL and loading psql.sql

-- Test 1: Basic schedule creation (should work now)
SELECT 'Testing basic schedule creation...' as test;
SELECT jcron.schedule('test-basic', '0 9 * * *', 'SELECT 1;') as job_id;

-- Test 2: Complex schedule with wildcards
SELECT 'Testing wildcard schedule...' as test;  
SELECT jcron.schedule('test-wildcard', '* * * * *', 'SELECT 2;') as job_id;

-- Test 3: Timezone-aware schedule
SELECT 'Testing timezone schedule...' as test;
SELECT jcron.schedule('test-tz', '0 9 * * MON-FRI TZ=UTC', 'SELECT 3;') as job_id;

-- Test 4: Validate expressions
SELECT 'Testing expression validation...' as test;
SELECT * FROM jcron.validate_schedule('0 9 * * *');
SELECT * FROM jcron.validate_schedule('*/15 * * * *');

-- Test 5: Check created jobs
SELECT 'All created jobs:' as test;
SELECT * FROM jcron.jobs();

-- Test 6: Check performance
SELECT 'Performance test (small sample):' as test;
SELECT * FROM jcron.performance_test(10);

SELECT 'Fix verification complete!' as result;
