/**
 * JCRON C Port - Correct Top-Down Jump Algorithm
 * 
 * Algorithm: Check from largest unit to smallest
 * Year → Month → Day → Hour → Minute → Second
 * 
 * If any field doesn't match:
 * - Jump to next valid value for that field
 * - Reset all smaller fields to their minimum
 * - Handle overflow (propagate to next larger unit)
 * 
 * This ensures O(fields) iterations instead of O(days)!
 */

#include "jcron.h"
#include <string.h>
#include <time.h>
#include "jcron_simd.h"

/* ========================================================================
 * Time Helpers
 * ======================================================================== */

static inline void timestamp_to_tm(int64_t timestamp, struct tm* tm) {
    time_t t = (time_t)timestamp;
    #ifdef _WIN32
        gmtime_s(tm, &t);
    #else
        gmtime_r(&t, tm);
    #endif
}

// static inline int64_t tm_to_timestamp(const struct tm* tm) {
//     struct tm tmp = *tm;
//     #ifdef __APPLE__
//         return (int64_t)timegm(&tmp);
//     #elif defined(_WIN32)
//         return (int64_t)_mkgmtime(&tmp);
//     #else
//         return (int64_t)timegm(&tmp);
//     #endif
// }

static inline int64_t tm_to_timestamp_fast(const struct tm* tm) {
    int year = tm->tm_year + 1900;
    int month = tm->tm_mon + 1;
    int day = tm->tm_mday;
    int hour = tm->tm_hour;
    int min = tm->tm_min;
    int sec = tm->tm_sec;
    
    // Days since 1970-01-01
    int64_t days = (year - 1970) * 365LL + (year - 1969) / 4 - (year - 1901) / 100 + (year - 1601) / 400;
    
    // Add days for months
    static const int month_days[13] = {0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365};
    days += month_days[month - 1] + day - 1;
    
    // Leap day adjustment
    if (month > 2 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) {
        days++;
    }
    
    return days * 86400LL + hour * 3600LL + min * 60LL + sec;
}

static inline int calc_day_of_week(int year, int month, int day) {
    if (month < 3) {
        month += 12;
        year--;
    }
    int k = year % 100;
    int j = year / 100;
    int h = (day + (13 * (month + 1)) / 5 + k + k / 4 + j / 4 - 2 * j) % 7;
    int dow = (h + 6) % 7;
    if (dow < 0) dow += 7;
    return dow;  // Sunday=0
}

/* ========================================================================
 * Optimized Lookup Tables and SIMD Operations
 * ======================================================================== */

// Precomputed cumulative days since 1970-01-01 for years 1970-2100
static const int32_t DAYS_SINCE_1970[131] = {
    0, 365, 730, 1096, 1461, 1826, 2191, 2557, 2922, 3287,  // 1970-1979
    3652, 4018, 4383, 4748, 5113, 5479, 5844, 6209, 6574, 6940,  // 1980-1989
    7305, 7670, 8035, 8401, 8766, 9131, 9496, 9862, 10227, 10592,  // 1990-1999
    10957, 11323, 11688, 12053, 12418, 12784, 13149, 13514, 13879, 14245,  // 2000-2009
    14610, 14975, 15340, 15706, 16071, 16436, 16801, 17167, 17532, 17897,  // 2010-2019
    18262, 18628, 18993, 19358, 19723, 20089, 20454, 20819, 21184, 21550,  // 2020-2029
    21915, 22280, 22645, 23011, 23376, 23741, 24106, 24472, 24837, 25202,  // 2030-2039
    25567, 25933, 26298, 26663, 27028, 27394, 27759, 28124, 28489, 28855,  // 2040-2049
    29220, 29585, 29950, 30316, 30681, 31046, 31411, 31777, 32142, 32507,  // 2050-2059
    32872, 33238, 33603, 33968, 34333, 34699, 35064, 35429, 35794, 36160,  // 2060-2069
    36525, 36890, 37255, 37621, 37986, 38351, 38716, 39082, 39447, 39812,  // 2070-2079
    40177, 40543, 40908, 41273, 41638, 42004, 42369, 42734, 43099, 43465,  // 2080-2089
    43830, 44195, 44560, 44926, 45291, 45656, 46021, 46387, 46752, 47117   // 2090-2099
};

// Month days (non-leap, leap)
static const int16_t MONTH_DAYS[2][13] = {
    {0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365},  // Non-leap
    {0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366}   // Leap
};

// Fast day of week calculation using lookup table
static inline int calc_day_of_week_fast(int year, int month, int day) {
    // Sakamoto's method - very fast
    static const int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    year -= month < 3;
    return (year + year/4 - year/100 + year/400 + t[month-1] + day) % 7;
}

// Ultra-fast timestamp calculation with precomputed tables
static inline int64_t tm_to_timestamp_ultra_fast(const struct tm* tm) {
    int year = tm->tm_year + 1900;
    int month = tm->tm_mon + 1;
    int day = tm->tm_mday;
    
    // Bounds check
    if (year < 1970 || year > 2100) {
        // Fallback to original
        return tm_to_timestamp_fast(tm);
    }
    
    int year_idx = year - 1970;
    int is_leap = ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0);
    
    int64_t days = DAYS_SINCE_1970[year_idx] + MONTH_DAYS[is_leap][month - 1] + day - 1;
    
    return days * 86400LL + tm->tm_hour * 3600LL + tm->tm_min * 60LL + tm->tm_sec;
}

static int64_t tm_to_timestamp_legacy(const struct tm* tm) {
    // Fallback to original (legacy) implementation
    int year = tm->tm_year + 1900;
    int month = tm->tm_mon + 1;
    int day = tm->tm_mday;
    int hour = tm->tm_hour;
    int min = tm->tm_min;
    int sec = tm->tm_sec;
    
    // Days since 1970-01-01
    int64_t days = (year - 1970) * 365LL + (year - 1969) / 4 - (year - 1901) / 100 + (year - 1601) / 400;
    
    // Add days for months
    static const int month_days[13] = {0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365};
    days += month_days[month - 1] + day - 1;
    
    // Leap day adjustment
    if (month > 2 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) {
        days++;
    }
    
    return days * 86400LL + hour * 3600LL + min * 60LL + sec;
}

static inline int64_t tm_to_timestamp_select(const struct tm* tm) {
    // Select optimal timestamp conversion based on year
    if (tm->tm_year + 1900 >= 1970 && tm->tm_year + 1900 <= 2100) {
        return tm_to_timestamp_ultra_fast(tm);
    } else {
        return tm_to_timestamp_legacy(tm);
    }
}

static int64_t apply_sod_eod_modifiers(int64_t timestamp, const jcron_pattern_t* pattern) {
    if (pattern->sod_type >= 0) {
        // Apply SOD modifier
        int64_t offset = 0;
        switch (pattern->sod_unit) {
            case 'H': offset = pattern->sod_modifier * 3600LL; break;
            case 'D': offset = pattern->sod_modifier * 86400LL; break;
            case 'W': offset = pattern->sod_modifier * 604800LL; break;
            case 'M': {
                // Start of month + modifier months
                struct tm tm;
                timestamp_to_tm(timestamp, &tm);
                tm.tm_mon += pattern->sod_modifier;
                if (tm.tm_mon > 11) {
                    tm.tm_year += tm.tm_mon / 12;
                    tm.tm_mon %= 12;
                }
                tm.tm_mday = 1;
                tm.tm_hour = 0;
                tm.tm_min = 0;
                tm.tm_sec = 0;
                return tm_to_timestamp_ultra_fast(&tm);
            }
        }
        timestamp += offset;
    }
    
    if (pattern->eod_type >= 0) {
        // Apply EOD modifier
        struct tm tm;
        timestamp_to_tm(timestamp, &tm);
        
        switch (pattern->eod_unit) {
            case 'H': 
                tm.tm_hour = 23;
                tm.tm_min = 59;
                tm.tm_sec = 59;
                break;
            case 'D': 
                tm.tm_hour = 23;
                tm.tm_min = 59;
                tm.tm_sec = 59;
                break;
            case 'W': 
                // End of week (Saturday 23:59:59)
                tm.tm_mday += (6 - tm.tm_wday);
                tm.tm_hour = 23;
                tm.tm_min = 59;
                tm.tm_sec = 59;
                break;
            case 'M': 
                // End of month
                tm.tm_mday = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
                tm.tm_hour = 23;
                tm.tm_min = 59;
                tm.tm_sec = 59;
                break;
        }
        
        // Apply modifier (negative offset)
        if (pattern->eod_unit == 'H') {
            tm.tm_hour -= pattern->eod_modifier;
        } else if (pattern->eod_unit == 'D') {
            tm.tm_mday -= pattern->eod_modifier;
        } else if (pattern->eod_unit == 'W') {
            tm.tm_mday -= pattern->eod_modifier * 7;
        } else if (pattern->eod_unit == 'M') {
            tm.tm_mon -= pattern->eod_modifier;
            if (tm.tm_mon < 0) {
                tm.tm_year--;
                tm.tm_mon += 12;
            }
            tm.tm_mday = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
        }
        
        timestamp = tm_to_timestamp_ultra_fast(&tm);
    }
    
    return timestamp;
}

/* ========================================================================
 * jcron_next() - Top-Down Jump Algorithm
 * ======================================================================== */

int jcron_next(int64_t from_timestamp, const jcron_pattern_t* pattern, 
               jcron_result_t* out) {
    if (!pattern || !out) {
        return JCRON_ERR_NULL_POINTER;
    }
    
    memset(out, 0, sizeof(jcron_result_t));
    
    if (!pattern->has_cron) {
        return JCRON_ERR_INVALID_PATTERN;
    }
    
    struct tm tm;
    timestamp_to_tm(from_timestamp, &tm);
    tm.tm_sec = 0;
    
    int max_iterations = 10000;  // Safety limit
    
    for (int iter = 0; iter < max_iterations; iter++) {
        // 1. Check MONTH
        if (!(pattern->months & (1 << (tm.tm_mon + 1)))) {
            // Month doesn't match - jump to next valid month
            int next_month = jcron_next_bit_32(pattern->months, tm.tm_mon + 2);
            
            if (next_month < 0) {
                // Wrap to next year
                next_month = jcron_first_bit_32(pattern->months);
                if (next_month < 0) return JCRON_ERR_NO_MATCH;
                tm.tm_year++;
            }
            
            tm.tm_mon = next_month - 1;
            tm.tm_mday = 1;
            tm.tm_hour = 0;
            tm.tm_min = 0;
            tm.tm_wday = calc_day_of_week(tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday);
            continue;
        }
        
        // 2. Check DAY (day_of_month AND day_of_week must both match)
        if (!jcron_test_bit_32(pattern->days_of_month, tm.tm_mday) ||
            !(pattern->days_of_week & (1 << tm.tm_wday))) {
            // Day doesn't match - jump to next day
            tm.tm_mday++;
            tm.tm_hour = 0;
            tm.tm_min = 0;
            
            // Check month overflow
            int days_in_month = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
            if (tm.tm_mday > days_in_month) {
                tm.tm_mday = 1;
                tm.tm_mon++;
                if (tm.tm_mon > 11) {
                    tm.tm_mon = 0;
                    tm.tm_year++;
                }
            }
            
            tm.tm_wday = calc_day_of_week_fast(tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday);
            continue;
        }
        
        // 3. Check HOUR
        if (!jcron_test_bit_32(pattern->hours, tm.tm_hour)) {
            // Hour doesn't match - jump to next valid hour
            int next_hour = jcron_next_bit_32(pattern->hours, tm.tm_hour + 1);
            
            if (next_hour < 0) {
                // Wrap to next day
                next_hour = jcron_first_bit_32(pattern->hours);
                if (next_hour < 0) return JCRON_ERR_NO_MATCH;
                
                tm.tm_mday++;
                int days_in_month = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
                if (tm.tm_mday > days_in_month) {
                    tm.tm_mday = 1;
                    tm.tm_mon++;
                    if (tm.tm_mon > 11) {
                        tm.tm_mon = 0;
                        tm.tm_year++;
                    }
                }
                tm.tm_wday = calc_day_of_week(tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday);
            }
            
            tm.tm_hour = next_hour;
            tm.tm_min = 0;
            continue;
        }
        
        // 4. Check MINUTE
        if (!jcron_test_bit_64(pattern->minutes, tm.tm_min)) {
            // Minute doesn't match - jump to next valid minute
            int next_min = jcron_next_bit_64(pattern->minutes, tm.tm_min + 1);
            
            if (next_min < 0) {
                // Wrap to next hour
                next_min = jcron_first_bit_64(pattern->minutes);
                if (next_min < 0) return JCRON_ERR_NO_MATCH;
                
                tm.tm_hour++;
                if (tm.tm_hour > 23) {
                    tm.tm_hour = 0;
                    tm.tm_mday++;
                    int days_in_month = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
                    if (tm.tm_mday > days_in_month) {
                        tm.tm_mday = 1;
                        tm.tm_mon++;
                        if (tm.tm_mon > 11) {
                            tm.tm_mon = 0;
                            tm.tm_year++;
                        }
                    }
                    tm.tm_wday = calc_day_of_week(tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday);
                }
            }
            
            tm.tm_min = next_min;
            continue;
        }
        
        // ALL FIELDS MATCH! Found next occurrence
        int64_t match_time = tm_to_timestamp_select(&tm);
        
        // Apply SOD/EOD modifiers
        match_time = apply_sod_eod_modifiers(match_time, pattern);
        
        out->next_time = tm_to_timestamp_ultra_fast(&tm);
        return JCRON_OK;
    }
    
    return JCRON_ERR_NO_MATCH;
}

/* ========================================================================
 * jcron_prev() - Top-Down Jump Algorithm (Backwards)
 * ======================================================================== */

int jcron_prev(int64_t from_timestamp, const jcron_pattern_t* pattern, 
               jcron_result_t* out) {
    if (!pattern || !out) {
        return JCRON_ERR_NULL_POINTER;
    }
    
    memset(out, 0, sizeof(jcron_result_t));
    
    if (!pattern->has_cron) {
        return JCRON_ERR_INVALID_PATTERN;
    }
    
    struct tm tm;
    timestamp_to_tm(from_timestamp, &tm);
    tm.tm_sec = 0;
    
    int max_iterations = 10000;
    
    for (int iter = 0; iter < max_iterations; iter++) {
        // Jump backwards first
        tm.tm_min--;
        if (tm.tm_min < 0) {
            tm.tm_min = 59;
            tm.tm_hour--;
            if (tm.tm_hour < 0) {
                tm.tm_hour = 23;
                tm.tm_mday--;
                if (tm.tm_mday < 1) {
                    tm.tm_mon--;
                    if (tm.tm_mon < 0) {
                        tm.tm_mon = 11;
                        tm.tm_year--;
                    }
                    tm.tm_mday = jcron_days_in_month(tm.tm_year + 1900, tm.tm_mon + 1);
                }
                tm.tm_wday = calc_day_of_week(tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday);
            }
        }
        
        // Now check if this time matches
        if ((pattern->months & (1 << (tm.tm_mon + 1))) &&
            jcron_test_bit_32(pattern->days_of_month, tm.tm_mday) &&
            (pattern->days_of_week & (1 << tm.tm_wday)) &&
            jcron_test_bit_32(pattern->hours, tm.tm_hour) &&
            jcron_test_bit_64(pattern->minutes, tm.tm_min)) {
            // Found previous occurrence
            int64_t match_time = tm_to_timestamp_select(&tm);
            
            // Apply SOD/EOD modifiers
            match_time = apply_sod_eod_modifiers(match_time, pattern);
            
            out->prev_time = match_time;
            return JCRON_OK;
        }
        
        // If not match, continue jumping backwards (already did at top)
    }
    
    return JCRON_ERR_NO_MATCH;
}

/* ========================================================================
 * Other functions
 * ======================================================================== */

int jcron_matches(int64_t timestamp, const jcron_pattern_t* pattern) {
    if (!pattern || !pattern->has_cron) return 0;

    struct tm tm;
    timestamp_to_tm(timestamp, &tm);

    // Prepare arrays for SIMD matching
    const uint32_t pattern_masks[5] = {
        pattern->minutes,
        pattern->hours,
        pattern->days_of_month,
        pattern->months,
        pattern->days_of_week
    };

    const uint32_t time_values[5] = {
        tm.tm_min,
        tm.tm_hour,
        tm.tm_mday,
        tm.tm_mon + 1,  // months are 1-based in cron
        tm.tm_wday
    };

    // Use SIMD-accelerated matching
    return jcron_simd_bitmask_match(pattern_masks, time_values, 5);
}

int jcron_next_n(int64_t from_timestamp, const jcron_pattern_t* pattern,
                 int count, jcron_result_t* results) {
    if (!pattern || !results || count <= 0) {
        return JCRON_ERR_NULL_POINTER;
    }
    
    int64_t current = from_timestamp;
    
    for (int i = 0; i < count; i++) {
        int ret = jcron_next(current, pattern, &results[i]);
        if (ret != JCRON_OK) {
            return ret;
        }
        current = results[i].next_time;
    }
    
    return JCRON_OK;
}
