# JCRON Syntax Specification

## Table of Contents
- [Overview](#overview)
- [Basic Syntax](#basic-syntax)
- [Field Definitions](#field-definitions)
- [Special Characters](#special-characters)
- [Advanced Features](#advanced-features)
- [EOD (End of Duration) Syntax](#eod-end-of-duration-syntax)
- [Timezone Support](#timezone-support)
- [Examples](#examples)
- [Implementation Notes](#implementation-notes)

## Overview

JCRON is an advanced cron expression format that extends traditional cron syntax with:
- Second-level precision (6 or 7 fields)
- End of Duration (EOD) calculations
- Enhanced special characters (L, #, W)
- Timezone support
- Year specification
- Vixie-cron OR logic compatibility

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

### Basic Format
```
cron_expression EOD:duration [reference_point] [event_identifier]
```

### Duration Format (ISO 8601-like)
```
E<duration>     # End reference (default)
S<duration>     # Start reference

Duration components:
- Y: Years
- M: Months (when after Y or in complex format)
- W: Weeks
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

### Event Identifiers
```
E[event_name]   # Named event identifier
```

### EOD Examples
```
0 9 * * 1-5 EOD:E8H                     # Work day + 8 hours
0 0 9 * * 1 EOD:E2W E[sprint_end]       # Sprint planning + 2 weeks
0 30 14 * * * EOD:S30M                  # Meeting + 30 minutes
0 9 * * 1-5 EOD:E2H D                   # Work start + 2 hours or end of day
0 0 0 1 * * EOD:E5D M                   # Month start + 5 days or end of month
```

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

### Timezone Examples
```
# Global team meeting (9 AM in different zones)
0 0 9 * * 1 TZ:America/New_York
0 0 9 * * 2 TZ:Europe/London  
0 0 9 * * 3 TZ:Asia/Tokyo

# Market opening times
0 30 9 * * 1-5 TZ:America/New_York      # NYSE
0 0 8 * * 1-5 TZ:Europe/London          # LSE
0 0 9 * * 1-5 TZ:Asia/Tokyo             # TSE

# Complex combinations
0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M    # First half year, weekdays, UTC, 45min duration
0 0 9 * * 1 WOY:*/2 TZ:Europe/London        # Every other Monday, London time
```

## Implementation Notes

### Field Parsing Order
1. Detect field count (5, 6, or 7)
2. Parse and extract extensions (WOY:, TZ:, EOD:)
3. Parse main cron fields
4. Apply special character logic
5. Validate constraints and ranges

### Special Character Precedence
1. `L` and `W` in day field
2. `#` and `L` in weekday field  
3. List values (`,`)
4. Ranges (`-`)
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
