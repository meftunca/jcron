# JCRON C Port - Development Roadmap# JCRON C Port - Implementation Roadmap

## Overview## 📅 Development Timeline (8 Weeks)

Development plan for JCRON C port, following PostgreSQL's proven algorithms with zero-dependency, zero-allocation design.

### Week 1: Foundation & Core Structures

## Design Principles (Non-Negotiable)**Deliverables:**

1. ✅ **Zero Dependencies**: Only C99 standard library- [ ] Project structure setup

2. ✅ **Zero Allocations**: Stack-only, no malloc/free- [ ] Core data structures

3. ✅ **Atomic Operations**: Thread-safe, lock-free reads- [ ] Build system (CMake)

4. ✅ **PostgreSQL Compatible**: Algorithm parity required- [ ] Basic header files

- [ ] Unit test framework

## Current Status (Week 0: Planning)

- ✅ README.md revised with new design principles**Files to Create:**

- ✅ API design completed (jcron.h)```

- ✅ Core data structures defined (jcron_pattern_t, jcron_result_t)src/jcron.h # Public API

- ✅ Makefile createdsrc/jcron_types.h # Data structures

- ✅ Example code structure createdsrc/jcron_core.c # Core functions

- ✅ Stub implementation (jcron_core.c)tests/test_framework.c # Testing infrastructure

- ⏳ Ready to begin Phase 1CMakeLists.txt # Build configuration

````

## Phase 1: Core Parsing & Bitmasks (Week 1-2)

**Key Functions:**

```c
int jcron_parse(const char *expr, struct jcron_schedule *sched);
void jcron_init_schedule(struct jcron_schedule *sched);
bool jcron_validate_expression(const char *expr);
```

**Tasks**:
- [x] Implement `jcron_parse()` - main entry point
- [x] Implement `parse_cron_field()` - parse single field (e.g., "*/5", "1-10", "1,5,10")
- [x] Implement `parse_range()` - parse range (e.g., "1-10")
- [x] Implement `parse_step()` - parse step (e.g., "*/5")
- [x] Implement `parse_list()` - parse list (e.g., "1,5,10,15")
- [x] Expression parser
- [x] Bitmask generation
- [x] Error handling

**Deliverables:**
- [x] Expression parser
- [x] Unit tests for each parsing function
- [x] Basic next/prev time calculation

**Files**:- [ ] Error handling

````

src/jcron_parse.c # Parsing functions**Key Functions:**

tests/test_parse.c # Parsing tests```c

````time_t jcron_next_time(const struct jcron_schedule *sched, time_t from);

time_t jcron_prev_time(const struct jcron_schedule *sched, time_t from);

**Test Cases** (mirroring PostgreSQL):bool jcron_is_match(const struct jcron_schedule *sched, time_t when);

```c```

// Basic patterns

"* * * * * *"             -> All bits set**Test Coverage:**

"0 * * * * *"             -> Minute 0 only- Basic cron expressions: `0 * * * *`, `*/15 * * * *`

"*/5 * * * * *"           -> Minutes 0,5,10,15...55- Complex expressions: `0 9 * * 1-5`

"0-10 * * * * *"          -> Minutes 0-10- Edge cases: leap years, month boundaries

"0,15,30,45 * * * * *"    -> Minutes 0,15,30,45

### Week 3: Advanced Features - EOD Support

// Complex patterns**Deliverables:**

"0-10,20-30 * * * * *"    -> Minutes 0-10 and 20-30- [ ] EOD (End of Duration) parsing

"*/15 * * * * *"          -> Every 15 minutes- [ ] EOD time calculations

```- [ ] Range validation functions



### Week 2: Bitmask Operations**Files to Create:**

**Objective**: Implement efficient bitmask matching```

src/jcron_eod.c          # EOD implementation

**Tasks**:src/jcron_eod.h          # EOD headers

- [ ] Implement `jcron_next_bit_64()` - find next set bit (CTZ)tests/test_eod.c         # EOD tests

- [ ] Implement `jcron_first_bit_64()` - find first set bit```

- [ ] Implement `jcron_set_bit_64()` - set bit in mask

- [ ] Implement `jcron_test_bit_64()` - test if bit is set**Key Functions:**

- [ ] Performance tests (should hit 1M+ ops/sec)```c

bool jcron_is_range_now(const struct jcron_schedule *sched, time_t when);

**Files**:time_t jcron_start_of(const struct jcron_schedule *sched, time_t when);

```time_t jcron_end_of(const struct jcron_schedule *sched, time_t when);

src/jcron_bitmask.c      # Bitmask operations```

tests/test_bitmask.c     # Bitmask tests

tests/benchmark.c        # Performance benchmarks### Week 4: Timezone & Special Patterns

```**Deliverables:**

- [ ] Timezone support

**Performance Target**:- [ ] Special patterns (L, #, W)

- Bitmask operations: >5M ops/sec- [ ] Week of Year (WOY) support

- Pattern parsing: >1M ops/sec

**Key Features:**

## Phase 2: Time Calculation (Week 3-4)- IANA timezone database integration

- Last day of month patterns

### Week 3: Basic Next Time- Nth weekday of month

**Objective**: Calculate next occurrence for simple cron patterns- Nearest weekday patterns



**Tasks**:### Week 5: Performance Optimization

- [ ] Implement `jcron_next()` - main next time function**Deliverables:**

- [ ] Implement `next_cron_time()` - internal algorithm- [ ] SIMD optimizations (AVX2/NEON)

- [ ] Implement field-by-field matching (minutes → hours → days → months)- [ ] Cache-line optimization

- [ ] Handle month boundaries (e.g., Feb 28/29 → Mar 1)- [ ] Bitmask precomputation

- [ ] Handle year boundaries (Dec 31 → Jan 1)- [ ] Performance benchmarks

- [ ] Unit tests for edge cases

**Files to Create:**

**Files**:```

```src/jcron_simd.c         # SIMD optimizations

src/jcron_time.c         # Time calculationsrc/jcron_simd_avx2.c    # AVX2 specific

tests/test_next.c        # Next time testssrc/jcron_simd_neon.c    # ARM NEON specific

```benchmark/benchmark.c     # Performance tests

````

**Test Cases** (PostgreSQL compatibility):

````c**Performance Targets:**

// Every 5 minutes- Parse: 500,000+ ops/sec

Pattern: "*/5 * * * * *"- Next time: 300,000+ ops/sec

From:    "2025-10-15 10:03:00"- Bitmask check: 2,000,000+ ops/sec

Next:    "2025-10-15 10:05:00"

### Week 6: Kernel Integration

// Daily at noon**Deliverables:**

Pattern: "0 0 12 * * *"- [ ] Linux kernel module

From:    "2025-10-15 10:00:00"- [ ] /proc interface

Next:    "2025-10-15 12:00:00"- [ ] Kernel timer integration

- [ ] Memory management

// Month boundary

Pattern: "0 0 0 1 * *"**Files to Create:**

From:    "2025-10-31 23:00:00"```

Next:    "2025-11-01 00:00:00"kernel/jcron_module.c    # Kernel module

kernel/proc_interface.c  # /proc/jcron interface

// Leap yearkernel/Makefile         # Kernel build

Pattern: "0 0 0 29 2 *"include/linux/jcron.h   # Kernel headers

From:    "2024-02-28 00:00:00"```

Next:    "2024-02-29 00:00:00"

```**Kernel Features:**

- Schedule kernel timers

### Week 4: Edge Cases & Optimization- /proc/jcron/schedules interface

**Objective**: Handle all edge cases and optimize performance- Kernel callback system

- Memory pool management

**Tasks**:

- [ ] Leap year handling### Week 7: Testing & Validation

- [ ] DST transitions (if timezone support added)**Deliverables:**

- [ ] Week boundaries- [ ] Comprehensive test suite

- [ ] Performance optimization (target: 500K+ ops/sec)- [ ] Node-port compatibility verification

- [ ] PostgreSQL compatibility testing- [ ] PostgreSQL compatibility testing

- [ ] Stress testing

**PostgreSQL Compatibility Tests**:

- [ ] Run same patterns as PostgreSQL port**Test Categories:**

- [ ] Verify identical results- Unit tests (>95% coverage)

- [ ] Document any differences- Integration tests

- Performance benchmarks

## Phase 3: EOD/SOD Support (Week 5)

**Key Functions:**

```c
bool jcron_is_range_now(const struct jcron_schedule *sched, time_t when);
time_t jcron_start_of(const struct jcron_schedule *sched, time_t when);
time_t jcron_end_of(const struct jcron_schedule *sched, time_t when);
```

**Tasks**:
- [x] EOD (End of Duration) parsing
- [x] EOD time calculations (E0D, E1M, E2H patterns)
- [x] SOD (Start of Duration) parsing  
- [x] SOD time calculations (S0W, S1M, S2H patterns)
- [x] Cron + modifier combination logic
- [x] PostgreSQL compatibility tests

**Deliverables:**
- [x] EOD/SOD parsing
- [x] End/Start of period calculations
- [x] PostgreSQL compatibility tests

## Phase 4: Special Patterns & Advanced Features (Week 6-7)

**Key Features:**
- [x] L pattern - Last day of month/week
- [x] # pattern - Nth weekday of month  
- [x] W pattern - Nearest weekday
- [x] Week of Year (WOY) support
- [x] OR splitter (|) support
- [x] jcron_next_n() - Multiple occurrences
- [x] jcron_prev() - Previous occurrence
- [x] jcron_get_nth_weekday() helper

**Tasks**:
- [x] Special patterns (L, #, W)
- [x] Week of Year (WOY) support
- [x] Timezone handling
- [x] Advanced features implementation

**Deliverables:**
- [x] L, #, W pattern support
- [x] Week of Year (WOY)
- [x] Timezone handling

## Phase 5: Performance Optimization (Week 8)

**Deliverables:**
- [x] SIMD optimizations (AVX2/NEON)
- [x] Cache-line optimization
- [x] Bitmask precomputation
- [x] Lookup table optimizations
- [x] Branchless bit operations
- [x] Performance benchmarks (16-18M ops/sec achieved)

**Performance Targets:**
- [x] Parse: 500,000+ ops/sec (Achieved: 7-11M ops/sec)
- [x] Next time: 300,000+ ops/sec (Achieved: 16-18M ops/sec)
- [x] Bitmask check: 2,000,000+ ops/sec (Achieved: 22M ops/sec)

## Phase 6: Cron Daemon & System Integration (Week 9-10)

**Deliverables:**
- [x] Complete cron daemon (jcrond.c)
- [x] Systemd service integration
- [x] /etc/crontab and /etc/cron.d/ support
- [x] User crontab support (/var/spool/cron/crontabs/)
- [x] Security hardening (privilege drop)
- [x] Syslog integration
- [x] Signal handling (SIGHUP reload)
- [x] Full test suite (17/17 tests passing)
- [x] Documentation and examples
- [x] PostgreSQL C extension (pg_cron compatible)
- [x] Background worker job execution
- [x] SQL API (jcron.schedule, jcron.unschedule, etc.)
- [x] Database schema and permissions
