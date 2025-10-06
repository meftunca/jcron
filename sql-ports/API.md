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

### Function Performance

| Function | Avg Time | Notes |
|----------|----------|-------|
| `next_time()` (simple) | ~1-3µs | Cached patterns |
| `next_time()` (complex) | ~5-10µs | With L/# syntax |
| `match_time()` | ~1-2µs | Fast boolean check |
| `fast_dow()` | <0.5µs | Pure mathematical |

### Optimization Tips

1. **Cache patterns** - Repeated patterns are faster
2. **Use simple patterns** when possible
3. **Avoid frequent L/# syntax** in tight loops
4. **Batch operations** instead of individual calls
5. **Use indexes** on scheduled_time columns

---

**Next:** [Scheduler Guide](SCHEDULER.md) | [Syntax Reference](SYNTAX.md)
