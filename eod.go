// eod.go - End of Duration functionality for JCron
package jcron

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ReferencePoint defines where the duration is measured from/to
type ReferencePoint int

const (
	ReferenceStart   ReferencePoint = iota // S - Start reference
	ReferenceEnd                           // E - End reference
	ReferenceDay                           // D - End of day
	ReferenceWeek                          // W - End of week
	ReferenceMonth                         // M - End of month
	ReferenceQuarter                       // Q - End of quarter
	ReferenceYear                          // Y - End of year
)

// String returns the string representation of ReferencePoint
func (r ReferencePoint) String() string {
	switch r {
	case ReferenceStart:
		return "START"
	case ReferenceEnd:
		return "END"
	case ReferenceDay:
		return "DAY"
	case ReferenceWeek:
		return "WEEK"
	case ReferenceMonth:
		return "MONTH"
	case ReferenceQuarter:
		return "QUARTER"
	case ReferenceYear:
		return "YEAR"
	default:
		return "UNKNOWN"
	}
}

// EndOfDuration represents a duration specification for schedule termination
type EndOfDuration struct {
	Years           int
	Months          int
	Weeks           int
	Days            int
	Hours           int
	Minutes         int
	Seconds         int
	ReferencePoint  ReferencePoint
	EventIdentifier *string // For event-based termination like E[project_deadline]
	IsSOD           bool    // true for Start of Duration (S), false for End of Duration (E)
}

// NewEndOfDuration creates a new EndOfDuration instance
func NewEndOfDuration(years, months, weeks, days, hours, minutes, seconds int, ref ReferencePoint) *EndOfDuration {
	return &EndOfDuration{
		Years:          years,
		Months:         months,
		Weeks:          weeks,
		Days:           days,
		Hours:          hours,
		Minutes:        minutes,
		Seconds:        seconds,
		ReferencePoint: ref,
	}
}

// HasDuration returns true if any duration component is set
func (eod *EndOfDuration) HasDuration() bool {
	return eod.Years > 0 || eod.Months > 0 || eod.Weeks > 0 || eod.Days > 0 ||
		eod.Hours > 0 || eod.Minutes > 0 || eod.Seconds > 0
}

// ToMilliseconds converts the duration to milliseconds (approximate for non-time components)
func (eod *EndOfDuration) ToMilliseconds() int64 {
	var ms int64
	ms += int64(eod.Seconds) * 1000
	ms += int64(eod.Minutes) * 60 * 1000
	ms += int64(eod.Hours) * 60 * 60 * 1000
	ms += int64(eod.Days) * 24 * 60 * 60 * 1000
	ms += int64(eod.Weeks) * 7 * 24 * 60 * 60 * 1000
	// Approximate values for months and years
	ms += int64(eod.Months) * 30 * 24 * 60 * 60 * 1000
	ms += int64(eod.Years) * 365 * 24 * 60 * 60 * 1000
	return ms
}

// String returns the EOD string representation (e.g., "E2DT4H", "S30m")
func (eod *EndOfDuration) String() string {
	if eod == nil {
		return ""
	}

	var parts []string

	// Add reference point prefix
	switch eod.ReferencePoint {
	case ReferenceStart:
		parts = append(parts, "S")
	case ReferenceEnd:
		parts = append(parts, "E")
	default:
		parts = append(parts, "E") // Default to End
	}

	// Build duration string
	var duration []string

	if eod.Years > 0 {
		duration = append(duration, fmt.Sprintf("%dY", eod.Years))
	}
	if eod.Months > 0 {
		duration = append(duration, fmt.Sprintf("%dM", eod.Months))
	}
	if eod.Weeks > 0 {
		duration = append(duration, fmt.Sprintf("%dW", eod.Weeks))
	}
	if eod.Days > 0 {
		duration = append(duration, fmt.Sprintf("%dD", eod.Days))
	}

	// Time part with T separator if needed
	var timePart []string
	if eod.Hours > 0 {
		timePart = append(timePart, fmt.Sprintf("%dH", eod.Hours))
	}
	if eod.Minutes > 0 {
		timePart = append(timePart, fmt.Sprintf("%dM", eod.Minutes))
	}
	if eod.Seconds > 0 {
		timePart = append(timePart, fmt.Sprintf("%dS", eod.Seconds))
	}

	if len(timePart) > 0 {
		if len(duration) > 0 {
			duration = append(duration, "T")
		}
		duration = append(duration, timePart...)
	}

	parts = append(parts, strings.Join(duration, ""))

	result := strings.Join(parts, "")

	// Add reference point suffix if applicable
	switch eod.ReferencePoint {
	case ReferenceDay:
		result += " D"
	case ReferenceWeek:
		result += " W"
	case ReferenceMonth:
		result += " M"
	case ReferenceQuarter:
		result += " Q"
	case ReferenceYear:
		result += " Y"
	}

	// Add event identifier if present
	if eod.EventIdentifier != nil {
		result += fmt.Sprintf(" E[%s]", *eod.EventIdentifier)
	}

	return result
}

// CalculateEndDate calculates the end date based on the EOD/SOD configuration
// JCRON 0-based indexing: E0W = end of this week, E1W = end of next week
// SOD (Start of Duration): S0W = start of this week, S1W = start of next week
func (eod *EndOfDuration) CalculateEndDate(fromDate time.Time) time.Time {
	if eod == nil {
		return fromDate
	}

	result := fromDate

	// Handle simple duration additions for START/END reference points
	if eod.ReferencePoint == ReferenceStart || eod.ReferencePoint == ReferenceEnd {
		// Traditional duration addition
		if eod.Years > 0 {
			result = result.AddDate(eod.Years, 0, 0)
		}
		if eod.Months > 0 {
			result = result.AddDate(0, eod.Months, 0)
		}
		if eod.Weeks > 0 {
			result = result.AddDate(0, 0, eod.Weeks*7)
		}
		if eod.Days > 0 {
			result = result.AddDate(0, 0, eod.Days)
		}

		// Add time components
		duration := time.Duration(eod.Hours)*time.Hour +
			time.Duration(eod.Minutes)*time.Minute +
			time.Duration(eod.Seconds)*time.Second

		result = result.Add(duration)
		return result
	}

	// Handle special reference points with JCRON 0-based indexing
	switch eod.ReferencePoint {
	case ReferenceDay:
		// E0D = end of current day, E1D = end of next day, etc.
		// Always add days (0-based indexing: 0 = current, 1 = next)
		result = result.AddDate(0, 0, eod.Days)
		if eod.IsSOD {
			// SOD: Start of day
			result = time.Date(result.Year(), result.Month(), result.Day(), 0, 0, 0, 0, result.Location())
		} else {
			// EOD: End of day
			result = time.Date(result.Year(), result.Month(), result.Day(), 23, 59, 59, 999999999, result.Location())
		}
	case ReferenceWeek:
		// E0W = end of current week, E1W = end of next week, etc.
		// Always add weeks (0-based indexing: 0 = current, 1 = next)
		result = result.AddDate(0, 0, eod.Weeks*7)
		if eod.IsSOD {
			// SOD: Start of week (Monday 00:00:00)
			daysFromMonday := int(result.Weekday()) - 1
			if daysFromMonday < 0 {
				daysFromMonday = 6 // Sunday case
			}
			result = result.AddDate(0, 0, -daysFromMonday)
			result = time.Date(result.Year(), result.Month(), result.Day(), 0, 0, 0, 0, result.Location())
		} else {
			// EOD: End of week (Sunday 23:59:59)
			daysUntilSunday := (7 - int(result.Weekday())) % 7
			if result.Weekday() == time.Sunday {
				daysUntilSunday = 0 // Already Sunday
			}
			result = result.AddDate(0, 0, daysUntilSunday)
			result = time.Date(result.Year(), result.Month(), result.Day(), 23, 59, 59, 999999999, result.Location())
		}
	case ReferenceMonth:
		// E0M = end of current month, E1M = end of next month, etc.
		// Always add months (0-based indexing: 0 = current, 1 = next)
		result = result.AddDate(0, eod.Months, 0)
		if eod.IsSOD {
			// SOD: Start of month (1st day 00:00:00)
			result = time.Date(result.Year(), result.Month(), 1, 0, 0, 0, 0, result.Location())
		} else {
			// EOD: End of month (last day 23:59:59)
			nextMonth := result.AddDate(0, 1, 0)
			firstOfNextMonth := time.Date(nextMonth.Year(), nextMonth.Month(), 1, 0, 0, 0, 0, result.Location())
			result = firstOfNextMonth.Add(-time.Nanosecond)
		}
	case ReferenceQuarter:
		// E0Q = end of current quarter, E1Q = end of next quarter, etc.
		currentQuarter := ((int(result.Month()) - 1) / 3)
		targetQuarter := currentQuarter + eod.Months // 0-based: add directly
		if eod.IsSOD {
			// SOD: Start of quarter
			quarterStartMonth := targetQuarter*3 + 1
			result = time.Date(result.Year(), time.Month(quarterStartMonth), 1, 0, 0, 0, 0, result.Location())
		} else {
			// EOD: End of quarter
			quarterEndMonth := (targetQuarter + 1) * 3
			result = time.Date(result.Year(), time.Month(quarterEndMonth), 1, 0, 0, 0, 0, result.Location())
			result = result.AddDate(0, 1, 0).Add(-time.Nanosecond)
		}
	case ReferenceYear:
		// E0Y = end of current year, E1Y = end of next year, etc.
		// Always add years (0-based indexing: 0 = current, 1 = next)
		result = result.AddDate(eod.Years, 0, 0)
		if eod.IsSOD {
			// SOD: Start of year (Jan 1 00:00:00)
			result = time.Date(result.Year(), 1, 1, 0, 0, 0, 0, result.Location())
		} else {
			// EOD: End of year (Dec 31 23:59:59)
			result = time.Date(result.Year(), 12, 31, 23, 59, 59, 999999999, result.Location())
		}
	}

	return result
}

// ParseEOD parses EOD/SOD expressions according to JCRON_SYNTAX.md specification
// Supports 0-based indexing: E0W = this week end, E1M = next month end
// Examples:
//   - "E0W" - End of this week (0-based)
//   - "E1M" - End of next month (0-based)
//   - "S0W" - Start of this week (0-based)
//   - "E1M2W" - Sequential: next month end + 2 weeks end
func ParseEOD(expression string) (*EndOfDuration, error) {
	if expression == "" {
		return nil, fmt.Errorf("empty EOD expression")
	}

	expression = strings.TrimSpace(strings.ToUpper(expression))

	// Determine if it's SOD (Start) or EOD (End)
	isSOD := strings.HasPrefix(expression, "S")
	if !isSOD && !strings.HasPrefix(expression, "E") {
		return nil, fmt.Errorf("EOD expression must start with 'E' or 'S', got: %s", expression)
	}

	// Remove the S/E prefix
	expr := expression[1:]

	// Parse complex expressions like "1M2W" (sequential processing)
	eod, err := parseComplexEOD(expr, isSOD)
	if err != nil {
		return nil, fmt.Errorf("parse EOD expression %s: %w", expression, err)
	}

	return eod, nil
}

// parseComplexEOD parses complex EOD expressions with multiple units
func parseComplexEOD(expr string, isSOD bool) (*EndOfDuration, error) {
	// Regex to match duration patterns: (\d+)([YMWDHMS])
	re := regexp.MustCompile(`(\d+)([YMWDHMS])`)
	matches := re.FindAllStringSubmatch(expr, -1)

	if len(matches) == 0 {
		return nil, fmt.Errorf("no valid duration units found in: %s", expr)
	}

	eod := &EndOfDuration{}

	// Determine reference point based on the primary unit (first or most significant)
	primaryUnit := matches[0][2] // First unit letter
	eod.ReferencePoint = getJCronReferencePoint(primaryUnit, isSOD)

	// Parse all duration components
	for _, match := range matches {
		valueStr := match[1]
		unit := match[2]

		value, err := strconv.Atoi(valueStr)
		if err != nil {
			return nil, fmt.Errorf("invalid number %s: %w", valueStr, err)
		}

		switch unit {
		case "Y":
			eod.Years = value
		case "M":
			eod.Months = value
		case "W":
			eod.Weeks = value
		case "D":
			eod.Days = value
		case "H":
			eod.Hours = value
		case "m": // lowercase m for minutes
			eod.Minutes = value
		case "S":
			eod.Seconds = value
		default:
			return nil, fmt.Errorf("unknown time unit: %s", unit)
		}
	}

	// Mark as SOD if needed
	if isSOD {
		eod.IsSOD = true
	}

	return eod, nil
}

// getJCronReferencePoint determines reference point for JCRON 0-based indexing
func getJCronReferencePoint(unit string, isSOD bool) ReferencePoint {
	switch unit {
	case "Y":
		return ReferenceYear
	case "M":
		return ReferenceMonth
	case "W":
		return ReferenceWeek
	case "D":
		return ReferenceDay
	default:
		// For H, m, S - use generic start/end reference
		if isSOD {
			return ReferenceStart
		}
		return ReferenceEnd
	}
}

// JCRON String representation for EOD/SOD (0-based indexing)
func (eod *EndOfDuration) ToJCronString() string {
	if eod == nil {
		return ""
	}

	var builder strings.Builder

	// Determine S or E prefix based on reference point
	isSOD := eod.ReferencePoint == ReferenceStart
	if isSOD {
		builder.WriteString("S")
	} else {
		builder.WriteString("E")
	}

	// Add duration components in standard order
	if eod.Years > 0 {
		builder.WriteString(fmt.Sprintf("%dY", eod.Years))
	}
	if eod.Months > 0 {
		builder.WriteString(fmt.Sprintf("%dM", eod.Months))
	}
	if eod.Weeks > 0 {
		builder.WriteString(fmt.Sprintf("%dW", eod.Weeks))
	}
	if eod.Days > 0 {
		builder.WriteString(fmt.Sprintf("%dD", eod.Days))
	}
	if eod.Hours > 0 {
		builder.WriteString(fmt.Sprintf("%dH", eod.Hours))
	}
	if eod.Minutes > 0 {
		builder.WriteString(fmt.Sprintf("%dm", eod.Minutes))
	}
	if eod.Seconds > 0 {
		builder.WriteString(fmt.Sprintf("%dS", eod.Seconds))
	}

	result := builder.String()

	// If no duration components, default to simple form
	if len(result) == 1 { // Only S or E
		switch eod.ReferencePoint {
		case ReferenceWeek:
			result += "0W"
		case ReferenceMonth:
			result += "0M"
		case ReferenceDay:
			result += "0D"
		case ReferenceYear:
			result += "0Y"
		default:
			result += "0D" // Default to day
		}
	}

	return result
}

// EoDHelpers provides convenience functions for common EOD patterns
type EoDHelpers struct{}

// EndOfDay creates an EOD that runs until end of day
func (EoDHelpers) EndOfDay(hours, minutes, seconds int) *EndOfDuration {
	return &EndOfDuration{
		Hours:          hours,
		Minutes:        minutes,
		Seconds:        seconds,
		ReferencePoint: ReferenceDay,
	}
}

// EndOfWeek creates an EOD that runs until end of week
func (EoDHelpers) EndOfWeek(days, hours, minutes int) *EndOfDuration {
	return &EndOfDuration{
		Days:           days,
		Hours:          hours,
		Minutes:        minutes,
		ReferencePoint: ReferenceWeek,
	}
}

// EndOfMonth creates an EOD that runs until end of month
func (EoDHelpers) EndOfMonth(days, hours, minutes int) *EndOfDuration {
	return &EndOfDuration{
		Days:           days,
		Hours:          hours,
		Minutes:        minutes,
		ReferencePoint: ReferenceMonth,
	}
}

// UntilEvent creates an EOD that runs until a specific event
func (EoDHelpers) UntilEvent(eventName string, hours, minutes, seconds int) *EndOfDuration {
	return &EndOfDuration{
		Hours:           hours,
		Minutes:         minutes,
		Seconds:         seconds,
		ReferencePoint:  ReferenceEnd,
		EventIdentifier: &eventName,
	}
}

// Global EODHelpers instance
var EODHelpers = EoDHelpers{}

// IsValidEoD checks if an EOD string is valid
func IsValidEoD(eodStr string) bool {
	_, err := ParseEOD(eodStr)
	return err == nil
}
