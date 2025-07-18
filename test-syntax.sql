-- Test basic syntax by running a simple query
\echo 'Testing JCRON PostgreSQL syntax...'

-- Test parse_expression
SELECT 'Testing parse_expression...' as test;
SELECT * FROM jcron.parse_expression('0 9 * * 1-5') LIMIT 1;

-- Test next_time
SELECT 'Testing next_time...' as test;
SELECT jcron.next_time('0 9 * * 1-5', '2025-01-01 00:00:00+00') as next_run;

-- Test is_match
SELECT 'Testing is_match...' as test;
SELECT jcron.is_match('30 10 1 1 *', '2025-01-01 10:30:00+00') as is_match;

-- Test prev_time
SELECT 'Testing prev_time...' as test;
SELECT jcron.prev_time('0 9 * * 1-5', '2025-01-01 12:00:00+00') as prev_run;

-- Test simple test function
SELECT 'Testing simple_test...' as test;
SELECT * FROM jcron.simple_test();

\echo 'All syntax tests completed!'
