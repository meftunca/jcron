-- =====================================================
-- JCRON PERFORMANCE MONITORING
-- =====================================================

-- Performance monitoring view
CREATE OR REPLACE VIEW jcron.performance_metrics AS
SELECT 
    'Parse Operations' as metric,
    extract(epoch from now() - pg_postmaster_start_time()) as uptime_seconds,
    pg_stat_get_function_calls('jcron.parse_expression'::regproc::oid) as total_calls,
    pg_stat_get_function_calls('jcron.fast_parse_common'::regproc::oid) as fast_calls,
    round(
        pg_stat_get_function_calls('jcron.fast_parse_common'::regproc::oid)::numeric / 
        NULLIF(pg_stat_get_function_calls('jcron.parse_expression'::regproc::oid), 0) * 100, 2
    ) as fast_path_percentage
UNION ALL
SELECT 
    'Next Time Calculations' as metric,
    extract(epoch from now() - pg_postmaster_start_time()) as uptime_seconds,
    pg_stat_get_function_calls('jcron.next_time'::regproc::oid) as total_calls,
    pg_stat_get_function_calls('jcron.fast_next_time_common'::regproc::oid) as fast_calls,
    round(
        pg_stat_get_function_calls('jcron.fast_next_time_common'::regproc::oid)::numeric / 
        NULLIF(pg_stat_get_function_calls('jcron.next_time'::regproc::oid), 0) * 100, 2
    ) as fast_path_percentage;

-- Memory usage monitoring
CREATE OR REPLACE FUNCTION jcron.memory_stats()
RETURNS TABLE(
    metric TEXT,
    value_mb NUMERIC,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Shared Buffers'::TEXT,
        round((current_setting('shared_buffers')::bigint * 8192 / 1024 / 1024)::numeric, 2),
        'PostgreSQL shared buffer pool size'::TEXT
    UNION ALL
    SELECT 
        'Work Memory'::TEXT,
        round((current_setting('work_mem')::bigint / 1024)::numeric, 2),
        'Memory for sort operations'::TEXT
    UNION ALL
    SELECT 
        'JCRON Cache Hit Rate'::TEXT,
        round(
            (SELECT sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100
             FROM pg_statio_user_tables WHERE schemaname = 'jcron')::numeric, 2
        ),
        'Cache efficiency for JCRON tables'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Real-time performance dashboard
CREATE OR REPLACE FUNCTION jcron.performance_dashboard()
RETURNS TABLE(
    section TEXT,
    metric TEXT,
    current_value TEXT,
    optimal_range TEXT,
    status TEXT
) AS $$
DECLARE
    v_parse_rate NUMERIC;
    v_next_time_rate NUMERIC;
    v_cache_hit_rate NUMERIC;
    v_active_jobs INTEGER;
BEGIN
    -- Calculate current rates
    SELECT count(*) INTO v_active_jobs FROM jcron.schedules WHERE status = 'ACTIVE';
    
    -- Performance metrics
    RETURN QUERY
    SELECT 
        'Performance'::TEXT,
        'Active Jobs'::TEXT,
        v_active_jobs::TEXT,
        '< 10,000'::TEXT,
        CASE WHEN v_active_jobs < 10000 THEN '✅ Good' ELSE '⚠️ High' END
    UNION ALL
    SELECT 
        'Performance'::TEXT,
        'Fast Path Usage'::TEXT,
        COALESCE((
            SELECT fast_path_percentage::TEXT || '%' 
            FROM jcron.performance_metrics 
            WHERE metric = 'Parse Operations'
        ), '0%'),
        '> 80%'::TEXT,
        CASE WHEN COALESCE((
            SELECT fast_path_percentage 
            FROM jcron.performance_metrics 
            WHERE metric = 'Parse Operations'
        ), 0) > 80 THEN '✅ Excellent' ELSE '⚠️ Can Improve' END;
    
    -- Memory metrics  
    RETURN QUERY
    SELECT 
        'Memory'::TEXT,
        m.metric,
        m.value_mb::TEXT || ' MB',
        CASE 
            WHEN m.metric = 'Shared Buffers' THEN '256+ MB'
            WHEN m.metric = 'Work Memory' THEN '4-16 MB'
            ELSE '> 95%'
        END,
        CASE 
            WHEN m.metric = 'Shared Buffers' AND m.value_mb >= 256 THEN '✅ Good'
            WHEN m.metric = 'Work Memory' AND m.value_mb BETWEEN 4 AND 16 THEN '✅ Good'
            WHEN m.metric LIKE '%Cache%' AND m.value_mb >= 95 THEN '✅ Excellent'
            ELSE '⚠️ Needs Attention'
        END
    FROM jcron.memory_stats() m;
    
    -- Index usage
    RETURN QUERY
    SELECT 
        'Indexes'::TEXT,
        'JCRON Index Usage'::TEXT,
        round(
            (SELECT avg(idx_scan) FROM pg_stat_user_indexes WHERE schemaname = 'jcron')::numeric, 0
        )::TEXT || ' scans/table',
        '> 100 scans/table'::TEXT,
        CASE WHEN COALESCE((
            SELECT avg(idx_scan) FROM pg_stat_user_indexes WHERE schemaname = 'jcron'
        ), 0) > 100 THEN '✅ Active' ELSE '⚠️ Underused' END;
END;
$$ LANGUAGE plpgsql;

-- Automated performance alerts
CREATE OR REPLACE FUNCTION jcron.check_performance_alerts()
RETURNS TABLE(alert_type TEXT, message TEXT, severity TEXT) AS $$
DECLARE
    v_slow_queries INTEGER;
    v_cache_hit_rate NUMERIC;
    v_long_running INTEGER;
BEGIN
    -- Check for slow queries
    SELECT count(*) INTO v_slow_queries 
    FROM pg_stat_statements 
    WHERE query LIKE '%jcron%' AND mean_exec_time > 100;
    
    IF v_slow_queries > 0 THEN
        RETURN QUERY SELECT 'Slow Queries'::TEXT, 
                           v_slow_queries || ' JCRON queries averaging >100ms'::TEXT,
                           'WARNING'::TEXT;
    END IF;
    
    -- Check cache hit rate
    SELECT COALESCE(
        sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100, 0
    ) INTO v_cache_hit_rate
    FROM pg_statio_user_tables WHERE schemaname = 'jcron';
    
    IF v_cache_hit_rate < 90 THEN
        RETURN QUERY SELECT 'Cache Efficiency'::TEXT,
                           'JCRON cache hit rate: ' || round(v_cache_hit_rate, 2) || '% (should be >90%)'::TEXT,
                           'WARNING'::TEXT;
    END IF;
    
    -- Check for long-running transactions
    SELECT count(*) INTO v_long_running
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query LIKE '%jcron%' 
    AND now() - query_start > interval '30 seconds';
    
    IF v_long_running > 0 THEN
        RETURN QUERY SELECT 'Long Running'::TEXT,
                           v_long_running || ' JCRON queries running >30 seconds'::TEXT,
                           'CRITICAL'::TEXT;
    END IF;
    
    -- If no alerts, return OK status
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'System Health'::TEXT, 'All JCRON performance metrics are optimal'::TEXT, 'OK'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
