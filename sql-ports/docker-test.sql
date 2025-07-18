-- JCRON PostgreSQL Docker Test Script
-- Bu script Docker ortamında jcron'un performansını ve işlevselliğini test eder

-- 1. Temel fonksiyonalite testleri
\echo '=== JCRON PostgreSQL Performans Testi ==='

-- Önce mevcut job'ları listele
\echo '\n--- Mevcut Jobs ---'
SELECT * FROM jcron.jobs();

-- Performance test çalıştır
\echo '\n--- Performans Testi (1000 iterasyon) ---'
SELECT * FROM jcron.performance_test(1000);

-- Cache istatistikleri
\echo '\n--- Cache ve Sistem İstatistikleri ---'
SELECT * FROM jcron.stats();

-- Çeşitli jcron expression'larını test et
\echo '\n--- Expression Validation Testleri ---'
SELECT 
    expr as "Expression",
    (SELECT is_valid FROM jcron.validate_schedule(expr)) as "Valid",
    (SELECT next_run FROM jcron.validate_schedule(expr)) as "Next Run"
FROM (VALUES
    ('0 9 * * MON-FRI TZ=UTC', 'Business hours'),
    ('*/5 * * * * TZ=UTC', 'Every 5 seconds'),
    ('0 0 12 L * * TZ=UTC', 'Last day of month'),
    ('0 8 * * * TZ=UTC EOD:E8H', 'Daily with 8h duration'),
    ('*/30 * * * * TZ=Europe/Istanbul', 'Every 30s Istanbul time')
) AS t(expr, descr);

-- Test job'u oluştur
\echo '\n--- Test Job Oluşturma ---'
SELECT jcron.schedule(
    'docker-test-job',
    '*/10 * * * * TZ=UTC',
    'SELECT NOW() as test_time;',
    current_database(),
    current_user,
    true
) as "Created Job ID";

-- Pending schedules'ları göster
\echo '\n--- Bekleyen Schedules ---'
SELECT * FROM jcron.get_pending_schedules(10);

-- Cleanup test
\echo '\n--- Cache Cleanup Testi ---'
SELECT jcron.cleanup_cache(0) as "Cleaned Cache Entries";

-- Final stats
\echo '\n--- Final İstatistikler ---'
SELECT * FROM jcron.stats();

\echo '\n=== Test Tamamlandı ==='
