#!/bin/bash

# ===================================================================
# 🚀 JCRON Benchmark Runner
# ===================================================================
# This script generates test data and runs comprehensive benchmarks
# on JCRON functions with realistic production-like workloads.
#
# Usage:
#   ./run_benchmark.sh [options]
#
# Options:
#   --tests <N>        Number of test patterns to generate (default: 1000)
#   --validPct <N>     Percentage of valid patterns (default: 70)
#   --woy              Include WOY patterns
#   --eod              Include EOD/SOD patterns
#   --special          Include special syntax (L, #, W)
#   --db <name>        Database name (default: postgres)
#   --host <host>      Database host (default: localhost)
#   --port <port>      Database port (default: 5432)
#   --user <user>      Database user (default: postgres)
#   --docker           Use Docker container (teamflow_postgres)
# ===================================================================

set -e

# Default values
TESTS=1000
VALID_PCT=70
WOY_FLAG=""
EOD_FLAG=""
SPECIAL_FLAG=""
DB_NAME="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
USE_DOCKER=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tests)
      TESTS="$2"
      shift 2
      ;;
    --validPct)
      VALID_PCT="$2"
      shift 2
      ;;
    --woy)
      WOY_FLAG="--woy"
      shift
      ;;
    --eod)
      EOD_FLAG="--eod"
      shift
      ;;
    --special)
      SPECIAL_FLAG="--special"
      shift
      ;;
    --db)
      DB_NAME="$2"
      shift 2
      ;;
    --host)
      DB_HOST="$2"
      shift 2
      ;;
    --port)
      DB_PORT="$2"
      shift 2
      ;;
    --user)
      DB_USER="$2"
      shift 2
      ;;
    --docker)
      USE_DOCKER=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           🎯 JCRON BENCHMARK RUNNER v2.0                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Generate test data
echo -e "${YELLOW}📊 Step 1: Generating test data...${NC}"
echo "   Tests: $TESTS"
echo "   Valid: ${VALID_PCT}%"
echo "   Features: WOY=${WOY_FLAG:+true}, EOD=${EOD_FLAG:+true}, Special=${SPECIAL_FLAG:+true}"
echo ""

cd test_gen

bun run generate-bench-improved.ts \
  --total "$TESTS" \
  --validPct "$VALID_PCT" \
  $WOY_FLAG \
  $EOD_FLAG \
  $SPECIAL_FLAG \
  --format sql \
  --out ../benchmark_test_data.sql

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to generate test data${NC}"
  exit 1
fi

cd ..

echo -e "${GREEN}✅ Test data generated: benchmark_test_data.sql${NC}"
echo ""

# Step 2: Load test data into PostgreSQL
echo -e "${YELLOW}📥 Step 2: Loading test data into PostgreSQL...${NC}"

if [ "$USE_DOCKER" = true ]; then
  echo "   Using Docker container: teamflow_postgres"
  docker exec -i teamflow_postgres psql -U "$DB_USER" -d "$DB_NAME" < benchmark_test_data.sql > /dev/null 2>&1
else
  echo "   Host: $DB_HOST:$DB_PORT"
  echo "   Database: $DB_NAME"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < benchmark_test_data.sql > /dev/null 2>&1
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to load test data${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Test data loaded into database${NC}"
echo ""

# Step 3: Load test data into temp table
echo -e "${YELLOW}📋 Step 3: Preparing test data table...${NC}"

if [ "$USE_DOCKER" = true ]; then
  docker exec -i teamflow_postgres psql -U "$DB_USER" -d "$DB_NAME" <<SQL
DROP TABLE IF EXISTS jcron_test_data;
SELECT 
  id::TEXT,
  pattern::TEXT,
  valid::BOOLEAN,
  category::TEXT,
  complexity::TEXT,
  timezone::TEXT,
  from_time::TIMESTAMPTZ,
  expected_time::TIMESTAMPTZ,
  tags::TEXT[],
  expected_error::TEXT
INTO TEMPORARY TABLE jcron_test_data
FROM jcron_tests;

SELECT COUNT(*) as total_tests FROM jcron_test_data;
SQL
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
DROP TABLE IF EXISTS jcron_test_data;
SELECT 
  id::TEXT,
  pattern::TEXT,
  valid::BOOLEAN,
  category::TEXT,
  complexity::TEXT,
  timezone::TEXT,
  from_time::TIMESTAMPTZ,
  expected_time::TIMESTAMPTZ,
  tags::TEXT[],
  expected_error::TEXT
INTO TEMPORARY TABLE jcron_test_data
FROM jcron_tests;

SELECT COUNT(*) as total_tests FROM jcron_test_data;
SQL
fi

echo -e "${GREEN}✅ Test data table prepared${NC}"
echo ""

# Step 4: Run benchmarks
echo -e "${YELLOW}🚀 Step 4: Running benchmarks...${NC}"
echo ""

if [ "$USE_DOCKER" = true ]; then
  docker exec -i teamflow_postgres psql -U "$DB_USER" -d "$DB_NAME" < test_jcron_benchmark.sql
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < test_jcron_benchmark.sql
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Benchmark failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Benchmark complete!${NC}"
echo ""

# Step 5: Export results
echo -e "${YELLOW}📤 Step 5: Exporting results...${NC}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="benchmark_results_${TIMESTAMP}.json"

if [ "$USE_DOCKER" = true ]; then
  docker exec -i teamflow_postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT jsonb_pretty(jsonb_agg(row_to_json(r))) 
     FROM jcron_benchmark_results r 
     ORDER BY test_id;" > "$RESULTS_FILE"
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT jsonb_pretty(jsonb_agg(row_to_json(r))) 
     FROM jcron_benchmark_results r 
     ORDER BY test_id;" > "$RESULTS_FILE"
fi

echo -e "${GREEN}✅ Results exported: $RESULTS_FILE${NC}"
echo ""

# Summary
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  📊 BENCHMARK COMPLETE                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "📁 Generated files:"
echo "   • benchmark_test_data.sql   - Test data"
echo "   • $RESULTS_FILE - Benchmark results"
echo ""
echo "🔍 View results:"
echo "   cat $RESULTS_FILE | jq ."
echo ""
echo "📊 Query results in database:"
echo "   SELECT * FROM jcron_benchmark_results ORDER BY test_id;"
echo ""
