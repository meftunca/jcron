/**
 * JCRON C Port - Pattern Parsing Tests
 * 
 * Test-driven development: Define expected behavior before implementation
 * All test cases mirror PostgreSQL port behavior
 */

#include "jcron.h"
#include <stdio.h>
#include <string.h>
#include <assert.h>

/* Test counters */
static int tests_run = 0;
static int tests_passed = 0;
static int tests_failed = 0;

/* Test macros */
#define TEST(name) \
    static void test_##name(void); \
    static void run_test_##name(void) { \
        printf("  Running: %s ... ", #name); \
        tests_run++; \
        test_##name(); \
        tests_passed++; \
        printf("✓\n"); \
    } \
    static void test_##name(void)

#define ASSERT(condition, message) \
    do { \
        if (!(condition)) { \
            printf("✗\n    FAILED: %s\n    at %s:%d\n", message, __FILE__, __LINE__); \
            tests_failed++; \
            tests_passed--; \
            return; \
        } \
    } while (0)

#define ASSERT_EQ(actual, expected, message) \
    ASSERT((actual) == (expected), message)

#define ASSERT_BIT_SET(mask, bit, message) \
    ASSERT(jcron_test_bit_64(mask, bit), message)

#define ASSERT_BIT_CLEAR(mask, bit, message) \
    ASSERT(!jcron_test_bit_64(mask, bit), message)

/* ========================================================================
 * Test Cases: Basic Pattern Parsing
 * ======================================================================== */

TEST(parse_all_wildcard) {
    // Pattern: "* * * * * *" - All fields wildcard
    jcron_pattern_t pattern;
    int result = jcron_parse("* * * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // All minutes should be set (0-59)
    for (int i = 0; i < 60; i++) {
        ASSERT_BIT_SET(pattern.minutes, i, "All minutes should be set");
    }
    
    // All hours should be set (0-23)
    for (int i = 0; i < 24; i++) {
        ASSERT_BIT_SET(pattern.hours, i, "All hours should be set");
    }
    
    // All days of month should be set (1-31)
    for (int i = 1; i <= 31; i++) {
        ASSERT_BIT_SET(pattern.days_of_month, i, "All days should be set");
    }
    
    // All months should be set (1-12)
    for (int i = 1; i <= 12; i++) {
        ASSERT_BIT_SET(pattern.months, i, "All months should be set");
    }
    
    // All weekdays should be set (0-6)
    for (int i = 0; i <= 6; i++) {
        ASSERT_BIT_SET(pattern.days_of_week, i, "All weekdays should be set");
    }
}

TEST(parse_specific_minute) {
    // Pattern: "* 5 * * * *" - Only minute 5
    jcron_pattern_t pattern;
    int result = jcron_parse("* 5 * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Only minute 5 should be set
    ASSERT_BIT_SET(pattern.minutes, 5, "Minute 5 should be set");
    
    // Other minutes should be clear
    ASSERT_BIT_CLEAR(pattern.minutes, 0, "Minute 0 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 4, "Minute 4 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 6, "Minute 6 should be clear");
}

TEST(parse_step_every_5_minutes) {
    // Pattern: "* */5 * * * *" - Every 5 minutes
    jcron_pattern_t pattern;
    int result = jcron_parse("* */5 * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Minutes 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 should be set
    for (int i = 0; i < 60; i++) {
        if (i % 5 == 0) {
            ASSERT_BIT_SET(pattern.minutes, i, "Minute divisible by 5 should be set");
        } else {
            ASSERT_BIT_CLEAR(pattern.minutes, i, "Minute not divisible by 5 should be clear");
        }
    }
}

TEST(parse_range_0_to_10) {
    // Pattern: "* 0-10 * * * *" - Minutes 0-10
    jcron_pattern_t pattern;
    int result = jcron_parse("* 0-10 * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Minutes 0-10 should be set
    for (int i = 0; i <= 10; i++) {
        ASSERT_BIT_SET(pattern.minutes, i, "Minutes 0-10 should be set");
    }
    
    // Other minutes should be clear
    ASSERT_BIT_CLEAR(pattern.minutes, 11, "Minute 11 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 59, "Minute 59 should be clear");
}

TEST(parse_list_0_15_30_45) {
    // Pattern: "* 0,15,30,45 * * * *" - Specific minutes
    jcron_pattern_t pattern;
    int result = jcron_parse("* 0,15,30,45 * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Only specified minutes should be set
    ASSERT_BIT_SET(pattern.minutes, 0, "Minute 0 should be set");
    ASSERT_BIT_SET(pattern.minutes, 15, "Minute 15 should be set");
    ASSERT_BIT_SET(pattern.minutes, 30, "Minute 30 should be set");
    ASSERT_BIT_SET(pattern.minutes, 45, "Minute 45 should be set");
    
    // Other minutes should be clear
    ASSERT_BIT_CLEAR(pattern.minutes, 1, "Minute 1 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 14, "Minute 14 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 59, "Minute 59 should be clear");
}

TEST(parse_complex_range_and_list) {
    // Pattern: "* 0-10,20-30 * * * *" - Ranges 0-10 and 20-30
    jcron_pattern_t pattern;
    int result = jcron_parse("* 0-10,20-30 * * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Minutes 0-10 should be set
    for (int i = 0; i <= 10; i++) {
        ASSERT_BIT_SET(pattern.minutes, i, "Minutes 0-10 should be set");
    }
    
    // Minutes 20-30 should be set
    for (int i = 20; i <= 30; i++) {
        ASSERT_BIT_SET(pattern.minutes, i, "Minutes 20-30 should be set");
    }
    
    // Gap should be clear
    ASSERT_BIT_CLEAR(pattern.minutes, 11, "Minute 11 should be clear");
    ASSERT_BIT_CLEAR(pattern.minutes, 19, "Minute 19 should be clear");
}

TEST(parse_daily_at_noon) {
    // Pattern: "0 0 12 * * *" - Daily at noon
    jcron_pattern_t pattern;
    int result = jcron_parse("0 0 12 * * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    ASSERT_BIT_SET(pattern.minutes, 0, "Minute 0 should be set");
    ASSERT_BIT_SET(pattern.hours, 12, "Hour 12 should be set");
    
    ASSERT_BIT_CLEAR(pattern.minutes, 1, "Minute 1 should be clear");
    ASSERT_BIT_CLEAR(pattern.hours, 0, "Hour 0 should be clear");
    ASSERT_BIT_CLEAR(pattern.hours, 11, "Hour 11 should be clear");
}

TEST(parse_weekdays_pattern) {
    // Pattern: "0 0 9 * * 1-5" - Weekdays at 9:00
    jcron_pattern_t pattern;
    int result = jcron_parse("0 0 9 * * 1-5", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    ASSERT_BIT_SET(pattern.minutes, 0, "Minute 0 should be set");
    ASSERT_BIT_SET(pattern.hours, 9, "Hour 9 should be set");
    
    // Weekdays 1-5 (Mon-Fri) should be set
    for (int i = 1; i <= 5; i++) {
        ASSERT_BIT_SET(pattern.days_of_week, i, "Weekday should be set");
    }
    
    // Sunday (0) and Saturday (6) should be clear
    ASSERT_BIT_CLEAR(pattern.days_of_week, 0, "Sunday should be clear");
    ASSERT_BIT_CLEAR(pattern.days_of_week, 6, "Saturday should be clear");
}

TEST(parse_monthly_pattern) {
    // Pattern: "0 0 0 1 * *" - First day of month at midnight
    jcron_pattern_t pattern;
    int result = jcron_parse("0 0 0 1 * *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    ASSERT_BIT_SET(pattern.minutes, 0, "Minute 0 should be set");
    ASSERT_BIT_SET(pattern.hours, 0, "Hour 0 should be set");
    ASSERT_BIT_SET(pattern.days_of_month, 1, "Day 1 should be set");
    
    ASSERT_BIT_CLEAR(pattern.days_of_month, 2, "Day 2 should be clear");
}

TEST(parse_quarterly_pattern) {
    // Pattern: "0 0 9 1 1,4,7,10 *" - Quarterly at 9:00 on 1st day
    jcron_pattern_t pattern;
    int result = jcron_parse("0 0 9 1 1,4,7,10 *", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    
    // Months 1, 4, 7, 10 should be set
    ASSERT_BIT_SET(pattern.months, 1, "Month 1 (Jan) should be set");
    ASSERT_BIT_SET(pattern.months, 4, "Month 4 (Apr) should be set");
    ASSERT_BIT_SET(pattern.months, 7, "Month 7 (Jul) should be set");
    ASSERT_BIT_SET(pattern.months, 10, "Month 10 (Oct) should be set");
    
    // Other months should be clear
    ASSERT_BIT_CLEAR(pattern.months, 2, "Month 2 should be clear");
    ASSERT_BIT_CLEAR(pattern.months, 3, "Month 3 should be clear");
}

/* ========================================================================
 * Test Cases: EOD/SOD Pattern Parsing
 * ======================================================================== */

TEST(parse_eod_end_of_month) {
    // Pattern: "EOD:E0M" - End of this month
    jcron_pattern_t pattern;
    int result = jcron_parse("EOD:E0M", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    ASSERT_EQ(pattern.eod_type, 0, "EOD type should be 0 (E0M)");
    ASSERT_EQ(pattern.eod_unit, 'M', "EOD unit should be 'M'");
    ASSERT_EQ(pattern.is_eod_pattern, 1, "Should be EOD-only pattern");
}

TEST(parse_sod_start_of_week) {
    // Pattern: "SOD:S0W" - Start of this week
    jcron_pattern_t pattern;
    int result = jcron_parse("SOD:S0W", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    ASSERT_EQ(pattern.sod_type, 0, "SOD type should be 0 (S0W)");
    ASSERT_EQ(pattern.sod_unit, 'W', "SOD unit should be 'W'");
    ASSERT_EQ(pattern.is_sod_pattern, 1, "Should be SOD-only pattern");
}

TEST(parse_cron_with_sod_modifier) {
    // Pattern: "0 0 10 * * * S2H" - 10:00 daily + 2 hours
    jcron_pattern_t pattern;
    int result = jcron_parse("0 0 10 * * * S2H", &pattern);
    
    ASSERT_EQ(result, JCRON_OK, "Parse should succeed");
    ASSERT_EQ(pattern.sod_type, 2, "SOD type should be 2 (S2H)");
    ASSERT_EQ(pattern.sod_unit, 'H', "SOD unit should be 'H'");
    ASSERT_EQ(pattern.has_cron, 1, "Should have cron component");
    ASSERT_BIT_SET(pattern.hours, 10, "Hour 10 should be set");
}

/* ========================================================================
 * Test Cases: Error Handling
 * ======================================================================== */

TEST(parse_null_pointer) {
    jcron_pattern_t pattern;
    int result = jcron_parse(NULL, &pattern);
    ASSERT_EQ(result, JCRON_ERR_NULL_POINTER, "Should return NULL_POINTER error");
    
    result = jcron_parse("* * * * * *", NULL);
    ASSERT_EQ(result, JCRON_ERR_NULL_POINTER, "Should return NULL_POINTER error");
}

TEST(parse_invalid_field_count) {
    jcron_pattern_t pattern;
    
    // Too few fields
    int result = jcron_parse("* * *", &pattern);
    ASSERT_EQ(result, JCRON_ERR_INVALID_PATTERN, "Should reject too few fields");
    
    // Too many fields (7 fields without modifier)
    result = jcron_parse("* * * * * * *", &pattern);
    // Note: This might be valid if last field is modifier, implementation-dependent
}

/* ========================================================================
 * Test Runner
 * ======================================================================== */

int main(void) {
    printf("JCRON C Port - Pattern Parsing Tests\n");
    printf("=====================================\n\n");
    
    printf("Basic Pattern Parsing:\n");
    run_test_parse_all_wildcard();
    run_test_parse_specific_minute();
    run_test_parse_step_every_5_minutes();
    run_test_parse_range_0_to_10();
    run_test_parse_list_0_15_30_45();
    run_test_parse_complex_range_and_list();
    run_test_parse_daily_at_noon();
    run_test_parse_weekdays_pattern();
    run_test_parse_monthly_pattern();
    run_test_parse_quarterly_pattern();
    
    printf("\nEOD/SOD Pattern Parsing:\n");
    run_test_parse_eod_end_of_month();
    run_test_parse_sod_start_of_week();
    run_test_parse_cron_with_sod_modifier();
    
    printf("\nError Handling:\n");
    run_test_parse_null_pointer();
    run_test_parse_invalid_field_count();
    
    printf("\n=====================================\n");
    printf("Results: %d/%d tests passed", tests_passed, tests_run);
    
    if (tests_failed > 0) {
        printf(" (%d FAILED)\n", tests_failed);
        return 1;
    } else {
        printf(" ✓\n");
        return 0;
    }
}
