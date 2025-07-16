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

// CalculateEndDate calculates the end date based on the EOD configuration
func (eod *EndOfDuration) CalculateEndDate(fromDate time.Time) time.Time {
	if eod == nil {
		return fromDate
	}

	result := fromDate

	// Add duration components
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

	// Apply reference point adjustments
	switch eod.ReferencePoint {
	case ReferenceDay:
		// End of day
		result = time.Date(result.Year(), result.Month(), result.Day(), 23, 59, 59, 999999999, result.Location())
	case ReferenceWeek:
		// End of week (Sunday)
		daysUntilSunday := (7 - int(result.Weekday())) % 7
		if daysUntilSunday == 0 {
			daysUntilSunday = 7
		}
		result = result.AddDate(0, 0, daysUntilSunday)
		result = time.Date(result.Year(), result.Month(), result.Day(), 23, 59, 59, 999999999, result.Location())
	case ReferenceMonth:
		// End of month
		nextMonth := result.AddDate(0, 1, 0)
		firstOfNextMonth := time.Date(nextMonth.Year(), nextMonth.Month(), 1, 0, 0, 0, 0, result.Location())
		result = firstOfNextMonth.Add(-time.Nanosecond)
	case ReferenceQuarter:
		// End of quarter
		currentQuarter := ((int(result.Month()) - 1) / 3) + 1
		quarterEndMonth := currentQuarter * 3
		result = time.Date(result.Year(), time.Month(quarterEndMonth), 1, 0, 0, 0, 0, result.Location())
		result = result.AddDate(0, 1, 0).Add(-time.Nanosecond)
	case ReferenceYear:
		// End of year
		result = time.Date(result.Year(), 12, 31, 23, 59, 59, 999999999, result.Location())
	}

	return result
}

// parseEoDPattern parses EOD string patterns like "E8h", "S30m", "E2DT4H M"
var eodPattern = regexp.MustCompile(`^([SE])(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?(?:\s+([DWMQY]))?(?:\s+E\[([^\]]+)\])?$`)

// ParseEoD parses an EOD string and returns an EndOfDuration instance
func ParseEoD(eodStr string) (*EndOfDuration, error) {
	if eodStr == "" {
		return nil, fmt.Errorf("empty EOD string")
	}

	originalStr := strings.TrimSpace(eodStr)

	// Handle simple patterns like "E8H", "S30M" first
	simplePattern := regexp.MustCompile(`^([SE])(\d+)([YMWDHMS])$`)
	if matches := simplePattern.FindStringSubmatch(originalStr); matches != nil {
		eod := &EndOfDuration{}

		// Parse reference point (S or E)
		if matches[1] == "S" {
			eod.ReferencePoint = ReferenceStart
		} else {
			eod.ReferencePoint = ReferenceEnd
		}

		// Parse value
		value, err := strconv.Atoi(matches[2])
		if err != nil {
			return nil, fmt.Errorf("invalid duration value: %s", matches[2])
		}

		// Parse unit
		switch matches[3] {
		case "Y":
			eod.Years = value
		case "M":
			eod.Minutes = value // M after time component is minutes
		case "W":
			eod.Weeks = value
		case "D":
			eod.Days = value
		case "H":
			eod.Hours = value
		case "S":
			eod.Seconds = value
		default:
			return nil, fmt.Errorf("invalid time unit: %s", matches[3])
		}

		return eod, nil
	}

	// Handle patterns with event identifiers like "E30M E[event]"
	eventPattern := regexp.MustCompile(`^([SE]\d+[YMWDHMS])\s+E\[([^\]]+)\]$`)
	if matches := eventPattern.FindStringSubmatch(originalStr); matches != nil {
		// Parse the duration part first
		eod, err := ParseEoD(matches[1])
		if err != nil {
			return nil, err
		}
		// Add event identifier
		eod.EventIdentifier = &matches[2]
		return eod, nil
	}

	// Try complex pattern
	matches := eodPattern.FindStringSubmatch(originalStr)
	if matches == nil {
		return nil, fmt.Errorf("invalid EOD format: %s", eodStr)
	}

	eod := &EndOfDuration{}

	// Parse reference point (S or E)
	if matches[1] == "S" {
		eod.ReferencePoint = ReferenceStart
	} else {
		eod.ReferencePoint = ReferenceEnd
	}

	// Parse duration components
	var err error
	if matches[2] != "" {
		if eod.Years, err = strconv.Atoi(matches[2]); err != nil {
			return nil, fmt.Errorf("invalid years: %s", matches[2])
		}
	}
	if matches[3] != "" {
		if eod.Months, err = strconv.Atoi(matches[3]); err != nil {
			return nil, fmt.Errorf("invalid months: %s", matches[3])
		}
	}
	if matches[4] != "" {
		if eod.Weeks, err = strconv.Atoi(matches[4]); err != nil {
			return nil, fmt.Errorf("invalid weeks: %s", matches[4])
		}
	}
	if matches[5] != "" {
		if eod.Days, err = strconv.Atoi(matches[5]); err != nil {
			return nil, fmt.Errorf("invalid days: %s", matches[5])
		}
	}
	if matches[6] != "" {
		if eod.Hours, err = strconv.Atoi(matches[6]); err != nil {
			return nil, fmt.Errorf("invalid hours: %s", matches[6])
		}
	}
	if matches[7] != "" {
		if eod.Minutes, err = strconv.Atoi(matches[7]); err != nil {
			return nil, fmt.Errorf("invalid minutes: %s", matches[7])
		}
	}
	if matches[8] != "" {
		if eod.Seconds, err = strconv.Atoi(matches[8]); err != nil {
			return nil, fmt.Errorf("invalid seconds: %s", matches[8])
		}
	}

	// Parse reference point suffix
	if matches[9] != "" {
		switch matches[9] {
		case "D":
			eod.ReferencePoint = ReferenceDay
		case "W":
			eod.ReferencePoint = ReferenceWeek
		case "M":
			eod.ReferencePoint = ReferenceMonth
		case "Q":
			eod.ReferencePoint = ReferenceQuarter
		case "Y":
			eod.ReferencePoint = ReferenceYear
		}
	}

	// Parse event identifier
	if matches[10] != "" {
		eod.EventIdentifier = &matches[10]
	}

	// Validate that at least one duration component is set
	if !eod.HasDuration() && eod.EventIdentifier == nil {
		return nil, fmt.Errorf("EOD must specify at least one duration component or event identifier")
	}

	return eod, nil
}

// IsValidEoD checks if an EOD string is valid
func IsValidEoD(eodStr string) bool {
	_, err := ParseEoD(eodStr)
	return err == nil
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

// EndOfQuarter creates an EOD that runs until end of quarter
func (EoDHelpers) EndOfQuarter(days, hours, minutes int) *EndOfDuration {
	return &EndOfDuration{
		Days:           days,
		Hours:          hours,
		Minutes:        minutes,
		ReferencePoint: ReferenceQuarter,
	}
}

// EndOfYear creates an EOD that runs until end of year
func (EoDHelpers) EndOfYear(days, hours, minutes int) *EndOfDuration {
	return &EndOfDuration{
		Days:           days,
		Hours:          hours,
		Minutes:        minutes,
		ReferencePoint: ReferenceYear,
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

// Global EoDHelpers instance
var EODHelpers = EoDHelpers{}
