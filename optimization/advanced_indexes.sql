-- =====================================================
-- ADVANCED INDEX OPTIMIZATION FOR JCRON
-- =====================================================

-- Ultra-fast composite indexes for scheduling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_schedules_ultra_fast
ON jcron.schedules(status, next_run, jcron_expr) 
WHERE status = 'ACTIVE' AND next_run IS NOT NULL;

-- Partial index for immediate execution jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_immediate_jobs
ON jcron.schedules(id, jcron_expr, function_name)
WHERE status = 'ACTIVE' AND next_run <= NOW() + INTERVAL '1 minute';

-- Index for common cron expressions (hash for O(1) lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_common_expressions
ON jcron.schedules USING HASH(jcron_expr)
WHERE jcron_expr IN ('0 * * * *', '*/15 * * * *', '0 9 * * 1-5', '0 0 * * *');

-- Covering index for execution log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jcron_execution_covering
ON jcron.execution_log(schedule_id, log_date, started_at, status)
INCLUDE (completed_at, error_message);

-- Materialized view for ultra-fast next execution lookup
CREATE MATERIALIZED VIEW IF NOT EXISTS jcron.next_executions AS
SELECT 
    s.id,
    s.name,
    s.jcron_expr,
    CASE 
        WHEN s.jcron_expr IN ('0 * * * *', '*/15 * * * *', '0 9 * * 1-5', '0 0 * * *') 
        THEN jcron.fast_next_time_common(s.jcron_expr, NOW())
        ELSE jcron.next_time(s.jcron_expr, NOW())
    END as next_run,
    s.function_name,
    s.function_args
FROM jcron.schedules s
WHERE s.status = 'ACTIVE';

-- Unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_jcron_next_executions_pk
ON jcron.next_executions(id);

-- Index for time-based queries on materialized view
CREATE INDEX IF NOT EXISTS idx_jcron_next_executions_time
ON jcron.next_executions(next_run) 
WHERE next_run IS NOT NULL;

-- Auto-refresh materialized view function
CREATE OR REPLACE FUNCTION jcron.refresh_next_executions()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY jcron.next_executions;
END;
$$ LANGUAGE plpgsql;

-- Schedule the refresh every minute for real-time accuracy
SELECT jcron.schedule_job(
    'refresh-next-executions',
    '0 * * * * *',  -- Every minute
    'SELECT jcron.refresh_next_executions();',
    NULL,
    NULL,
    TRUE
);

-- Statistics update for optimal query planning
CREATE OR REPLACE FUNCTION jcron.update_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE jcron.schedules;
    ANALYZE jcron.execution_log;
    ANALYZE jcron.events;
    ANALYZE jcron.next_executions;
END;
$$ LANGUAGE plpgsql;

-- Schedule statistics update every hour
SELECT jcron.schedule_job(
    'update-statistics',
    '0 0 * * * *',  -- Every hour
    'SELECT jcron.update_statistics();',
    NULL,
    NULL,
    TRUE
);
