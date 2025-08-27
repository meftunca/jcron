package main

import (
	"fmt"
	"time"

	"github.com/maple-tech/baseline/jcron"
)

func main() {
	fmt.Println("=== WOY (Week of Year) Test ===")

	// Test cases for WOY functionality
	testCases := []struct {
		name       string
		expression string
		fromTime   string
	}{
		{
			name:       "WOY:1 - First week of year",
			expression: "0 0 9 * * * WOY:1",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3
		},
		{
			name:       "WOY:26 - Mid year (week 26)",
			expression: "0 0 12 * * * WOY:26",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3
		},
		{
			name:       "WOY:1-4 - First month weeks",
			expression: "0 0 9 * * * WOY:1-4",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3
		},
		{
			name:       "WOY:1,13,26,39,52 - Quarterly",
			expression: "0 0 9 * * * WOY:1,13,26,39,52",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3
		},
	}

	for _, tc := range testCases {
		fmt.Printf("\n--- %s ---\n", tc.name)

		fromTime, err := time.Parse(time.RFC3339, tc.fromTime)
		if err != nil {
			fmt.Printf("❌ Parse error: %v\n", err)
			continue
		}

		result, err := jcron.NextTime(tc.expression, fromTime)
		if err != nil {
			fmt.Printf("❌ NextTime error: %v\n", err)
			continue
		}

		// Get ISO week info
		year, week := result.ISOWeek()
		fromYear, fromWeek := fromTime.ISOWeek()

		fmt.Printf("Expression: %s\n", tc.expression)
		fmt.Printf("From: %s (ISO Week %d of %d)\n", fromTime.Format("2006-01-02"), fromWeek, fromYear)
		fmt.Printf("Next: %s (ISO Week %d of %d)\n", result.Format("2006-01-02 15:04:05"), week, year)
		fmt.Printf("✅ Success\n")
	}
}
