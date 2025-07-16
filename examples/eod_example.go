// example_eod.go - Example usage of End of Duration functionality
package examples

import (
	"fmt"
	"log"
	"time"

	"github.com/meftunca/jcron"
)

func RunEoDExamples() {
	fmt.Println("=== JCron End of Duration (EOD) Examples ===\n")

	// Example 1: Basic EOD with cron syntax
	fmt.Println("1. Basic EOD Usage:")
	schedule1, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Schedule: %s\n", schedule1.ToJCronString())
	fmt.Printf("Has EOD: %t\n", schedule1.HasEOD())

	if schedule1.HasEOD() {
		endTime := schedule1.EndOfFromNow()
		fmt.Printf("Current session ends at: %s\n", endTime.Format("2006-01-02 15:04:05"))
	}
	fmt.Println()

	// Example 2: Using JCron format with multiple extensions
	fmt.Println("2. JCron Format with Multiple Extensions:")
	schedule2, err := jcron.FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Schedule: %s\n", schedule2.ToJCronString())
	fmt.Printf("Week of Year: %s\n", getStringValue(schedule2.WeekOfYear))
	fmt.Printf("Timezone: %s\n", getStringValue(schedule2.Timezone))
	fmt.Printf("EOD: %s\n", schedule2.EOD.String())
	fmt.Println()

	// Example 3: Using EOD helpers
	fmt.Println("3. EOD Helpers:")

	// End of day helper
	eodDay := jcron.EODHelpers.EndOfDay(2, 30, 0) // 2h 30m until end of day
	fmt.Printf("End of Day EoD: %s\n", eodDay.String())

	// End of month helper
	eodMonth := jcron.EODHelpers.EndOfMonth(5, 0, 0) // 5 days until end of month
	fmt.Printf("End of Month EoD: %s\n", eodMonth.String())

	// End of quarter helper
	eodQuarter := jcron.EODHelpers.EndOfQuarter(0, 10, 0) // 10 days until end of quarter
	fmt.Printf("End of Quarter EoD: %s\n", eodQuarter.String())

	// Until event helper
	eodEvent := jcron.EODHelpers.UntilEvent("project_deadline", 4, 0, 0) // 4 hours until event
	fmt.Printf("Until Event EoD: %s\n", eodEvent.String())
	fmt.Println()

	// Example 4: Schedule with helper-created EOD
	fmt.Println("4. Schedule with Helper EOD:")
	schedule3 := jcron.Schedule{
		Second:     stringPtr("0"),
		Minute:     stringPtr("0"),
		Hour:       stringPtr("9"),
		DayOfMonth: stringPtr("*"),
		Month:      stringPtr("*"),
		DayOfWeek:  stringPtr("MON-FRI"),
		EOD:        eodMonth,
	}

	fmt.Printf("Schedule: %s\n", schedule3.ToJCronString())

	testDate := time.Date(2024, 7, 15, 9, 0, 0, 0, time.UTC)
	endDate := schedule3.EndOf(testDate)
	fmt.Printf("From %s, ends at: %s\n", testDate.Format("2006-01-02 15:04:05"), endDate.Format("2006-01-02 15:04:05"))
	fmt.Println()

	// Example 5: Parsing and validation
	fmt.Println("5. EOD Parsing and Validation:")

	testEoDs := []string{
		"E8H",              // 8 hours
		"S30M",             // 30 minutes from start
		"E2DT4H",           // 2 days 4 hours
		"E1DT12H M",        // 1 day 12 hours until end of month
		"E30M E[deadline]", // 30 minutes until deadline event
		"INVALID",          // Invalid format
	}

	for _, eodStr := range testEoDs {
		if jcron.IsValidEoD(eodStr) {
			eod, _ := jcron.ParseEoD(eodStr)
			fmt.Printf("✓ %s -> %s (has duration: %t)\n", eodStr, eod.String(), eod.HasDuration())
		} else {
			fmt.Printf("✗ %s -> Invalid format\n", eodStr)
		}
	}
	fmt.Println()

	// Example 6: Complex scheduling scenario
	fmt.Println("6. Complex Scheduling Scenario:")

	// Daily standup meetings for 8 hours each day during first half of year
	dailyStandup, err := jcron.FromJCronString("0 30 9 * * MON-FRI WOY:1-26 EOD:E8H")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Daily Standup: %s\n", dailyStandup.ToJCronString())

	// Calculate when next standup session ends
	engine := jcron.New()
	nextRun, err := engine.Next(*dailyStandup, time.Now())
	if err != nil {
		log.Printf("Error calculating next run: %v", err)
	} else {
		sessionEnd := dailyStandup.EndOf(nextRun)
		fmt.Printf("Next standup: %s\n", nextRun.Format("2006-01-02 15:04:05"))
		fmt.Printf("Session ends: %s\n", sessionEnd.Format("2006-01-02 15:04:05"))
		fmt.Printf("Session duration: %s\n", sessionEnd.Sub(nextRun).String())
	}
	fmt.Println()

	// Example 7: End date calculations
	fmt.Println("7. End Date Calculations:")

	now := time.Now()

	// Various EOD patterns and their calculations
	patterns := []struct {
		name string
		eod  *jcron.EndOfDuration
	}{
		{"8 hours from now", jcron.NewEndOfDuration(0, 0, 0, 0, 8, 0, 0, jcron.ReferenceEnd)},
		{"End of today", jcron.NewEndOfDuration(0, 0, 0, 0, 0, 0, 0, jcron.ReferenceDay)},
		{"End of this week", jcron.NewEndOfDuration(0, 0, 0, 0, 0, 0, 0, jcron.ReferenceWeek)},
		{"End of this month", jcron.NewEndOfDuration(0, 0, 0, 0, 0, 0, 0, jcron.ReferenceMonth)},
		{"End of this quarter", jcron.NewEndOfDuration(0, 0, 0, 0, 0, 0, 0, jcron.ReferenceQuarter)},
	}

	for _, p := range patterns {
		endDate := p.eod.CalculateEndDate(now)
		duration := endDate.Sub(now)
		fmt.Printf("%-20s: %s (in %s)\n", p.name, endDate.Format("2006-01-02 15:04:05"), duration.Round(time.Minute))
	}

	fmt.Println("\n=== EOD Integration Complete ===")
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func stringPtr(s string) *string {
	return &s
}
