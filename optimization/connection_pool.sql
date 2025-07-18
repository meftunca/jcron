-- =====================================================
-- JCRON CONNECTION POOL OPTIMIZATION
-- =====================================================

-- Prepared statement optimization for ultra-fast execution
DO $$
BEGIN
    -- Prepare common statements for repeated use
    PERFORM pg_stat_statements_reset();
    
    -- Common cron expressions that will be cached
    PREPARE fast_hourly AS 
        SELECT jcron.fast_next_time_common('0 * * * *', $1);
    
    PREPARE fast_daily AS 
        SELECT jcron.fast_next_time_common('0 0 * * *', $1);
    
    PREPARE fast_business AS 
        SELECT jcron.fast_next_time_common('0 9 * * 1-5', $1);
    
    PREPARE fast_15min AS 
        SELECT jcron.fast_next_time_common('*/15 * * * *', $1);
END $$;

-- Connection pool settings for optimal performance
-- Add to postgresql.conf:
/*
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_prepared_transactions = 100
*/

-- JCRON-specific connection pool
CREATE OR REPLACE FUNCTION jcron.init_connection_pool()
RETURNS VOID AS $$
BEGIN
    -- Set connection-specific optimizations
    SET work_mem = '16MB';
    SET enable_hashjoin = on;
    SET enable_mergejoin = on;
    SET enable_nestloop = off;  -- Prefer hash/merge joins
    SET random_page_cost = 1.1; -- SSD optimized
    SET seq_page_cost = 1.0;
    
    -- Disable unnecessary logging for performance
    SET log_statement = 'none';
    SET log_min_duration_statement = 1000; -- Only log slow queries
END;
$$ LANGUAGE plpgsql;
