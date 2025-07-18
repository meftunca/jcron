-- Test the fixed implementation
\echo 'Testing jcron implementation...'

-- Drop and recreate schema
DROP SCHEMA IF EXISTS jcron CASCADE;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Load the implementation
\i sql-ports/psql.sql

-- Test basic parsing
\echo 'Testing basic expression parsing...'
SELECT jcron.parse_expression('0 9 * * *') as simple_parse;

-- Test with step pattern
\echo 'Testing step pattern...'
SELECT jcron.parse_expression('*/5 * * * *') as step_parse;

-- Test schedule creation
\echo 'Testing schedule creation...'
SELECT jcron.schedule('test-job', '0 9 * * *', 'SELECT 1') as job_id;

-- Show results
\echo 'Showing created jobs...'
SELECT * FROM jcron.jobs();
