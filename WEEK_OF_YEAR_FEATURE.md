# Week of Year Feature - Implementation Guide

## Overview

The Week of Year feature has been successfully implemented in both the Go and Node.js/TypeScript versions of jcron. This feature allows you to schedule jobs based on ISO week numbers (1-53), providing more granular control over job scheduling.

## Key Features

### 1. **7-Field Cron Syntax Support**
- Traditional cron: `minute hour day month weekday`
- With seconds: `second minute hour day month weekday`
- **New with WeekOfYear**: `second minute hour day month weekday weekofyear`

### 2. **Week Constraint Functions**
- `FromCronWithWeekOfYear()` - Add week constraint to existing cron
- `WithWeekOfYear()` - Modify existing schedule with week constraint

### 3. **Predefined Week Patterns**
- First/Last weeks, Quarters, Even/Odd weeks, etc.

## Implementation Details

### Go Implementation

#### New Fields Added:
```go
type Schedule struct {
    // ... existing fields ...
    WeekOfYear *string  // New field for week of year (1-53)
}

type ExpandedSchedule struct {
    // ... existing fields ...
    WeeksOfYearMask uint64  // Bitmask for weeks 1-53
    WeekOfYear      string  // Original expression
}
```

#### Key Functions:
- `FromCronSyntax()` - Updated to support 7-field format
- `FromCronWithWeekOfYear()` - Helper to add week constraint
- `isWeekOfYearMatch()` - Core matching logic using ISO week numbers

### TypeScript Implementation

#### New Fields Added:
```typescript
class Schedule {
    constructor(
        // ... existing fields ...
        public readonly woy: string | null = null, // Week of Year
    ) {}
}

class ExpandedSchedule {
    // ... existing fields ...
    weeksOfYear: number[] = [];  // Array of valid weeks
    weekOfYear: string = "*";    // Original expression
}
```

#### Key Functions:
- `fromCronSyntax()` - Updated to support 7-field format
- `fromCronWithWeekOfYear()` - Helper to add week constraint
- `_isWeekOfYearMatch()` - Core matching logic using ISO week numbers

## Usage Examples

### Basic Usage

#### Go
```go
// Method 1: 7-field cron syntax
schedule1, _ := jcron.FromCronSyntax("0 0 9 * * * 1-13")  // First quarter weeks

// Method 2: Traditional cron + week constraint
schedule2, _ := jcron.FromCronWithWeekOfYear("0 9 * * 1", jcron.OddWeeks)

// Method 3: Using predefined patterns
schedule3 := jcron.WithWeekOfYear(baseSchedule, jcron.FirstQuarter)
```

#### TypeScript
```typescript
// Method 1: 7-field cron syntax
const schedule1 = fromCronSyntax("0 0 9 * * * 1-13");  // First quarter weeks

// Method 2: Traditional cron + week constraint  
const schedule2 = fromCronWithWeekOfYear("0 9 * * 1", WeekPatterns.ODD_WEEKS);

// Method 3: Using predefined patterns
const schedule3 = withWeekOfYear(baseSchedule, WeekPatterns.FIRST_QUARTER);
```

### Advanced Examples

#### 1. Bi-weekly Team Meetings
```go
// Go
schedule, _ := jcron.FromCronWithWeekOfYear("0 10 * * 2", jcron.OddWeeks)
// Every Tuesday at 10 AM during odd weeks (bi-weekly)
```

```typescript
// TypeScript
const schedule = fromCronWithWeekOfYear("0 10 * * 2", WeekPatterns.ODD_WEEKS);
// Every Tuesday at 10 AM during odd weeks (bi-weekly)
```

#### 2. Quarterly Business Reports
```go
// Go
schedule, _ := jcron.FromCronSyntax("0 0 8 1 * * 1,14,27,40")
// First day of month at 8 AM during weeks 1, 14, 27, 40 (roughly quarterly)
```

```typescript
// TypeScript  
const schedule = fromCronSyntax("0 0 8 1 * * 1,14,27,40");
// First day of month at 8 AM during weeks 1, 14, 27, 40 (roughly quarterly)
```

#### 3. Seasonal Tasks
```go
// Go - Winter maintenance (weeks 1-13)
winterSchedule, _ := jcron.FromCronWithWeekOfYear("0 6 * * 0", "1-13")

// Summer tasks (weeks 27-39)  
summerSchedule, _ := jcron.FromCronWithWeekOfYear("0 7 * * 6", "27-39")
```

```typescript
// TypeScript - Winter maintenance (weeks 1-13)
const winterSchedule = fromCronWithWeekOfYear("0 6 * * 0", "1-13");

// Summer tasks (weeks 27-39)
const summerSchedule = fromCronWithWeekOfYear("0 7 * * 6", "27-39");
```

### Predefined Week Patterns

Both implementations include convenient predefined patterns:

```go
// Go
var (
    FirstWeek     = "1"
    LastWeek      = "53" 
    EvenWeeks     = "2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52"
    OddWeeks      = "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53"
    FirstQuarter  = "1-13"
    SecondQuarter = "14-26"
    ThirdQuarter  = "27-39" 
    FourthQuarter = "40-53"
)
```

```typescript
// TypeScript
export const WeekPatterns = {
    FIRST_WEEK: "1",
    LAST_WEEK: "53",
    EVEN_WEEKS: "2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52",
    ODD_WEEKS: "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53",
    FIRST_QUARTER: "1-13",
    SECOND_QUARTER: "14-26", 
    THIRD_QUARTER: "27-39",
    FOURTH_QUARTER: "40-53",
    BI_WEEKLY: "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53",
    MONTHLY: "1,5,9,13,17,21,25,29,33,37,41,45,49,53",
} as const;
```

## Testing

### Current Week Information
```go
// Go
now := time.Now()
year, week := now.ISOWeek()
fmt.Printf("Current week: %d of year %d\n", week, year)
```

```typescript
// TypeScript
function getISOWeek(date: Date): number {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000
                          - 3 + (week1.getDay() + 6) % 7) / 7);
}

const currentWeek = getISOWeek(new Date());
console.log('Current week:', currentWeek);
```

## Backward Compatibility

- ✅ All existing 5-field and 6-field cron expressions continue to work
- ✅ No breaking changes to existing APIs
- ✅ Week of year constraint is optional (defaults to "*" = any week)
- ✅ Existing predefined schedules (@hourly, @daily, etc.) unchanged

## Performance Considerations

- Week of year checking uses efficient bitmask operations (Go) and array lookups (TypeScript)
- ISO week calculation is performed only when week constraints are specified
- Cache keys include week of year field for optimal caching
- Minimal performance impact on existing functionality

## Future Enhancements

Potential future additions could include:
- Week-of-month patterns (1st, 2nd, 3rd, 4th week of month)
- Fiscal year support (different week numbering systems)
- Business week patterns (excluding holidays)
- Custom week definitions (e.g., starting on different days)

---

The week of year feature significantly enhances jcron's scheduling capabilities while maintaining full backward compatibility and performance.
