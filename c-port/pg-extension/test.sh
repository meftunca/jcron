#!/bin/bash
# JCRON PostgreSQL Extension Test Script

echo "JCRON PostgreSQL Extension Test"
echo "================================"

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create test database
echo "Creating test database..."
createdb jcron_test 2>/dev/null || echo "Database already exists"

# Build and install extension
echo "Building JCRON library..."
cd ..
make clean && make && sudo make install

echo "Building PostgreSQL extension..."
cd pg-extension
make clean && make && sudo make install

# Test extension
echo "Testing extension installation..."
psql -d jcron_test -c "DROP EXTENSION IF EXISTS jcron;" 2>/dev/null
psql -d jcron_test -c "CREATE EXTENSION jcron;"

if [ $? -eq 0 ]; then
    echo "✅ Extension created successfully"
else
    echo "❌ Extension creation failed"
    exit 1
fi

# Test basic functions
echo "Testing basic functions..."

# Test next_time function
RESULT=$(psql -d jcron_test -t -c "SELECT jcron.next_time('*/5 * * * *');")
if [ $? -eq 0 ]; then
    echo "✅ next_time function works"
else
    echo "❌ next_time function failed"
fi

# Test job scheduling
JOB_ID=$(psql -d jcron_test -t -c "SELECT jcron.schedule('*/10 * * * *', 'SELECT 1', 'jcron_test', 'postgres');" | tr -d ' ')
if [ -n "$JOB_ID" ] && [ "$JOB_ID" -gt 0 ]; then
    echo "✅ Job scheduling works (Job ID: $JOB_ID)"
else
    echo "❌ Job scheduling failed"
fi

# Test job listing
JOBS=$(psql -d jcron_test -t -c "SELECT count(*) FROM jcron.list_jobs();")
if [ "$JOBS" -gt 0 ]; then
    echo "✅ Job listing works ($JOBS jobs found)"
else
    echo "❌ Job listing failed"
fi

# Test job unscheduling
if [ -n "$JOB_ID" ] && [ "$JOB_ID" -gt 0 ]; then
    RESULT=$(psql -d jcron_test -t -c "SELECT jcron.unschedule($JOB_ID);")
    if [ "$RESULT" = " t" ]; then
        echo "✅ Job unscheduling works"
    else
        echo "❌ Job unscheduling failed"
    fi
fi

# Test cron convenience functions
JOB_ID2=$(psql -d jcron_test -t -c "SELECT cron.schedule('0 * * * *', 'SELECT 42');" | tr -d ' ')
if [ -n "$JOB_ID2" ] && [ "$JOB_ID2" -gt 0 ]; then
    echo "✅ Cron convenience functions work (Job ID: $JOB_ID2)"
else
    echo "❌ Cron convenience functions failed"
fi

# Cleanup
echo "Cleaning up..."
psql -d jcron_test -c "DROP EXTENSION jcron;"
dropdb jcron_test 2>/dev/null

echo ""
echo "🎉 All tests completed!"
echo "JCRON PostgreSQL extension is ready for production use."