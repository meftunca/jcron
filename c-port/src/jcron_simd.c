/**
 * JCRON C Port - SIMD Optimizations Implementation
 *
 * SIMD-accelerated bitmask operations for AVX2 and ARM64 NEON
 */

#include "jcron_simd.h"
#include <string.h>

// AVX2 implementations
#if defined(JCRON_HAS_AVX2)

/**
 * AVX2-accelerated bitmask matching for cron patterns
 * Uses SIMD to check multiple fields in parallel with real AVX2 operations
 */
int jcron_simd_bitmask_match_avx2(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields) {
    // Real AVX2 implementation: Process fields in parallel using 256-bit registers

    // For cron patterns (5 fields), we can process all at once
    if (num_fields >= 5) {
        // Load all 5 pattern masks into AVX2 register (pad with zeros if needed)
        __m256i patterns = _mm256_setr_epi32(
            pattern_masks[0], pattern_masks[1], pattern_masks[2],
            pattern_masks[3], pattern_masks[4], 0, 0, 0
        );

        // Load all 5 time values
        __m256i times = _mm256_setr_epi32(
            time_values[0], time_values[1], time_values[2],
            time_values[3], time_values[4], 0, 0, 0
        );

        // Create bit masks: 1 << time_values[i] for each field
        __m256i ones = _mm256_set1_epi32(1);
        __m256i bit_masks = _mm256_sllv_epi32(ones, times);

        // Check matches: pattern_masks[i] & bit_masks[i] != 0
        __m256i matches = _mm256_and_si256(patterns, bit_masks);

        // Check if all matches are non-zero (all fields match)
        // Use horizontal OR to combine all results
        __m256i zero = _mm256_setzero_si256();
        __m256i cmp_zero = _mm256_cmpeq_epi32(matches, zero);

        // Extract the comparison results
        int mask = _mm256_movemask_epi8(cmp_zero);

        // If any of the first 5 fields failed (bits 0-4 set), return 0
        // Each epi32 comparison sets 4 bytes, so first 5 fields = first 20 bytes
        return (mask & 0xFFFFF) == 0 ? 1 : 0;
    }

    // Fallback for fewer fields
    for (int i = 0; i < num_fields; i++) {
        uint32_t pattern = pattern_masks[i];
        uint32_t time_val = time_values[i];
        uint32_t bit_mask = 1U << time_val;
        if ((pattern & bit_mask) == 0) {
            return 0;
        }
    }
    return 1;
}

#endif // JCRON_HAS_AVX2

// ARM64 NEON implementations
#if defined(JCRON_HAS_NEON)

/**
 * NEON-accelerated bitmask matching for cron patterns
 * Uses SIMD to check multiple fields in parallel with real NEON operations
 */
int jcron_simd_bitmask_match_neon(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields) {
    // Real NEON implementation: Process fields in parallel using 128-bit registers

    if (num_fields >= 4) {
        // Load first 4 pattern masks and time values
        uint32x4_t patterns = vld1q_u32(pattern_masks);
        uint32x4_t times = vld1q_u32(time_values);

        // Create bit masks: 1 << time_values[i]
        uint32x4_t ones = vdupq_n_u32(1);
        uint32x4_t bit_masks = vshlq_u32(ones, times);

        // Check matches: pattern & bit_mask != 0
        uint32x4_t matches = vandq_u32(patterns, bit_masks);

        // Check if all matches are non-zero
        uint32x4_t zero = vdupq_n_u32(0);
        uint32x4_t cmp_zero = vceqq_u32(matches, zero);

        // Horizontal OR all comparison results
        uint32_t or_result = vaddvq_u32(cmp_zero);

        // If any comparison was true (equal to zero), or_result will be non-zero
        if (or_result != 0) {
            return 0; // Some field failed
        }

        // Check remaining fields (if any)
        for (int i = 4; i < num_fields; i++) {
            uint32_t pattern = pattern_masks[i];
            uint32_t time_val = time_values[i];
            uint32_t bit_mask = 1U << time_val;
            if ((pattern & bit_mask) == 0) {
                return 0;
            }
        }

        return 1;
    }

    // Fallback for fewer fields
    for (int i = 0; i < num_fields; i++) {
        uint32_t pattern = pattern_masks[i];
        uint32_t time_val = time_values[i];
        uint32_t bit_mask = 1U << time_val;
        if ((pattern & bit_mask) == 0) {
            return 0;
        }
    }
    return 1;
}

#endif // JCRON_HAS_NEON

/**
 * Generic SIMD dispatcher - chooses best available SIMD implementation
 */
int jcron_simd_bitmask_match(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields) {
#if defined(JCRON_HAS_AVX2)
    return jcron_simd_bitmask_match_avx2(pattern_masks, time_values, num_fields);
#elif defined(JCRON_HAS_NEON)
    return jcron_simd_bitmask_match_neon(pattern_masks, time_values, num_fields);
#else
    // Fallback to scalar implementation
    for (int i = 0; i < num_fields; i++) {
        uint32_t bit_mask = 1U << time_values[i];
        if ((pattern_masks[i] & bit_mask) == 0) {
            return 0;
        }
    }
    return 1;
#endif
}