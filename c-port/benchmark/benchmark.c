/*
 * JCRON C Port - Performance Benchmark
 * 
 * Measures:
 * - Pattern parsing performance
 * - jcron_next() performance
 * - jcron_prev() performance
 * - jcron_matches() performance
 * 
 * Targets (from PostgreSQL/Node.js ports):
 * - Parsing: >1M ops/sec
 * - next(): >500K ops/sec
 * - matches(): >1M ops/sec
 */

#include "../include/jcron.h"
#include <stdio.h>
#include <time.h>
#include <sys/time.h>
#include <string.h>

/* ========================================================================
 * Timing Utilities
 * ======================================================================== */

static inline double get_time_ms(void) {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return tv.tv_sec * 1000.0 + tv.tv_usec / 1000.0;
}

#define BENCHMARK(name, iterations, code) do { \
    printf("  %-40s ", name); \
    fflush(stdout); \
    double start = get_time_ms(); \
    for (int _i = 0; _i < iterations; _i++) { \
        code; \
    } \
    double end = get_time_ms(); \
    double elapsed = end - start; \
    double ops_per_sec = (iterations / elapsed) * 1000.0; \
    printf("%8d ops in %7.2f ms = %10.0f ops/sec\n", iterations, elapsed, ops_per_sec); \
} while(0)

#define BENCHMARK_TIME(name, duration_ms, code) do { \
    printf("  %-40s ", name); \
    fflush(stdout); \
    double start = get_time_ms(); \
    int iterations = 0; \
    double current_time; \
    do { \
        code; \
        iterations++; \
        current_time = get_time_ms(); \
    } while (current_time - start < duration_ms); \
    double end = current_time; \
    double elapsed = end - start; \
    double ops_per_sec = (iterations / elapsed) * 1000.0; \
    printf("%8d ops in %7.2f ms = %10.0f ops/sec\n", iterations, elapsed, ops_per_sec); \
} while(0)

/* ========================================================================
 * Benchmark Tests
 * ======================================================================== */

void benchmark_parsing(void) {
    printf("\n=== Pattern Parsing Benchmarks ===\n");
    
    jcron_pattern_t pattern;
    
    // Simple patterns
    BENCHMARK_TIME("Parse: * * * * * *", 1000, {
        jcron_parse("* * * * * *", &pattern);
    });
    
    BENCHMARK_TIME("Parse: 0 */5 * * * *", 1000, {
        jcron_parse("0 */5 * * * *", &pattern);
    });
    
    BENCHMARK_TIME("Parse: 0 0 12 * * *", 1000, {
        jcron_parse("0 0 12 * * *", &pattern);
    });
    
    // Complex patterns
    BENCHMARK_TIME("Parse: 0,15,30,45 0,6,12,18 * * *", 1000, {
        jcron_parse("0,15,30,45 0,6,12,18 * * * *", &pattern);
    });
    
    BENCHMARK_TIME("Parse: 0-30 8-17 1-15 * 1-5 *", 1000, {
        jcron_parse("0-30 8-17 1-15 * 1-5 *", &pattern);
    });
}

void benchmark_next(void) {
    printf("\n=== jcron_next() Benchmarks ===\n");
    
    jcron_pattern_t pattern;
    jcron_result_t result;
    int64_t from = 1729728000; // 2024-10-24 00:00:00 UTC
    
    // Every minute
    jcron_parse("* * * * * *", &pattern);
    BENCHMARK_TIME("next: * * * * * * (every minute)", 1000, {
        jcron_next(from, &pattern, &result);
    });
    
    // Every 5 minutes
    jcron_parse("* */5 * * * *", &pattern);
    BENCHMARK_TIME("next: * */5 * * * * (every 5 min)", 1000, {
        jcron_next(from, &pattern, &result);
    });
    
    // Daily at noon
    jcron_parse("0 0 12 * * *", &pattern);
    BENCHMARK_TIME("next: 0 0 12 * * * (daily noon)", 1000, {
        jcron_next(from, &pattern, &result);
    });
    
    // Weekdays only at 9 AM
    jcron_parse("0 0 9 * * 1-5", &pattern);
    BENCHMARK_TIME("next: 0 0 9 * * 1-5 (weekdays 9AM)", 1000, {
        jcron_next(from, &pattern, &result);
    });
    
    // Complex: Every 15 min during business hours on weekdays
    jcron_parse("0,15,30,45 9-17 * * 1-5 *", &pattern);
    BENCHMARK_TIME("next: complex business hours", 1000, {
        jcron_next(from, &pattern, &result);
    });
}

void benchmark_prev(void) {
    printf("\n=== jcron_prev() Benchmarks ===\n");
    
    jcron_pattern_t pattern;
    jcron_result_t result;
    int64_t from = 1729728000; // 2024-10-24 00:00:00 UTC
    
    // Every minute
    jcron_parse("* * * * * *", &pattern);
    BENCHMARK_TIME("prev: * * * * * * (every minute)", 1000, {
        jcron_prev(from, &pattern, &result);
    });
    
    // Every 5 minutes
    jcron_parse("* */5 * * * *", &pattern);
    BENCHMARK_TIME("prev: * */5 * * * * (every 5 min)", 1000, {
        jcron_prev(from, &pattern, &result);
    });
    
    // Daily at noon
    jcron_parse("0 0 12 * * *", &pattern);
    BENCHMARK_TIME("prev: 0 0 12 * * * (daily noon)", 1000, {
        jcron_prev(from, &pattern, &result);
    });
}

void benchmark_matches(void) {
    printf("\n=== jcron_matches() Benchmarks ===\n");
    
    jcron_pattern_t pattern;
    int64_t timestamp = 1729728000; // 2024-10-24 00:00:00 UTC
    
    // Every minute - will match
    jcron_parse("* * * * * *", &pattern);
    BENCHMARK_TIME("matches: * * * * * (wildcard)", 1000, {
        jcron_matches(timestamp, &pattern);
    });
    
    // Specific time - won't match
    jcron_parse("0 0 12 * * *", &pattern);
    BENCHMARK_TIME("matches: 0 0 12 * * * (specific)", 1000, {
        jcron_matches(timestamp, &pattern);
    });
    
    // Weekday constraint
    jcron_parse("* * * * * 1-5", &pattern);
    BENCHMARK_TIME("matches: weekday constraint", 1000, {
        jcron_matches(timestamp, &pattern);
    });
}

void benchmark_next_n(void) {
    printf("\n=== jcron_next_n() Benchmarks ===\n");
    
    jcron_pattern_t pattern;
    jcron_result_t results[100];
    int64_t from = 1729728000;
    
    jcron_parse("* */5 * * * *", &pattern);
    BENCHMARK_TIME("next_n(10): every 5 minutes", 1000, {
        jcron_next_n(from, &pattern, 10, results);
    });
    
    BENCHMARK_TIME("next_n(50): every 5 minutes", 1000, {
        jcron_next_n(from, &pattern, 50, results);
    });
    
    BENCHMARK_TIME("next_n(100): every 5 minutes", 1000, {
        jcron_next_n(from, &pattern, 100, results);
    });
}

void benchmark_memory(void) {
    printf("\n=== Memory Usage ===\n");
    printf("  sizeof(jcron_pattern_t)  : %3zu bytes\n", sizeof(jcron_pattern_t));
    printf("  sizeof(jcron_result_t)   : %3zu bytes\n", sizeof(jcron_result_t));
    printf("  Total stack allocation   : %3zu bytes (for both structs)\n", 
           sizeof(jcron_pattern_t) + sizeof(jcron_result_t));
}

/* ========================================================================
 * Main
 * ======================================================================== */

int main(void) {
    printf("\n");
    printf("╔════════════════════════════════════════════════════════════════╗\n");
    printf("║         JCRON C Port - Performance Benchmark Suite            ║\n");
    printf("╚════════════════════════════════════════════════════════════════╝\n");
    
    benchmark_memory();
    benchmark_parsing();
    benchmark_next();
    benchmark_prev();
    benchmark_matches();
    benchmark_next_n();
    
    printf("\n");
    printf("╔════════════════════════════════════════════════════════════════╗\n");
    printf("║                      Performance Targets                       ║\n");
    printf("╠════════════════════════════════════════════════════════════════╣\n");
    printf("║  Parsing:    > 1,000,000 ops/sec                              ║\n");
    printf("║  next():     >   500,000 ops/sec                              ║\n");
    printf("║  matches():  > 1,000,000 ops/sec                              ║\n");
    printf("╚════════════════════════════════════════════════════════════════╝\n");
    printf("\n");
    
    return 0;
}
