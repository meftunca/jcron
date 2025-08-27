# JCRON Syntax & Logic Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Philosophy](#core-philosophy)
3. [Expression Types](#expression-types)
4. [Mathematical Foundation](#mathematical-foundation)
5. [Unified API Design](#unified-api-design)
6. [Advanced Features](#advanced-features)
7. [Real-World Applications](#real-world-applications)
8. [Performance & Optimization](#performance--optimization)

---

## Overview

JCRON is a revolutionary scheduling system that unifies multiple time expression syntaxes under a single, intelligent API. It combines the familiarity of traditional cron with the power of mathematical time calculations and modern scheduling needs.

### Key Innovation
**Single Function, Multiple Syntaxes**: All expression types work through the same `jcron.next_time()` function with automatic syntax detection.

### Supported Expression Types
- **Traditional Cron**: Industry-standard cron expressions
- **WOY (Week of Year)**: Week-based yearly scheduling patterns
- **TZ (Timezone)**: Explicit timezone specification for any expression
- **EOD (End of Duration)**: Mathematical end-of-period calculations
- **SOD (Start of Duration)**: Mathematical start-of-period calculations
- **L (Last) Syntax**: Last day/weekday patterns
- **# (Nth Occurrence)**: Nth weekday occurrence patterns
- **Hybrid Expressions**: Combinations of cron + EOD/SOD

---

## Core Philosophy

### 1. Mathematical Consistency
JCRON uses **0-based indexing** for intuitive mathematical operations:
- `0` = Current period (this week, this month, this day)
- `1` = Next period (next week, next month, next day)
- `N` = N periods forward

This eliminates confusion and provides predictable behavior.

### 2. Sequential Processing
Complex expressions are processed sequentially, left-to-right:
```
E1M2W3D = Base → +1 Month End → +2 Week End → +3 Day End
```

Each operation builds upon the previous result, creating powerful time calculations.

### 3. Unified API
All syntax types share the same function interface:
```sql
SELECT jcron.next_time(expression);  -- Works for ALL syntax types
```

No need to remember different functions for different expression types.

### 4. NULL Convention
- `NULL` values in expressions mean "ignore this unit"
- Explicit `0` means "current period"
- This provides precise control over time calculations

---

## Expression Types

### 1. Traditional Cron Expressions

#### Format
```
[SECOND] [MINUTE] [HOUR] [DAY] [MONTH] [WEEKDAY]
```

#### Examples
```sql
'0 30 14 * * *'        -- Daily at 14:30:00
'*/15 * * * * *'       -- Every 15 seconds
'0 0 9 1 * *'          -- 1st of every month at 09:00
'0 0 9 * * MON'        -- Every Monday at 09:00
'0 */10 9-17 * * 1-5'  -- Every 10 minutes, 9-17h, weekdays
```

#### Special Characters
- `*` : Any value
- `,` : List separator (e.g., `1,15` = 1st and 15th)
- `-` : Range (e.g., `9-17` = 9 through 17)
- `/` : Step values (e.g., `*/5` = every 5 units)
- `?` : No specific value (day/weekday only)

#### Week of Year (WOY) Syntax
WOY syntax allows scheduling based on specific weeks of the year (1-53 according to ISO 8601).

##### Format
```
WOY:[WEEK_NUMBERS]
```

##### Supported Patterns
- `WOY:*` : Every week of the year
- `WOY:1` : Only week 1 (first week of year)
- `WOY:1,15,30` : Weeks 1, 15, and 30
- `WOY:1-4` : Weeks 1 through 4 (first month)
- `WOY:*/2` : Every 2nd week (bi-weekly)
- `WOY:10-20` : Weeks 10 through 20 (Q2 period)

##### Examples
```sql
'0 0 9 * * MON WOY:1'        -- Monday 09:00 on first week of year
'0 30 14 * * * WOY:1,26,52'  -- Daily 14:30 on weeks 1, 26, and 52
'0 0 12 * * FRI WOY:*/4'     -- Friday noon every 4th week
'0 0 8 * * * WOY:10-15'      -- Daily 08:00 during weeks 10-15
'0 15 16 * * * WOY:1-13'     -- Daily 16:15 during Q1 (weeks 1-13)
```

##### Business Use Cases
- **Quarterly Planning**: `WOY:1-13,14-26,27-39,40-53` for quarters
- **Bi-weekly Sprints**: `WOY:*/2` for agile development cycles
- **Seasonal Operations**: `WOY:22-35` for summer season (weeks 22-35)
- **Year-end Processing**: `WOY:52,53` for year-end operations
- **Monthly Cycles**: `WOY:1,5,9,13,17,21,25,29,33,37,41,45,49` for monthly

##### ISO 8601 Week Numbering
- Week 1: Contains the first Thursday of the year
- Weeks run Monday through Sunday
- Year can have 52 or 53 weeks
- Week numbers: 1-53

#### Timezone (TZ) Syntax
TZ syntax allows explicit timezone specification for any expression type.

##### Format
```
[EXPRESSION] TZ:[TIMEZONE]
```

##### Supported Timezone Formats
- `TZ:UTC` : Coordinated Universal Time
- `TZ:America/New_York` : IANA timezone database format
- `TZ:Europe/London` : European timezone
- `TZ:Asia/Tokyo` : Asian timezone
- `TZ:+03:00` : UTC offset format
- `TZ:-05:00` : Negative UTC offset

##### Examples
```sql
'0 0 9 * * * TZ:UTC'                    -- Daily 09:00 UTC
'0 30 14 * * MON TZ:America/New_York'   -- Monday 14:30 Eastern Time
'E0W TZ:Europe/London'                  -- Week end in London timezone
'0 0 12 * * FRI WOY:*/2 TZ:Asia/Tokyo'  -- Bi-weekly Friday noon in Tokyo
'0 0 17 L * * TZ:+03:00'                -- Last day 17:00 UTC+3
```

##### Business Use Cases
- **Global Teams**: `TZ:America/New_York` for US operations
- **Multi-region Scheduling**: Different timezones for different services
- **Financial Markets**: `TZ:America/New_York` for NYSE, `TZ:Europe/London` for LSE
- **Server Maintenance**: `TZ:UTC` for consistent global scheduling
- **Local Business Hours**: `TZ:Asia/Tokyo` for Japan operations

##### Timezone Handling Rules
- Default timezone is system timezone if not specified
- All calculations performed in specified timezone
- Daylight saving transitions handled automatically
- Invalid timezones fallback to UTC with warning

### 2. EOD (End of Duration) Expressions

#### Philosophy
EOD expressions calculate the **end time** of time periods using mathematical progression.

#### Format
```
E[YEARS]Y[MONTHS]M[WEEKS]W[DAYS]D[HOURS]H[MINUTES]M[SECONDS]S
```

#### 0-Based Logic Examples
```sql
'E0W'      -- This week end (current week's Sunday 23:59:59)
'E1W'      -- Next week end (next week's Sunday 23:59:59)  
'E2W'      -- 2nd week end (two weeks from now, Sunday 23:59:59)
'E0M'      -- This month end (current month's last day 23:59:59)
'E1M'      -- Next month end (next month's last day 23:59:59)
'E0D'      -- Today end (today 23:59:59)
'E1D'      -- Tomorrow end (tomorrow 23:59:59)
```

#### Sequential Processing Examples
```sql
'E1M2W'    -- Base → +1 Month End → +2 Week End
'E0W3D'    -- Base → This Week End → +3 Day End
'E2Y1M1W'  -- Base → +2 Year End → +1 Month End → +1 Week End
```

#### Step-by-Step Calculation
For `E1M2W3D` from `2024-01-15 10:00:00`:
1. **Base**: `2024-01-15 10:00:00`
2. **+1 Month End**: `2024-02-29 23:59:59` (February end)
3. **+2 Week End**: `2024-03-17 23:59:59` (2 weeks later, Sunday end)
4. **+3 Day End**: `2024-03-20 23:59:59` (3 days later, day end)

### 3. SOD (Start of Duration) Expressions

#### Philosophy
SOD expressions calculate the **start time** of time periods, complementing EOD functionality.

#### Format
```
S[YEARS]Y[MONTHS]M[WEEKS]W[DAYS]D[HOURS]H[MINUTES]M[SECONDS]S
```

#### 0-Based Logic Examples
```sql
'S0W'      -- This week start (current week's Monday 00:00:00)
'S1W'      -- Next week start (next week's Monday 00:00:00)
'S0M'      -- This month start (current month's 1st day 00:00:00)
'S1M'      -- Next month start (next month's 1st day 00:00:00)
'S0D'      -- Today start (today 00:00:00)
'S1D'      -- Tomorrow start (tomorrow 00:00:00)
```

#### Sequential Processing Examples
```sql
'S1M1W'    -- Base → +1 Month Start → +1 Week Start
'S0W2D'    -- Base → This Week Start → +2 Day Start
'S0M1W3D'  -- Base → This Month Start → +1 Week Start → +3 Day Start
```

#### EOD vs SOD Comparison
```sql
-- For reference time: 2024-01-15 10:00:00 (Monday)

'E0W'  →  2024-01-21 23:59:59  -- This week END (Sunday)
'S0W'  →  2024-01-15 00:00:00  -- This week START (Monday)

'E0M'  →  2024-01-31 23:59:59  -- This month END (31st)
'S0M'  →  2024-01-01 00:00:00  -- This month START (1st)

'E0D'  →  2024-01-15 23:59:59  -- Today END
'S0D'  →  2024-01-15 00:00:00  -- Today START
```

### 4. L (Last) Syntax

#### Philosophy
L syntax provides business-friendly "last occurrence" patterns commonly needed in scheduling.

#### Patterns
```sql
'L'        -- Last day of month
'NL'       -- Last occurrence of weekday N (0=Sun, 1=Mon, ..., 6=Sat)
'L-N'      -- N days before last day of month
```

#### Examples
```sql
'0 0 17 L * *'       -- Last day of month at 17:00
'0 0 9 * * 5L'       -- Last Friday of month at 09:00
'0 0 12 L-5 * *'     -- 5 days before month end at 12:00
'0 30 14 * * 1L'     -- Last Monday of month at 14:30
```

#### Business Use Cases
- **Payroll**: Last Friday processing
- **Reports**: Month-end reports on last day
- **Deadlines**: Reminders before month end

### 5. # (Nth Occurrence) Syntax

#### Philosophy
# syntax enables precise "Nth occurrence" scheduling for regular business patterns.

#### Patterns
```sql
'N#M'      -- Mth occurrence of weekday N in month
```

#### Examples
```sql
'0 0 9 * * 2#1'      -- 1st Tuesday of month at 09:00
'0 30 14 * * 5#3'    -- 3rd Friday of month at 14:30
'0 0 10 * * 1#2'     -- 2nd Monday of month at 10:00
'0 0 15 * * 4#4'     -- 4th Thursday of month at 15:00
```

#### Business Use Cases
- **Meetings**: Monthly team meetings on 1st Monday
- **Reviews**: Quarterly reviews on 3rd Thursday
- **Planning**: Sprint planning on 2nd Friday

### 6. Hybrid Expressions

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

#### Examples
```sql
'* * 3 * * * E1W'           -- Hour 3 reference → 1 week end
'0 0 9 * * MON E0M'         -- Monday 09:00 reference → this month end
'0 30 14 * * 5L E1W'        -- Last Friday 14:30 → next week end
'0 0 12 15 * * E0Q'         -- 15th day noon → this quarter end
'0 0 0 1 * * S1M'           -- 1st day midnight → next month start
```

#### Processing Logic
For `'0 0 9 * * MON E0M'`:
1. Find next Monday at 09:00 (cron reference)
2. From that Monday, calculate this month end (EOD calculation)
3. Return the calculated end time

#### Advanced Hybrid Examples
```sql
-- Complex business scenarios
'0 0 9 * * 1#1 E0Q'         -- 1st Monday 09:00 → quarter end
'0 30 17 * * 5L S1W'        -- Last Friday 17:30 → next week start
'0 0 12 L-3 * * E0M'        -- 3 days before month end noon → month end
```

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
```sql
-- Days
E0D = Today end
E1D = Tomorrow end
E7D = 7 days from now end

-- Weeks  
E0W = This week end (current Sunday)
E1W = Next week end (next Sunday)
E4W = 4 weeks from now end

-- Months
E0M = This month end (current month last day)
E1M = Next month end (next month last day)
E12M = 12 months from now end (1 year later)
```

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
```sql
E0W2D     -- NULL NULL 0 2 = Week + Day calculation only
E1M0W     -- NULL 1 0 NULL = Month calculation, then current week
E2D       -- NULL NULL NULL 2 = Day calculation only
```

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

## Unified API Design

### 1. Auto-Detection Logic

#### Detection Order
1. **Hybrid Check**: Look for both cron and EOD/SOD patterns
2. **EOD/SOD Check**: Look for `^[ES][0-9]` pattern
3. **Timezone Check**: Look for `TZ:` pattern in expression
4. **WOY Check**: Look for `WOY:` pattern in expression
5. **L/# Check**: Look for `[L#]` characters in cron fields
6. **Traditional Cron**: Default fallback

#### Implementation Flow
```sql
FUNCTION next_time(expression):
    parsed = parse_hybrid(expression)
    IF parsed.is_hybrid THEN
        RETURN next_time_hybrid(expression)
    END IF
    
    IF expression MATCHES '^[ES][0-9]' THEN
        RETURN next_end_of_time(expression)
    END IF
    
    -- Traditional cron processing
    RETURN traditional_cron_next_time(expression)
END
```

### 2. Function Consistency

#### Universal Functions
All expression types work through these functions:
- `jcron.next_time(expression)`: Find next occurrence
- `jcron.prev_time(expression)`: Find previous occurrence  
- `jcron.is_time_match(expression, time)`: Check if time matches
- `jcron.parse_expression(expression)`: Parse any expression type

#### Error Handling
- Consistent error messages across all syntax types
- Graceful handling of invalid expressions
- Clear error descriptions for debugging

### 3. Performance Optimization

#### Smart Routing
Each syntax type uses optimized processing:
- **Traditional Cron**: Bitmask operations
- **WOY Syntax**: Week number indexing and ISO 8601 calculations
- **Timezone Syntax**: IANA timezone database lookups and offset calculations
- **EOD/SOD**: Direct mathematical calculations
- **L/# Syntax**: Special calendar functions
- **Hybrid**: Combined processing with caching

#### Caching Strategy
- Parse results can be cached for frequently used expressions
- Mathematical calculations use efficient algorithms
- Database queries optimized for each syntax type

---

## Advanced Features

### 1. Timezone Support

#### Implementation
All expressions respect timezone settings:
```sql
SELECT jcron.next_time('0 0 9 * * *', NOW(), 'America/New_York');
SELECT jcron.next_time('E0W', NOW(), 'Europe/London');
```

#### Timezone Handling
- **EOD/SOD**: End/start times calculated in specified timezone
- **Cron**: Time matching done in specified timezone
- **Hybrid**: Both components respect timezone setting

### 2. Complex Sequential Calculations

#### Multi-Unit EOD
```sql
'E2Y1M3W2D1H30M15S'  -- 2 years + 1 month + 3 weeks + 2 days + 1 hour + 30 minutes + 15 seconds
```

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
```sql
'E0M31D'  -- Month end + 31 days (handles different month lengths)
```

#### Leap Year Support
```sql
'E0Y'     -- Year end (handles leap years correctly)
```

#### Weekend Handling
```sql
'E0W'     -- Always finds Sunday end, regardless of start day
```

### 4. Validation and Constraints

#### Expression Validation
- Syntax validation before processing
- Range validation for all time components
- Logical validation (e.g., no negative values)

#### Constraint Examples
```sql
-- Valid
'E0W', 'E1M2D', '0 30 14 * * *'

-- Invalid  
'E-1W'      -- Negative values not allowed
'E1X'       -- Invalid unit 'X'
'60 * * * * *' -- Invalid minute (>59)
```

---

## Real-World Applications

### 1. Business Scheduling Scenarios

#### Financial Operations
```sql
-- Month-end closing
'0 0 23 L * *'           -- Last day of month at 23:00

-- Quarterly reports  
'0 0 9 L * * E0Q'        -- Last day → quarter end calculation

-- Payroll processing
'0 0 6 * * 5L'           -- Last Friday at 06:00
```

#### IT Operations
```sql
-- Weekly backups
'0 0 2 * * SUN E1W'      -- Sunday 02:00 → next week end window

-- Monthly maintenance
'0 0 3 1 * *'            -- 1st of month at 03:00

-- Quarterly patching
'0 0 4 * */3 SAT#1'      -- 1st Saturday of quarter at 04:00
```

#### Human Resources
```sql
-- Monthly all-hands
'0 30 10 * * 1#1'        -- 1st Monday at 10:30

-- Performance reviews
'0 0 14 * */6 3#3'       -- 3rd Wednesday, every 6 months at 14:00

-- Training sessions
'0 0 9 * * 5#2'          -- 2nd Friday at 09:00
```

### 2. Complex Business Rules

#### Multi-Stage Processing
```sql
-- Project deadline: 2nd Friday + 2 weeks for review
'0 0 17 * * 5#2 E2W'

-- Budget planning: Last day of quarter - 1 week (conceptual)
'0 0 9 L * * E0Q S-1W'

-- Contract renewal: 1st Monday + month end - 5 days (conceptual)
'0 0 10 * * 1#1 E0M-5D'
```

#### Conditional Logic (Future Enhancement)
```sql
-- IF last Friday THEN week end ELSE month end
'IF(5L) E1W ELSE E0M'    -- Conceptual future syntax
```

### 3. Integration Patterns

#### Database Integration
```sql
-- Job scheduling table
CREATE TABLE scheduled_jobs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    expression TEXT NOT NULL,  -- Any JCRON expression type
    next_run TIMESTAMPTZ,
    enabled BOOLEAN DEFAULT true
);

-- Update next run times
UPDATE scheduled_jobs 
SET next_run = jcron.next_time(expression, NOW())
WHERE enabled = true;
```

#### Application Integration
```python
# Python example
import psycopg2

def schedule_job(expression, job_name):
    """Schedule a job using any JCRON expression type"""
    sql = """
        INSERT INTO scheduled_jobs (name, expression, next_run)
        VALUES (%s, %s, jcron.next_time(%s))
    """
    cursor.execute(sql, (job_name, expression, expression))
```

---

## Performance & Optimization

### 1. Computational Complexity

#### Expression Types by Performance
1. **Traditional Cron**: O(1) bitmask operations (fastest)
2. **WOY Syntax**: O(1) week number calculations (very fast)
3. **Timezone Syntax**: O(1) timezone conversion (very fast)
4. **Simple EOD**: O(1) mathematical calculations (very fast)  
5. **Sequential EOD**: O(n) where n = number of units (fast)
6. **L/# Syntax**: O(d) where d = days in month (moderate)
7. **Hybrid**: O(cron + eod) combined complexity (moderate)

#### Optimization Strategies
- **Caching**: Parse results for frequently used expressions
- **Indexing**: Database indexes on next_run columns
- **Batch Processing**: Update multiple jobs in single transaction

### 2. Memory Usage

#### Expression Storage
- Parsed expressions can be cached in memory
- JSON representation for complex expressions
- Minimal memory footprint for simple expressions

#### Processing Memory
- Stateless functions require minimal working memory
- No large data structures needed
- Efficient timestamp calculations

### 3. Scalability Considerations

#### Database Scaling
```sql
-- Partitioning by next_run date
CREATE TABLE scheduled_jobs_2024_01 PARTITION OF scheduled_jobs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for performance  
CREATE INDEX idx_jobs_next_run ON scheduled_jobs (next_run) 
WHERE enabled = true;
```

#### Application Scaling
- Stateless design enables horizontal scaling
- No shared state between function calls
- Thread-safe operations

### 4. Monitoring & Debugging

#### Performance Monitoring
```sql
-- Execution time tracking
SELECT 
    expression,
    AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_ms
FROM performance_log 
GROUP BY expression;
```

#### Debug Helpers
```sql
-- Expression analysis
SELECT 
    expression,
    jcron.parse_expression(expression) as parsed_result,
    jcron.next_time(expression, NOW()) as next_occurrence;
```

---

## Future Enhancements

### 1. Advanced Hybrid Expressions

#### Multiple EOD in Single Expression
```sql
'0 0 9 * * * E1W E0M'    -- Hour 9 → week end AND month end
```

#### Conditional Logic
```sql
'IF(MON) E1W ELSE E0M'   -- If Monday then week end, else month end
```

### 2. Named Patterns
```sql
'@monthly_end'           -- Predefined pattern for month end
'@payroll_friday'        -- Business-specific pattern
'@quarter_close'         -- Financial quarter patterns
```

### 3. Duration Calculations
```sql
'DURATION(E0W, E1M)'     -- Calculate duration between expressions
```

### 4. Business Calendar Integration
```sql
'E0W SKIP_HOLIDAYS'      -- Skip holidays in calculations
'BUSINESS_DAYS(5)'       -- 5 business days from now
```

---

## Quick Reference

### Syntax Cheat Sheet

#### Traditional Cron
```sql
'0 30 14 * * *'          -- Daily 14:30
'0 0 9 * * MON'          -- Monday 09:00
'0 */10 9-17 * * 1-5'    -- Every 10min, 9-17h, weekdays
```

#### WOY (Week of Year)
```sql
'0 0 9 * * MON WOY:1'    -- Monday 09:00 on first week
'0 30 14 * * * WOY:*/2'  -- Daily 14:30 every 2nd week
'0 0 12 * * FRI WOY:1-13' -- Friday noon during Q1
'0 15 16 * * * WOY:26,52' -- Daily 16:15 on weeks 26,52
```

#### TZ (Timezone)
```sql
'0 0 9 * * * TZ:UTC'           -- Daily 09:00 UTC
'0 30 14 * * MON TZ:America/New_York' -- Monday 14:30 ET
'E0W TZ:Europe/London'         -- Week end London time
'0 0 12 * * * WOY:*/2 TZ:+03:00' -- Bi-weekly noon UTC+3
```

#### EOD/SOD
```sql
'E0W'                    -- This week end
'E1M2D'                  -- Next month + 2 days end
'S0D'                    -- Today start
'S1W'                    -- Next week start
```

#### L/# Syntax
```sql
'0 0 17 L * *'           -- Last day of month 17:00
'0 0 9 * * 5L'           -- Last Friday 09:00
'0 30 14 * * 2#1'        -- 1st Tuesday 14:30
'0 0 10 * * 5#3'         -- 3rd Friday 10:00
```

#### Hybrid
```sql
'0 0 9 * * MON E0M'      -- Monday 09:00 → month end
'* * 3 * * * E1W'        -- Hour 3 → next week end
'0 0 17 * * 5L E1W'      -- Last Friday 17:00 → next week end
```

### Function Reference
```sql
-- Universal functions for all syntax types
jcron.next_time(expression, from_time?, timezone?)
jcron.prev_time(expression, from_time?, timezone?)
jcron.is_time_match(expression, check_time, tolerance?)
jcron.parse_expression(expression)
```

---

## Conclusion

JCRON represents a paradigm shift in scheduling systems by:

1. **Unifying** multiple expression types under a single API
2. **Providing** mathematical consistency with 0-based indexing  
3. **Enabling** complex time calculations through sequential processing
4. **Supporting** real-world business scheduling needs
5. **Maintaining** high performance across all expression types

The system bridges the gap between traditional cron scheduling and modern business requirements, providing developers with a powerful, intuitive, and comprehensive scheduling solution.

Whether you need simple daily schedules or complex multi-stage time calculations, JCRON provides the tools to express your scheduling needs naturally and efficiently.

---

**JCRON v1.0** - *Unified Scheduling for the Modern Era*

*Documentation Version: 1.0*  
*Last Updated: August 2024*