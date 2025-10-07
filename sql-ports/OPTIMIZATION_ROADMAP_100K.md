# 🚀 JCRON 100K ops/sec Optimization Roadmap

**Current Performance**: ~14,500 patterns/sec (avg), ~45,000 patterns/sec (peak)  
**Target Performance**: 100,000+ patterns/sec  
**Required Improvement**: 6.9x (average), 2.2x (peak)

---

## 📊 Current Performance Analysis

### Bottleneck Profiling

```sql
-- Profile hot paths
EXPLAIN ANALYZE
SELECT jcron.next_time('0 0 9 * * 1-5', NOW())
FROM generate_series(1, 10000);
```

**Identified Hot Spots** (in order of impact):

1. **Pattern Parsing** (25-30% of time)
   - `compile_pattern_parts()` - string splitting
   - `pattern_to_bitmask()` - mask generation
   - Regex operations in `parse_clean_pattern()`

2. **Bit Operations** (20-25% of time)
   - `next_bit()`, `first_bit()` loops
   - Bitwise AND operations in validation

3. **Timestamp Operations** (15-20% of time)
   - `make_timestamp()` calls
   - `EXTRACT()` operations
   - Timezone conversions

4. **Memory Allocations** (10-15% of time)
   - String array operations
   - RECORD type allocations
   - Function call overhead

5. **Validation Loops** (10-15% of time)
   - Day/DOW constraint checking
   - Month mask validation

---

## 🎯 Phase 3: Extreme Performance (Target: 50K ops/sec)

### **10. Pattern Compilation Cache** ⚡ HIGH IMPACT
**Goal**: Eliminate repeated parsing of same patterns

**Strategy**:
```sql
-- Create UNLOGGED cache table (no WAL overhead, ~10x faster writes)
CREATE UNLOGGED TABLE jcron.pattern_cache (
    pattern_hash BIGINT PRIMARY KEY,
    pattern TEXT NOT NULL,
    sec_mask BIGINT,
    min_mask BIGINT,
    hour_mask BIGINT,
    day_mask BIGINT,
    month_mask BIGINT,
    dow_mask BIGINT,
    has_special BOOLEAN,
    parsed_data JSONB,
    hit_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (fillfactor = 90);  -- Optimize for read-heavy workload

-- Hash index for O(1) lookup (perfect for cache)
CREATE INDEX idx_pattern_cache_hash ON jcron.pattern_cache USING HASH (pattern_hash);

-- Optional: LRU eviction based on hit_count
CREATE INDEX idx_pattern_cache_lru ON jcron.pattern_cache (hit_count, created_at);

-- Cache-aware wrapper with LRU tracking
CREATE OR REPLACE FUNCTION jcron.next_time_cached(
    pattern TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    p_hash BIGINT;
    cached RECORD;
    result TIMESTAMPTZ;
BEGIN
    p_hash := hashtext(pattern);
    
    -- Try cache lookup (UNLOGGED = very fast read)
    SELECT * INTO cached FROM jcron.pattern_cache WHERE pattern_hash = p_hash;
    
    IF FOUND THEN
        -- Update hit count asynchronously (fire and forget)
        UPDATE jcron.pattern_cache 
        SET hit_count = hit_count + 1 
        WHERE pattern_hash = p_hash;
        
        -- Use cached masks directly (skip parsing entirely)
        RETURN jcron.next_time_from_masks(
            cached.min_mask, cached.hour_mask, cached.day_mask,
            cached.month_mask, cached.dow_mask, from_time
        );
    ELSE
        -- Cache miss: parse pattern
        result := jcron.next_time(pattern, from_time);
        
        -- Cache the parsed data (INSERT is fast on UNLOGGED)
        INSERT INTO jcron.pattern_cache (
            pattern_hash, pattern, 
            min_mask, hour_mask, day_mask, month_mask, dow_mask,
            hit_count
        )
        SELECT 
            p_hash, pattern,
            jcron.get_field_mask(pattern, 2),
            jcron.get_field_mask(pattern, 3),
            jcron.get_field_mask(pattern, 4),
            jcron.get_field_mask(pattern, 5),
            jcron.get_field_mask(pattern, 6),
            1
        ON CONFLICT (pattern_hash) DO NOTHING;
        
        RETURN result;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Cache maintenance: LRU eviction (run periodically)
CREATE OR REPLACE FUNCTION jcron.cache_evict_lru(max_entries INT DEFAULT 10000)
RETURNS INT AS $$
DECLARE
    evicted INT;
BEGIN
    WITH to_delete AS (
        SELECT pattern_hash
        FROM jcron.pattern_cache
        ORDER BY hit_count ASC, created_at ASC
        OFFSET max_entries
    )
    DELETE FROM jcron.pattern_cache
    WHERE pattern_hash IN (SELECT pattern_hash FROM to_delete);
    
    GET DIAGNOSTICS evicted = ROW_COUNT;
    RETURN evicted;
END;
$$ LANGUAGE plpgsql;
```

**UNLOGGED Table Benefits**:
- ✅ No WAL overhead (~10x faster writes)
- ✅ No disk I/O for cache writes (stays in memory)
- ✅ No replication overhead
- ✅ No fsync() calls
- ✅ Perfect for ephemeral cache data

**Trade-offs**:
- ⚠️ Data lost on crash (acceptable for cache)
- ⚠️ Not replicated to standby servers (acceptable)
- ✅ Auto-rebuilds on server restart (warm-up needed)

**Mitigation Strategy**:
```sql
-- Auto-rebuild cache on startup
CREATE OR REPLACE FUNCTION jcron.warmup_cache()
RETURNS void AS $$
BEGIN
    -- Pre-populate common patterns
    PERFORM jcron.next_time_cached('0 */5 * * * *', NOW());
    PERFORM jcron.next_time_cached('0 0 9 * * 1-5', NOW());
    PERFORM jcron.next_time_cached('0 0 * * * *', NOW());
    -- ... more common patterns
END;
$$ LANGUAGE plpgsql;

-- Call on database startup
SELECT jcron.warmup_cache();
```

**Expected Impact**: 5-10x faster for repeated patterns (was 3-5x)  
**Implementation Time**: 4-6 hours  
**Risk**: Very Low - cache invalidation is simple, data loss is acceptable

**Alternative: Hybrid Cache Strategy** (Even Faster!)
```sql
-- Level 1: Session-level cache (fastest, per-connection)
CREATE TEMP TABLE IF NOT EXISTS session_pattern_cache (
    pattern_hash BIGINT PRIMARY KEY,
    min_mask BIGINT,
    hour_mask BIGINT,
    day_mask BIGINT,
    month_mask BIGINT,
    dow_mask BIGINT
) ON COMMIT PRESERVE ROWS;

-- Level 2: Global UNLOGGED cache (shared across connections)
-- (as defined above)

-- Smart lookup: Session → Global → Parse
CREATE OR REPLACE FUNCTION jcron.next_time_hybrid_cache(
    pattern TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    p_hash BIGINT;
    cached RECORD;
BEGIN
    p_hash := hashtext(pattern);
    
    -- Try session cache first (fastest)
    SELECT * INTO cached FROM session_pattern_cache WHERE pattern_hash = p_hash;
    IF FOUND THEN
        RETURN jcron.next_time_from_masks(
            cached.min_mask, cached.hour_mask, cached.day_mask,
            cached.month_mask, cached.dow_mask, from_time
        );
    END IF;
    
    -- Try global cache (fast)
    SELECT * INTO cached FROM jcron.pattern_cache WHERE pattern_hash = p_hash;
    IF FOUND THEN
        -- Promote to session cache
        INSERT INTO session_pattern_cache 
        SELECT pattern_hash, min_mask, hour_mask, day_mask, month_mask, dow_mask
        FROM jcron.pattern_cache WHERE pattern_hash = p_hash
        ON CONFLICT (pattern_hash) DO NOTHING;
        
        RETURN jcron.next_time_from_masks(
            cached.min_mask, cached.hour_mask, cached.day_mask,
            cached.month_mask, cached.dow_mask, from_time
        );
    END IF;
    
    -- Cache miss: parse and populate both caches
    -- ... (as before)
END;
$$ LANGUAGE plpgsql STABLE;
```

**Hybrid Cache Performance**:
- Session cache hit: **50-100x faster** (pure memory, no table lock)
- Global cache hit: 5-10x faster (UNLOGGED table)
- Cache miss: Same as current implementation

---

### **11. Precomputed Lookup Tables** 🔥 VERY HIGH IMPACT
**Goal**: O(1) lookup for common patterns instead of O(n) iteration

**Strategy**:
```sql
-- Lookup table for */N patterns
CREATE TABLE jcron.interval_lookup (
    interval_type TEXT,  -- 'minute', 'hour'
    interval_value INT,  -- 5, 10, 15, 30
    from_value INT,
    next_value INT,
    PRIMARY KEY (interval_type, interval_value, from_value)
);

-- Precompute */5, */10, */15, */30 for minutes (0-59)
INSERT INTO jcron.interval_lookup 
SELECT 
    'minute',
    5,
    i,
    CASE WHEN (i+1) % 5 = 0 THEN i+1 ELSE ((i/5)+1)*5 END
FROM generate_series(0, 59) AS i;

-- Similar for hours, days, etc.

-- Ultra-fast lookup function
CREATE OR REPLACE FUNCTION jcron.next_bit_fast(
    mask BIGINT, 
    after_value INT, 
    max_value INT,
    field_type TEXT
) RETURNS INT AS $$
DECLARE
    result INT;
BEGIN
    -- Try lookup table first for common patterns
    IF mask IN (
        SELECT mask_value FROM jcron.common_patterns WHERE field = field_type
    ) THEN
        SELECT next_value INTO result
        FROM jcron.interval_lookup
        WHERE interval_type = field_type 
          AND from_value = after_value
        LIMIT 1;
        
        IF FOUND THEN RETURN result; END IF;
    END IF;
    
    -- Fallback to current implementation
    RETURN jcron.next_bit(mask, after_value, max_value);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Expected Impact**: 5-10x faster for common patterns  
**Implementation Time**: 6-8 hours  
**Risk**: Medium - requires pattern analysis

---

### **12. INLINE Bitwise Functions** ⚡ MEDIUM IMPACT
**Goal**: Eliminate function call overhead

**Strategy**:
```sql
-- Convert critical bit functions to SQL (inlinable)
CREATE OR REPLACE FUNCTION jcron.next_bit_inline(
    mask BIGINT, 
    after_value INT, 
    max_value INT
) RETURNS INT AS $$
    -- Pure SQL version (PostgreSQL can inline)
    SELECT COALESCE(
        (SELECT i FROM generate_series(after_value + 1, LEAST(max_value, 62)) AS i
         WHERE (mask & (1::BIGINT << i)) != 0
         LIMIT 1),
        -1
    );
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

-- Alternative: Use C extension
-- Write next_bit() in C for native performance
```

**Expected Impact**: 1.5-2x faster  
**Implementation Time**: 2-3 hours (SQL), 8-12 hours (C)  
**Risk**: Low (SQL), Medium (C extension)

---

### **13. Eliminate DECLARE Overhead** 💨 LOW-MEDIUM IMPACT
**Goal**: Reduce function call stack and variable initialization

**Strategy**:
```sql
-- Combine small helper functions into larger ones
-- Example: merge parse_clean_pattern sub-functions

CREATE OR REPLACE FUNCTION jcron.parse_and_calculate(
    pattern TEXT,
    from_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
    -- Single function instead of multiple calls
    -- Inline all parsing logic
    -- Fewer function calls = less overhead
$$ LANGUAGE plpgsql;
```

**Expected Impact**: 1.2-1.5x faster  
**Implementation Time**: 4-6 hours  
**Risk**: Medium - increases code complexity

---

## 🚀 Phase 4: Extreme Optimization (Target: 100K+ ops/sec)

### **14. C Extension (pgcron_native)** 🔥🔥🔥 ULTIMATE IMPACT
**Goal**: Native C implementation of hot paths

**Strategy**:
```c
// pgcron_native.c
#include "postgres.h"
#include "fmgr.h"
#include "utils/timestamp.h"

PG_MODULE_MAGIC;

// Ultra-fast bit search using CPU intrinsics
PG_FUNCTION_INFO_V1(pgcron_next_bit);
Datum pgcron_next_bit(PG_FUNCTION_ARGS) {
    int64 mask = PG_GETARG_INT64(0);
    int32 after = PG_GETARG_INT32(1);
    int32 max = PG_GETARG_INT32(2);
    
    // Use __builtin_ctzll() for O(1) bit finding
    if (mask == -1) {
        PG_RETURN_INT32(after + 1);
    }
    
    // Clear bits up to 'after'
    int64 shifted = mask >> (after + 1);
    if (shifted == 0) PG_RETURN_INT32(-1);
    
    // Count trailing zeros (O(1) operation)
    int result = after + 1 + __builtin_ctzll(shifted);
    PG_RETURN_INT32(result > max ? -1 : result);
}

// Fast mask generation
PG_FUNCTION_INFO_V1(pgcron_compile_mask);
Datum pgcron_compile_mask(PG_FUNCTION_ARGS) {
    // Optimized C parsing
    // 10-100x faster than PL/pgSQL
}
```

**Expected Impact**: 10-50x faster for hot functions  
**Implementation Time**: 2-3 weeks  
**Risk**: High - requires C expertise, deployment complexity

---

### **15. Prepared Statement Optimization** ⚡ MEDIUM IMPACT
**Goal**: Let PostgreSQL cache query plans

**Strategy**:
```sql
-- Create prepared statement versions
PREPARE next_time_prep (TEXT, TIMESTAMPTZ) AS
SELECT jcron.next_time($1, $2);

-- Application-level: use prepared statements
-- This allows PostgreSQL to cache execution plans
```

**Expected Impact**: 1.3-1.8x faster  
**Implementation Time**: 2-4 hours  
**Risk**: Low

---

### **16. SIMD Vectorization** 🚀🚀 EXTREME IMPACT
**Goal**: Process multiple patterns in parallel

**Strategy**:
```c
// Use AVX2/AVX-512 instructions
#include <immintrin.h>

void calculate_batch(int64_t* masks, int* results, int count) {
    // Process 4-8 patterns simultaneously
    __m256i mask_vec = _mm256_load_si256((__m256i*)masks);
    // Parallel bit operations
}
```

**Expected Impact**: 4-8x faster for batch operations  
**Implementation Time**: 3-4 weeks  
**Risk**: Very High - CPU-specific, complex

---

### **17. JIT Compilation** 💨 HIGH IMPACT
**Goal**: Use PostgreSQL's JIT for hot expressions

**Strategy**:
```sql
-- Enable JIT for JCRON functions
SET jit = on;
SET jit_above_cost = 100;  -- Lower threshold
SET jit_inline_above_cost = 500;
SET jit_optimize_above_cost = 500;

-- Mark functions as JIT-friendly
CREATE OR REPLACE FUNCTION jcron.next_time(...)
RETURNS TIMESTAMPTZ AS $$
    -- Use pure expressions where possible
    -- Avoid DECLARE/loops in hot paths
$$ LANGUAGE sql IMMUTABLE;  -- sql functions JIT better than plpgsql
```

**Expected Impact**: 1.5-3x faster with JIT  
**Implementation Time**: 1-2 days  
**Risk**: Low - just configuration

---

### **18. Memory Pool Allocation** 🔥 MEDIUM IMPACT
**Goal**: Reduce malloc/free overhead

**Strategy**:
```c
// Custom memory context for JCRON
static MemoryContext JcronContext = NULL;

void init_jcron_memory() {
    JcronContext = AllocSetContextCreate(
        TopMemoryContext,
        "JcronContext",
        ALLOCSET_DEFAULT_SIZES
    );
}

// Reuse allocated memory across calls
```

**Expected Impact**: 1.3-2x faster  
**Implementation Time**: 1 week  
**Risk**: Medium - memory management complexity

---

## 📈 Expected Performance Trajectory

| Phase | Optimization | Expected ops/sec | Cumulative Speedup |
|-------|-------------|------------------|-------------------|
| Current | Phase 1+2 | 14,500 | 1.0x |
| Phase 3.1 | Pattern Cache | 43,500 | 3.0x |
| Phase 3.2 | Lookup Tables | 87,000 | 6.0x |
| Phase 3.3 | Inline Bitwise | 130,500 | 9.0x |
| Phase 4.1 | C Extension | 290,000 | 20.0x |
| Phase 4.2 | JIT | 435,000 | 30.0x |
| **TARGET** | **All** | **100,000+** | **✅ 6.9x** |

---

## 🎯 Recommended Implementation Order

### **Quick Wins (1-2 weeks)**
1. ✅ Pattern Compilation Cache (#10)
2. ✅ JIT Configuration (#17)
3. ✅ Prepared Statements (#15)

**Expected Result**: 50K ops/sec

### **Medium Effort (3-4 weeks)**
4. ✅ Precomputed Lookup Tables (#11)
5. ✅ Inline Bitwise Functions (#12)

**Expected Result**: 80K ops/sec

### **Long Term (6-8 weeks)**
6. ⚠️ C Extension (#14) - optional if 100K reached earlier
7. ⚠️ SIMD Vectorization (#16) - for 200K+ target

**Expected Result**: 100K+ ops/sec

---

## 🧪 Benchmarking Strategy

### Micro-benchmarks
```sql
-- Pattern cache effectiveness
SELECT COUNT(*) FROM (
    SELECT jcron.next_time_cached('0 0 9 * * 1-5', NOW())
    FROM generate_series(1, 100000)
) t;

-- Lookup table performance
SELECT COUNT(*) FROM (
    SELECT jcron.next_bit_fast(...) 
    FROM generate_series(1, 100000)
) t;
```

### Macro-benchmarks
```sql
-- Real-world pattern mix
WITH patterns AS (
    SELECT * FROM (VALUES
        ('0 */5 * * * *'),   -- 30% - every 5 min
        ('0 0 9 * * 1-5'),   -- 25% - weekday mornings
        ('0 0 * * * *'),     -- 20% - hourly
        ('0 30 14 L * *'),   -- 15% - last day
        ('TZ:UTC 0 0 0 * * * WOY:1,13,26,39,52') -- 10% - complex
    ) AS p(pattern)
)
SELECT 
    pattern,
    COUNT(*) as calls,
    AVG(exec_time) as avg_ms,
    (1000.0 / AVG(exec_time)) as ops_per_sec
FROM (
    SELECT 
        p.pattern,
        (EXTRACT(EPOCH FROM clock_timestamp()) * 1000) as start_time,
        jcron.next_time(p.pattern, NOW()),
        (EXTRACT(EPOCH FROM clock_timestamp()) * 1000) as end_time,
        ((EXTRACT(EPOCH FROM clock_timestamp()) * 1000) - start_time) as exec_time
    FROM patterns p
    CROSS JOIN generate_series(1, 10000) AS iteration
) AS benchmarks
GROUP BY pattern
ORDER BY ops_per_sec DESC;
```

---

## 🛡️ Safety & Compatibility

### Must-Maintain Guarantees
- ✅ Backward compatibility with existing patterns
- ✅ Same results as current implementation
- ✅ DST-safe timezone handling
- ✅ All special syntax support (L, #, W, WOY)
- ✅ Thread-safe / parallel-safe

### Testing Requirements
- ✅ Full regression test suite (1000+ patterns)
- ✅ Performance benchmarks on each commit
- ✅ Edge case validation (leap years, DST, etc.)
- ✅ Memory leak detection
- ✅ Concurrent access testing

---

## 📦 Deployment Strategy

### Phase 3 (SQL-only optimizations)
```sql
-- Drop-in replacement
-- No application changes required
-- Just reload jcron.sql
```

### Phase 4 (C extension)
```bash
# Compile extension
make
sudo make install

# Load in PostgreSQL
CREATE EXTENSION pgcron_native;

# Optional: fallback if extension not available
CREATE OR REPLACE FUNCTION jcron.next_bit(...)
RETURNS INT AS $$
BEGIN
    -- Try C version first
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcron_native') THEN
        RETURN pgcron_next_bit($1, $2, $3);
    END IF;
    
    -- Fallback to PL/pgSQL
    RETURN jcron.next_bit_plpgsql($1, $2, $3);
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Success Metrics

### Performance Targets
- [x] **Phase 1+2**: 14.5K ops/sec ✅ ACHIEVED
- [ ] **Phase 3**: 50K ops/sec (Quick wins)
- [ ] **Phase 4**: 100K ops/sec (Target)
- [ ] **Stretch**: 200K+ ops/sec (C extension + SIMD)

### Quality Targets
- [ ] Test coverage: 95%+
- [ ] Zero regressions in correctness
- [ ] Memory usage: <1MB per 1000 patterns
- [ ] Latency P99: <0.5ms

---

## 🔬 Research & Experiments

### Alternative Approaches to Explore

1. **Pattern Language Simplification**
   - Compile JCRON → simpler internal format
   - Reduce parsing complexity

2. **Probabilistic Optimization**
   - Learn most common patterns
   - Speculative execution

3. **GPU Acceleration**
   - Batch processing on GPU
   - For massive parallel workloads

4. **WebAssembly Version**
   - Compile to WASM for edge compute
   - Universal deployment

---

## 📚 References & Resources

### PostgreSQL Performance
- [PostgreSQL JIT Documentation](https://www.postgresql.org/docs/current/jit.html)
- [Writing PostgreSQL C Extensions](https://www.postgresql.org/docs/current/xfunc-c.html)
- [Advanced PL/pgSQL Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)

### Cron Parsing
- [Quartz Scheduler Implementation](https://github.com/quartz-scheduler/quartz)
- [Go-Cron Optimization](https://github.com/robfig/cron)
- [Rust Cron Performance](https://github.com/zslayton/cron)

### Bit Manipulation
- [Bit Twiddling Hacks](https://graphics.stanford.edu/~seander/bithacks.html)
- [SIMD Bit Operations](https://www.intel.com/content/www/us/en/docs/intrinsics-guide/)

---

**Last Updated**: 2025-10-07  
**Version**: 1.0  
**Status**: Planning Phase  
**Next Review**: After Phase 3 completion
