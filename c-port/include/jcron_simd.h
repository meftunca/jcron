/**
 * JCRON C Port - SIMD Optimizations
 *
 * SIMD-accelerated bitmask operations for AVX2 and ARM64 NEON
 */

#ifndef JCRON_SIMD_H
#define JCRON_SIMD_H

#include <stdint.h>

// SIMD detection macros
#if defined(__AVX2__)
#include <immintrin.h>
#define JCRON_HAS_AVX2 1
#elif defined(__ARM_NEON) || defined(__aarch64__)
#include <arm_neon.h>
#define JCRON_HAS_NEON 1
#endif

// SIMD-accelerated functions
#ifdef __cplusplus
extern "C" {
#endif

// AVX2 implementations
#if defined(JCRON_HAS_AVX2)
int jcron_simd_bitmask_match_avx2(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields);
#endif

// ARM64 NEON implementations
#if defined(JCRON_HAS_NEON)
int jcron_simd_bitmask_match_neon(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields);
#endif

// Generic SIMD dispatcher
int jcron_simd_bitmask_match(const uint32_t* pattern_masks, const uint32_t* time_values, int num_fields);

#ifdef __cplusplus
}
#endif

#endif // JCRON_SIMD_H