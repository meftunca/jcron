# EOD/SOD Modifiers - Complete Guide

End of Day/Week/Month/Hour (EOD) ve Start of Day/Week/Month/Hour (SOD) modifier'larının kapsamlı kullanım kılavuzu.

## 📋 Table of Contents

- [Quick Reference](#quick-reference)
- [Standalone Usage](#standalone-usage)
- [Combined with Cron](#combined-with-cron)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## 🎯 Quick Reference

### EOD (End of Period)

| Pattern | Description          | Example Result          |
| ------- | -------------------- | ----------------------- |
| `E0H`   | End of this hour     | 09:59:59                |
| `E1H`   | End of next hour     | 10:59:59                |
| `E2H`   | End of 2 hours later | 11:59:59                |
| `E0D`   | End of today         | 23:59:59                |
| `E1D`   | End of tomorrow      | Tomorrow 23:59:59       |
| `E0W`   | End of this week     | Sunday 23:59:59         |
| `E1W`   | End of next week     | Next Sunday 23:59:59    |
| `E0M`   | End of this month    | 31st/30th/28th 23:59:59 |
| `E1M`   | End of next month    | Next month end 23:59:59 |
| `E0Y`   | End of this year     | Dec 31 23:59:59         |

### SOD (Start of Period)

| Pattern | Description            | Example Result          |
| ------- | ---------------------- | ----------------------- |
| `S0H`   | Start of this hour     | 09:00:00                |
| `S1H`   | Start of next hour     | 10:00:00                |
| `S2H`   | Start of 2 hours later | 11:00:00                |
| `S0D`   | Start of today         | 00:00:00                |
| `S1D`   | Start of tomorrow      | Tomorrow 00:00:00       |
| `S0W`   | Start of this week     | Monday 00:00:00         |
| `S1W`   | Start of next week     | Next Monday 00:00:00    |
| `S0M`   | Start of this month    | 1st 00:00:00            |
| `S1M`   | Start of next month    | Next month 1st 00:00:00 |
| `S0Y`   | Start of this year     | Jan 1 00:00:00          |

---

## 📝 Standalone Usage

### Basic Examples

```sql
-- Current time: 2025-10-23 14:30:45

-- Hour modifiers
SELECT jcron.next('E0H');  -- 2025-10-23 14:59:59
SELECT jcron.next('S2H');  -- 2025-10-23 16:00:00

-- Day modifiers
SELECT jcron.next('E0D');  -- 2025-10-23 23:59:59
SELECT jcron.next('S1D');  -- 2025-10-24 00:00:00

-- Week modifiers (Week starts Monday)
SELECT jcron.next('E0W');  -- 2025-10-26 23:59:59 (Sunday)
SELECT jcron.next('S0W');  -- 2025-10-20 00:00:00 (Monday)

-- Month modifiers
SELECT jcron.next('E0M');  -- 2025-10-31 23:59:59
SELECT jcron.next('S1M');  -- 2025-11-01 00:00:00
```

### Using Dedicated Functions

```sql
-- End functions
SELECT jcron.next_end('E0D');  -- End of today
SELECT jcron.next_end('E1W');  -- End of next week

-- Start functions
SELECT jcron.next_start('S0M');  -- Start of this month
SELECT jcron.next_start('S1Y');  -- Start of next year
```

---

## 🔧 Combined with Cron

**The real power**: Combine cron patterns with EOD/SOD modifiers!

### Hour Modifiers + Cron

The cron defines the base time, and the hour modifier adds an offset:

```sql
-- Base: Every day at 10:00
-- Result: 12:00 (10:00 + 2 hours)
SELECT jcron.next('0 0 10 * * * S2H');

-- Base: Weekdays at 9:00
-- Result: 11:00 (9:00 + 2 hours)
SELECT jcron.next('0 0 9 * * 1-5 S2H');

-- Base: Every hour at :30
-- Result: Next hour start (e.g., 10:30 → 11:00)
SELECT jcron.next('0 30 * * * * S1H');
```

### Day Modifiers + Cron

```sql
-- Daily at 9:00, start of day
SELECT jcron.next('0 0 9 * * * S0D');
-- Result: Today 00:00:00 (if not passed), Tomorrow 00:00:00 (if passed)

-- Daily at 9:00, end of day
SELECT jcron.next('0 0 9 * * * E0D');
-- Result: Today 23:59:59

-- Weekdays at 17:00, end of day
SELECT jcron.next('0 0 17 * * 1-5 E0D');
-- Result: Weekdays 23:59:59
```

### Week Modifiers + Cron

```sql
-- Monday at 10:00, start of week
SELECT jcron.next('0 0 10 * * 1 S0W');
-- Result: Monday 00:00:00 (week start)

-- Friday at 17:00, end of week
SELECT jcron.next('0 0 17 * * 5 E0W');
-- Result: Sunday 23:59:59 (week end)
```

### Month Modifiers + Cron

```sql
-- 1st day at 9:00, start of month
SELECT jcron.next('0 0 9 1 * * S0M');
-- Result: 1st day 00:00:00

-- Last day at 17:00, end of month
SELECT jcron.next('0 0 17 L * * E0M');
-- Result: Last day 23:59:59
```

---

## 💡 Real-World Examples

### Business Hours Scenarios

```sql
-- Start work shift 2 hours after 8 AM = 10:00
SELECT jcron.next('0 0 8 * * 1-5 S2H');

-- End of business day (5 PM becomes 11:59 PM)
SELECT jcron.next('0 0 17 * * 1-5 E0D');

-- Start of lunch break (12:00 PM becomes 12:00 sharp)
SELECT jcron.next('0 0 12 * * 1-5 S0H');
```

### Maintenance Windows

```sql
-- Start maintenance 3 hours after midnight = 3:00 AM
SELECT jcron.next('0 0 0 * * 0 S3H');

-- End maintenance window at day's end
SELECT jcron.next('0 0 6 * * 0 E0D');
```

### Report Generation

```sql
-- Monthly report: End of month
SELECT jcron.next('0 0 23 L * * E0M');

-- Quarterly report: End of quarter months
SELECT jcron.next('0 0 23 L 3,6,9,12 * E0M');

-- Weekly report: End of week (Sunday night)
SELECT jcron.next('0 0 23 * * 0 E0W');
```

### Backup Scheduling

```sql
-- Daily backup at 2 AM, start of next hour = 3:00 AM
SELECT jcron.next('0 0 2 * * * S1H');

-- Weekly full backup: Sunday midnight + 1 hour = 1:00 AM
SELECT jcron.next('0 0 0 * * 0 S1H');

-- Monthly backup: Start of month at midnight
SELECT jcron.next('0 0 0 1 * * S0M');
```

---

## ✅ Best Practices

### 1. **Use Hour Modifiers for Time Offsets**

```sql
-- ✅ GOOD: Clear intent, offset from base time
'0 0 10 * * * S2H'  -- 10:00 + 2 hours = 12:00

-- ❌ AVOID: Direct time specification (less flexible)
'0 0 12 * * *'      -- Just use 12:00 directly if no offset needed
```

### 2. **Combine Day Modifiers for Boundary Times**

```sql
-- ✅ GOOD: Clear end-of-day intent
'0 0 9 * * 1-5 E0D'  -- Weekdays end of day

-- ✅ GOOD: Clear start-of-day intent
'0 0 17 * * * S1D'   -- Tomorrow start (midnight)
```

### 3. **Week/Month Modifiers for Period Boundaries**

```sql
-- ✅ GOOD: Clear week boundary
'0 0 10 * * 1 S0W'   -- Start of week (Monday midnight)

-- ✅ GOOD: Clear month boundary
'0 0 10 L * * E0M'   -- End of month
```

### 4. **E0 vs E1 Pattern Choice**

```sql
-- E0: "This" period (current)
'E0M'  -- End of THIS month
'S0W'  -- Start of THIS week

-- E1: "Next" period (future)
'E1M'  -- End of NEXT month
'S1W'  -- Start of NEXT week

-- E2+: Multiple periods ahead
'E2H'  -- End of 2 hours later
'S3D'  -- Start of 3 days later
```

---

## 🔍 Testing Examples

```sql
-- Test from specific time
SELECT jcron.next_from('0 0 10 * * * S2H', '2025-10-23 08:00:00'::timestamptz);
-- Expected: 2025-10-23 12:00:00

-- Test E0M for different months
SELECT jcron.next_from('E0M', '2025-02-15 10:00:00'::timestamptz);  -- Feb 28
SELECT jcron.next_from('E0M', '2024-02-15 10:00:00'::timestamptz);  -- Feb 29 (leap)
SELECT jcron.next_from('E0M', '2025-04-15 10:00:00'::timestamptz);  -- Apr 30

-- Test S0W for different days
SELECT jcron.next_from('S0W', '2025-10-20 10:00:00'::timestamptz);  -- Monday (same day)
SELECT jcron.next_from('S0W', '2025-10-23 10:00:00'::timestamptz);  -- Thursday (prev Monday)
```

---

## 📊 Comparison Table

| Scenario       | Without Modifier | With Modifier      | Benefit           |
| -------------- | ---------------- | ------------------ | ----------------- |
| Time offset    | `0 0 12 * * *`   | `0 0 10 * * * S2H` | Dynamic offset    |
| End of day     | `0 59 23 * * *`  | `E0D`              | Clearer intent    |
| Start of month | `0 0 0 1 * *`    | `S0M`              | Boundary handling |
| Week end       | Complex logic    | `E0W`              | Simple & clear    |

---

## 🚀 Performance Notes

- ✅ **Hour modifiers**: ~16-28μs execution time
- ✅ **Day modifiers**: ~16-20μs execution time
- ✅ **Week modifiers**: ~18-25μs execution time
- ✅ **Month modifiers**: ~20-28μs execution time

All modifiers are highly optimized with minimal overhead!

---

## 🎓 Summary

**Key Takeaways:**

1. **E0** = This period, **E1** = Next period, **E2+** = Multiple periods ahead
2. **Hour modifiers** work great with cron for time offsets
3. **Day/Week/Month** modifiers simplify boundary logic
4. **Combine patterns** for powerful business rules
5. **Test edge cases** (month ends, leap years, week boundaries)

**When to use:**

- ✅ Time offsets from base schedule
- ✅ Period boundary operations
- ✅ Business logic requiring "end of" or "start of" times
- ✅ Dynamic scheduling based on period calculations

Happy scheduling! 🎉
