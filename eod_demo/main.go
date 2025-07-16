// EOD Demo - JCron End of Duration Feature Demonstration
package main

import (
	"fmt"
	"strings"
)

// Note: This is a demonstration file showing how to use JCron EOD features
// In actual usage, you would import "github.com/meftunca/jcron"

func main() {
	fmt.Println("🚀 JCron End of Duration (EOD) - Feature Demo")
	fmt.Println(strings.Repeat("=", 50))

	// Demo scenarios
	showBasicEODConcepts()
	showEODFormats()
	showUsagePatterns()
	showValidationExamples()
	showRealWorldScenarios()
}

func showBasicEODConcepts() {
	fmt.Println("\n📅 1. Basic EOD Concepts")
	fmt.Println(strings.Repeat("-", 30))

	fmt.Println("EOD (End of Duration) adds duration information to cron schedules:")
	fmt.Println()

	examples := []struct {
		cron        string
		description string
		usage       string
	}{
		{
			cron:        `schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")`,
			description: "Weekdays 9 AM, each session runs for 8 hours",
			usage:       "Standard work hours",
		},
		{
			cron:        `schedule, err := jcron.FromCronSyntax("0 14 * * 1 EOD:E1HT30M")`,
			description: "Monday 2 PM, session runs for 1 hour 30 minutes",
			usage:       "Weekly team meeting",
		},
		{
			cron:        `schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:D")`,
			description: "Weekdays 9 AM, session runs until end of day",
			usage:       "All-day availability",
		},
	}

	for i, example := range examples {
		fmt.Printf("Example %d: %s\n", i+1, example.description)
		fmt.Printf("Code: %s\n", example.cron)
		fmt.Printf("Use case: %s\n", example.usage)
		fmt.Println()
	}
}

func showEODFormats() {
	fmt.Println("\n🔧 2. EOD Format Reference")
	fmt.Println(strings.Repeat("-", 30))

	fmt.Println("Basic Formats:")
	basicFormats := []struct {
		format string
		desc   string
		usage  string
	}{
		{"E8H", "End + 8 hours", "Standard work day"},
		{"S30M", "Start + 30 minutes", "Short meeting"},
		{"E2D", "End + 2 days", "Multi-day project"},
		{"D", "Until end of day", "Daily tasks"},
		{"W", "Until end of week", "Weekly goals"},
		{"M", "Until end of month", "Monthly reports"},
	}

	for _, format := range basicFormats {
		fmt.Printf("%-8s - %-20s (%s)\n", format.format, format.desc, format.usage)
	}

	fmt.Println("\nComplex Formats (ISO 8601-like):")
	complexFormats := []struct {
		format string
		desc   string
	}{
		{"E2DT4H", "End + 2 days 4 hours"},
		{"E1Y6M", "End + 1 year 6 months"},
		{"S3WT2D", "Start + 3 weeks 2 days"},
		{"E1DT12H30M", "End + 1 day 12 hours 30 minutes"},
	}

	for _, format := range complexFormats {
		fmt.Printf("%-12s - %s\n", format.format, format.desc)
	}

	fmt.Println("\nReference Point Formats:")
	refFormats := []struct {
		ref  string
		desc string
		calc string
	}{
		{"D", "Day", "Until 23:59:59 of current day"},
		{"W", "Week", "Until Sunday 23:59:59"},
		{"M", "Month", "Until last day of month 23:59:59"},
		{"Q", "Quarter", "Until last day of quarter 23:59:59"},
		{"Y", "Year", "Until December 31 23:59:59"},
	}

	for _, ref := range refFormats {
		fmt.Printf("%-3s - %-10s (%s)\n", ref.ref, ref.desc, ref.calc)
	}
}

func showUsagePatterns() {
	fmt.Println("\n� 3. Usage Patterns")
	fmt.Println(strings.Repeat("-", 30))

	patterns := []struct {
		title   string
		code    string
		explain string
	}{
		{
			title: "Basic Parsing",
			code: `schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")
if err != nil {
    log.Fatal(err)
}`,
			explain: "Parse cron syntax with EOD extension",
		},
		{
			title:   "JCron Extended Format",
			code:    `schedule, err := jcron.FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M")`,
			explain: "Multiple extensions: Week of Year, Timezone, EOD",
		},
		{
			title: "EOD Validation",
			code: `if jcron.IsValidEoD("E8H") {
    fmt.Println("Valid EOD format")
}`,
			explain: "Validate EOD format before use",
		},
		{
			title: "Helper Functions",
			code: `eod := jcron.EODHelpers.EndOfMonth(5, 0, 0) // 5 days before month end
schedule := &jcron.Schedule{
    Hour: jcron.StrPtr("9"),
    DayOfWeek: jcron.StrPtr("MON-FRI"),
    EOD: eod,
}`,
			explain: "Use helpers for common patterns",
		},
		{
			title: "End Time Calculation",
			code: `if schedule.HasEOD() {
    endTime := schedule.EndOf(time.Now())
    fmt.Printf("Session ends: %s\n", endTime.Format("15:04:05"))
}`,
			explain: "Calculate when session will end",
		},
	}

	for i, pattern := range patterns {
		fmt.Printf("%d. %s\n", i+1, pattern.title)
		fmt.Printf("   %s\n", pattern.explain)
		fmt.Printf("   Code:\n")
		for _, line := range strings.Split(pattern.code, "\n") {
			fmt.Printf("   %s\n", line)
		}
		fmt.Println()
	}
}

func showValidationExamples() {
	fmt.Println("\n✅ 4. Validation Examples")
	fmt.Println(strings.Repeat("-", 30))

	validFormats := []string{
		"E8H", "S30M", "E2DT4H", "D", "M", "Q", "Y",
		"E1Y6M3DT4H30M", "E30M E[event_name]",
	}

	invalidFormats := []string{
		"X8H", "E25H", "E60M", "INVALID", "", "E", "8H",
	}

	fmt.Println("✅ Valid EOD Formats:")
	for _, format := range validFormats {
		fmt.Printf("   %s\n", format)
	}

	fmt.Println("\n❌ Invalid EOD Formats:")
	for _, format := range invalidFormats {
		if format == "" {
			fmt.Printf("   (empty string)\n")
		} else {
			fmt.Printf("   %s\n", format)
		}
	}

	fmt.Println("\nValidation Code Examples:")
	fmt.Println(`   // Basic validation
   isValid := jcron.IsValidEoD("E8H")  // returns true
   
   // Parse and validate
   eod, err := jcron.ParseEoD("E2DT4H")
   if err != nil {
       fmt.Printf("Parse error: %v\n", err)
   } else {
       fmt.Printf("Parsed successfully: %s\n", eod.String())
   }`)
}

func showRealWorldScenarios() {
	fmt.Println("\n🌍 5. Real-World Scenarios")
	fmt.Println(strings.Repeat("-", 30))

	scenarios := []struct {
		name        string
		cron        string
		eod         string
		description string
		duration    string
	}{
		{
			name:        "Office Hours",
			cron:        "0 9 * * 1-5",
			eod:         "EOD:E8H",
			description: "Standard 9-to-5 office work schedule",
			duration:    "8 hours per day",
		},
		{
			name:        "Night Backup",
			cron:        "0 2 * * *",
			eod:         "EOD:E4H",
			description: "Daily backup process at 2 AM",
			duration:    "4 hours",
		},
		{
			name:        "Weekly Team Meeting",
			cron:        "0 14 * * 1",
			eod:         "EOD:E1HT30M",
			description: "Monday afternoon team sync",
			duration:    "1.5 hours",
		},
		{
			name:        "Monthly Report",
			cron:        "0 9 1 * *",
			eod:         "EOD:M",
			description: "Monthly report generation starting 1st of month",
			duration:    "Until end of month",
		},
		{
			name:        "Quarterly Review",
			cron:        "0 9 1 1,4,7,10 *",
			eod:         "EOD:E2W",
			description: "Quarterly business review process",
			duration:    "2 weeks",
		},
		{
			name:        "Development Sprint",
			cron:        "0 9 * * 1-5",
			eod:         "EOD:E2W",
			description: "2-week development sprint",
			duration:    "2 weeks (weekdays only)",
		},
		{
			name:        "Event Preparation",
			cron:        "*/30 9-17 * * 1-5",
			eod:         "EOD:E4H E[event_start]",
			description: "Event prep until 4h before event starts",
			duration:    "Until event - 4 hours",
		},
	}

	fmt.Printf("%-20s %-15s %-35s %s\n", "Scenario", "Duration", "Description", "Full Cron + EOD")
	fmt.Println(strings.Repeat("-", 100))

	for _, scenario := range scenarios {
		fullCron := scenario.cron + " " + scenario.eod
		fmt.Printf("%-20s %-15s %-35s %s\n",
			scenario.name,
			scenario.duration,
			scenario.description,
			fullCron)
	}

	fmt.Println("\nExample Usage:")
	fmt.Println(`   // Office hours example
   schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")
   if err == nil && schedule.HasEOD() {
       // Calculate work end time
       workStart := time.Date(2024, 7, 16, 9, 0, 0, 0, time.UTC)
       workEnd := schedule.EndOf(workStart)
       fmt.Printf("Work ends at: %s\n", workEnd.Format("15:04"))
       // Output: Work ends at: 17:00
   }`)
}

func demonstrateTimeCalculations() {
	fmt.Println("\n⏰ Time Calculation Examples")
	fmt.Println(strings.Repeat("-", 30))

	// Example time calculations (simulated)
	examples := []struct {
		eodFormat string
		startTime string
		endTime   string
		explain   string
	}{
		{
			eodFormat: "E8H",
			startTime: "09:00:00",
			endTime:   "17:00:00",
			explain:   "8-hour work day",
		},
		{
			eodFormat: "E2DT4H",
			startTime: "2024-07-16 09:00:00",
			endTime:   "2024-07-18 13:00:00",
			explain:   "2 days 4 hours project",
		},
		{
			eodFormat: "D",
			startTime: "09:00:00",
			endTime:   "23:59:59",
			explain:   "Until end of day",
		},
	}

	fmt.Printf("%-10s %-20s %-20s %s\n", "EOD", "Start Time", "End Time", "Description")
	fmt.Println(strings.Repeat("-", 70))

	for _, example := range examples {
		fmt.Printf("%-10s %-20s %-20s %s\n",
			example.eodFormat,
			example.startTime,
			example.endTime,
			example.explain)
	}
}
