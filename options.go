// options.go (Yeni Dosya)
package jcron

import (
	"fmt"
	"strings"
	"time"
)

// RetryOptions, bir görev başarısız olduğunda yeniden deneme davranışını belirler.
type RetryOptions struct {
	MaxRetries int           // Maksimum yeniden deneme sayısı. 0 ise yeniden denenmez.
	Delay      time.Duration // Her deneme arasındaki bekleme süresi.
}

// JobOption, bir göreve eklenen her türlü ayar için kullanılan fonksiyon tipidir.
// "Functional Options Pattern" olarak bilinir.
type JobOption func(*managedJob)

// WithRetries, bir göreve yeniden deneme yeteneği kazandıran bir JobOption'dır.
func WithRetries(maxRetries int, delay time.Duration) JobOption {
	return func(job *managedJob) {
		job.retryOpts = RetryOptions{
			MaxRetries: maxRetries,
			Delay:      delay,
		}
	}
}
func strPtr(s string) *string { return &s }

func FromCronSyntax(cronString string) (Schedule, error) {
	if strings.ToLower(cronString) == "@reboot" {
		return Schedule{Year: &cronString}, nil
	}
	if spec, ok := predefinedSchedules[cronString]; ok {
		cronString = spec
	}

	// Check for EOD extension
	var eodStr string
	var eod *EndOfDuration

	// Parse EOD if present (format: "cron_expression EOD:eod_spec")
	if strings.Contains(cronString, "EOD:") {
		eodIndex := strings.Index(cronString, "EOD:")
		eodStr = strings.TrimSpace(cronString[eodIndex+4:])
		cronString = strings.TrimSpace(cronString[:eodIndex])

		var err error
		eod, err = ParseEoD(eodStr)
		if err != nil {
			return Schedule{}, fmt.Errorf("invalid EOD format '%s': %w", eodStr, err)
		}
	}

	parts := strings.Fields(cronString)
	var s Schedule
	switch len(parts) {
	case 7:
		// 7-field: second minute hour day month weekday weekofyear
		s = Schedule{
			Second: &parts[0], Minute: &parts[1], Hour: &parts[2],
			DayOfMonth: &parts[3], Month: &parts[4], DayOfWeek: &parts[5],
			WeekOfYear: &parts[6], EOD: eod,
		}
	case 6:
		// 6-field: second minute hour day month weekday (traditional with seconds)
		s = Schedule{
			Second: &parts[0], Minute: &parts[1], Hour: &parts[2],
			DayOfMonth: &parts[3], Month: &parts[4], DayOfWeek: &parts[5],
			EOD: eod,
		}
	case 5:
		// 5-field: minute hour day month weekday (traditional cron)
		s = Schedule{
			Second: strPtr("0"), Minute: &parts[0], Hour: &parts[1],
			DayOfMonth: &parts[2], Month: &parts[3], DayOfWeek: &parts[4],
			EOD: eod,
		}
	default:
		return Schedule{}, fmt.Errorf("invalid cron format: expected 5, 6, or 7 fields, got %d", len(parts))
	}
	return s, nil
}

// WithWeekOfYear creates a new schedule with the specified week of year constraint
func WithWeekOfYear(schedule Schedule, weekOfYear string) Schedule {
	newSchedule := schedule
	newSchedule.WeekOfYear = strPtr(weekOfYear)
	return newSchedule
}

// FromCronWithWeekOfYear parses a standard cron string and adds week of year constraint
func FromCronWithWeekOfYear(cronString, weekOfYear string) (Schedule, error) {
	schedule, err := FromCronSyntax(cronString)
	if err != nil {
		return schedule, err
	}
	schedule.WeekOfYear = strPtr(weekOfYear)
	return schedule, nil
}

// Some predefined week patterns for convenience
var (
	FirstWeek     = "1"  // First week of year
	LastWeek      = "53" // Last possible week of year
	EvenWeeks     = "2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52"
	OddWeeks      = "1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53"
	FirstQuarter  = "1-13"  // Weeks 1-13 (roughly first quarter)
	SecondQuarter = "14-26" // Weeks 14-26 (roughly second quarter)
	ThirdQuarter  = "27-39" // Weeks 27-39 (roughly third quarter)
	FourthQuarter = "40-53" // Weeks 40-53 (roughly fourth quarter)
)

// ToJCronString converts Schedule to JCron extended format with EOD support
func (s *Schedule) ToJCronString() string {
	parts := []string{}

	// Add cron fields
	if s.Second != nil {
		parts = append(parts, *s.Second)
	} else {
		parts = append(parts, "*")
	}
	if s.Minute != nil {
		parts = append(parts, *s.Minute)
	} else {
		parts = append(parts, "*")
	}
	if s.Hour != nil {
		parts = append(parts, *s.Hour)
	} else {
		parts = append(parts, "*")
	}
	if s.DayOfMonth != nil {
		parts = append(parts, *s.DayOfMonth)
	} else {
		parts = append(parts, "*")
	}
	if s.Month != nil {
		parts = append(parts, *s.Month)
	} else {
		parts = append(parts, "*")
	}
	if s.DayOfWeek != nil {
		parts = append(parts, *s.DayOfWeek)
	} else {
		parts = append(parts, "*")
	}

	// Add optional year
	if s.Year != nil && *s.Year != "" {
		parts = append(parts, *s.Year)
	}

	result := strings.Join(parts, " ")

	// Add extensions
	if s.WeekOfYear != nil && *s.WeekOfYear != "" {
		result += " WOY:" + *s.WeekOfYear
	}
	if s.Timezone != nil && *s.Timezone != "" {
		result += " TZ:" + *s.Timezone
	}
	if s.EOD != nil {
		result += " EOD:" + s.EOD.String()
	}

	return result
}

// FromJCronString parses JCron extended format with EOD support
// Format: "s m h D M dow [Y] [WOY:woy] [TZ:tz] [EOD:eod]"
func FromJCronString(jcronString string) (Schedule, error) {
	parts := strings.Fields(jcronString)
	if len(parts) == 0 {
		return Schedule{}, fmt.Errorf("empty JCron string")
	}

	var cronParts []string
	var woy, tz, eodStr string

	// Parse parts and extract extensions
	for _, part := range parts {
		if strings.HasPrefix(part, "WOY:") {
			woy = part[4:]
		} else if strings.HasPrefix(part, "TZ:") {
			tz = part[3:]
		} else if strings.HasPrefix(part, "EOD:") {
			eodStr = part[4:]
		} else {
			cronParts = append(cronParts, part)
		}
	}

	// Validate cron part count
	if len(cronParts) < 5 || len(cronParts) > 7 {
		return Schedule{}, fmt.Errorf("invalid JCron format: 5, 6, or 7 cron fields expected, but %d found", len(cronParts))
	}

	// Add seconds if missing (5-field format)
	if len(cronParts) == 5 {
		cronParts = append([]string{"0"}, cronParts...)
	}

	// Create schedule
	var s Schedule
	s.Second = &cronParts[0]
	s.Minute = &cronParts[1]
	s.Hour = &cronParts[2]
	s.DayOfMonth = &cronParts[3]
	s.Month = &cronParts[4]
	s.DayOfWeek = &cronParts[5]

	if len(cronParts) > 6 {
		s.Year = &cronParts[6]
	}

	if woy != "" {
		s.WeekOfYear = &woy
	}
	if tz != "" {
		s.Timezone = &tz
	}

	// Parse EOD if present
	if eodStr != "" {
		eod, err := ParseEoD(eodStr)
		if err != nil {
			return Schedule{}, fmt.Errorf("invalid EOD format '%s': %w", eodStr, err)
		}
		s.EOD = eod
	}

	return s, nil
}

// CalculateEndOfDuration convenience function to calculate end date for any schedule
func CalculateEndOfDuration(schedule Schedule, fromDate time.Time) time.Time {
	return schedule.EndOf(fromDate)
}

// CalculateEndOfDurationFromNow convenience function to calculate end date from current time
func CalculateEndOfDurationFromNow(schedule Schedule) time.Time {
	return schedule.EndOfFromNow()
}
