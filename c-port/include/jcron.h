/**
 * JCRON C Port - High-Performance Cron Scheduler Library
 * 
 * Zero Dependencies | Zero Allocations | Atomic Operations
 * PostgreSQL API Compatible
 * 
 * @author meftunca
 * @license MIT
 * @version 1.0.0-dev
 */

#ifndef JCRON_H
#define JCRON_H

#include <stdint.h>
#include <time.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ========================================================================
 * Version and Build Information
 * ======================================================================== */

#define JCRON_VERSION_MAJOR 1
#define JCRON_VERSION_MINOR 0
#define JCRON_VERSION_PATCH 0
#define JCRON_VERSION_STRING "1.0.0-dev"

/* ========================================================================
 * Error Codes (matches PostgreSQL error handling pattern)
 * ======================================================================== */

typedef enum {
    JCRON_OK                 =  0,  /* Success */
    JCRON_ERR_INVALID_PATTERN = -1,  /* Invalid cron pattern syntax */
    JCRON_ERR_INVALID_TIME    = -2,  /* Invalid time value */
    JCRON_ERR_NO_MATCH        = -3,  /* Pattern has no future matches */
    JCRON_ERR_OVERFLOW        = -4,  /* Time calculation overflow */
    JCRON_ERR_NULL_POINTER    = -5   /* Null pointer argument */
} jcron_error_t;

/* ========================================================================
 * Data Structures (Stack Allocated, ~256 bytes)
 * ======================================================================== */

/**
 * Parsed cron pattern structure
 * 
 * Bitmask representation for efficient matching:
 * - minutes: 60 bits (0-59)
 * - hours: 24 bits (0-23)
 * - days_of_month: 31 bits (1-31)
 * - months: 12 bits (1-12)
 * - days_of_week: 7 bits (0-6, Sunday=0)
 * 
 * Total size: ~256 bytes (stack allocated)
 */
typedef struct {
    /* Bitmask fields for cron pattern */
    uint64_t minutes;          /* 60 bits: 0-59 */
    uint32_t hours;            /* 24 bits: 0-23 */
    uint32_t days_of_month;    /* 31 bits: 1-31 */
    uint16_t months;           /* 12 bits: 1-12 */
    uint8_t  days_of_week;     /* 7 bits: 0-6 (Sunday=0) */
    
    /* EOD (End of Day/Week/Month/Hour) modifiers */
    int8_t   eod_type;         /* -1=none, 0=E0D, 1=E1D, 2=E2D, etc. */
    int8_t   eod_modifier;     /* Modifier value for EOD */
    char     eod_unit;         /* 'D'=Day, 'W'=Week, 'M'=Month, 'H'=Hour */
    
    /* SOD (Start of Day/Week/Month/Hour) modifiers */
    int8_t   sod_type;         /* -1=none, 0=S0D, 1=S1D, 2=S2D, etc. */
    int8_t   sod_modifier;     /* Modifier value for SOD */
    char     sod_unit;         /* 'D'=Day, 'W'=Week, 'M'=Month, 'H'=Hour */
    
    /* Week of Year (WOY) support */
    uint8_t  woy_modifier;     /* WOY modifier enabled */
    uint8_t  woy_count;        /* Number of week numbers (0-4) */
    uint8_t  woy_weeks[4];     /* Week numbers (1-53) */
    
    /* Special pattern flags */
    uint8_t  has_last;         /* L pattern (last day of month/week) */
    uint8_t  has_nth_weekday;  /* # pattern (nth weekday of month) */
    uint8_t  nth_weekday_n;    /* N value for # pattern (1-5) */
    uint8_t  nth_weekday_dow;  /* Day of week for # pattern (0-6) */
    uint8_t  has_nearest_weekday; /* W pattern (nearest weekday) */
    uint8_t  nearest_weekday_day; /* Day for W pattern */
    
    /* Timezone support (optional) */
    uint8_t  has_timezone;     /* Timezone specified? */
    char     timezone[32];     /* Timezone string (e.g., "America/New_York") */
    
    /* Internal flags */
    uint8_t  is_eod_pattern;   /* Pattern is EOD-only (no cron) */
    uint8_t  is_sod_pattern;   /* Pattern is SOD-only (no cron) */
    uint8_t  has_cron;         /* Pattern has cron component */
    
    /* Padding for alignment (total: 256 bytes) */
    uint8_t  _reserved[128];
} jcron_pattern_t;

/**
 * Result structure for next/prev time calculations
 * 
 * Total size: ~64 bytes (stack allocated)
 */
typedef struct {
    int64_t  next_time;        /* Next occurrence (Unix timestamp) */
    int64_t  prev_time;        /* Previous occurrence (Unix timestamp) */
    struct tm time;            /* Broken-down time (year, month, day, etc.) */
    int      error_code;       /* Error code (JCRON_OK or negative) */
} jcron_result_t;

/* ========================================================================
 * Main API Functions (PostgreSQL-Compatible)
 * ======================================================================== */

/**
 * Parse a cron pattern string
 * 
 * Supports:
 * - 6-field cron: "sec min hour day month weekday"
 * - EOD modifiers: "EOD:E0M" (end of this month)
 * - SOD modifiers: "SOD:S2H" (start of hour + 2)
 * - Combined: "0 0 10 * * * S2H" (10:00 + 2 hours)
 * - Special: "L" (last), "#" (nth weekday), "W" (nearest weekday)
 * - WOY: "WOY:1,2,3" (weeks 1, 2, 3)
 * 
 * @param pattern  Pattern string (e.g., "0 5 * * * *" for every 5 minutes)
 * @param out      Output pattern structure (stack allocated)
 * @return         JCRON_OK or error code
 * 
 * Example:
 *   jcron_pattern_t pattern;
 *   int result = jcron_parse("0 5 * * * *", &pattern);
 */
int jcron_parse(const char* pattern, jcron_pattern_t* out);

/**
 * Calculate next occurrence of pattern from given time
 * 
 * Equivalent to PostgreSQL's next_time() function.
 * 
 * @param from_timestamp Starting time (Unix timestamp)
 * @param pattern        Parsed pattern
 * @param out            Result structure with next timestamp
 * @return               JCRON_OK or error code
 * 
 * Example:
 *   jcron_result_t next;
 *   int64_t now = time(NULL);
 *   int result = jcron_next(now, &pattern, &next);
 *   if (result == JCRON_OK) {
 *       printf("Next: %lld\n", next.next_time);
 *   }
 */
int jcron_next(int64_t from_timestamp, const jcron_pattern_t* pattern, jcron_result_t* out);

/**
 * Calculate next N occurrences of pattern
 * 
 * Equivalent to PostgreSQL's next_times() function.
 * 
 * @param from_timestamp Starting time
 * @param pattern        Parsed pattern
 * @param count          Number of occurrences to calculate
 * @param results        Array of result structures (must have space for count)
 * @return               JCRON_OK or negative error code
 * 
 * Example:
 *   jcron_result_t results[10];
 *   int ret = jcron_next_n(time(NULL), &pattern, 10, results);
 */
int jcron_next_n(int64_t from_timestamp, const jcron_pattern_t* pattern,
                 int count, jcron_result_t* results);

/**
 * Calculate previous occurrence of pattern before given time
 * 
 * Equivalent to PostgreSQL's prev_time() function.
 * 
 * @param from_timestamp Reference time
 * @param pattern        Parsed pattern
 * @param out            Result structure with previous timestamp
 * @return               JCRON_OK or error code
 */
int jcron_prev(int64_t from_timestamp, const jcron_pattern_t* pattern, jcron_result_t* out);

/**
 * Check if given time matches pattern
 * 
 * Equivalent to PostgreSQL's matches_pattern() function.
 * 
 * @param timestamp Time to check
 * @param pattern   Parsed pattern
 * @return          1 if matches, 0 if not, negative error code
 */
int jcron_matches(int64_t timestamp, const jcron_pattern_t* pattern);

/* ========================================================================
 * Helper Functions (PostgreSQL Compatibility)
 * ======================================================================== */

/**
 * Parse EOD (End of Day/Week/Month/Hour) pattern
 * 
 * Equivalent to PostgreSQL's parse_eod() function.
 * Returns -1 for "not found" (matches PostgreSQL fixed behavior).
 * 
 * @param pattern     Pattern string (e.g., "E0M", "E2H")
 * @param out_type    Output: -1=none, 0=E0x, 1=E1x, 2=E2x, etc.
 * @param out_modifier Output: modifier value (0, 1, 2, etc.)
 * @param out_unit    Output: unit character ('D', 'W', 'M', 'H')
 * @return            JCRON_OK or error code
 */
int jcron_parse_eod(const char* pattern, int8_t* out_type, 
                    int8_t* out_modifier, char* out_unit);

/**
 * Parse SOD (Start of Day/Week/Month/Hour) pattern
 * 
 * Equivalent to PostgreSQL's parse_sod() function.
 * Returns -1 for "not found" (matches PostgreSQL fixed behavior).
 * 
 * @param pattern     Pattern string (e.g., "S0W", "S2H")
 * @param out_type    Output: -1=none, 0=S0x, 1=S1x, 2=S2x, etc.
 * @param out_modifier Output: modifier value (0, 1, 2, etc.)
 * @param out_unit    Output: unit character ('D', 'W', 'M', 'H')
 * @return            JCRON_OK or error code
 */
int jcron_parse_sod(const char* pattern, int8_t* out_type, 
                    int8_t* out_modifier, char* out_unit);

/**
 * Calculate end of period time
 * 
 * Equivalent to PostgreSQL's calc_end_time() function.
 * 
 * @param base_time  Base time (in/out parameter, modified in place)
 * @param eod_type   EOD type (0=E0x, 1=E1x, 2=E2x, etc.)
 * @param modifier   Modifier value
 * @param unit       Unit character ('D', 'W', 'M', 'H')
 * @return           JCRON_OK or error code
 * 
 * Example:
 *   struct tm t;
 *   time_t now = time(NULL);
 *   localtime_r(&now, &t);
 *   jcron_calc_end_time(&t, 0, 0, 'M');  // End of this month (E0M)
 */
int jcron_calc_end_time(struct tm* base_time, int8_t eod_type, 
                        int8_t modifier, char unit);

/**
 * Calculate start of period time
 * 
 * Equivalent to PostgreSQL's calc_start_time() function.
 * 
 * @param base_time  Base time (in/out parameter, modified in place)
 * @param sod_type   SOD type (0=S0x, 1=S1x, 2=S2x, etc.)
 * @param modifier   Modifier value
 * @param unit       Unit character ('D', 'W', 'M', 'H')
 * @return           JCRON_OK or error code
 */
int jcron_calc_start_time(struct tm* base_time, int8_t sod_type, 
                          int8_t modifier, char unit);

/**
 * Get nth weekday of month
 * 
 * Equivalent to PostgreSQL's get_nth_weekday() function.
 * 
 * @param year     Year (e.g., 2025)
 * @param month    Month (1-12)
 * @param weekday  Day of week (0-6, Sunday=0)
 * @param n        Nth occurrence (1-5, -1=last)
 * @return         Day of month (1-31), or 0 if not found
 * 
 * Example:
 *   int day = jcron_get_nth_weekday(2025, 10, 1, 2);  // 2nd Monday of Oct 2025
 */
int jcron_get_nth_weekday(int year, int month, int weekday, int n);

/**
 * Check if year is leap year
 * 
 * Equivalent to PostgreSQL's is_leap_year() function.
 * 
 * @param year  Year (e.g., 2024)
 * @return      1 if leap year, 0 otherwise
 */
int jcron_is_leap_year(int year);

/**
 * Get number of days in month
 * 
 * Equivalent to PostgreSQL's days_in_month() function.
 * 
 * @param year   Year (for leap year calculation)
 * @param month  Month (1-12)
 * @return       Days in month (28-31)
 */
int jcron_days_in_month(int year, int month);

/* ========================================================================
 * Bitmask Operations (Internal, but exposed for advanced usage)
 * ======================================================================== */

/**
 * Set bit in bitmask
 * 
 * @param mask  Bitmask pointer (uint64_t, uint32_t, uint16_t, or uint8_t)
 * @param bit   Bit position to set
 */
static inline void jcron_set_bit_64(uint64_t* mask, int bit) {
    *mask |= (1ULL << bit);
}

static inline void jcron_set_bit_32(uint32_t* mask, int bit) {
    *mask |= (1U << bit);
}

/**
 * Check if bit is set in bitmask
 * 
 * @param mask  Bitmask value
 * @param bit   Bit position to check
 * @return      1 if set, 0 otherwise
 */
static inline int jcron_test_bit_64(uint64_t mask, int bit) {
    return (mask & (1ULL << bit)) != 0;
}

static inline int jcron_test_bit_32(uint32_t mask, int bit) {
    return (mask & (1U << bit)) != 0;
}

/**
 * Find next set bit in bitmask (Count Trailing Zeros)
 * 
 * @param mask      Bitmask value
 * @param start_bit Start searching from this bit
 * @return          Next set bit position, or -1 if none
 */
int jcron_next_bit_64(uint64_t mask, int start_bit);
int jcron_next_bit_32(uint32_t mask, int start_bit);

/**
 * Find first set bit in bitmask
 * 
 * @param mask  Bitmask value
 * @return      First set bit position, or -1 if none
 */
int jcron_first_bit_64(uint64_t mask);
int jcron_first_bit_32(uint32_t mask);

/**
 * Find last set bit in bitmask (highest position)
 * 
 * @param mask  Bitmask value
 * @return      Last set bit position, or -1 if none
 */
int jcron_last_bit_64(uint64_t mask);
int jcron_last_bit_32(uint32_t mask);

/**
 * Find previous set bit in bitmask (before given position)
 * 
 * @param mask        Bitmask value
 * @param before_bit  Find bit before this position (exclusive)
 * @return            Previous set bit position, or -1 if none
 */
int jcron_prev_bit_64(uint64_t mask, int before_bit);
int jcron_prev_bit_32(uint32_t mask, int before_bit);

/* ========================================================================
 * Utility Functions
 * ======================================================================== */

/**
 * Get error message for error code
 * 
 * @param error_code  Error code (JCRON_ERR_*)
 * @return            Human-readable error message
 */
const char* jcron_strerror(int error_code);

/**
 * Get version string
 * 
 * @return  Version string (e.g., "1.0.0-dev")
 */
const char* jcron_version(void);

#ifdef __cplusplus
}
#endif

#endif /* JCRON_H */
