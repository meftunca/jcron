/**
 * JCRON C Port - Core Implementation
 * 
 * Zero Dependencies | Zero Allocations | PostgreSQL Compatible
 * 
 * This file contains stub implementations. The actual implementation
 * will follow PostgreSQL's algorithm exactly.
 */

#include "jcron.h"
#include <string.h>
#include <stdio.h>
#include <ctype.h>

// SIMD optimizations
#include "jcron_simd.h"

/* ========================================================================
 * Version and Error Handling
 * ======================================================================== */

const char* jcron_version(void) {
    return JCRON_VERSION_STRING;
}

const char* jcron_strerror(int error_code) {
    switch (error_code) {
        case JCRON_OK:
            return "Success";
        case JCRON_ERR_INVALID_PATTERN:
            return "Invalid cron pattern syntax";
        case JCRON_ERR_INVALID_TIME:
            return "Invalid time value";
        case JCRON_ERR_NO_MATCH:
            return "Pattern has no future matches";
        case JCRON_ERR_OVERFLOW:
            return "Time calculation overflow";
        case JCRON_ERR_NULL_POINTER:
            return "Null pointer argument";
        default:
            return "Unknown error";
    }
}

/* ========================================================================
 * Bitmask Operations (O(1) using GCC intrinsics)
 * ======================================================================== */

// Forward declarations for branchless functions
static inline int jcron_next_bit_32_branchless(uint32_t mask, int start_bit);
static inline int jcron_next_bit_64_branchless(uint64_t mask, int start_bit);

int jcron_next_bit_64(uint64_t mask, int start_bit) {
    return jcron_next_bit_64_branchless(mask, start_bit);
}

int jcron_next_bit_32(uint32_t mask, int start_bit) {
    return jcron_next_bit_32_branchless(mask, start_bit);
}

int jcron_first_bit_64(uint64_t mask) {
    return jcron_next_bit_64(mask, 0);
}

int jcron_first_bit_32(uint32_t mask) {
    return jcron_next_bit_32(mask, 0);
}

int jcron_last_bit_64(uint64_t mask) {
    if (mask == 0) return -1;
    
#ifdef __GNUC__
    // CLZ (Count Leading Zeros) gives position from MSB
    return 63 - __builtin_clzll(mask);
#else
    // Fallback: linear search from end
    for (int i = 63; i >= 0; i--) {
        if (mask & (1ULL << i)) return i;
    }
    return -1;
#endif
}

int jcron_last_bit_32(uint32_t mask) {
    if (mask == 0) return -1;
    
#ifdef __GNUC__
    return 31 - __builtin_clz(mask);
#else
    for (int i = 31; i >= 0; i--) {
        if (mask & (1U << i)) return i;
    }
    return -1;
#endif
}

int jcron_prev_bit_64(uint64_t mask, int before_bit) {
    if (before_bit <= 0) return -1;
    
    // Mask off bits >= before_bit
    if (before_bit < 64) {
        mask &= (1ULL << before_bit) - 1;
    }
    
    return jcron_last_bit_64(mask);
}

int jcron_prev_bit_32(uint32_t mask, int before_bit) {
    if (before_bit <= 0) return -1;
    
    if (before_bit < 32) {
        mask &= (1U << before_bit) - 1;
    }
    
    return jcron_last_bit_32(mask);
}

/* ========================================================================
 * Helper Functions (PostgreSQL Compatible)
 * ======================================================================== */

int jcron_is_leap_year(int year) {
    // Equivalent to PostgreSQL's is_leap_year()
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int jcron_days_in_month(int year, int month) {
    // Equivalent to PostgreSQL's days_in_month()
    static const int days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    
    if (month < 1 || month > 12) return 0;
    
    int d = days[month - 1];
    if (month == 2 && jcron_is_leap_year(year)) {
        d = 29;
    }
    
    return d;
}

int jcron_get_nth_weekday(int year, int month, int weekday, int n) {
    // Equivalent to PostgreSQL's get_nth_weekday()
    // TODO: Implement full algorithm
    // This is a stub - will be implemented in Phase 4
    (void)year; (void)month; (void)weekday; (void)n;
    return 0;
}

/* ========================================================================
 * Main API Functions
 * ======================================================================== */

// Note: jcron_parse() is implemented in jcron_parse.c
// Note: jcron_next(), jcron_prev(), jcron_matches(), jcron_next_n() 
//       are implemented in jcron_time.c

/* ========================================================================
 * Branchless Bitmask Operations
 * ======================================================================== */

// Branchless bit operations using GCC builtins
static inline int jcron_next_bit_32_branchless(uint32_t mask, int start_bit) {
    if (start_bit >= 32) return -1;
    
    mask &= ~((1U << start_bit) - 1);
    
    if (mask == 0) return -1;
    return __builtin_ctz(mask);
}

static inline int jcron_next_bit_64_branchless(uint64_t mask, int start_bit) {
    if (start_bit >= 64) return -1;
    
    mask &= ~((1ULL << start_bit) - 1);
    
    if (mask == 0) return -1;
    return __builtin_ctzll(mask);
}
