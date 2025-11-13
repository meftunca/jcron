/**
 * JCRON C Port - Basic Usage Example
 * 
 * Demonstrates:
 * - Pattern parsing
 * - Next occurrence calculation
 * - Error handling
 */

#include "jcron.h"
#include <stdio.h>
#include <time.h>
#include <string.h>

void print_separator(void) {
    printf("========================================\n");
}

void example_every_5_minutes(void) {
    printf("Example 1: Every 5 minutes\n");
    print_separator();
    
    // Parse pattern
    jcron_pattern_t pattern;
    const char* expr = "*/5 * * * * *";
    printf("Pattern: %s\n", expr);
    
    int result = jcron_parse(expr, &pattern);
    if (result != JCRON_OK) {
        printf("ERROR: Failed to parse pattern: %s\n", jcron_strerror(result));
        return;
    }
    printf("✓ Pattern parsed successfully\n\n");
    
    // Get next occurrence
    jcron_result_t next;
    time_t now = time(NULL);
    printf("Current time: %s", ctime(&now));
    
    result = jcron_next(&pattern, now, &next);
    if (result == JCRON_OK) {
        printf("Next run:     %s", ctime(&next.timestamp));
    } else {
        printf("ERROR: %s\n", jcron_strerror(result));
    }
    
    printf("\n");
}

void example_daily_at_noon(void) {
    printf("Example 2: Daily at noon (12:00)\n");
    print_separator();
    
    jcron_pattern_t pattern;
    const char* expr = "0 0 12 * * *";
    printf("Pattern: %s\n", expr);
    
    int result = jcron_parse(expr, &pattern);
    if (result != JCRON_OK) {
        printf("ERROR: %s\n", jcron_strerror(result));
        return;
    }
    printf("✓ Pattern parsed successfully\n\n");
    
    // Get next 5 occurrences
    jcron_result_t results[5];
    time_t now = time(NULL);
    printf("Current time: %s\n", ctime(&now));
    
    int count = jcron_next_n(&pattern, now, results, 5);
    if (count > 0) {
        printf("Next 5 runs:\n");
        for (int i = 0; i < count; i++) {
            printf("  %d. %s", i + 1, ctime(&results[i].timestamp));
        }
    } else {
        printf("ERROR: %s\n", jcron_strerror(count));
    }
    
    printf("\n");
}

void example_eod_end_of_month(void) {
    printf("Example 3: End of this month (EOD:E0M)\n");
    print_separator();
    
    jcron_pattern_t pattern;
    const char* expr = "EOD:E0M";
    printf("Pattern: %s\n", expr);
    
    int result = jcron_parse(expr, &pattern);
    if (result != JCRON_OK) {
        printf("ERROR: %s\n", jcron_strerror(result));
        return;
    }
    printf("✓ Pattern parsed successfully\n\n");
    
    jcron_result_t next;
    time_t now = time(NULL);
    printf("Current time: %s", ctime(&now));
    
    result = jcron_next(&pattern, now, &next);
    if (result == JCRON_OK) {
        printf("End of month: %s", ctime(&next.timestamp));
        printf("  (should be last day at 23:59:59)\n");
    } else {
        printf("ERROR: %s\n", jcron_strerror(result));
    }
    
    printf("\n");
}

void example_sod_with_cron(void) {
    printf("Example 4: 10:00 daily + 2 hours (0 0 10 * * * S2H)\n");
    print_separator();
    
    jcron_pattern_t pattern;
    const char* expr = "0 0 10 * * * S2H";
    printf("Pattern: %s\n", expr);
    
    int result = jcron_parse(expr, &pattern);
    if (result != JCRON_OK) {
        printf("ERROR: %s\n", jcron_strerror(result));
        return;
    }
    printf("✓ Pattern parsed successfully\n\n");
    
    jcron_result_t next;
    time_t now = time(NULL);
    printf("Current time: %s", ctime(&now));
    
    result = jcron_next(&pattern, now, &next);
    if (result == JCRON_OK) {
        printf("Next run:     %s", ctime(&next.timestamp));
        printf("  (should be 12:00, which is 10:00 + 2 hours)\n");
    } else {
        printf("ERROR: %s\n", jcron_strerror(result));
    }
    
    printf("\n");
}

void example_weekday_pattern(void) {
    printf("Example 5: Weekdays at 9:00 (0 0 9 * * 1-5)\n");
    print_separator();
    
    jcron_pattern_t pattern;
    const char* expr = "0 0 9 * * 1-5";
    printf("Pattern: %s\n", expr);
    
    int result = jcron_parse(expr, &pattern);
    if (result != JCRON_OK) {
        printf("ERROR: %s\n", jcron_strerror(result));
        return;
    }
    printf("✓ Pattern parsed successfully\n\n");
    
    jcron_result_t results[5];
    time_t now = time(NULL);
    printf("Current time: %s\n", ctime(&now));
    
    int count = jcron_next_n(&pattern, now, results, 5);
    if (count > 0) {
        printf("Next 5 weekday runs:\n");
        for (int i = 0; i < count; i++) {
            struct tm* tm = localtime(&results[i].timestamp);
            const char* days[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
            printf("  %d. %s, %04d-%02d-%02d %02d:%02d:%02d\n",
                   i + 1,
                   days[tm->tm_wday],
                   tm->tm_year + 1900,
                   tm->tm_mon + 1,
                   tm->tm_mday,
                   tm->tm_hour,
                   tm->tm_min,
                   tm->tm_sec);
        }
    } else {
        printf("ERROR: %s\n", jcron_strerror(count));
    }
    
    printf("\n");
}

int main(void) {
    printf("JCRON C Port - Basic Usage Examples\n");
    printf("Version: %s\n\n", jcron_version());
    
    example_every_5_minutes();
    example_daily_at_noon();
    example_eod_end_of_month();
    example_sod_with_cron();
    example_weekday_pattern();
    
    printf("All examples completed!\n");
    return 0;
}
