// eod_example.go - Example usage of End of Duration functionality
package main

import (
	"fmt"
	"time"
)

// Import would be: "github.com/meftunca/jcron"
// For now we'll show the usage without actual imports

func main() {
	fmt.Println("=== JCron End of Duration (EOD) Examples ===\n")

	fmt.Println("This example shows how to use JCron's End of Duration (EOD) feature.")
	fmt.Println("To run this code, you would import the jcron package and use the following patterns:\n")

	// Example patterns and explanations
	examples := []struct {
		name        string
		pattern     string
		description string
	}{
		{
			name:        "Basic EOD with cron syntax",
			pattern:     `schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")`,
			description: "Weekdays at 9 AM, each session runs for 8 hours",
		},
		{
			name:        "JCron format with multiple extensions",
			pattern:     `schedule, err := jcron.FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M")`,
			description: "Weekdays at 2:30 PM, first half of year, UTC timezone, 45 minutes duration",
		},
		{
			name:        "Using EOD helpers",
			pattern:     `eod := jcron.EODHelpers.EndOfMonth(5, 0, 0)`,
			description: "Create EOD that runs until 5 days before end of month",
		},
		{
			name:        "Calculate end date",
			pattern:     `endTime := schedule.EndOf(time.Now())`,
			description: "Calculate when the current schedule session will end",
		},
		{
			name:        "Parse EOD string",
			pattern:     `eod, err := jcron.ParseEoD("E2DT4H M")`,
			description: "Parse '2 days 4 hours until end of month' EOD specification",
		},
		{
			name:        "Validate EOD format",
			pattern:     `isValid := jcron.IsValidEoD("E8H")`,
			description: "Check if EOD string is valid format",
		},
	}

	for i, example := range examples {
		fmt.Printf("%d. %s:\n", i+1, example.name)
		fmt.Printf("   Code: %s\n", example.pattern)
		fmt.Printf("   Description: %s\n\n", example.description)
	}

	fmt.Println("EOD Format Reference:")
	fmt.Println("  E8H        - End + 8 hours")
	fmt.Println("  S30M       - Start + 30 minutes")
	fmt.Println("  E2DT4H     - End + 2 days 4 hours")
	fmt.Println("  E1DT12H M  - End + 1 day 12 hours until end of Month")
	fmt.Println("  E30M E[event] - End + 30 minutes until event completion")
	fmt.Println()

	fmt.Println("Reference Points:")
	fmt.Println("  D - End of Day")
	fmt.Println("  W - End of Week")
	fmt.Println("  M - End of Month")
	fmt.Println("  Q - End of Quarter")
	fmt.Println("  Y - End of Year")
	fmt.Println()

	fmt.Println("Integration with Go:")
	fmt.Println("1. Add EOD field to Schedule struct")
	fmt.Println("2. Parse EOD from cron strings with 'EOD:' prefix")
	fmt.Println("3. Use Schedule.EndOf() method to calculate termination dates")
	fmt.Println("4. Use EODHelpers for common patterns")
	fmt.Println("5. Validate EOD strings with IsValidEoD()")

	currentTime := time.Now()
	fmt.Printf("\nCurrent time: %s\n", currentTime.Format("2006-01-02 15:04:05"))

	// Simulate some calculations without actual imports
	fmt.Println("\nSimulated EOD calculations:")
	fmt.Printf("  8 hours from now: %s\n", currentTime.Add(8*time.Hour).Format("2006-01-02 15:04:05"))
	fmt.Printf("  End of today: %s\n", getEndOfDay(currentTime).Format("2006-01-02 15:04:05"))
	fmt.Printf("  End of this month: %s\n", getEndOfMonth(currentTime).Format("2006-01-02 15:04:05"))

	fmt.Println("\n=== EOD Integration Guide Complete ===")
}

func getEndOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
}

func getEndOfMonth(t time.Time) time.Time {
	nextMonth := t.AddDate(0, 1, 0)
	firstOfNextMonth := time.Date(nextMonth.Year(), nextMonth.Month(), 1, 0, 0, 0, 0, t.Location())
	return firstOfNextMonth.Add(-time.Nanosecond)
}
