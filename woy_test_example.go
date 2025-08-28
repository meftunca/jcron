package jcron

import (
	"testing"
	"time"
)

func TestWOYSupport(t *testing.T) {
	testCases := []struct {
		name         string
		expression   string
		fromTime     string
		expectedWeek int // Expected ISO week number
	}{
		{
			name:         "WOY:1 - First week of year",
			expression:   "0 0 9 * * * WOY:1",
			fromTime:     "2024-01-15T08:00:00Z", // Week 3 of 2024
			expectedWeek: 1,                      // Should find week 1 of 2025
		},
		{
			name:         "WOY:26 - Mid year (week 26)",
			expression:   "0 0 12 * * * WOY:26",
			fromTime:     "2024-01-15T08:00:00Z", // Week 3 of 2024
			expectedWeek: 26,                     // Should find week 26 of 2024
		},
		{
			name:         "WOY:4 - Early year week",
			expression:   "0 0 9 * * * WOY:4",
			fromTime:     "2024-01-15T08:00:00Z", // Week 3 of 2024
			expectedWeek: 4,                      // Should find week 4 of 2024
		},
		{
			name:         "WOY:52 - End of year",
			expression:   "0 0 9 * * * WOY:52",
			fromTime:     "2024-01-15T08:00:00Z", // Week 3 of 2024
			expectedWeek: 52,                     // Should find week 52 of 2024
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fromTime, err := time.Parse(time.RFC3339, tc.fromTime)
			if err != nil {
				t.Fatalf("Failed to parse fromTime: %v", err)
			}

			result, err := NextTime(tc.expression, fromTime)
			if err != nil {
				t.Fatalf("NextTime failed: %v", err)
			}

			// Get ISO week info
			year, week := result.ISOWeek()
			fromYear, fromWeek := fromTime.ISOWeek()

			t.Logf("Expression: %s", tc.expression)
			t.Logf("From: %s (ISO Week %d of %d)", fromTime.Format("2006-01-02"), fromWeek, fromYear)
			t.Logf("Next: %s (ISO Week %d of %d)", result.Format("2006-01-02 15:04:05"), week, year)

			// Verify the week matches expectation
			if week != tc.expectedWeek {
				t.Errorf("Expected week %d, got week %d", tc.expectedWeek, week)
			}

			// Verify result is after fromTime
			if !result.After(fromTime) {
				t.Errorf("Result time %v should be after fromTime %v", result, fromTime)
			}
		})
	}
}

func TestWOYRangeSupport2(t *testing.T) {
	testCases := []struct {
		name       string
		expression string
		fromTime   string
		validWeeks []int // Expected valid weeks
	}{
		{
			name:       "WOY:1-4 - First month weeks",
			expression: "0 0 9 * * * WOY:1-4",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3 of 2024
			validWeeks: []int{1, 2, 3, 4},
		},
		{
			name:       "WOY:1,13,26,39,52 - Quarterly weeks",
			expression: "0 0 9 * * * WOY:1,13,26,39,52",
			fromTime:   "2024-01-15T08:00:00Z", // Week 3 of 2024
			validWeeks: []int{1, 13, 26, 39, 52},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fromTime, err := time.Parse(time.RFC3339, tc.fromTime)
			if err != nil {
				t.Fatalf("Failed to parse fromTime: %v", err)
			}

			result, err := NextTime(tc.expression, fromTime)
			if err != nil {
				t.Fatalf("NextTime failed: %v", err)
			}

			// Get ISO week info
			year, week := result.ISOWeek()
			fromYear, fromWeek := fromTime.ISOWeek()

			t.Logf("Expression: %s", tc.expression)
			t.Logf("From: %s (ISO Week %d of %d)", fromTime.Format("2006-01-02"), fromWeek, fromYear)
			t.Logf("Next: %s (ISO Week %d of %d)", result.Format("2006-01-02 15:04:05"), week, year)

			// Check if the result week is in valid weeks
			isValid := false
			for _, validWeek := range tc.validWeeks {
				if week == validWeek {
					isValid = true
					break
				}
			}

			if !isValid {
				t.Errorf("Result week %d is not in valid weeks %v", week, tc.validWeeks)
			}

			// Verify result is after fromTime
			if !result.After(fromTime) {
				t.Errorf("Result time %v should be after fromTime %v", result, fromTime)
			}
		})
	}
}
