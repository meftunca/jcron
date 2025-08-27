# JCRON V2 Syntax & Logic Documentation

## Table of Contents
1. [Overview](#overview)
2. [V2 Clean Architecture](#v2-clean-architecture)
3. [Core Philosophy](#core-philosophy)
4. [Expression Types](#expression-types)
5. [Mathematical Foundation](#mathematical-foundation)
6. [Advanced Features](#advanced-features)
7. [Real-World Applications](#real-world-applications)
8. [Quick Reference](#quick-reference)

---

## Overview

JCRON V2 is a revolutionary scheduling system that unifies multiple time expression syntaxes under a clean, high-performance architecture. It combines the familiarity of traditional cron with the power of mathematical time calculations and modern scheduling needs.

### Key Innovation V2
**Clean 4-Parameter Architecture**: All expression types work through the same unified function design with intelligent pattern separation and conflict-free API design.

---

## V2 Clean Architecture

### Core Design Principles

#### 1. 4-Parameter Function Design
The unified function signature provides clean separation of concerns:
- **pattern**: Core scheduling pattern (cron, WOY, etc.)
- **modifier**: Optional time modifications (EOD/SOD calculations)
- **base_time**: Reference timestamp for calculations
- **target_tz**: Target timezone for result

#### 2. Clean Pattern Separation
- **Pattern Types**: CRON, WOY, TIMEZONE, SPECIAL
- **Modifier Types**: EOD, SOD, NONE
- **Intelligent Detection**: Automatic pattern type identification
- **No Conflicts**: Each pattern type has dedicated processing logic

#### 3. Conflict-Free API
Main functions with distinct names:
- **next()**: Next occurrence calculation
- **next_end()**: Next occurrence with end-time focus
- **next_start()**: Next occurrence with start-time focus

### V2 Enhanced Features

#### 1. Enhanced WOY Multi-Year Support
- **ISO 8601 Compliance**: Accurate week numbering across year boundaries
- **Multi-Year Search**: Automatic search across multiple years for valid weeks
- **Future Year Transitions**: Seamless handling of WOY patterns crossing year boundaries

#### 2. Ultra-High Performance
- **2.3M+ Operations/Second**: Peak performance with optimized algorithms
- **Bitwise Cache Optimization**: Immutable cache mechanisms for maximum speed
- **Clean Memory Management**: Efficient resource utilization

#### 3. Backwards Compatibility
- **Legacy Support**: Existing expressions continue to work
- **Migration Path**: Easy upgrade from V1 to V2
- **API Consistency**: Familiar function interfaces

### Supported Expression Types
- **Traditional Cron**: Industry-standard cron expressions with V2 enhanced parsing
- **WOY (Week of Year)**: Week-based yearly scheduling with multi-year support
- **TZ (Timezone)**: Explicit timezone specification for any expression
- **EOD (End of Duration)**: Mathematical end-of-period calculations
- **SOD (Start of Duration)**: Mathematical start-of-period calculations
- **L (Last) Syntax**: Last day/weekday patterns
- **# (Nth Occurrence)**: Nth weekday occurrence patterns
- **Hybrid Expressions**: Combinations of patterns with modifiers

---

## Core Philosophy

### 1. Clean 4-Parameter Architecture
JCRON V2 uses a **clean separation of concerns** through a 4-parameter design:
```sql
next_time(pattern, modifier, base_time, target_tz)
```

This eliminates parsing conflicts and provides crystal-clear semantics.

### 2. Enhanced Pattern Detection
V2 uses intelligent pattern detection with dedicated processors:
- **CRON**: Traditional cron expressions
- **WOY**: Week of year patterns with ISO 8601 compliance
- **TIMEZONE**: Timezone-aware calculations
- **SPECIAL**: L and # syntax patterns

### 3. Multi-Year WOY Logic
V2 enhanced WOY processing supports:
- **Year Boundary Crossing**: Seamless transitions across year boundaries
- **Multi-Year Search**: Automatic search in past/future years for valid weeks
- **ISO 8601 Compliance**: Accurate week numbering (weeks 1-53)

### 4. Mathematical Consistency
JCRON V2 uses **0-based indexing** for intuitive mathematical operations:
- `0` = Current period (this week, this month, this day)
- `1` = Next period (next week, next month, next day)
- `N` = N periods forward

This eliminates confusion and provides predictable behavior.

### 5. Sequential Processing
Complex modifier expressions are processed sequentially, left-to-right:
```
E1M2W3D = Base → +1 Month End → +2 Week End → +3 Day End
```

Each operation builds upon the previous result, creating powerful time calculations.

### 6. Clean API Design
V2 provides conflict-free functions with distinct names:
```sql
SELECT jcron.next('0 0 9 * * *');           -- Next occurrence
SELECT jcron.next_end('0 0 9 * * *', 'E1W'); -- Next + end calculation
SELECT jcron.next_start('WOY:1', 'S0M');     -- WOY + start calculation
```

---

## Expression Types

### 1. Traditional Cron Expressions

#### Format
```
[SECOND] [MINUTE] [HOUR] [DAY] [MONTH] [WEEKDAY]
```

#### Examples
**Daily Scheduling:**
- '0 30 14 * * *' → Daily at 14:30:00
- '*/15 * * * * *' → Every 15 seconds
- '0 0 9 1 * *' → 1st of every month at 09:00

**Weekly Patterns:**
- '0 0 9 * * MON' → Every Monday at 09:00
- '0 */10 9-17 * * 1-5' → Every 10 minutes, 9-17h, weekdays

#### Special Characters
- `*` : Any value
- `,` : List separator (e.g., 1,15 = 1st and 15th)
- `-` : Range (e.g., 9-17 = 9 through 17)
- `/` : Step values (e.g., */5 = every 5 units)
- `?` : No specific value (day/weekday only)

### 2. Week of Year (WOY) Syntax V2 Enhanced
WOY syntax allows scheduling based on specific weeks of the year (1-53 according to ISO 8601) with **multi-year support** in V2.

#### Format
```
WOY:[WEEK_NUMBERS]
```

#### V2 Enhancements
- **Multi-Year Search**: Automatically searches across multiple years for valid weeks
- **ISO 8601 Compliance**: Accurate week numbering with proper year boundaries
- **Future Year Transitions**: Seamless handling of week patterns crossing year boundaries
- **Enhanced Validation**: Intelligent week existence validation across years

#### Supported Patterns
- **WOY:*** → Every week of the year
- **WOY:1** → Only week 1 (first week of year)
- **WOY:1,15,30** → Weeks 1, 15, and 30
- **WOY:1-4** → Weeks 1 through 4 (first month)
- **WOY:*/2** → Every 2nd week (bi-weekly)
- **WOY:10-20** → Weeks 10 through 20 (Q2 period)

#### V2 Multi-Year Logic Examples
**Current: Week 50 of 2024 (52-week year)**
- 'WOY:53' → Finds week 53 in 2025 (53-week year)

**Current: Week 25 of 2024**  
- 'WOY:1' → Finds week 1 of 2025 (next occurrence)

**Seamless year boundary handling:**
- 'WOY:52,1' → Week 52 of current year, then week 1 of next year

#### Business Use Cases
- **Quarterly Planning**: WOY:1-13,14-26,27-39,40-53 for quarters
- **Bi-weekly Sprints**: WOY:*/2 for agile development cycles
- **Seasonal Operations**: WOY:22-35 for summer season (weeks 22-35)
- **Year-end Processing**: WOY:52,53 for year-end operations

#### ISO 8601 Week Numbering V2
- **Week 1**: Contains the first Thursday of the year
- **Weeks run Monday through Sunday**
- **Year can have 52 or 53 weeks** (V2 handles both automatically)
- **Week numbers: 1-53**
- **Multi-year validation**: V2 searches across years for valid week numbers
- **Enhanced accuracy**: Proper week start/end calculations using ISO 8601 standards

### 3. Timezone (TZ) Syntax
TZ syntax allows explicit timezone specification for any expression type.

#### Format
```
[EXPRESSION] TZ:[TIMEZONE]
```

#### Supported Timezone Formats
- **TZ:UTC** → Coordinated Universal Time
- **TZ:America/New_York** → IANA timezone database format
- **TZ:Europe/London** → European timezone
- **TZ:Asia/Tokyo** → Asian timezone
- **TZ:+03:00** → UTC offset format
- **TZ:-05:00** → Negative UTC offset

#### Examples
- '0 0 9 * * * TZ:UTC' → Daily 09:00 UTC
- '0 30 14 * * MON TZ:America/New_York' → Monday 14:30 Eastern Time
- 'E0W TZ:Europe/London' → Week end in London timezone
- '0 0 12 * * FRI WOY:*/2 TZ:Asia/Tokyo' → Bi-weekly Friday noon in Tokyo
- '0 0 17 L * * TZ:+03:00' → Last day 17:00 UTC+3

#### Business Use Cases
- **Global Teams**: TZ:America/New_York for US operations
- **Multi-region Scheduling**: Different timezones for different services
- **Financial Markets**: TZ:America/New_York for NYSE, TZ:Europe/London for LSE
- **Server Maintenance**: TZ:UTC for consistent global scheduling
- **Local Business Hours**: TZ:Asia/Tokyo for Japan operations

#### Timezone Handling Rules
- Default timezone is system timezone if not specified
- All calculations performed in specified timezone
- Daylight saving transitions handled automatically
- Invalid timezones fallback to UTC with warning

### 4. EOD (End of Duration) Expressions

#### Philosophy
EOD expressions calculate the **end time** of time periods using mathematical progression.

#### Format
```
E[YEARS]Y[MONTHS]M[WEEKS]W[DAYS]D[HOURS]H[MINUTES]M[SECONDS]S
```

#### 0-Based Logic Examples
- **E0W** → This week end (current week's Sunday 23:59:59)
- **E1W** → Next week end (next week's Sunday 23:59:59)  
- **E2W** → 2nd week end (two weeks from now, Sunday 23:59:59)
- **E0M** → This month end (current month's last day 23:59:59)
- **E1M** → Next month end (next month's last day 23:59:59)
- **E0D** → Today end (today 23:59:59)
- **E1D** → Tomorrow end (tomorrow 23:59:59)

#### Sequential Processing Examples
- **E1M2W** → Base → +1 Month End → +2 Week End
- **E0W3D** → Base → This Week End → +3 Day End
- **E2Y1M1W** → Base → +2 Year End → +1 Month End → +1 Week End

#### Step-by-Step Calculation
**For E1M2W3D from 2024-01-15 10:00:00:**
1. **Base**: 2024-01-15 10:00:00
2. **+1 Month End**: 2024-02-29 23:59:59 (February end)
3. **+2 Week End**: 2024-03-17 23:59:59 (2 weeks later, Sunday end)
4. **+3 Day End**: 2024-03-20 23:59:59 (3 days later, day end)

### 5. SOD (Start of Duration) Expressions

#### Philosophy
SOD expressions calculate the **start time** of time periods, complementing EOD functionality.

#### Format
```
S[YEARS]Y[MONTHS]M[WEEKS]W[DAYS]D[HOURS]H[MINUTES]M[SECONDS]S
```

#### 0-Based Logic Examples
- **S0W** → This week start (current week's Monday 00:00:00)
- **S1W** → Next week start (next week's Monday 00:00:00)
- **S0M** → This month start (current month's 1st day 00:00:00)
- **S1M** → Next month start (next month's 1st day 00:00:00)
- **S0D** → Today start (today 00:00:00)
- **S1D** → Tomorrow start (tomorrow 00:00:00)

#### Sequential Processing Examples
- **S1M1W** → Base → +1 Month Start → +1 Week Start
- **S0W2D** → Base → This Week Start → +2 Day Start
- **S0M1W3D** → Base → This Month Start → +1 Week Start → +3 Day Start

#### EOD vs SOD Comparison
**For reference time: 2024-01-15 10:00:00 (Monday)**

- **E0W** → 2024-01-21 23:59:59  (This week END - Sunday)
- **S0W** → 2024-01-15 00:00:00  (This week START - Monday)

- **E0M** → 2024-01-31 23:59:59  (This month END - 31st)
- **S0M** → 2024-01-01 00:00:00  (This month START - 1st)

- **E0D** → 2024-01-15 23:59:59  (Today END)
- **S0D** → 2024-01-15 00:00:00  (Today START)

### 6. L (Last) Syntax

#### Philosophy
L syntax provides business-friendly "last occurrence" patterns commonly needed in scheduling.

#### Patterns
- **L** → Last day of month
- **NL** → Last occurrence of weekday N (0=Sun, 1=Mon, ..., 6=Sat)
- **L-N** → N days before last day of month

#### Examples
- '0 0 17 L * *' → Last day of month at 17:00
- '0 0 9 * * 5L' → Last Friday of month at 09:00
- '0 0 12 L-5 * *' → 5 days before month end at 12:00
- '0 30 14 * * 1L' → Last Monday of month at 14:30

#### Business Use Cases
- **Payroll**: Last Friday processing
- **Reports**: Month-end reports on last day
- **Deadlines**: Reminders before month end

### 7. # (Nth Occurrence) Syntax

#### Philosophy
# syntax enables precise "Nth occurrence" scheduling for regular business patterns.

#### Patterns
- **N#M** → Mth occurrence of weekday N in month

#### Examples
- '0 0 9 * * 2#1' → 1st Tuesday of month at 09:00
- '0 30 14 * * 5#3' → 3rd Friday of month at 14:30
- '0 0 10 * * 1#2' → 2nd Monday of month at 10:00
- '0 0 15 * * 4#4' → 4th Thursday of month at 15:00

#### Business Use Cases
- **Meetings**: Monthly team meetings on 1st Monday
- **Reviews**: Quarterly reviews on 3rd Thursday
- **Planning**: Sprint planning on 2nd Friday

### 8. Hybrid Expressions

#### Philosophy
Hybrid expressions combine cron scheduling with EOD/SOD calculations, enabling **temporal reference point** logic.

#### Concept: Temporal Reference Points
A hybrid expression has two parts:
1. **Cron Reference**: Defines when to establish a time reference
2. **EOD/SOD Calculation**: Calculates from that reference point

#### Format
```
[CRON_EXPRESSION] [EOD/SOD_EXPRESSION]
```

#### V2 Enhanced Examples
Using V2 Clean API with separate pattern and modifier parameters:
- **Pattern**: '0 0 9 * * *', **Modifier**: 'E1W' → Simple cron + week end
- **Pattern**: 'WOY:1', **Modifier**: 'E1W' → WOY + end modifier
- **Pattern**: '* * 14 * * *', **Modifier**: 'E0M' → Cron + month end
- **Pattern**: '0 0 9 * * MON', **Modifier**: 'S1W' → Monday + week start

#### V2 Multi-Year WOY Examples  
- **Pattern**: 'WOY:53', **Modifier**: NULL → Week 53 (searches future years)
- **Pattern**: 'WOY:1', **Modifier**: NULL, **Base**: '2024-12-25' → Week 1 from Christmas
- **Pattern**: 'WOY:*/2', **Modifier**: 'E0W' → Bi-weekly + week end

#### V2 Timezone + WOY Combinations
- **Pattern**: 'WOY:1', **Modifier**: 'S0W', **Timezone**: 'UTC' → Week 1 start in UTC
- **Pattern**: 'WOY:26,52', **Modifier**: 'E1W', **Timezone**: 'America/New_York' → Multi-week + timezone

### 9. V2 Processing Logic

#### V2 Pattern Processing
**For Pattern: 'WOY:1', Modifier: 'E0M':**
1. **Pattern Detection**: Identifies WOY pattern type
2. **WOY Processing**: Finds next occurrence of week 1 (may be in future year)
3. **Modifier Application**: Applies month end calculation from week 1 start
4. **Result**: Returns end of month containing week 1

#### V2 Multi-Year WOY Logic
**For Pattern: 'WOY:53' from week 50 of 52-week year:**
1. **Current Year Check**: Week 53 doesn't exist in current year
2. **Future Year Search**: Searches next year for week 53
3. **Validation**: Confirms week 53 exists in target year
4. **Result**: Returns first occurrence of week 53 in future year

#### V2 Enhanced Hybrid Processing
**Pattern: '0 0 9 * * MON', Modifier: 'E1W':**
1. Find next Monday 09:00 (pattern processing)
2. From that Monday, calculate +1 week end (modifier processing)
3. Return the calculated end time

---

## Mathematical Foundation

### 1. 0-Based Indexing System

#### Principle
JCRON uses 0-based indexing for all time calculations, following mathematical conventions:

```
0 = Current period
1 = Next period  
2 = Second next period
...
N = Nth next period
```

#### Examples Across Time Units
**Days:**
- E0D = Today end
- E1D = Tomorrow end
- E7D = 7 days from now end

**Weeks:**
- E0W = This week end (current Sunday)
- E1W = Next week end (next Sunday)
- E4W = 4 weeks from now end

**Months:**
- E0M = This month end (current month last day)
- E1M = Next month end (next month last day)
- E12M = 12 months from now end (1 year later)

### 2. Sequential Processing Algorithm

#### Process Flow
1. **Initialize**: Start with base timestamp
2. **Process Years**: If present, add years and find year end
3. **Process Months**: From current result, add months and find month end  
4. **Process Weeks**: From current result, add weeks and find week end
5. **Process Days**: From current result, add days and find day end
6. **Process Hours**: From current result, add hours and find hour end
7. **Process Minutes**: From current result, add minutes and find minute end
8. **Process Seconds**: From current result, add seconds and find second end

#### Mathematical Formula
```
Result = ((((((Base +Y)end +M)end +W)end +D)end +H)end +Min)end +S)end
```

Where `+X` means "add X units" and `end` means "find end of that period".

### 3. NULL Convention Logic

#### Rules
- `NULL` units are completely ignored in calculations
- `0` units mean "current period of that type"
- Positive units mean "N periods forward"

#### Examples
- **E0W2D** → NULL NULL 0 2 = Week + Day calculation only
- **E1M0W** → NULL 1 0 NULL = Month calculation, then current week
- **E2D** → NULL NULL NULL 2 = Day calculation only

### 4. Time Period Definitions

#### Week Definition
- **Start**: Monday 00:00:00
- **End**: Sunday 23:59:59
- **ISO 8601 compliant**

#### Month Definition  
- **Start**: 1st day 00:00:00
- **End**: Last day 23:59:59 (handles leap years automatically)

#### Quarter Definition
- **Q1**: Jan-Mar (ends March 31st)
- **Q2**: Apr-Jun (ends June 30th)
- **Q3**: Jul-Sep (ends September 30th)
- **Q4**: Oct-Dec (ends December 31st)

#### Year Definition
- **Start**: January 1st 00:00:00
- **End**: December 31st 23:59:59

---

## Advanced Features

### 1. Timezone Support

#### Implementation
All expressions respect timezone settings with V2 clean parameter design:
- Main pattern processed in specified timezone
- Modifier calculations performed in same timezone
- Results returned in target timezone

#### Timezone Handling
- **EOD/SOD**: End/start times calculated in specified timezone
- **Cron**: Time matching done in specified timezone
- **Hybrid**: Both components respect timezone setting

### 2. Complex Sequential Calculations

#### Multi-Unit EOD
**E2Y1M3W2D1H30M15S** → 2 years + 1 month + 3 weeks + 2 days + 1 hour + 30 minutes + 15 seconds

#### Processing Steps
1. Base time + 2 years → find year end
2. Year end + 1 month → find month end
3. Month end + 3 weeks → find week end
4. Week end + 2 days → find day end
5. Day end + 1 hour → find hour end
6. Hour end + 30 minutes → find minute end
7. Minute end + 15 seconds → find second end

### 3. Edge Case Handling

#### Month Overflow
**E0M31D** → Month end + 31 days (handles different month lengths)

#### Leap Year Support
**E0Y** → Year end (handles leap years correctly)

#### Weekend Handling
**E0W** → Always finds Sunday end, regardless of start day

### 4. Validation and Constraints

#### Expression Validation
- Syntax validation before processing
- Range validation for all time components
- Logical validation (e.g., no negative values)

#### Constraint Examples
**Valid:**
- 'E0W', 'E1M2D', '0 30 14 * * *'

**Invalid:**
- 'E-1W' → Negative values not allowed
- 'E1X' → Invalid unit 'X'
- '60 * * * * *' → Invalid minute (>59)

---

## Real-World Applications

### 1. Business Scheduling Scenarios

#### Financial Operations
**Month-end closing:**
- '0 0 23 L * *' → Last day of month at 23:00

**Quarterly reports:**
- Pattern: '0 0 9 L * *', Modifier: 'E0Q' → Last day → quarter end calculation

**Payroll processing:**
- '0 0 6 * * 5L' → Last Friday at 06:00

#### IT Operations
**Weekly backups:**
- Pattern: '0 0 2 * * SUN', Modifier: 'E1W' → Sunday 02:00 → next week end window

**Monthly maintenance:**
- '0 0 3 1 * *' → 1st of month at 03:00

**Quarterly patching:**
- '0 0 4 * */3 SAT#1' → 1st Saturday of quarter at 04:00

#### Human Resources
**Monthly all-hands:**
- '0 30 10 * * 1#1' → 1st Monday at 10:30

**Performance reviews:**
- '0 0 14 * */6 3#3' → 3rd Wednesday, every 6 months at 14:00

**Training sessions:**
- '0 0 9 * * 5#2' → 2nd Friday at 09:00

### 2. Complex Business Rules

#### Multi-Stage Processing
**Project deadline: 2nd Friday + 2 weeks for review**
- Pattern: '0 0 17 * * 5#2', Modifier: 'E2W'

**Budget planning: Last day of quarter - 1 week**
- Pattern: '0 0 9 L * *', Modifier: 'E0Q' + S-1W (conceptual)

**Contract renewal: 1st Monday + month end - 5 days**
- Pattern: '0 0 10 * * 1#1', Modifier: 'E0M-5D' (conceptual)

### 3. Integration Patterns

#### V2 Database Integration
**Enhanced Job Scheduling Table:**
- **id**: Primary key
- **name**: Job name
- **pattern**: Core pattern (cron, WOY, etc.)
- **modifier**: Optional modifier (EOD/SOD)
- **target_tz**: Target timezone
- **next_run**: Calculated next run time
- **enabled**: Enable/disable flag

**Update Process:**
- Calculate next_run using pattern and modifier parameters
- Store timezone-aware results
- Enable efficient querying by next_run time

#### Application Integration Examples
**Python Integration:**
- Use pattern and modifier as separate parameters
- Pass timezone for global application support
- Handle V2 multi-year WOY automatically

**Web Service Integration:**
- RESTful API accepting pattern, modifier, timezone
- JSON response with next occurrence timestamps
- Bulk processing for multiple job schedules

---

## Quick Reference

### Syntax Cheat Sheet

#### Traditional Cron
- **'0 30 14 * * *'** → Daily 14:30
- **'0 0 9 * * MON'** → Monday 09:00
- **'0 */10 9-17 * * 1-5'** → Every 10min, 9-17h, weekdays

#### WOY (Week of Year)
- **'WOY:1'** → Week 1 (first week of year)
- **'WOY:*/2'** → Every 2nd week (bi-weekly)
- **'WOY:1-13'** → Weeks 1-13 (Q1)
- **'WOY:26,52'** → Weeks 26 and 52

#### TZ (Timezone)
- **'0 0 9 * * * TZ:UTC'** → Daily 09:00 UTC
- **'0 30 14 * * MON TZ:America/New_York'** → Monday 14:30 ET
- **'E0W TZ:Europe/London'** → Week end London time
- **'WOY:*/2 TZ:+03:00'** → Bi-weekly UTC+3

#### EOD/SOD
- **'E0W'** → This week end
- **'E1M2D'** → Next month + 2 days end
- **'S0D'** → Today start
- **'S1W'** → Next week start

#### L/# Syntax
- **'0 0 17 L * *'** → Last day of month 17:00
- **'0 0 9 * * 5L'** → Last Friday 09:00
- **'0 30 14 * * 2#1'** → 1st Tuesday 14:30
- **'0 0 10 * * 5#3'** → 3rd Friday 10:00

#### V2 Hybrid (Pattern + Modifier)
- **Pattern**: '0 0 9 * * MON', **Modifier**: 'E0M' → Monday 09:00 → month end
- **Pattern**: '* * 3 * * *', **Modifier**: 'E1W' → Hour 3 → next week end
- **Pattern**: '0 0 17 * * 5L', **Modifier**: 'E1W' → Last Friday 17:00 → next week end

### V2 Function Reference
**Universal functions for all syntax types:**
- **next()**: Calculate next occurrence
- **next_end()**: Calculate next occurrence with end-time focus
- **next_start()**: Calculate next occurrence with start-time focus
- **prev_time()**: Calculate previous occurrence
- **is_time_match()**: Check if time matches pattern
- **parse_expression()**: Parse and validate expression

---

## Conclusion

JCRON V2 represents a paradigm shift in scheduling systems by:

1. **Unifying** multiple expression types under a clean 4-parameter API
2. **Providing** mathematical consistency with 0-based indexing  
3. **Enabling** complex time calculations through sequential processing
4. **Supporting** real-world business scheduling needs with enhanced WOY multi-year logic
5. **Maintaining** ultra-high performance (2.3M+ ops/sec) across all expression types
6. **Eliminating** function conflicts through clean separation of pattern and modifier

The V2 architecture bridges the gap between traditional cron scheduling and modern business requirements, providing developers with a powerful, intuitive, and comprehensive scheduling solution that handles complex scenarios like multi-year WOY patterns and sophisticated timezone management.

Whether you need simple daily schedules or complex multi-stage time calculations, JCRON V2 provides the tools to express your scheduling needs naturally and efficiently while maintaining exceptional performance.

---

**JCRON V2** - *Unified Scheduling for the Modern Era*

*Documentation Version: 2.0*  
*Last Updated: August 2025*