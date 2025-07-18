#!/bin/bash

# JCRON PostgreSQL Docker Performance Benchmark Script
# Bu script Docker ortamında jcron'un performansını ölçer

echo "=== JCRON PostgreSQL Docker Benchmark ==="

# Container bilgilerini al
echo "Container Info:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep postgres

echo -e "\n=== Database Connection Test ==="
docker exec -it $(docker ps -q --filter "ancestor=postgres") psql -U postgres -d postgres -c "SELECT version();"

echo -e "\n=== JCRON Schema Test ==="
docker exec -it $(docker ps -q --filter "ancestor=postgres") psql -U postgres -d postgres -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'jcron';"

echo -e "\n=== Performance Benchmark ==="
docker exec -it $(docker ps -q --filter "ancestor=postgres") psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/docker-test.sql

echo -e "\n=== Memory Usage Test ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps -q --filter "ancestor=postgres")

echo -e "\n=== High Load Test (10000 iterasyon) ==="
docker exec -it $(docker ps -q --filter "ancestor=postgres") psql -U postgres -d postgres -c "
SELECT 
    operation,
    avg_time_ms,
    CASE 
        WHEN avg_time_ms < 1 THEN '🟢 Excellent'
        WHEN avg_time_ms < 5 THEN '🟡 Good'
        WHEN avg_time_ms < 10 THEN '🟠 Fair'
        ELSE '🔴 Needs Optimization'
    END as performance_rating
FROM jcron.performance_test(10000);
"

echo -e "\n=== Cache Effectiveness Test ==="
docker exec -it $(docker ps -q --filter "ancestor=postgres") psql -U postgres -d postgres -c "
SELECT 
    cache_key,
    access_count,
    last_accessed,
    CASE 
        WHEN access_count > 100 THEN '🔥 Hot'
        WHEN access_count > 10 THEN '⚡ Warm'
        ELSE '❄️ Cold'
    END as cache_status
FROM jcron.schedule_cache 
ORDER BY access_count DESC 
LIMIT 10;
"

echo -e "\n=== Benchmark Tamamlandı ==="
