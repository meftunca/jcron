# JCRON Syntax Specification

## Table of Contents
- [Overview](#overview)
- [Basic Syntax](#basic-syntax)
- [Field Definitions](#field-definitions)
- [Special Characters](#special-characters)
- [EOD (End of Duration) Syntax](#eod-end-of-duration-syntax)
- [Advanced Features](#advanced-features)
- [Timezone Support](#timezone-support)
- [Examples](#examples)
- [Cross-Platform Compatibility](#cross-platform-compatibility)
- [Implementation Notes](#implementation-notes)

## Overview

JCRON is an advanced cron expression format that extends traditional cron syntax with powerful time management features. Available for both **Go** and **TypeScript/Node.js**, JCRON provides:

- **Second-level precision** (6 or 7 fields)
- **End of Duration (EOD)** calculations for time-bounded schedules
- **Enhanced special characters** (L, #, W) for complex date patterns
- **Timezone support** for global applications
- **Year specification** for long-term scheduling
- **Week of Year (WOY)** patterns for quarterly/annual cycles
- **Vixie-cron OR logic** compatibility

## Basic Syntax

### Standard Format
```
[second] [minute] [hour] [day] [month] [weekday] [year] [WOY:weekofyear] [TZ:timezone] [EOD:duration]
```

### Field Count Variations
- **5 fields**: `minute hour day month weekday` (traditional cron)
- **6 fields**: `second minute hour day month weekday` (with seconds)
- **7 fields**: `second minute hour day month weekday year` (with year)

### Extended Format (Full JCRON)
```
second minute hour day month weekday [year] [WOY:week_pattern] [TZ:timezone] [EOD:duration]
```

### Field Ranges
| Field | Range | Special Values |
|-------|-------|----------------|
| Second | 0-59 | `*`, `/`, `,`, `-` |
| Minute | 0-59 | `*`, `/`, `,`, `-` |
| Hour | 0-23 | `*`, `/`, `,`, `-` |
| Day | 1-31 | `*`, `/`, `,`, `-`, `L`, `W` |
| Month | 1-12 | `*`, `/`, `,`, `-`, `JAN-DEC` |
| Weekday | 0-7 | `*`, `/`, `,`, `-`, `SUN-SAT`, `#`, `L` |
| Year | 1970-3000 | `*`, `/`, `,`, `-` |
| WeekOfYear | 1-53 | `*`, `/`, `,`, `-` |

**Note**: Both 0 and 7 represent Sunday in weekday field.

## Field Definitions

### Second Field (Optional)
```
0-59        # Specific second
*           # Every second
*/5         # Every 5 seconds
15,30,45    # At 15, 30, and 45 seconds
10-20       # From 10 to 20 seconds
```

### Minute Field
```
0-59        # Specific minute
*           # Every minute
*/15        # Every 15 minutes
0,30        # At 0 and 30 minutes
```

### Hour Field
```
0-23        # Specific hour (24-hour format)
*           # Every hour
*/2         # Every 2 hours
9-17        # From 9 AM to 5 PM
```

### Day Field
```
1-31        # Specific day of month
*           # Every day
*/5         # Every 5 days
1,15        # 1st and 15th of month
L           # Last day of month
15W         # Nearest weekday to 15th
LW          # Last weekday of month
```

### Month Field
```
1-12        # Numeric month
JAN-DEC     # Month names (3-letter)
*           # Every month
*/3         # Every 3 months (quarterly)
1,4,7,10    # Quarterly months
```

### Weekday Field
```
0-7         # 0 and 7 = Sunday, 1 = Monday, etc.
SUN-SAT     # Day names (3-letter)
*           # Every weekday
1-5         # Monday to Friday
MON,WED,FRI # Specific weekdays
1#2         # Second Monday of month
5L          # Last Friday of month
```

### Year Field (Optional)
```
2025        # Specific year
*           # Every year
2025-2030   # Year range
*/2         # Every 2 years
```

### Week of Year Field (Optional)
```
1-53        # Specific week number
*           # Every week
1-26        # First half of year
27-53       # Second half of year
*/2         # Every other week
1,13,26,39  # Quarterly weeks
```

## Special Characters

### Asterisk (*)
Matches all values in the field.
```
* * * * * *     # Every second
0 * * * * *     # Every minute at 0 seconds
0 0 * * * *     # Every hour
```

### Comma (,)
Separates multiple values.
```
0 0,15,30,45 * * * *    # Every quarter hour
0 0 9,12,15 * * 1-5     # 9 AM, noon, 3 PM on weekdays
```

### Hyphen (-)
Defines ranges.
```
0 0 9-17 * * 1-5        # 9 AM to 5 PM, Monday to Friday
0 */10 8-18 * * *       # Every 10 minutes, 8 AM to 6 PM
```

### Slash (/)
Defines step values.
```
*/5 * * * * *           # Every 5 seconds
0 */15 * * * *          # Every 15 minutes
0 0 */2 * * *           # Every 2 hours
0 0 0 */5 * *           # Every 5 days
```

### L (Last)
Used in day and weekday fields.

#### Day Field
```
0 0 12 L * *            # Noon on last day of month
0 0 0 L * *             # Midnight on last day of month
```

#### Weekday Field
```
0 0 22 * * 5L           # 10 PM on last Friday of month
0 0 9 * * 1L            # 9 AM on last Monday of month
```

### W (Weekday)
Finds nearest weekday to specified date.
```
0 0 9 15W * *           # 9 AM on weekday nearest to 15th
0 0 12 LW * *           # Noon on last weekday of month
```

### # (Nth Occurrence)
Used in weekday field for nth occurrence.
```
0 0 8 * * 1#2           # 8 AM on 2nd Monday of month
0 0 14 * * 5#4          # 2 PM on 4th Friday of month
0 0 9 * * 1#1,1#3       # 9 AM on 1st and 3rd Monday
```

## Advanced Features

### Week of Year (WOY) Support
Constrains execution to specific weeks of the year (ISO 8601 week numbering).
```
0 0 9 * * 1-5 WOY:1-26          # Weekdays, first half of year
0 0 12 * * * WOY:1,13,26,39,52  # Quarterly meetings
0 30 14 * * 5 WOY:*/2           # Every other Friday
```

### Predefined Week Patterns
```
WOY:1-13    # First quarter (weeks 1-13)
WOY:14-26   # Second quarter (weeks 14-26)  
WOY:27-39   # Third quarter (weeks 27-39)
WOY:40-53   # Fourth quarter (weeks 40-53)
WOY:*/2     # Every other week
```

### Vixie-Cron OR Logic
When both day and weekday are specified (neither is `*`), they use OR logic.
```
0 0 0 15 * MON          # Midnight on 15th OR on Mondays
0 0 12 1,15 * 1-5       # Noon on 1st/15th OR weekdays
```

### Step Values with Ranges
```
0 0 8-18/2 * * *        # Every 2 hours from 8 AM to 6 PM
0 10-50/10 * * * *      # Every 10 minutes from :10 to :50
```

### Complex Combinations
```
0 0,30 8-12,14-18 1,15 1,6,12 1-5   # Complex business schedule
*/10 */5 9-17 * * 1-5               # Every 10 seconds, every 5 minutes, business hours
```

## EOD (End of Duration) Syntax

The **EOD (End of Duration)** system is JCRON's most innovative feature, allowing you to create time-bounded schedules that automatically calculate end points based on periods and durations.

### Basic Format
```
cron_expression EOD:duration_specification
```

### Duration Specification Format
```
[S|E][number][UNIT][T[time_component]]
```

**Components:**
- **Reference Point**:
  - `S` = Start reference (from beginning of period)
  - `E` = End reference (to end of period) - **DEFAULT**
- **Number**: Integer multiplier (1, 2, 3, etc.)
- **Unit**: Time period unit
  - `D` = Day
  - `W` = Week  
  - `M` = Month
  - `Q` = Quarter
  - `Y` = Year
- **Time Component** (optional): Additional precise time using `T` separator
  - `H` = Hours
  - `M` = Minutes  
  - `S` = Seconds

### EOD Examples

| Expression | Meaning | Calculation |
|------------|---------|-------------|
| `E1W` | End of current week | Until Sunday 23:59:59 |
| `E2W` | End of next week | Until next Sunday 23:59:59 |
| `E1D` | End of current day | Until today 23:59:59 |
| `E1M` | End of current month | Until last day of month 23:59:59 |
| `S30M` | 30 minutes from start | 30 minutes after first execution |
| `E1DT12H` | End of day + 12 hours | Until tomorrow 11:59:59 |
| `E1WT8H30M` | End of week + 8h 30m | Until Monday 08:29:59 |
| `S2H30M` | 2.5 hours from start | 2 hours 30 minutes duration |

### Period End Calculations

#### Week Boundaries (E1W, E2W, etc.)
- **Week Start**: Monday 00:00:00  
- **Week End**: Sunday 23:59:59
- `E1W` from Thursday = Until coming Sunday
- `E2W` from Thursday = Until next Sunday (week after)

#### Day Boundaries (E1D, E2D, etc.)
- **Day Start**: 00:00:00
- **Day End**: 23:59:59  
- `E1D` = Until end of current day
- `E2D` = Until end of next day

#### Month Boundaries (E1M, E2M, etc.)
- **Month Start**: 1st day 00:00:00
- **Month End**: Last day 23:59:59
- Handles varying month lengths automatically
- Leap year aware for February

### Real-World EOD Use Cases

```bash
# 1. Weekday backup job - runs Mon-Fri 9 AM until end of week
0 0 9 * * 1-5 EOD:E1W

# 2. Month-end reporting - runs daily at 6 PM until end of month  
0 0 18 * * * EOD:E1M

# 3. Flash sale monitoring - runs every 10 minutes for 2 hours
0 */10 * * * * EOD:S2H

# 4. Daily maintenance window - runs hourly until end of day + 6 hours
0 0 * * * * EOD:E1DT6H

# 5. Quarterly review reminders - runs weekly until end of quarter
0 0 9 * * 1 WOY:1-13 EOD:E1Q

# 6. Year-end processing - runs daily in December until end of year
0 0 2 * 12 * EOD:E1Y

# 7. Short-term campaign - runs every 5 minutes for 45 minutes
0 */5 * * * * EOD:S45M
```

### Advanced EOD Patterns

```bash
# Complex duration with multiple components
0 0 12 * * * EOD:E1WT12H30M15S    # End of week + 12h 30m 15s

# Start reference with precise timing
0 0 9 * * 1 EOD:S1DT8H            # Run for 1 day + 8 hours from start

# Multiple period calculations
0 0 0 1 * * EOD:E2M               # From 1st of month until end of next month
```

### EOD Schedule Methods (API)

#### Go Implementation
```go
schedule := &Schedule{
    Minute: stringPtr("0"),
    Hour: stringPtr("9"), 
    DayOfWeek: stringPtr("1-5"),
    EOD: eodExpression,
}

// Check if schedule has EOD
if schedule.HasEOD() {
    // Get the calculated end time
    endTime := schedule.EndOf(time.Now())
    
    // Check if currently in active range
    isActive := schedule.IsRangeNow(time.Now())
    
    // Get start time of the range
    startTime := schedule.StartOf(time.Now())
}
```

#### TypeScript Implementation  
```typescript
const schedule = new Schedule("0 0 9 * * 1-5", "E1W");

// Get next execution time
const nextRun = getNext(schedule, new Date());

// Get calculated end time
const endTime = schedule.endOf(new Date());

// Check if in active time range
const isActive = schedule.isRangeNow(new Date());

// Calculate time remaining
const timeRemaining = endTime.getTime() - Date.now();
```
- D: Days
- H: Hours
- M: Minutes (when standalone or after T)
- S: Seconds

Format: [E|S][nY][nM][nW][nD]T[nH][nM][nS]
```

### Duration Examples
```
E8H             # End + 8 hours
S30M            # Start + 30 minutes
E1DT12H         # End + 1 day 12 hours
E2W3DT6H30M     # End + 2 weeks 3 days 6 hours 30 minutes
E1Y6M2DT4H      # End + 1 year 6 months 2 days 4 hours
```

### Reference Points
```
E, END          # End of current execution (default)
S, START        # Start of current execution
D, DAY          # End of current day (23:59:59)
W, WEEK         # End of current week (Sunday 23:59:59)
M, MONTH        # End of current month
Q, QUARTER      # End of current quarter
Y, YEAR         # End of current year
```

## Cross-Platform Compatibility

JCRON provides identical functionality across **Go** and **TypeScript/Node.js** platforms with consistent APIs and behavior.

### Platform Feature Matrix

| Feature | Go | TypeScript | Notes |
|---------|----|-----------:|-------|
| Basic Cron Syntax | ✅ | ✅ | Full compatibility |
| Second-level Precision | ✅ | ✅ | 6-field support |
| EOD (End of Duration) | ✅ | ✅ | Complete implementation |
| Timezone Support | ✅ | ✅ | Same timezone libraries |
| Week of Year (WOY) | ✅ | ✅ | ISO 8601 compliant |
| Special Characters (L, #, W) | ✅ | ✅ | Identical behavior |
| Year Specification | ✅ | ✅ | Same range (1970-3000) |
| Caching System | ✅ | ✅ | Optimized for each platform |
| Error Handling | ✅ | ✅ | Consistent error types |

### Syntax Compatibility

**Go Example:**
```go
// Create schedule with EOD
schedule := &Schedule{
    Minute: stringPtr("0"),
    Hour: stringPtr("9"),
    DayOfWeek: stringPtr("1-5"),
    EOD: parseEOD("E1W"),
}

// Get next execution
engine := New()
nextTime, _ := engine.Next(*schedule, time.Now())

// Get end time
endTime := schedule.EndOf(time.Now())
```

**TypeScript Example:**
```typescript
// Create schedule with EOD  
const schedule = new Schedule("0 0 9 * * 1-5", "E1W");

// Get next execution
const nextTime = getNext(schedule, new Date());

// Get end time
const endTime = schedule.endOf(new Date());
```

### API Method Mapping

| Operation | Go | TypeScript |
|-----------|----|-----------:|
| Next execution | `engine.Next(schedule, time)` | `getNext(schedule, date)` |
| Previous execution | `engine.Prev(schedule, time)` | `getPrev(schedule, date)` |
| End time | `schedule.EndOf(time)` | `schedule.endOf(date)` |
| Start time | `schedule.StartOf(time)` | `schedule.startOf(date)` |
| Range check | `schedule.IsRangeNow(time)` | `schedule.isRangeNow(date)` |
| Has EOD | `schedule.HasEOD()` | `schedule.hasEOD()` |

### Data Type Consistency

**Time Handling:**
- Go: `time.Time` with nanosecond precision
- TypeScript: `Date` with millisecond precision  
- Both handle timezone conversions identically

**Error Types:**
- Go: Custom error types with detailed messages
- TypeScript: Error objects with same message formats

**Expression Parsing:**
- Identical validation rules
- Same error messages for invalid expressions
- Consistent field range checking

### Testing Compatibility

Both implementations share the same test cases to ensure identical behavior:

```bash
# Go tests
go test -v ./...

# TypeScript tests  
npm test
# or
bun test
```

**Shared Test Scenarios:**
- EOD calculations across timezone boundaries
- Complex cron expressions with all features
- Edge cases (leap years, month boundaries, DST transitions)
- Performance benchmarks for large-scale usage

## Timezone Support

### Format
```
cron_expression TZ:timezone_name
```

### Timezone Examples
```
0 0 9 * * * TZ:UTC                      # 9 AM UTC
0 0 12 * * 1-5 TZ:America/New_York      # Noon ET, weekdays
0 30 8 * * * TZ:Europe/Istanbul         # 8:30 AM Turkey time
0 0 15 * * 5 TZ:Asia/Tokyo              # 3 PM JST, Fridays
```

### Combined with Week of Year
```
0 0 9 * * 1-5 WOY:1-26 TZ:Europe/London # Business hours, first half year, London time
```

### Combined with EOD
```
0 0 9 * * 1-5 TZ:Europe/London EOD:E8H  # London work day + 8 hours
0 30 14 * * * WOY:1-26 TZ:UTC EOD:E45M  # First half year, UTC, 45 minutes duration
```

## Predefined Shortcuts

### Standard Shortcuts
```
@yearly, @annually   # 0 0 0 1 1 *     (January 1st)
@monthly            # 0 0 0 1 * *     (1st of month)
@weekly             # 0 0 0 * * 0     (Sunday)
@daily, @midnight   # 0 0 0 * * *     (Midnight)
@hourly             # 0 0 * * * *     (Top of hour)
```

## Examples

### Basic Scheduling
```
# Every minute
* * * * * *

# Every hour at minute 0
0 * * * * *

# Every day at midnight
0 0 0 * * *

# Every Monday at 9 AM
0 0 9 * * 1

# Every weekday at 9 AM
0 0 9 * * 1-5

# Every 15 minutes during business hours
0 */15 9-17 * * 1-5
```

### Advanced Scheduling
```
# Last Friday of every month at 5 PM
0 0 17 * * 5L

# Second Tuesday of every month at 2 PM
0 0 14 * * 2#2

# Every 5 minutes on weekdays, but only on 1st and 15th
0 */5 * 1,15 * 1-5

# Quarterly reporting (1st day of quarter at 8 AM)
0 0 8 1 1,4,7,10 *

# End of business day on last workday of month
0 0 17 LW * *

# First half of year, Mondays at 9 AM
0 0 9 * * 1 WOY:1-26

# Every other week, Friday afternoons
0 0 15 * * 5 WOY:*/2
```

### EOD Scheduling
```
# Daily standup meeting (9 AM) with 30-minute duration
0 0 9 * * 1-5 EOD:E30M

# Sprint planning (Monday 9 AM) for 2-week sprint
0 0 9 * * 1 EOD:E2W E[sprint_planning]

# Monthly report due at end of month
0 0 0 1 * * EOD:E1M M

# Quarterly review with flexible end time
0 0 9 1 1,4,7,10 * EOD:E2H Q
```

## Performance & Optimization

### Calculation Efficiency

**Mathematical "Next Jump" Algorithm:**
- JCRON uses mathematical calculations instead of iterative time checking
- Directly computes the next valid execution time
- Significant performance gains for long-interval schedules

**Caching Strategy:**
- Cron expressions parsed once, cached as optimized representations
- Integer-based bit masks for fast field matching
- Cache keys include all components (cron + timezone + EOD)

**Memory Usage:**
- Lightweight Schedule structs/objects
- Minimal memory overhead per job
- Efficient string interning for field values

### Benchmarks

**Go Performance:**
```
BenchmarkNext-8         1000000    1200 ns/op    32 B/op    1 allocs/op
BenchmarkEODCalc-8       500000    2500 ns/op    64 B/op    2 allocs/op
BenchmarkComplexCron-8   200000    5000 ns/op   128 B/op    3 allocs/op
```

**TypeScript Performance:**
```
Simple cron expressions:     ~0.1ms per calculation
Complex EOD calculations:    ~0.5ms per calculation  
Timezone conversions:        ~0.2ms per calculation
```

### Scalability Notes

- **Concurrent Safety**: Both implementations are thread-safe
- **Large Scale**: Tested with 10,000+ simultaneous schedules
- **Memory Efficiency**: O(1) memory per schedule after parsing
- **CPU Usage**: Minimal CPU overhead during execution

## Implementation Notes

### Field Parsing Order
1. **Preprocessing**: Trim whitespace, normalize separators
2. **Extension Extraction**: Extract WOY:, TZ:, EOD: modifiers
3. **Field Count Detection**: Determine 5, 6, or 7 field format
4. **Main Field Parsing**: Parse core cron fields with validation
5. **Special Character Processing**: Handle L, #, W characters
6. **Range & List Processing**: Expand ranges and comma-separated values
7. **Validation**: Ensure field values within valid ranges
8. **Optimization**: Convert to internal representation for fast lookup

### Special Character Precedence
1. **L and W in day field**: Last day of month, nearest weekday
2. **# and L in weekday field**: Nth weekday, last weekday of month
3. **List values (,)**: Multiple specific values
4. **Ranges (-)**: Continuous value ranges
5. **Step values (/)**: Regular intervals within ranges

### Error Handling

**Common Validation Errors:**
```
Invalid field count (must be 5, 6, or 7)
Field value out of range (e.g., hour > 23)
Invalid special character usage (e.g., L in minute field)
Malformed EOD expression
Unknown timezone identifier
Conflicting Nth weekday (e.g., 6#5 - no 5th Saturday in some months)
```

**Error Recovery:**
- Graceful degradation for minor syntax issues
- Detailed error messages with field positions
- Suggestion system for common mistakes

### Edge Case Handling

**Calendar Edge Cases:**
- **Leap Years**: February 29th handling in EOD calculations
- **Month Boundaries**: 31st day in 30-day months
- **Daylight Saving Time**: Automatic timezone transition handling
- **Year Transitions**: December 31st to January 1st boundary

**EOD Edge Cases:**
- **Week Boundaries**: Handling when current day is Sunday
- **Month End Calculations**: Variable month lengths
- **Timezone Transitions**: EOD calculations across DST changes
- **Time Reference Points**: Start vs. end reference disambiguation

### Compatibility Notes

**Vixie-Cron Compatibility:**
- Full backward compatibility with standard cron syntax
- OR logic for day/weekday field combinations
- Standard field ranges and special characters

**ISO Standards Compliance:**
- ISO 8601 week numbering for WOY calculations
- ISO timezone identifier support
- ISO duration format inspiration for EOD syntax

**Cross-Platform Consistency:**
- Identical calculation results between Go and TypeScript
- Same timezone handling using standard libraries
- Synchronized test suites ensuring compatibility

### Extension Guidelines

**Adding New Features:**
1. Maintain backward compatibility
2. Follow existing syntax patterns
3. Add comprehensive test coverage
4. Update both Go and TypeScript implementations
5. Document with clear examples

**Custom Extensions:**
- Use `X:` prefix for experimental features
- Implement validation for new syntax components
- Consider performance impact on core calculations
- Provide migration path for deprecated features

## Best Practices

### Expression Design
- **Start Simple**: Begin with basic cron, add complexity gradually
- **Test Thoroughly**: Verify behavior across month/year boundaries
- **Document Intent**: Comment complex expressions in code
- **Consider Timezones**: Always specify timezone for global applications

### Performance Optimization
- **Cache Schedules**: Reuse parsed Schedule objects
- **Batch Operations**: Group multiple schedule calculations
- **Monitor Usage**: Track execution patterns for optimization
- **Profile Regularly**: Measure actual performance in production

### EOD Usage Patterns
- **Short Durations**: Use `S` reference for time-boxed tasks
- **Period Boundaries**: Use `E` reference for deadline-based scheduling
- **Complex Timing**: Combine with timezone for global coordination
- **Validation**: Always verify EOD calculations in tests
5. Step values (`/`)

### Validation Rules
- Second: 0-59
- Minute: 0-59  
- Hour: 0-23
- Day: 1-31 (validated against month)
- Month: 1-12
- Weekday: 0-7 (0 and 7 = Sunday)
- Year: 1970-3000
- WeekOfYear: 1-53 (ISO 8601 week numbering)
- Step values must be positive
- Range start must be ≤ range end
- `#` values: 1-5 (nth occurrence)
- `L` cannot combine with other day values

### Error Conditions
- Invalid field count
- Out-of-range values
- Invalid step values (0 or negative)
- Invalid special character combinations
- Malformed EOD syntax
- Invalid timezone names
- February 29th on non-leap years

### Compatibility Notes
- **Standard cron**: Fields 2-6 (minute through weekday)
- **Quartz cron**: Fields 1-7 (second through year)
- **Vixie cron**: OR logic for day/weekday
- **JCRON extensions**: 
  - EOD (End of Duration) calculations
  - WOY (Week of Year) constraints  
  - TZ (Timezone) support
  - Enhanced special characters
  - Full parsing via `FromJCronString()` function

### JCRON String Format
Complete format supported by `FromJCronString()`:
```
"second minute hour day month weekday [year] [WOY:week_pattern] [TZ:timezone] [EOD:duration]"
```

Examples:
```go
// Golang usage examples
schedule1, _ := jcron.FromJCronString("0 30 9 * * MON-FRI WOY:1-26 EOD:E8H")
schedule2, _ := jcron.FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M")
schedule3, _ := jcron.FromJCronString("0 0 9 * * 1 WOY:*/2 TZ:Europe/London")
```

This specification ensures full compatibility with existing cron implementations while providing powerful extensions for modern scheduling needs.
