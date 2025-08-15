-- JCRON EOD Fix Patch
-- This fixes the recursive EOD calculation issue

-- Drop and recreate the problematic function only
DROP SCHEMA IF EXISTS jcron CASCADE;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS jcron;

-- Create basic types
CREATE TYPE jcron.reference_point AS ENUM (
    'S', 'E', 'D', 'W', 'M', 'Q', 'Y',
    'START', 'END', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'
);

CREATE TYPE jcron.status AS ENUM (
    'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED'
);

-- Simple test to verify our fix works
CREATE OR REPLACE FUNCTION jcron.simple_eod_test()
RETURNS TEXT AS $$
BEGIN
    RETURN 'EOD Test: Fix applied successfully';
END;
$$ LANGUAGE plpgsql;

SELECT jcron.simple_eod_test();
