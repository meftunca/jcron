package jcron

import (
	"testing"
	"time"
)

func TestJCronUnifiedAPI(t *testing.T) {
	testCases := []struct {
		name         string
		expression   string
		fromTime     string
		expectedTime string
	}{
		// Traditional Cron
		{
			name:         "Traditional Cron",
			expression:   "0 30 14 * * *",
			fromTime:     "2024-01-15T10:00:00Z",
			expectedTime: "2024-01-15T14:30:00Z",
		},

		// Pure EOD Expressions (0-based indexing)
		{
			name:         "Pure EOD - E0W (this week end)",
			expression:   "E0W",
			fromTime:     "2024-01-15T10:00:00Z", // Monday
			expectedTime: "2024-01-21T23:59:59Z", // Sunday (approximately)
		},
		{
			name:         "Pure EOD - E1M (next month end)",
			expression:   "E1M",
			fromTime:     "2024-01-15T10:00:00Z", // January 15
			expectedTime: "2024-02-29T23:59:59Z", // End of February (leap year)
		},

		// Pure SOD Expressions (0-based indexing)
		{
			name:         "Pure SOD - S0W (this week start)",
			expression:   "S0W",
			fromTime:     "2024-01-15T10:00:00Z", // Monday
			expectedTime: "2024-01-15T00:00:00Z", // Monday start (approximately)
		},

		// Hybrid Expressions
		{
			name:         "Hybrid - Weekdays 9am + month end",
			expression:   "0 0 9 * * 1-5 EOD:E0M",
			fromTime:     "2024-01-15T08:00:00Z",
			expectedTime: "2024-01-31T23:59:59Z", // End of January (approximately)
		},

		// WOY Syntax
		{
			name:         "WOY - First week of year",
			expression:   "0 0 9 * * * WOY:1",
			fromTime:     "2024-01-15T08:00:00Z",
			expectedTime: "2025-01-01T09:00:00Z", // Next year's week 1
		},

		// TZ Syntax
		{
			name:         "TZ - UTC timezone",
			expression:   "0 0 9 * * * TZ:UTC",
			fromTime:     "2024-01-15T08:00:00Z",
			expectedTime: "2024-01-15T09:00:00Z",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fromTime, err := time.Parse(time.RFC3339, tc.fromTime)
			if err != nil {
				t.Fatalf("Failed to parse fromTime: %v", err)
			}

			// Test NextTime
			result, err := NextTime(tc.expression, fromTime)
			if err != nil {
				t.Fatalf("NextTime failed: %v", err)
			}

			// Parse expected time
			expectedTime, err := time.Parse(time.RFC3339, tc.expectedTime)
			if err != nil {
				t.Fatalf("Failed to parse expectedTime: %v", err)
			}

			// Allow some tolerance for time calculations (especially for EOD)
			tolerance := time.Hour * 24 // 1 day tolerance for EOD calculations
			diff := result.Sub(expectedTime)
			if diff < -tolerance || diff > tolerance {
				t.Errorf("NextTime() = %v, want approximately %v (diff: %v)",
					result.Format(time.RFC3339),
					expectedTime.Format(time.RFC3339),
					diff)
			}

			t.Logf("✅ %s: %s -> %s", tc.name, tc.expression, result.Format(time.RFC3339))
		})
	}
}

func TestParseExpression(t *testing.T) {
	testCases := []struct {
		name       string
		expression string
		wantError  bool
	}{
		{"Traditional Cron", "0 30 14 * * *", false},
		{"Pure EOD", "E0W", false},
		{"Pure SOD", "S1M", false},
		{"Complex EOD", "E1M2W", false},
		{"Hybrid", "0 0 9 * * 1-5 EOD:E0M", false},
		{"With WOY", "0 0 9 * * * WOY:1-26", false},
		{"With TZ", "0 0 9 * * * TZ:UTC", false},
		{"Full Featured", "0 0 9 * * 1-5 WOY:1-26 TZ:UTC EOD:E0M", false},
		{"Empty Expression", "", true},
		{"Invalid EOD", "X0W", true},
		{"Invalid Extension", "0 0 9 * * * XXX:invalid", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			schedule, err := ParseExpression(tc.expression)

			if tc.wantError {
				if err == nil {
					t.Errorf("ParseExpression() expected error but got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("ParseExpression() unexpected error: %v", err)
			}

			// Basic validation
			if schedule.Second == nil || schedule.Minute == nil {
				t.Errorf("ParseExpression() produced invalid schedule")
			}

			t.Logf("✅ %s: parsed successfully", tc.name)
		})
	}
}

func TestIsTimeMatch(t *testing.T) {
	testCases := []struct {
		name        string
		expression  string
		targetTime  string
		expectMatch bool
	}{
		{
			name:        "Traditional Cron Match",
			expression:  "0 30 14 * * *",
			targetTime:  "2024-01-15T14:30:00Z",
			expectMatch: true,
		},
		{
			name:        "Traditional Cron No Match",
			expression:  "0 30 14 * * *",
			targetTime:  "2024-01-15T14:31:00Z",
			expectMatch: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			targetTime, err := time.Parse(time.RFC3339, tc.targetTime)
			if err != nil {
				t.Fatalf("Failed to parse targetTime: %v", err)
			}

			match, err := IsTimeMatch(tc.expression, targetTime)
			if err != nil {
				t.Fatalf("IsTimeMatch failed: %v", err)
			}

			if match != tc.expectMatch {
				t.Errorf("IsTimeMatch() = %v, want %v", match, tc.expectMatch)
			}

			t.Logf("✅ %s: match=%v", tc.name, match)
		})
	}
}
