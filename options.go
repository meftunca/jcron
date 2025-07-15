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
	parts := strings.Fields(cronString)
	var s Schedule
	switch len(parts) {
	case 7:
		// 7-field: second minute hour day month weekday weekofyear
		s = Schedule{
			Second: &parts[0], Minute: &parts[1], Hour: &parts[2],
			DayOfMonth: &parts[3], Month: &parts[4], DayOfWeek: &parts[5],
			WeekOfYear: &parts[6],
		}
	case 6:
		// 6-field: second minute hour day month weekday (traditional with seconds)
		s = Schedule{
			Second: &parts[0], Minute: &parts[1], Hour: &parts[2],
			DayOfMonth: &parts[3], Month: &parts[4], DayOfWeek: &parts[5],
		}
	case 5:
		// 5-field: minute hour day month weekday (traditional cron)
		s = Schedule{
			Second: strPtr("0"), Minute: &parts[0], Hour: &parts[1],
			DayOfMonth: &parts[2], Month: &parts[3], DayOfWeek: &parts[4],
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
