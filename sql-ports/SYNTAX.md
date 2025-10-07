# JCRON SQL - Syntax Reference

Comprehensive syntax guide for JCRON SQL cron expressions.

## Table of Contents

- [Cron Pattern Format](#cron-pattern-format)
- [Field Values](#field-values)
- [Special Characters](#special-characters)
- [Advanced Syntax](#advanced-syntax)
- [Examples](#examples)

## Cron Pattern Format

JCRON supports standard 6-field cron syntax:

```
┌───────────── saniye (0-59)
│ ┌─────────── dakika (0-59)
│ │ ┌───────── saat (0-23)
│ │ │ ┌─────── ayın günü (1-31)
│ │ │ │ ┌───── ay (1-12)
│ │ │ │ │ ┌─── haftanın günü (0-6, 0=Pazar)
│ │ │ │ │ │
* * * * * *
```

## Field Values

| Field | Range | Special Characters | Description |
|-------|-------|-------------------|-------------|
| Second | 0-59 | `*` `,` `-` `/` | Saniye |
| Minute | 0-59 | `*` `,` `-` `/` | Dakika |
| Hour | 0-23 | `*` `,` `-` `/` | Saat |
| Day | 1-31 | `*` `,` `-` `/` `L` | Ayın günü |
| Month | 1-12 | `*` `,` `-` `/` | Ay |
| DOW | 0-6 | `*` `,` `-` `/` `L` `#` | Haftanın günü |

**Note:** 0 = Sunday (Pazar), 6 = Saturday (Cumartesi)

## Special Characters

### `*` (Asterisk) - All Values

Tüm değerleri temsil eder.

```sql
-- Her saniye
SELECT jcron.next_time('* * * * * *', NOW());

-- Her dakika
SELECT jcron.next_time('0 * * * * *', NOW());

-- Her saat
SELECT jcron.next_time('0 0 * * * *', NOW());
```

### `,` (Comma) - Value List

Birden fazla belirli değeri virgülle ayırarak liste oluşturabilirsiniz.

```sql
-- 1, 15, 30. dakikalarda
SELECT jcron.next_time('0 1,15,30 * * * *', NOW());

-- Pazartesi, Çarşamba, Cuma günleri
SELECT jcron.next_time('0 0 9 * * 1,3,5', NOW());

-- Ocak, Nisan, Temmuz, Ekim aylarında (çeyrekler)
SELECT jcron.next_time('0 0 0 1 1,4,7,10 *', NOW());
```

### `-` (Hyphen) - Range

Değer aralığı belirtir.

```sql
-- 9-17 arası her saat (iş saatleri)
SELECT jcron.next_time('0 0 9-17 * * *', NOW());

-- Pazartesi-Cuma (hafta içi)
SELECT jcron.next_time('0 0 9 * * 1-5', NOW());

-- Mart-Haziran arası
SELECT jcron.next_time('0 0 0 1 3-6 *', NOW());
```

### `/` (Slash) - Step Value

Artış/atlama değeri belirtir.

```sql
-- Her 15 dakikada
SELECT jcron.next_time('0 */15 * * * *', NOW());

-- Her 2 saatte
SELECT jcron.next_time('0 0 */2 * * *', NOW());

-- Her 5 dakikada (alternatif)
SELECT jcron.next_time('0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *', NOW());

-- Her 10 saniyede
SELECT jcron.next_time('*/10 * * * * *', NOW());
```

### `L` (Last) - Last Day/Weekday

Ayın son günü veya son haftanın günü.

#### Last Day of Month

```sql
-- Her ayın son günü gece yarısı
SELECT jcron.next_time('0 0 0 L * *', NOW());
```

#### Last Weekday of Month

```sql
-- Her ayın son pazartesi
SELECT jcron.next_time('0 0 9 * * 1L', NOW());

-- Her ayın son cuması
SELECT jcron.next_time('0 0 17 * * 5L', NOW());

-- Her ayın son çarşambası
SELECT jcron.next_time('0 0 12 * * 3L', NOW());
```

**Syntax:**
- Day field: `L` = last day of month
- DOW field: `{0-6}L` = last {weekday} of month

### `#` (Nth) - Nth Weekday

Ayın N'inci belirli haftanın günü.

```sql
-- Her ayın 1. pazartesi
SELECT jcron.next_time('0 0 9 * * 1#1', NOW());

-- Her ayın 2. perşembesi
SELECT jcron.next_time('0 0 9 * * 4#2', NOW());

-- Her ayın 3. cuması
SELECT jcron.next_time('0 0 17 * * 5#3', NOW());

-- Her ayın 4. salısı
SELECT jcron.next_time('0 0 10 * * 2#4', NOW());
```

**Syntax:** `{0-6}#{1-5}`
- First number: day of week (0=Sunday, 6=Saturday)
- Second number: occurrence (1-5)

## Advanced Syntax

### Week of Year (WOY) Patterns

ISO 8601 standardına uygun hafta bazlı zamanlama:

```sql
-- Tek hafta
SELECT jcron.next_time('W1', NOW());

-- Hafta aralığı
SELECT jcron.next_time('W1-5', NOW());

-- Hafta listesi
SELECT jcron.next_time('W1,10,20,30', NOW());
```

### End/Start of Period Modifiers

#### End of Period (E)

```sql
-- End of Day (23:59:59)
SELECT jcron.next_time('E1D', NOW());

-- End of Week (Pazar 23:59:59)
SELECT jcron.next_time('E1W', NOW());

-- End of Month
SELECT jcron.next_time('E1M', NOW());

-- End of Year
SELECT jcron.next_time('E1Y', NOW());
```

#### Start of Period (S)

```sql
-- Start of Day (00:00:00)
SELECT jcron.next_time('S1D', NOW());

-- Start of Week (Pazartesi 00:00:00)
SELECT jcron.next_time('S1W', NOW());

-- Start of Month
SELECT jcron.next_time('S1M', NOW());

-- Start of Year
SELECT jcron.next_time('S1Y', NOW());
```

### Timezone Patterns

```sql
-- Timezone prefix ile
SELECT jcron.next_time('TZ:America/New_York 0 0 9 * * *', NOW());

-- Timezone parametresi ile
SELECT jcron.next_time('0 0 9 * * *', NOW(), TRUE, FALSE, 'Europe/Istanbul');
```

## Examples

### Common Patterns

```sql
-- Her dakika
SELECT jcron.next_time('0 * * * * *', NOW());

-- Her 5 dakikada
SELECT jcron.next_time('0 */5 * * * *', NOW());

-- Her saat başı
SELECT jcron.next_time('0 0 * * * *', NOW());

-- Her gün gece yarısı
SELECT jcron.next_time('0 0 0 * * *', NOW());

-- Her gün öğlen
SELECT jcron.next_time('0 0 12 * * *', NOW());

-- Hafta içi sabah 9
SELECT jcron.next_time('0 0 9 * * 1-5', NOW());

-- Hafta sonu sabah 10
SELECT jcron.next_time('0 0 10 * * 0,6', NOW());
```

### Business Hours

```sql
-- İş saatleri (9-17)
SELECT jcron.next_time('0 0 9-17 * * 1-5', NOW());

-- Öğle arası hariç
SELECT jcron.next_time('0 0 9-12,13-17 * * 1-5', NOW());

-- İş günü başlangıcı
SELECT jcron.next_time('0 0 9 * * 1-5', NOW());

-- İş günü bitişi
SELECT jcron.next_time('0 0 18 * * 1-5', NOW());
```

### Monthly Patterns

```sql
-- Her ayın ilk günü
SELECT jcron.next_time('0 0 0 1 * *', NOW());

-- Her ayın 15'i
SELECT jcron.next_time('0 0 0 15 * *', NOW());

-- Her ayın son günü
SELECT jcron.next_time('0 0 0 L * *', NOW());

-- Her ayın 1. pazartesi
SELECT jcron.next_time('0 0 9 * * 1#1', NOW());

-- Her ayın son cuması
SELECT jcron.next_time('0 0 17 * * 5L', NOW());
```

### Quarterly Patterns

```sql
-- Her çeyrek ilk günü
SELECT jcron.next_time('0 0 0 1 1,4,7,10 *', NOW());

-- Her çeyrek 15'i
SELECT jcron.next_time('0 0 0 15 1,4,7,10 *', NOW());
```

### Yearly Patterns

```sql
-- Yılbaşı
SELECT jcron.next_time('0 0 0 1 1 *', NOW());

-- Yıl sonu
SELECT jcron.next_time('0 0 0 31 12 *', NOW());
```

### Complex Patterns

```sql
-- Pazartesi ve cuma günleri sabah 9 ve 16'da
SELECT jcron.next_time('0 0 9,16 * * 1,5', NOW());

-- Her ayın 1 ve 15'inde öğlen
SELECT jcron.next_time('0 0 12 1,15 * *', NOW());

-- Her çeyrek son cuması
SELECT jcron.next_time('0 0 17 * 3,6,9,12 5L', NOW());

-- İş saatleri içinde her 30 dakika
SELECT jcron.next_time('0 0,30 9-17 * * 1-5', NOW());
```

## Validation Rules

### Valid Patterns

✅ Correct syntax examples:
```sql
'0 0 9 * * *'        -- Daily at 9 AM
'0 */15 * * * *'     -- Every 15 minutes
'0 0 9 * * 1-5'      -- Weekdays at 9 AM
'0 0 0 L * *'        -- Last day of month
'0 0 9 * * 1L'       -- Last Monday of month
'0 0 9 * * 4#2'      -- 2nd Thursday of month
```

### Invalid Patterns

❌ Common mistakes:
```sql
'* * * * *'          -- Missing seconds field (use 6 fields)
'0 0 9 32 * *'       -- Invalid day (32 > 31)
'0 0 25 * * *'       -- Invalid hour (25 > 23)
'0 0 9 * * 7'        -- Invalid DOW (use 0-6, not 1-7)
'0 0 9 L * 1L'       -- Can't use L in both fields
```

## Pattern Testing

Test your patterns to see next occurrences:

```sql
-- Create helper function
CREATE OR REPLACE FUNCTION test_pattern(
    pattern TEXT,
    count INTEGER DEFAULT 5
)
RETURNS TABLE(
    occurrence INTEGER,
    next_time TIMESTAMPTZ,
    formatted TEXT
) AS $$
DECLARE
    current_time TIMESTAMPTZ := NOW();
    i INTEGER;
BEGIN
    FOR i IN 1..count LOOP
        current_time := jcron.next_time(pattern, current_time);
        
        RETURN QUERY SELECT 
            i,
            current_time,
            TO_CHAR(current_time, 'YYYY-MM-DD HH24:MI:SS Day');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test pattern
SELECT * FROM test_pattern('0 0 9 * * 1-5', 10);
```

## Advanced Combinations

### L + Timezone
```sql
-- Last day at 10 PM NY time
SELECT jcron.next_time('0 0 22 L * * America/New_York', NOW());

-- Last Friday 9 AM London time
SELECT jcron.next_time('0 0 9 * * 5L Europe/London', NOW());
```

### # + Multiple Values
```sql
-- 2nd Monday AND 2nd Wednesday
SELECT jcron.next_time('0 0 9 * * 1#2,3#2', NOW());

-- 1st and 3rd Friday at noon
SELECT jcron.next_time('0 0 12 * * 5#1,5#3', NOW());
```

### Complex Business Rules
```sql
-- Weekdays at 9 AM
SELECT jcron.next_time('0 0 9 * * 1-5', NOW());

-- 8:30 AM, 12:30 PM, 5:30 PM on weekdays
SELECT jcron.next_time('0 30 8,12,17 * * 1-5', NOW());

-- 1st and 15th of every month
SELECT jcron.next_time('0 0 0 1,15 * *', NOW());
```

---

## Common Pitfalls & Solutions

### ❌ Day AND Weekday Both Specified
```sql
-- WRONG: Ambiguous! Day=15 OR Monday?
SELECT jcron.next_time('0 0 9 15 * 1', NOW());

-- RIGHT: Use only one
SELECT jcron.next_time('0 0 9 15 * *', NOW());  -- 15th of every month
SELECT jcron.next_time('0 0 9 * * 1', NOW());   -- Every Monday
```

### ❌ Invalid L Syntax
```sql
-- WRONG: L in day field doesn't take prefix
SELECT jcron.next_time('0 0 0 5L * *', NOW());

-- RIGHT: Use L alone for day, or with weekday prefix
SELECT jcron.next_time('0 0 0 L * *', NOW());   -- Last day of month
SELECT jcron.next_time('0 0 9 * * 5L', NOW());  -- Last Friday
```

### ❌ # Outside Valid Range
```sql
-- WRONG: 6th Monday (most months only have 4-5)
SELECT jcron.next_time('0 0 9 * * 1#6', NOW());

-- RIGHT: Use only 1-5 for # patterns
SELECT jcron.next_time('0 0 9 * * 1#2', NOW());  -- 2nd Monday
SELECT jcron.next_time('0 0 9 * * 5L', NOW());   -- Last occurrence
```

### ❌ Invalid Timezone
```sql
-- WRONG: Invalid timezone name
SELECT jcron.next_time('0 0 9 * * * US/Pacific', NOW());

-- RIGHT: Use standard IANA names
SELECT jcron.next_time('0 0 9 * * * America/Los_Angeles', NOW());
SELECT jcron.next_time('0 0 9 * * * Europe/Istanbul', NOW());
```

### ❌ E/S with Regular Pattern
```sql
-- WRONG: Mixing period and specific time
SELECT jcron.next_time('E1D 0 0 9 * * *', NOW());

-- RIGHT: Use E/S alone or regular pattern alone
SELECT jcron.next_end('E1D');              -- End of period
SELECT jcron.next_time('0 0 9 * * *', NOW());  -- Specific time
```

---

## Best Practices

1. **Always specify all 6 fields** for clarity
2. **Use descriptive comments** when patterns are complex
3. **Test patterns** before deploying to production
4. **Consider timezone** for global applications
5. **Avoid overly frequent** patterns (e.g., every second)
6. **Use ranges** instead of long lists when possible
7. **Document business logic** behind complex patterns
8. **Validate L and # patterns** - ensure they make logical sense
9. **Use match_time()** to verify pattern matches expected times
10. **Consider DST transitions** when using timezones

---

**Next:** [API Reference](API.md) | [Scheduler Guide](SCHEDULER.md)
