/**
 * JCRON C Port - Time Calculation Tests
 * 
 * Tests for jcron_next(), jcron_prev(), jcron_matches()
 */

#include "jcron.h"
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>

/* ========================================================================
 * Test Framework
 * ======================================================================== */

static int tests_run = 0;
static int tests_passed = 0;
static int tests_failed = 0;

#define TEST(name) static void test_##name(void)

#define ASSERT(condition, message) \
    do { \
        if (!(condition)) { \
            printf("    ✗ FAILED: %s\n", message); \
            tests_failed++; \
            return; \
        } \
    } while (0)

#define ASSERT_EQ(actual, expected, message) \
    do { \
        if ((actual) != (expected)) { \
            printf("    ✗ FAILED: %s (expected %ld, got %ld)\n", \
                   message, (long)(expected), (long)(actual)); \
            tests_failed++; \
            return; \
        } \
    } while (0)

#define ASSERT_TIME_EQ(actual, expected, message) \
    do { \
        if ((actual) != (expected)) { \
            char buf1[64], buf2[64]; \
            struct tm tm1, tm2; \
            time_t t1 = (time_t)(actual); \
            time_t t2 = (time_t)(expected); \
            localtime_r(&t1, &tm1); \
            localtime_r(&t2, &tm2); \
            strftime(buf1, sizeof(buf1), "%Y-%m-%d %H:%M:%S", &tm1); \
            strftime(buf2, sizeof(buf2), "%Y-%m-%d %H:%M:%S", &tm2); \
            printf("    ✗ FAILED: %s\n", message); \
            printf("      Expected: %s (%" PRId64 ")\n", buf2, (int64_t)(expected)); \
            printf("      Got:      %s (%" PRId64 ")\n", buf1, (int64_t)(actual)); \
            tests_failed++; \
            return; \
        } \
    } while (0)

#define RUN_TEST(name) \
    do { \
        printf("  Running: " #name " ... "); \
        fflush(stdout); \
        tests_run++; \
        test_##name(); \
        if (tests_failed == 0 || tests_failed == tests_run - tests_passed - 1) { \
            printf("✓\n"); \
            tests_passed++; \
        } \
    } while (0)

/* ========================================================================
 * Helper Functions
 * ======================================================================== */

/**
 * Create timestamp from date/time components
 * Uses UTC to avoid timezone issues in tests
 */
static int64_t make_timestamp(int year, int month, int day, int hour, int min, int sec) {
    struct tm tm = {0};
    tm.tm_year = year - 1900;
    tm.tm_mon = month - 1;
    tm.tm_mday = day;
    tm.tm_hour = hour;
    tm.tm_min = min;
    tm.tm_sec = sec;
    tm.tm_isdst = -1;
    
    // Use timegm for UTC
    return (int64_t)timegm(&tm);
}

/* ========================================================================
 * Basic Pattern Tests
 * ======================================================================== */

TEST(next_every_minute) {
    // Pattern: "* * * * * *" - Every minute
    jcron_pattern_t pattern;
    jcron_parse("* * * * * *", &pattern);
    
    // From 2025-10-23 10:00:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-23 10:00:00 (same time, since it matches)
    int64_t expected = make_timestamp(2025, 10, 23, 10, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be the same minute since it matches");
}

TEST(next_every_5_minutes) {
    // Pattern: "* */5 * * * *" - Every 5 minutes
    jcron_pattern_t pattern;
    jcron_parse("* */5 * * * *", &pattern);
    
    // From 2025-10-23 10:03:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 3, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-23 10:05:00
    int64_t expected = make_timestamp(2025, 10, 23, 10, 5, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be 10:05:00");
}

TEST(next_specific_minute) {
    // Pattern: "* 30 * * * *" - At minute 30
    jcron_pattern_t pattern;
    jcron_parse("* 30 * * * *", &pattern);
    
    // From 2025-10-23 10:15:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 15, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-23 10:30:00
    int64_t expected = make_timestamp(2025, 10, 23, 10, 30, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be 10:30:00");
}

TEST(next_daily_at_noon) {
    // Pattern: "* 0 12 * * *" - Daily at noon
    jcron_pattern_t pattern;
    jcron_parse("* 0 12 * * *", &pattern);
    
    // From 2025-10-23 10:00:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-23 12:00:00 (same day)
    int64_t expected = make_timestamp(2025, 10, 23, 12, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be 12:00:00 same day");
}

TEST(next_daily_at_noon_after_noon) {
    // Pattern: "* 0 12 * * *" - Daily at noon
    jcron_pattern_t pattern;
    jcron_parse("* 0 12 * * *", &pattern);
    
    // From 2025-10-23 14:00:00 (after noon)
    int64_t from = make_timestamp(2025, 10, 23, 14, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-24 12:00:00 (next day)
    int64_t expected = make_timestamp(2025, 10, 24, 12, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be 12:00:00 next day");
}

TEST(next_hour_rollover) {
    // Pattern: "* 55 * * * *" - At minute 55
    jcron_pattern_t pattern;
    jcron_parse("* 55 * * * *", &pattern);
    
    // From 2025-10-23 23:50:00
    int64_t from = make_timestamp(2025, 10, 23, 23, 50, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-23 23:55:00
    int64_t expected = make_timestamp(2025, 10, 23, 23, 55, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be 23:55:00");
}

TEST(next_day_rollover) {
    // Pattern: "* 10 23 * * *" - At 23:10
    jcron_pattern_t pattern;
    jcron_parse("* 10 23 * * *", &pattern);
    
    // From 2025-10-23 23:30:00
    int64_t from = make_timestamp(2025, 10, 23, 23, 30, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-10-24 23:10:00 (next day)
    int64_t expected = make_timestamp(2025, 10, 24, 23, 10, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be next day 23:10:00");
}

TEST(next_month_rollover) {
    // Pattern: "* 0 0 1 * *" - First day of month at midnight
    jcron_pattern_t pattern;
    jcron_parse("* 0 0 1 * *", &pattern);
    
    // From 2025-10-31 23:00:00 (last day of October)
    int64_t from = make_timestamp(2025, 10, 31, 23, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2025-11-01 00:00:00
    int64_t expected = make_timestamp(2025, 11, 1, 0, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be first of November");
}

TEST(next_weekday_monday) {
    // Pattern: "* 0 9 * * 1" - Mondays at 9:00
    jcron_pattern_t pattern;
    jcron_parse("* 0 9 * * 1", &pattern);
    
    // From 2025-10-23 (Thursday) 10:00:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next Monday is 2025-10-27 09:00:00
    int64_t expected = make_timestamp(2025, 10, 27, 9, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be next Monday at 9:00");
}

TEST(next_weekdays_only) {
    // Pattern: "* 0 9 * * 1-5" - Weekdays (Mon-Fri) at 9:00
    jcron_pattern_t pattern;
    jcron_parse("* 0 9 * * 1-5", &pattern);
    
    // From 2025-10-24 (Friday) 10:00:00
    int64_t from = make_timestamp(2025, 10, 24, 10, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next weekday is Monday 2025-10-27 09:00:00 (skips weekend)
    int64_t expected = make_timestamp(2025, 10, 27, 9, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should skip weekend to Monday");
}

/* ========================================================================
 * Edge Case Tests
 * ======================================================================== */

TEST(next_february_leap_year) {
    // Pattern: "* 0 0 29 2 *" - Feb 29 at midnight (leap year)
    jcron_pattern_t pattern;
    jcron_parse("* 0 0 29 2 *", &pattern);
    
    // From 2024-02-28 (leap year)
    int64_t from = make_timestamp(2024, 2, 28, 12, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2024-02-29 00:00:00
    int64_t expected = make_timestamp(2024, 2, 29, 0, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be Feb 29 in leap year");
}

TEST(next_february_non_leap_year) {
    // Pattern: "* 0 0 29 2 *" - Feb 29 at midnight
    jcron_pattern_t pattern;
    jcron_parse("* 0 0 29 2 *", &pattern);
    
    // From 2025-02-28 (non-leap year)
    int64_t from = make_timestamp(2025, 2, 28, 12, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2028-02-29 00:00:00 (skip to next leap year)
    int64_t expected = make_timestamp(2028, 2, 29, 0, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be Feb 29 in next leap year");
}

TEST(next_year_rollover) {
    // Pattern: "* 0 0 1 1 *" - January 1 at midnight
    jcron_pattern_t pattern;
    jcron_parse("* 0 0 1 1 *", &pattern);
    
    // From 2025-12-31 23:00:00
    int64_t from = make_timestamp(2025, 12, 31, 23, 0, 0);
    jcron_result_t result;
    
    int ret = jcron_next(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_next should succeed");
    
    // Next should be 2026-01-01 00:00:00
    int64_t expected = make_timestamp(2026, 1, 1, 0, 0, 0);
    ASSERT_TIME_EQ(result.next_time, expected, "Next time should be New Year");
}

/* ========================================================================
 * jcron_matches() Tests
 * ======================================================================== */

TEST(matches_exact_time) {
    // Pattern: "* 30 14 * * *" - 14:30
    jcron_pattern_t pattern;
    jcron_parse("* 30 14 * * *", &pattern);
    
    // Test 2025-10-23 14:30:00 - should match
    int64_t time1 = make_timestamp(2025, 10, 23, 14, 30, 0);
    ASSERT(jcron_matches(time1, &pattern) == 1, "Should match at 14:30:00");
    
    // Test 2025-10-23 14:31:00 - should not match
    int64_t time2 = make_timestamp(2025, 10, 23, 14, 31, 0);
    ASSERT(jcron_matches(time2, &pattern) == 0, "Should not match at 14:31:00");
}

TEST(matches_weekday) {
    // Pattern: "* 0 9 * * 1" - Mondays at 9:00
    jcron_pattern_t pattern;
    jcron_parse("* 0 9 * * 1", &pattern);
    
    // Test 2025-10-27 (Monday) 09:00:00 - should match
    int64_t time1 = make_timestamp(2025, 10, 27, 9, 0, 0);
    ASSERT(jcron_matches(time1, &pattern) == 1, "Should match Monday 9:00");
    
    // Test 2025-10-28 (Tuesday) 09:00:00 - should not match
    int64_t time2 = make_timestamp(2025, 10, 28, 9, 0, 0);
    ASSERT(jcron_matches(time2, &pattern) == 0, "Should not match Tuesday");
}

/* ========================================================================
 * jcron_prev() Tests
 * ======================================================================== */

TEST(prev_every_minute) {
    // Pattern: "* * * * * *" - Every minute
    jcron_pattern_t pattern;
    jcron_parse("* * * * * *", &pattern);
    
    // From 2025-10-23 10:05:00
    int64_t from = make_timestamp(2025, 10, 23, 10, 5, 0);
    jcron_result_t result;
    
    int ret = jcron_prev(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_prev should succeed");
    
    // Previous should be 2025-10-23 10:04:00
    int64_t expected = make_timestamp(2025, 10, 23, 10, 4, 0);
    ASSERT_TIME_EQ(result.prev_time, expected, "Previous time should be one minute earlier");
}

TEST(prev_day_rollback) {
    // Pattern: "* 0 0 * * *" - Midnight
    jcron_pattern_t pattern;
    jcron_parse("* 0 0 * * *", &pattern);
    
    // From 2025-10-23 01:30:00 (after midnight has passed)
    int64_t from = make_timestamp(2025, 10, 23, 1, 30, 0);
    jcron_result_t result;
    
    int ret = jcron_prev(from, &pattern, &result);
    ASSERT_EQ(ret, JCRON_OK, "jcron_prev should succeed");
    
    // Previous should be 2025-10-23 00:00:00 (today's midnight)
    int64_t expected = make_timestamp(2025, 10, 23, 0, 0, 0);
    ASSERT_TIME_EQ(result.prev_time, expected, "Previous time should be today's midnight");
}

/* ========================================================================
 * Main Test Runner
 * ======================================================================== */

int main(void) {
    printf("JCRON C Port - Time Calculation Tests\n");
    printf("======================================\n\n");
    
    printf("Basic Pattern Tests:\n");
    RUN_TEST(next_every_minute);
    RUN_TEST(next_every_5_minutes);
    RUN_TEST(next_specific_minute);
    RUN_TEST(next_daily_at_noon);
    RUN_TEST(next_daily_at_noon_after_noon);
    RUN_TEST(next_hour_rollover);
    RUN_TEST(next_day_rollover);
    RUN_TEST(next_month_rollover);
    RUN_TEST(next_weekday_monday);
    RUN_TEST(next_weekdays_only);
    
    printf("\nEdge Case Tests:\n");
    RUN_TEST(next_february_leap_year);
    RUN_TEST(next_february_non_leap_year);
    RUN_TEST(next_year_rollover);
    
    printf("\njcron_matches() Tests:\n");
    RUN_TEST(matches_exact_time);
    RUN_TEST(matches_weekday);
    
    printf("\njcron_prev() Tests:\n");
    RUN_TEST(prev_every_minute);
    RUN_TEST(prev_day_rollback);
    
    printf("\n=====================================\n");
    printf("Results: %d/%d tests passed ", tests_passed, tests_run);
    
    if (tests_failed == 0) {
        printf("✓\n");
        return 0;
    } else {
        printf("✗ (%d failed)\n", tests_failed);
        return 1;
    }
}
