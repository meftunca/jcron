# JCRON SQL - API Reference

Complete API documentation for JCRON SQL functions.

## Table of Contents

- [Core Functions](#core-functions)
- [Helper Functions](#helper-functions)
- [Utility Functions](#utility-functions)
- [Test Functions](#test-functions)

## Core Functions

### `jcron.next_time()`

Ana scheduling fonksiyonu. Bir sonraki çalışma zamanını hesaplar.

**Signature:**
```sql
jcron.next_time(
    pattern TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW(),
    get_endof BOOLEAN DEFAULT TRUE,
    get_startof BOOLEAN DEFAULT FALSE
) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `pattern` - Cron pattern veya özel syntax (WOY, E/S modifiers)
- `from_time` - Başlangıç zamanı (default: NOW())
- `get_endof` - Period sonunu hesapla (default: TRUE)
- `get_startof` - Period başını hesapla (default: FALSE)

**Returns:** Next occurrence timestamp

**Examples:**
```sql
-- Temel kullanım
SELECT jcron.next_time('0 0 9 * * *');

-- Belirli bir zamandan itibaren
SELECT jcron.next_time('0 0 9 * * 1-5', '2025-01-01 00:00:00');

-- End of day
SELECT jcron.next_time('E1D', NOW());

-- Start of week
SELECT jcron.next_time('S1W', NOW());
```

---

### `jcron.next()`

Simplified version - sadece pattern alır.

**Signature:**
```sql
jcron.next(pattern TEXT) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `pattern` - Cron pattern

**Returns:** Next occurrence from NOW()

**Example:**
```sql
SELECT jcron.next('0 0 9 * * *');
```

---

### `jcron.next_from()`

Belirli bir zamandan sonraki occurrence.

**Signature:**
```sql
jcron.next_from(
    pattern TEXT,
    from_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `pattern` - Cron pattern
- `from_time` - Starting time

**Returns:** Next occurrence after from_time

**Example:**
```sql
SELECT jcron.next_from('0 0 9 * * *', '2025-01-01');
```

---

### `jcron.next_end()`

Next occurrence'ın period sonu (simplified).

**Signature:**
```sql
jcron.next_end(pattern TEXT) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `pattern` - Cron pattern

**Returns:** Next end of period

**Example:**
```sql
SELECT jcron.next_end('E1D');  -- End of today
```

---

### `jcron.next_end_from()`

Belirli zamandan sonraki period sonu.

**Signature:**
```sql
jcron.next_end_from(
    pattern TEXT,
    from_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ
```

**Example:**
```sql
SELECT jcron.next_end_from('E1W', '2025-01-01');
```

---

### `jcron.next_start()`

Next occurrence'ın period başı (simplified).

**Signature:**
```sql
jcron.next_start(pattern TEXT) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `pattern` - Cron pattern

**Returns:** Next start of period

**Example:**
```sql
SELECT jcron.next_start('S1D');  -- Start of tomorrow
```

---

### `jcron.next_start_from()`

Belirli zamandan sonraki period başı.

**Signature:**
```sql
jcron.next_start_from(
    pattern TEXT,
    from_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ
```

**Example:**
```sql
SELECT jcron.next_start_from('S1M', '2025-01-15');
```

---

### `jcron.prev_time()`

Önceki çalışma zamanını hesaplar.

**Signature:**
```sql
jcron.prev_time(
    pattern TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW(),
    get_endof BOOLEAN DEFAULT TRUE,
    get_startof BOOLEAN DEFAULT FALSE
) RETURNS TIMESTAMPTZ
```

**Parameters:**
- Same as `next_time()`

**Returns:** Previous occurrence timestamp

**Example:**
```sql
SELECT jcron.prev_time('0 0 9 * * *', NOW());
```

---

### `jcron.match_time()`

Verilen zamanın pattern'a uyup uymadığını kontrol eder.

**Signature:**
```sql
jcron.match_time(
    pattern TEXT,
    check_time TIMESTAMPTZ
) RETURNS BOOLEAN
```

**Parameters:**
- `pattern` - Cron pattern
- `check_time` - Time to check

**Returns:** TRUE if time matches pattern

**Examples:**
```sql
-- Şu an 9:00 mı?
SELECT jcron.match_time('0 0 9 * * *', NOW());

-- Belirli bir zaman kontrol et
SELECT jcron.match_time(
    '0 0 9 * * 1-5',
    '2025-10-06 09:00:00'::TIMESTAMPTZ
);
```

---

## Period Calculation Functions

### `jcron.calc_end_time()`

Period sonunu hesaplar (E modifier işlemleri için).

**Signature:**
```sql
jcron.calc_end_time(
    from_time TIMESTAMPTZ,
    weeks INTEGER DEFAULT 0,
    months INTEGER DEFAULT 0,
    days INTEGER DEFAULT 0
) RETURNS TIMESTAMPTZ
```

**Parameters:**
- `from_time` - Starting timestamp
- `weeks` - Number of weeks to add
- `months` - Number of months to add
- `days` - Number of days to add

**Returns:** End of the specified period

**Examples:**
```sql
-- End of current day
SELECT jcron.calc_end_time(NOW(), 0, 0, 0);

-- End of current week
SELECT jcron.calc_end_time(NOW(), 0, 0, 0);

-- End of current month
SELECT jcron.calc_end_time(NOW(), 0, 1, 0);
```

---

### `jcron.calc_start_time()`

Period başlangıcını hesaplar (S modifier işlemleri için).

**Signature:**
```sql
jcron.calc_start_time(
    from_time TIMESTAMPTZ,
    weeks INTEGER DEFAULT 0,
    months INTEGER DEFAULT 0,
    days INTEGER DEFAULT 0
) RETURNS TIMESTAMPTZ
```

**Parameters:**
- Same as `calc_end_time()`

**Returns:** Start of the specified period

**Examples:**
```sql
-- Start of tomorrow
SELECT jcron.calc_start_time(NOW(), 0, 0, 1);

-- Start of next week
SELECT jcron.calc_start_time(NOW(), 1, 0, 0);

-- Start of next month
SELECT jcron.calc_start_time(NOW(), 0, 1, 0);
```

---

## Helper Functions

### `jcron.get_last_weekday()`

Ayın son belirtilen gününü hesaplar (L syntax alternatifi).

**Signature:**
```sql
jcron.get_last_weekday(
    year_val INTEGER,
    month_val INTEGER,
    weekday_num INTEGER
) RETURNS DATE
```

**Parameters:**
- `year_val` - Year
- `month_val` - Month (1-12)
- `weekday_num` - Day of week (0=Sunday, 6=Saturday)

**Returns:** Date of last specified weekday

**Examples:**
```sql
-- 2025 Ekim'in son pazartesi
SELECT jcron.get_last_weekday(2025, 10, 1);

-- Bu ayın son cuması
SELECT jcron.get_last_weekday(
    EXTRACT(YEAR FROM NOW())::INTEGER,
    EXTRACT(MONTH FROM NOW())::INTEGER,
    5
);
```

---

### `jcron.get_nth_weekday()`

Ayın N'inci belirtilen gününü hesaplar (# syntax alternatifi).

**Signature:**
```sql
jcron.get_nth_weekday(
    year_val INTEGER,
    month_val INTEGER,
    weekday_num INTEGER,
    nth_occurrence INTEGER
) RETURNS DATE
```

**Parameters:**
- `year_val` - Year
- `month_val` - Month (1-12)
- `weekday_num` - Day of week (0=Sunday, 6=Saturday)
- `nth_occurrence` - Occurrence number (1-5)

**Returns:** Date of Nth weekday, or NULL if doesn't exist

**Examples:**
```sql
-- 2025 Ekim'in 2. perşembesi
SELECT jcron.get_nth_weekday(2025, 10, 4, 2);

-- Bu ayın 3. cuması
SELECT jcron.get_nth_weekday(
    EXTRACT(YEAR FROM NOW())::INTEGER,
    EXTRACT(MONTH FROM NOW())::INTEGER,
    5,
    3
);
```

---

### `jcron.get_weekday_of_week()` ⭐ NEW

Ayın belirli haftasında belirli bir weekday'i hesaplar (week-based).

**Signature:**
```sql
jcron.get_weekday_of_week(
    year_val INTEGER,
    month_val INTEGER,
    weekday_num INTEGER,
    week_num INTEGER
) RETURNS DATE
```

**Parameters:**
- `year_val` - Year
- `month_val` - Month (1-12)
- `weekday_num` - Day of week (0=Sunday, 6=Saturday)
- `week_num` - Week number (1-5)

**Returns:** Date of weekday in specified week, or NULL if doesn't exist

**Week Definition:**
- Week 1 starts on day 1 of month
- Week 1 ends on first Sunday
- Subsequent weeks are 7-day periods

**Examples:**
```sql
-- July 2025'in 4. haftasının pazartesi (21 Temmuz)
SELECT jcron.get_weekday_of_week(2025, 7, 1, 4);
-- Returns: 2025-07-21

-- July 2025'in 1. haftasının pazartesi (week 1'de pazartesi yok)
SELECT jcron.get_weekday_of_week(2025, 7, 1, 1);
-- Returns: NULL (week 1 = days 1-6, no Monday)
```

**Difference from `get_nth_weekday()`:**
- `get_nth_weekday()` - Occurrence-based (e.g., 3rd Monday)
- `get_weekday_of_week()` - Week-based (e.g., Monday of week 4)
- They may return different dates depending on month start day!

**Example showing difference:**
```sql
-- July 2025 starts Tuesday:
SELECT jcron.get_weekday_of_week(2025, 7, 1, 4);  -- Week 4 Monday = July 21
SELECT jcron.get_nth_weekday(2025, 7, 1, 3);      -- 3rd Monday = July 21 (same!)

SELECT jcron.get_weekday_of_week(2025, 7, 1, 2);  -- Week 2 Monday = July 7
SELECT jcron.get_nth_weekday(2025, 7, 1, 1);      -- 1st Monday = July 7 (same!)

-- But week 1 has NO Monday:
SELECT jcron.get_weekday_of_week(2025, 7, 1, 1);  -- NULL
SELECT jcron.get_nth_weekday(2025, 7, 1, 1);      -- July 7 (1st occurrence)
```

---

### `jcron.get_week_start()`

ISO 8601 haftasının başlangıç tarihini hesaplar.

**Signature:**
```sql
jcron.get_week_start(
    year_val INTEGER,
    week_num INTEGER
) RETURNS DATE
```

**Parameters:**
- `year_val` - Year
- `week_num` - ISO week number (1-53)

**Returns:** Start date of the week (Monday)

**Example:**
```sql
-- 2025'in 40. haftasının başlangıcı
SELECT jcron.get_week_start(2025, 40);
```

---

## Utility Functions

### `jcron.fast_dow()`

Epoch değerinden day of week hesaplar (ultra-fast mathematical calculation).

**Signature:**
```sql
jcron.fast_dow(epoch_val BIGINT) RETURNS INTEGER
```

**Parameters:**
- `epoch_val` - Unix epoch timestamp

**Returns:** Day of week (0=Sunday, 6=Saturday)

**Example:**
```sql
SELECT jcron.fast_dow(EXTRACT(EPOCH FROM NOW())::BIGINT);
-- Returns: 0-6
```

---

### `jcron.fast_epoch()`

Timestamp'ten epoch değeri çıkarır (optimized).

**Signature:**
```sql
jcron.fast_epoch(ts TIMESTAMPTZ) RETURNS BIGINT
```

**Parameters:**
- `ts` - Timestamp with timezone

**Returns:** Unix epoch value

**Example:**
```sql
SELECT jcron.fast_epoch(NOW());
```

---

### `jcron.fast_time_diff_ms()`

İki zaman arasındaki farkı milisaniye cinsinden hesaplar.

**Signature:**
```sql
jcron.fast_time_diff_ms(
    end_ts TIMESTAMPTZ,
    start_ts TIMESTAMPTZ
) RETURNS NUMERIC
```

**Parameters:**
- `end_ts` - End timestamp
- `start_ts` - Start timestamp

**Returns:** Difference in milliseconds

**Example:**
```sql
SELECT jcron.fast_time_diff_ms(
    NOW(),
    NOW() - INTERVAL '1 hour'
);
-- Returns: 3600000
```

---

### `jcron.validate_timezone()`

Timezone'un geçerli olup olmadığını kontrol eder.

**Signature:**
```sql
jcron.validate_timezone(tz TEXT) RETURNS BOOLEAN
```

**Parameters:**
- `tz` - Timezone name

**Returns:** TRUE if valid timezone

**Examples:**
```sql
SELECT jcron.validate_timezone('America/New_York');  -- true
SELECT jcron.validate_timezone('Invalid/Zone');      -- false
```

---

### `jcron.classify_pattern()`

Pattern tipini tespit eder.

**Signature:**
```sql
jcron.classify_pattern(expr TEXT) RETURNS TEXT
```

**Parameters:**
- `expr` - Pattern expression

**Returns:** Pattern type ('CRON', 'WOY', 'SPECIAL', etc.)

**Examples:**
```sql
SELECT jcron.classify_pattern('0 0 9 * * *');     -- 'CRON'
SELECT jcron.classify_pattern('W1-5');             -- 'WOY'
SELECT jcron.classify_pattern('E1D');              -- 'SPECIAL'
```

---

## Test Functions

### `jcron.performance_test_v4_extreme()`

V4 Extreme versiyonunun performans testini çalıştırır.

**Signature:**
```sql
jcron.performance_test_v4_extreme() 
RETURNS TABLE(
    test_name TEXT,
    iterations INTEGER,
    total_time_ms NUMERIC,
    avg_time_ms NUMERIC,
    ops_per_sec NUMERIC
)
```

**Returns:** Performance metrics table

**Example:**
```sql
SELECT * FROM jcron.performance_test_v4_extreme();
```

---

### `jcron.examples()`

Çeşitli kullanım örneklerini gösterir.

**Signature:**
```sql
jcron.examples() 
RETURNS TABLE(
    description TEXT,
    pattern TEXT,
    next_run TIMESTAMPTZ
)
```

**Returns:** Example patterns and results

**Example:**
```sql
SELECT * FROM jcron.examples();
```

---

### `jcron.version()`

JCRON versiyonunu döndürür.

**Signature:**
```sql
jcron.version() RETURNS TEXT
```

**Returns:** Version string

**Example:**
```sql
SELECT jcron.version();
-- Returns: "JCRON V4 EXTREME - 100K OPS/SEC"
```

---

## Advanced Usage

### Week-based vs Occurrence-based Scheduling ⭐ NEW

JCRON supports two different ways to specify nth weekdays:

#### `#` Syntax (Occurrence-based)

Counts occurrences of a weekday within a month:

```sql
-- 1st Monday of month
SELECT jcron.next_time('0 0 9 * * 1#1', NOW());

-- 3rd Friday of month
SELECT jcron.next_time('0 0 17 * * 5#3', NOW());
```

#### `W` Syntax (Week-based)

Specifies weekday within a week number:

```sql
-- Monday of week 4
SELECT jcron.next_time('0 0 9 * * 1W4', NOW());

-- Friday of week 3
SELECT jcron.next_time('0 0 17 * * 5W3', NOW());
```

#### Key Differences

**Week Definition:**
- Week 1 starts on day 1 of month (regardless of weekday)
- Week 1 ends on first Sunday
- Subsequent weeks are standard 7-day periods

**Example: July 2025 (starts Tuesday)**

| Week | Days | Monday | Syntax Comparison |
|------|------|--------|-------------------|
| Week 1 | 1-6 (Tue-Sun) | **None** | `1W1` → NULL, `1#1` → July 7 |
| Week 2 | 7-13 | July 7 | `1W2` → July 7 (= `1#1`) |
| Week 3 | 14-20 | July 14 | `1W3` → July 14 (= `1#2`) |
| Week 4 | 21-27 | July 21 | `1W4` → July 21 (= `1#3`) ✅ |

**When they differ:**
```sql
-- September 2025 starts Monday:
SELECT jcron.next_time('0 0 9 * * 1W1', '2025-08-31'::TIMESTAMPTZ);
-- Returns: 2025-09-01 (week 1 HAS Monday)

SELECT jcron.next_time('0 0 9 * * 1#1', '2025-08-31'::TIMESTAMPTZ);
-- Returns: 2025-09-01 (1st Monday - same!)

-- July 2025 starts Tuesday:
SELECT jcron.next_time('0 0 9 * * 1W1', '2025-06-30'::TIMESTAMPTZ);
-- Returns: 2025-09-01 (skips July, week 1 has no Monday)

SELECT jcron.next_time('0 0 9 * * 1#1', '2025-06-30'::TIMESTAMPTZ);
-- Returns: 2025-07-07 (1st Monday exists)
```

**NULL Handling:**
- If a weekday doesn't exist in the specified week, `W` syntax returns NULL
- The scheduler automatically skips to the next month where it exists
- `#` syntax always finds the occurrence if it exists in the month

---

### Timezone Support

Tüm timezone fonksiyonları PostgreSQL'in timezone sistemini kullanır.

```sql
-- Farklı timezone'larda aynı pattern
SELECT 
    'UTC' as tz,
    jcron.next_time('0 0 9 * * *', NOW()) AT TIME ZONE 'UTC'
UNION ALL
SELECT 
    'New York',
    jcron.next_time('0 0 9 * * *', NOW()) AT TIME ZONE 'America/New_York';
```

### Chaining Calls

```sql
-- Sonraki 5 çalışmayı bul
WITH RECURSIVE next_runs AS (
    SELECT 
        1 as n,
        jcron.next_time('0 0 9 * * *', NOW()) as run_time
    UNION ALL
    SELECT 
        n + 1,
        jcron.next_time('0 0 9 * * *', run_time)
    FROM next_runs
    WHERE n < 5
)
SELECT * FROM next_runs;
```

### Error Handling

```sql
-- Pattern validasyonu
DO $$
BEGIN
    PERFORM jcron.next_time('invalid pattern', NOW());
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Invalid pattern: %', SQLERRM;
END $$;
```

## Performance Notes

### Function Performance (Benchmarked)

| Pattern Complexity | Avg Time | Throughput | Example |
|-------------------|----------|------------|---------|
| **Simple** | ~1.4 ms | ~700/sec | `0 */5 * * * *` |
| **Medium** (with TZ) | ~1.8 ms | ~550/sec | `TZ:UTC 0 0 9 * * *` |
| **Complex** (WOY/EOD) | ~2.5 ms | ~400/sec | `0 0 0 L * * WOY:10,20,30` |
| **Extreme** (all features) | ~3.1 ms | ~320/sec | `TZ:UTC 0 0 23 * * 0 WOY:10,20,30 E1W` |

**Based on realistic benchmark with 1000+ production-like patterns**

### Optimization Tips

1. **Cache patterns** - Repeated patterns are faster due to regex caching
2. **Use simple patterns** when possible - ~2x faster than complex patterns
3. **Batch operations** - Use set-based operations instead of loops
4. **Use indexes** on scheduled_time columns for query optimization
5. **Prepare statements** for frequently used patterns
6. **Enable parallel execution** - Functions are marked `PARALLEL SAFE`

### Benchmark Your Setup

Run realistic benchmarks on your database:

```bash
# Generate test data
cd ../test_gen
bun run generate-bench-improved.ts --total 1000 --woy --eod --special --format sql --out ../test_data.sql

# Load and benchmark
psql -U postgres -d your_db -f ../test_data.sql
psql -U postgres -d your_db -f ../test_jcron_benchmark.sql
```

**Or use the automated runner:**

```bash
cd ..
./run_benchmark.sh --tests 1000 --woy --eod --special --db your_db
```

### Performance Targets

| Environment | Target Throughput | Notes |
|-------------|------------------|-------|
| Development | >500 patterns/sec | Basic functionality testing |
| Production | >1000 patterns/sec | With indexes and optimization |
| High Performance | >5000 patterns/sec | With caching and connection pooling |

📖 **See [BENCHMARK_README.md](../BENCHMARK_README.md)** for detailed benchmark documentation and CI/CD integration.

---

**Next:** [Scheduler Guide](SCHEDULER.md) | [Syntax Reference](SYNTAX.md) | [Benchmark Guide](../BENCHMARK_README.md)
