# JCRON Ports Differences Analysis

This document outlines the differences and incompatibilities between the three JCRON implementations: **PostgreSQL (psql.sql)**, **Go (core.go)**, and **Node.js TypeScript port (node-port/)**.

## 📊 Summary of Key Differences

| Feature | PostgreSQL | Go | Node.js | Status |
|---------|------------|----|---------| ------- |
| Schedule Structure | JSONB Fields | Go Struct Pointers | TypeScript Class | ❌ **Incompatible** |
| Field Naming | Single Letters | Full Names | Mixed | ⚠️ **Partially Compatible** |
| Week of Year Support | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ **Compatible** |
| Timezone Handling | PostgreSQL TZ | Go time.Location | date-fns-tz | ⚠️ **Different APIs** |
| Special Patterns | Full L/# Support | Full L/# Support | Limited Support | ⚠️ **Partial Compatibility** |
| Error Handling | SQL Exceptions | Go Errors | TypeScript Errors | ❌ **Different Approaches** |
| Caching | Database Cache | In-Memory Map | WeakMap | ❌ **Different Strategies** |

---

## 🔴 **CRITICAL INCOMPATIBILITIES**

### 1. Schedule Field Naming Convention

**PostgreSQL JSONB Format:**
```sql
-- Single letter field names
{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5","Y":"*","W":"*","timezone":"UTC"}
```

**Go Struct Format:**
```go
type Schedule struct {
    Second, Minute, Hour, DayOfMonth, Month, DayOfWeek, Year, WeekOfYear, Timezone *string
}
```

**Node.js Class Format:**
```typescript
class Schedule {
    constructor(
        public readonly s: string | null = null,        // Second
        public readonly m: string | null = null,        // Minute  
        public readonly h: string | null = null,        // Hour
        public readonly D: string | null = null,        // DayOfMonth
        public readonly M: string | null = null,        // Month
        public readonly dow: string | null = null,      // DayOfWeek
        public readonly Y: string | null = null,        // Year
        public readonly woy: string | null = null,      // WeekOfYear
        public readonly tz: string | null = null        // Timezone
    )
}
```

**🚨 Issue:** 
- PostgreSQL uses single-letter keys in JSONB
- Go uses full descriptive names as struct fields
- Node.js uses mixed approach with single letters for some fields

### 2. Data Storage and Retrieval

**PostgreSQL:**
```sql
-- Stores as JSONB in database
INSERT INTO jcron.jobs (schedule) VALUES ('{"s":"0","m":"30","h":"9"}');

-- Retrieves specific fields
SELECT schedule->>'s' as seconds FROM jcron.jobs;
```

**Go:**
```go
// Uses pointers to strings for optional fields
schedule := Schedule{
    Second: &"0",
    Minute: &"30", 
    Hour:   &"9",
}

// Null checking required
if schedule.Second != nil {
    seconds := *schedule.Second
}
```

**Node.js:**
```typescript
// Uses null for optional fields
const schedule = new Schedule("0", "30", "9", null, null, null);

// Direct null checking
if (schedule.s !== null) {
    const seconds = schedule.s;
}
```

---

## ⚠️ **MAJOR COMPATIBILITY ISSUES**

### 3. Timezone Field Names

| Implementation | Field Name | Example |
|----------------|------------|---------|
| PostgreSQL | `timezone` | `{"timezone":"America/New_York"}` |
| Go | `Timezone` | `Timezone: &"America/New_York"` |
| Node.js | `tz` | `tz: "America/New_York"` |

### 4. Week of Year Field Names

| Implementation | Field Name | Example |
|----------------|------------|---------|
| PostgreSQL | `W` | `{"W":"1-53"}` |
| Go | `WeekOfYear` | `WeekOfYear: &"1-53"` |
| Node.js | `woy` | `woy: "1-53"` |

### 5. Day of Week Field Names

| Implementation | Field Name | Example |
|----------------|------------|---------|
| PostgreSQL | `dow` | `{"dow":"1-5"}` |
| Go | `DayOfWeek` | `DayOfWeek: &"1-5"` |
| Node.js | `dow` | `dow: "1-5"` |

---

## 🟡 **IMPLEMENTATION DIFFERENCES**

### 6. Caching Strategies

**PostgreSQL:**
```sql
-- Database-level caching in schedule_cache table
CREATE TABLE jcron.schedule_cache (
    schedule JSONB PRIMARY KEY,
    seconds_vals INT[],
    minutes_vals INT[],
    -- ... cached expansion data
);
```

**Go:**
```go
// In-memory concurrent map with RWMutex
type Engine struct {
    cache map[string]*ExpandedSchedule
    mu    sync.RWMutex
}
```

**Node.js:**
```typescript
// WeakMap for automatic garbage collection
export class Engine {
    private readonly scheduleCache = new WeakMap<Schedule, ExpandedSchedule>();
}
```

### 7. Error Handling Approaches

**PostgreSQL:**
```sql
-- SQL exceptions with detailed messages
RAISE EXCEPTION 'Could not find a valid day within 5 years.';
```

**Go:**
```go
// Standard Go error handling
if err != nil {
    return time.Time{}, fmt.Errorf("invalid timezone '%s': %w", tz, err)
}
```

**Node.js:**
```typescript
// Custom error classes
export class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ParseError';
    }
}
```

---

## 🔧 **FUNCTIONAL DIFFERENCES**

### 8. Special Pattern Support

**PostgreSQL:**
```sql
-- Full support for Quartz-style patterns
-- L patterns: 'L', '1L', '2L', etc.
-- # patterns: '1#1', '2#3', etc.
IF dom_str ~ 'L$' THEN
    -- Last day logic
```

**Go:**
```go
// Pre-compiled pattern map for performance
commonSpecialPatterns = map[string]bool{
    "L": true, "1L": true, "2L": true,
    "1#1": true, "1#2": true, // ...
}
```

**Node.js:**
```typescript
// Limited special pattern support
// Focus on standard cron expressions
```

### 9. Date Arithmetic Libraries

| Implementation | Library/Method | Example |
|----------------|----------------|---------|
| PostgreSQL | Native SQL | `date_trunc('day', search_ts)` |
| Go | `time` package | `time.AddDate(1, 0, 0)` |
| Node.js | `date-fns` | `addDays(date, 1)` |

---

## 🚀 **PERFORMANCE CONSIDERATIONS**

### 10. Bitmask Usage

**PostgreSQL:**
```sql
-- Uses integer arrays for value storage
seconds_vals INT[],
minutes_vals INT[],
```

**Go:**
```go
// Uses optimized bitmasks for fast matching
type ExpandedSchedule struct {
    SecondsMask, MinutesMask   uint64
    HoursMask, DaysOfMonthMask uint32
    MonthsMask                 uint16
    DaysOfWeekMask             uint8
}
```

**Node.js:**
```typescript
// Uses simple arrays (less optimized)
class ExpandedSchedule {
    seconds: number[] = [];
    minutes: number[] = [];
    hours: number[] = [];
}
```

---

## 📋 **RECOMMENDED COMPATIBILITY ACTIONS**

### 1. **IMMEDIATE (Breaking Changes Required)**

1. **Standardize Field Names**
   ```typescript
   // Recommended unified format
   interface UnifiedSchedule {
     second?: string;      // 's' -> 'second'
     minute?: string;      // 'm' -> 'minute'  
     hour?: string;        // 'h' -> 'hour'
     dayOfMonth?: string;  // 'D' -> 'dayOfMonth'
     month?: string;       // 'M' -> 'month'
     dayOfWeek?: string;   // 'dow' -> 'dayOfWeek'
     year?: string;        // 'Y' -> 'year'
     weekOfYear?: string;  // 'W'/'woy' -> 'weekOfYear'
     timezone?: string;    // 'tz'/'timezone' -> 'timezone'
   }
   ```

2. **Create Translation Layer**
   ```typescript
   // Add conversion functions between formats
   function postgresqlToGo(pgSchedule: any): Schedule { ... }
   function goToNodejs(goSchedule: Schedule): Schedule { ... }
   function nodejsToPostgresql(nodeSchedule: Schedule): any { ... }
   ```

### 2. **SHORT-TERM (API Compatibility)**

1. **Add Compatibility Methods**
   ```typescript
   // Node.js port should support both formats
   class Schedule {
     static fromPostgreSQLJSON(json: string): Schedule { ... }
     static fromGoStruct(data: any): Schedule { ... }
     toPostgreSQLJSON(): string { ... }
     toGoStruct(): any { ... }
   }
   ```

2. **Unified Error Types**
   ```typescript
   // Create common error interface
   interface CronError {
     code: string;
     message: string;
     context?: any;
   }
   ```

### 3. **LONG-TERM (Architecture Alignment)**

1. **Shared Schema Definition**
   - Create a common JSON schema for all implementations
   - Use code generation to create native types

2. **Performance Optimization**
   - Implement bitmask optimization in Node.js
   - Align caching strategies across platforms

3. **Feature Parity**
   - Complete special pattern support in Node.js
   - Standardize timezone handling approaches

---

## 🧪 **TESTING COMPATIBILITY**

### Test Cases Needed:

1. **Cross-Platform Schedule Parsing**
   ```javascript
   // Test that same cron expression produces same results
   const cronExpr = "0 30 9 * * 1-5";
   
   // Should all return equivalent next execution times
   const pgResult = await postgresqlNext(cronExpr, now);
   const goResult = await goNext(cronExpr, now);
   const nodeResult = nodeNext(cronExpr, now);
   ```

2. **Field Name Translation**
   ```javascript
   // Test conversion between formats
   const pgJSON = '{"s":"0","m":"30","h":"9","D":"*","M":"*","dow":"1-5"}';
   const converted = convertPostgreSQLToNode(pgJSON);
   const backConverted = convertNodeToPostgreSQL(converted);
   assert.deepEqual(JSON.parse(pgJSON), JSON.parse(backConverted));
   ```

3. **Special Pattern Compatibility**
   ```javascript
   // Test special patterns across implementations
   const lastDayPattern = "0 0 0 L * *";
   // Should handle consistently or fail gracefully
   ```

---

## 💡 **MIGRATION STRATEGY**

### Phase 1: Establish Compatibility Layer
- Add translation functions between formats
- Maintain backward compatibility

### Phase 2: Gradual Field Name Unification  
- Start with new APIs using unified names
- Deprecate old field names

### Phase 3: Complete Alignment
- Unified error handling
- Consistent performance optimizations
- Feature parity across all implementations

---

## 📝 **CONCLUSION**

The three JCRON implementations have **significant structural differences** that prevent direct interoperability. The main issues are:

1. **Field naming inconsistencies** (single letters vs full names)
2. **Different data representation** (JSONB vs structs vs classes)  
3. **Incompatible APIs** for the same functionality
4. **Varying feature support** (special patterns, optimizations)

**Recommended approach:** Create a compatibility layer with translation functions while planning a unified v2.0 API that standardizes field names and behavior across all platforms.
