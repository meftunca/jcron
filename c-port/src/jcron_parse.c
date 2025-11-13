/**
 * JCRON C Port - Pattern Parsing Implementation
 * 
 * Parses cron patterns into bitmask representation
 * Algorithm mirrors PostgreSQL port exactly
 */

#include "jcron.h"
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <stdlib.h>

/* ========================================================================
 * Internal Helper Functions
 * ======================================================================== */

/**
 * Skip whitespace in string
 */
static const char* skip_whitespace(const char* str) {
    while (*str && isspace(*str)) {
        str++;
    }
    return str;
}

/**
 * Parse integer from string
 */
static int parse_int(const char** str, int* out) {
    const char* p = *str;
    
    if (!isdigit(*p)) {
        return -1;  // Not a number
    }
    
    int value = 0;
    while (isdigit(*p)) {
        value = value * 10 + (*p - '0');
        p++;
    }
    
    *out = value;
    *str = p;
    return 0;
}

/**
 * Set all bits in range [start, end] for 64-bit mask
 */
static void set_range_64(uint64_t* mask, int start, int end) {
    for (int i = start; i <= end; i++) {
        jcron_set_bit_64(mask, i);
    }
}

/**
 * Set all bits in range [start, end] for 32-bit mask
 */
static void set_range_32(uint32_t* mask, int start, int end) {
    for (int i = start; i <= end; i++) {
        jcron_set_bit_32(mask, i);
    }
}

/**
 * Set all bits in range [start, end] for 16-bit mask
 */
static void set_range_16(uint16_t* mask, int start, int end) {
    for (int i = start; i <= end; i++) {
        *mask |= (1 << i);
    }
}

/**
 * Set all bits in range [start, end] for 8-bit mask
 */
static void set_range_8(uint8_t* mask, int start, int end) {
    for (int i = start; i <= end; i++) {
        *mask |= (1 << i);
    }
}

/* ========================================================================
 * Field Parsing Functions
 * ======================================================================== */

/**
 * Parse single cron field into bitmask
 * 
 * Handles:
 * - "*" (all values)
 * - "N" (single value)
 * - "N-M" (range)
 * - "N,M,O" (list)
 * - "STAR/N" or "N-M/S" (step, STAR means asterisk)
 * 
 * @param field     Field string (e.g., "5" or "1-10" or "1,5,10")
 * @param min_val   Minimum allowed value
 * @param max_val   Maximum allowed value
 * @param mask_64   Output 64-bit mask (for minutes)
 * @param mask_32   Output 32-bit mask (for hours, days)
 * @param mask_16   Output 16-bit mask (for months)
 * @param mask_8    Output 8-bit mask (for weekdays)
 * @return          JCRON_OK or error code
 */
static int parse_cron_field(const char* field, int min_val, int max_val,
                            uint64_t* mask_64, uint32_t* mask_32, 
                            uint16_t* mask_16, uint8_t* mask_8) {
    if (!field) return JCRON_ERR_INVALID_PATTERN;
    
    const char* p = skip_whitespace(field);
    
    // Handle wildcard "*"
    if (*p == '*') {
        p++;
        
        // Check for step "*/N"
        if (*p == '/') {
            p++;
            int step = 0;
            if (parse_int(&p, &step) != 0 || step <= 0) {
                return JCRON_ERR_INVALID_PATTERN;
            }
            
            // Set bits with step
            for (int i = min_val; i <= max_val; i += step) {
                if (mask_64) jcron_set_bit_64(mask_64, i);
                if (mask_32) jcron_set_bit_32(mask_32, i);
                if (mask_16) *mask_16 |= (1 << i);
                if (mask_8)  *mask_8 |= (1 << i);
            }
        } else {
            // Set all bits
            if (mask_64) set_range_64(mask_64, min_val, max_val);
            if (mask_32) set_range_32(mask_32, min_val, max_val);
            if (mask_16) set_range_16(mask_16, min_val, max_val);
            if (mask_8)  set_range_8(mask_8, min_val, max_val);
        }
        
        return JCRON_OK;
    }
    
    // Parse list/range
    while (*p) {
        p = skip_whitespace(p);
        
        // Parse start value
        int start = 0;
        if (parse_int(&p, &start) != 0) {
            return JCRON_ERR_INVALID_PATTERN;
        }
        
        if (start < min_val || start > max_val) {
            return JCRON_ERR_INVALID_PATTERN;
        }
        
        int end = start;  // Default: single value
        int step = 1;
        
        // Check for range "N-M"
        if (*p == '-') {
            p++;
            if (parse_int(&p, &end) != 0) {
                return JCRON_ERR_INVALID_PATTERN;
            }
            
            if (end < min_val || end > max_val || end < start) {
                return JCRON_ERR_INVALID_PATTERN;
            }
        }
        
        // Check for step "N-M/S" or "N/S"
        if (*p == '/') {
            p++;
            if (parse_int(&p, &step) != 0 || step <= 0) {
                return JCRON_ERR_INVALID_PATTERN;
            }
        }
        
        // Set bits in range with step
        for (int i = start; i <= end; i += step) {
            if (mask_64) jcron_set_bit_64(mask_64, i);
            if (mask_32) jcron_set_bit_32(mask_32, i);
            if (mask_16) *mask_16 |= (1 << i);
            if (mask_8)  *mask_8 |= (1 << i);
        }
        
        // Check for comma (list continuation)
        p = skip_whitespace(p);
        if (*p == ',') {
            p++;
        } else if (*p != '\0') {
            // Unexpected character
            return JCRON_ERR_INVALID_PATTERN;
        }
    }
    
    return JCRON_OK;
}

/* ========================================================================
 * Main Parsing Function
 * ======================================================================== */

/**
 * Parse full cron pattern
 * 
 * Format: "sec min hour day month weekday [modifier]"
 * 
 * Examples:
 * - "* * * * * *" - Every second
 * - "0 5 * * * *" - Every 5 minutes (at minute 5 of every hour)
 * - "0 0 12 * * *" - Daily at noon
 * - "0 0 10 * * * S2H" - 10:00 + 2 hours (SOD modifier)
 * - "EOD:E0M" - End of this month
 */
int jcron_parse(const char* pattern, jcron_pattern_t* out) {
    if (!pattern || !out) {
        return JCRON_ERR_NULL_POINTER;
    }
    
    // Initialize structure
    memset(out, 0, sizeof(jcron_pattern_t));
    out->eod_type = -1;
    out->sod_type = -1;
    out->eod_modifier = -1;
    out->sod_modifier = -1;
    
    // Check for EOD-only pattern
    if (strncmp(pattern, "EOD:", 4) == 0) {
        out->is_eod_pattern = 1;
        return jcron_parse_eod(pattern, &out->eod_type, &out->eod_modifier, &out->eod_unit);
    }
    
    // Check for SOD-only pattern
    if (strncmp(pattern, "SOD:", 4) == 0) {
        out->is_sod_pattern = 1;
        return jcron_parse_sod(pattern, &out->sod_type, &out->sod_modifier, &out->sod_unit);
    }
    
    // Check for OR patterns separated by "|"
    const char* or_separator = strchr(pattern, '|');
    if (or_separator) {
        // Parse as OR pattern
        char pattern1[256];
        char pattern2[256];
        
        size_t len1 = or_separator - pattern;
        if (len1 >= sizeof(pattern1)) return JCRON_ERR_INVALID_PATTERN;
        strncpy(pattern1, pattern, len1);
        pattern1[len1] = '\0';
        
        const char* p2 = or_separator + 1;
        while (*p2 && isspace(*p2)) p2++;  // Skip whitespace
        if (strlen(p2) >= sizeof(pattern2)) return JCRON_ERR_INVALID_PATTERN;
        strcpy(pattern2, p2);
        
        // Parse both patterns
        jcron_pattern_t pat1, pat2;
        int ret1 = jcron_parse(pattern1, &pat1);
        if (ret1 != JCRON_OK) return ret1;
        int ret2 = jcron_parse(pattern2, &pat2);
        if (ret2 != JCRON_OK) return ret2;
        
        // Combine with OR
        out->has_cron = 1;
        out->minutes = pat1.minutes | pat2.minutes;
        out->hours = pat1.hours | pat2.hours;
        out->days_of_month = pat1.days_of_month | pat2.days_of_month;
        out->months = pat1.months | pat2.months;
        out->days_of_week = pat1.days_of_week | pat2.days_of_week;
        
        // Copy modifiers from first pattern (simplified)
        out->woy_modifier = pat1.woy_modifier;
        out->sod_type = pat1.sod_type;
        out->sod_modifier = pat1.sod_modifier;
        out->sod_unit = pat1.sod_unit;
        out->eod_type = pat1.eod_type;
        out->eod_modifier = pat1.eod_modifier;
        out->eod_unit = pat1.eod_unit;
        
        return JCRON_OK;
    }
    
    // Parse 6-field cron pattern
    // Make a copy for tokenization
    char buffer[512];
    strncpy(buffer, pattern, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
    
    // Split by whitespace
    char* fields[7];  // 6 cron fields + optional modifier
    int field_count = 0;
    char* token = strtok(buffer, " \t");
    
    while (token && field_count < 7) {
        fields[field_count++] = token;
        token = strtok(NULL, " \t");
    }
    
    // Must have at least 6 fields (sec min hour day month weekday)
    if (field_count < 6) {
        return JCRON_ERR_INVALID_PATTERN;
    }
    
    out->has_cron = 1;
    
    // Parse each field
    int result;
    
    // Field 0: Seconds (0-59) - We don't have a seconds bitmask yet
    // For now, we'll skip seconds and treat this as 5-field cron starting at minutes
    // TODO: Add seconds support in Phase 2
    
    // Minutes (field 1): 0-59
    result = parse_cron_field(fields[1], 0, 59, &out->minutes, NULL, NULL, NULL);
    if (result != JCRON_OK) return result;
    
    // Hours (field 2: 0-23
    result = parse_cron_field(fields[2], 0, 23, NULL, &out->hours, NULL, NULL);
    if (result != JCRON_OK) return result;
    
    // Day of month (field 3): 1-31
    result = parse_cron_field(fields[3], 1, 31, NULL, &out->days_of_month, NULL, NULL);
    if (result != JCRON_OK) return result;
    
    // Month (field 4): 1-12
    result = parse_cron_field(fields[4], 1, 12, NULL, NULL, &out->months, NULL);
    if (result != JCRON_OK) return result;
    
    // Day of week (field 5): 0-6 (Sunday=0) or 1-53 for WOY
    if (out->woy_modifier) {
        result = parse_cron_field(fields[5], 1, 53, NULL, NULL, NULL, NULL);
        if (result != JCRON_OK) return result;
        // For now, store in days_of_week (simplified)
        out->days_of_week = 0x7F;  // All days
        // TODO: Implement proper WOY logic
    } else {
        result = parse_cron_field(fields[5], 0, 6, NULL, NULL, NULL, &out->days_of_week);
        if (result != JCRON_OK) return result;
    }
    
    // Check for optional modifier (field 6)
    if (field_count >= 7) {
        // Try to parse as modifier
        const char* modifier = fields[6];
        
        // Check for WOY modifier
        if (strcmp(modifier, "WOY") == 0) {
            out->woy_modifier = 1;
        }
        // Check for SOD modifier
        else if (modifier[0] == 'S' && isdigit(modifier[1])) {
            jcron_parse_sod(modifier, &out->sod_type, &out->sod_modifier, &out->sod_unit);
        }
        // Check for EOD modifier
        else if (modifier[0] == 'E' && isdigit(modifier[1])) {
            jcron_parse_eod(modifier, &out->eod_type, &out->eod_modifier, &out->eod_unit);
        }
    }
    
    return JCRON_OK;
}

/* ========================================================================
 * SOD/EOD Parsing Functions
 * ======================================================================== */

int jcron_parse_sod(const char* modifier, int8_t* type, int8_t* modifier_val, char* unit) {
    if (!modifier || modifier[0] != 'S' || !isdigit(modifier[1])) {
        return JCRON_ERR_INVALID_PATTERN;
    }
    
    *type = modifier[1] - '0';
    const char* p = modifier + 2;
    
    if (*p == '\0') {
        *modifier_val = 0;
        *unit = 'D';  // Default to days
    } else {
        *modifier_val = *type;
        *unit = *p;
        if (*unit != 'H' && *unit != 'D' && *unit != 'W' && *unit != 'M') {
            return JCRON_ERR_INVALID_PATTERN;
        }
    }
    
    return JCRON_OK;
}

int jcron_parse_eod(const char* modifier, int8_t* type, int8_t* modifier_val, char* unit) {
    if (!modifier || modifier[0] != 'E' || !isdigit(modifier[1])) {
        return JCRON_ERR_INVALID_PATTERN;
    }
    
    *type = modifier[1] - '0';
    const char* p = modifier + 2;
    
    if (*p == '\0') {
        *modifier_val = 0;
        *unit = 'D';  // Default to days
    } else {
        *modifier_val = *type;
        *unit = *p;
        if (*unit != 'H' && *unit != 'D' && *unit != 'W' && *unit != 'M') {
            return JCRON_ERR_INVALID_PATTERN;
        }
    }
    
    return JCRON_OK;
}
