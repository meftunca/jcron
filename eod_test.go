// eod_test.go - Tests for End of Duration functionality
package jcron

import (
	"testing"
	"time"
)

func TestEndOfDuration_String(t *testing.T) {
	tests := []struct {
		name     string
		eod      *EndOfDuration
		expected string
	}{
		{
			name: "Simple duration with end reference",
			eod: &EndOfDuration{
				Hours:          8,
				ReferencePoint: ReferenceEnd,
			},
			expected: "E8H",
		},
		{
			name: "Start reference with minutes",
			eod: &EndOfDuration{
				Minutes:        30,
				ReferencePoint: ReferenceStart,
			},
			expected: "S30M",
		},
		{
			name: "Complex duration",
			eod: &EndOfDuration{
				Days:           2,
				Hours:          4,
				ReferencePoint: ReferenceEnd,
			},
			expected: "E2DT4H",
		},
		{
			name: "Until end of month",
			eod: &EndOfDuration{
				Days:           5,
				ReferencePoint: ReferenceMonth,
			},
			expected: "E5D M",
		},
		{
			name: "Until end of quarter",
			eod: &EndOfDuration{
				Hours:          10,
				ReferencePoint: ReferenceQuarter,
			},
			expected: "E10H Q",
		},
		{
			name: "With event identifier",
			eod: &EndOfDuration{
				Hours:           2,
				ReferencePoint:  ReferenceEnd,
				EventIdentifier: stringPtr("project_deadline"),
			},
			expected: "E2H E[project_deadline]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.eod.String()
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestParseEoD(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
		check   func(*EndOfDuration) bool
	}{
		{
			name:    "Simple end reference",
			input:   "E8H",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Hours == 8 && eod.ReferencePoint == ReferenceEnd
			},
		},
		{
			name:    "Start reference",
			input:   "S30M",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Minutes == 30 && eod.ReferencePoint == ReferenceStart
			},
		},
		{
			name:    "Complex duration",
			input:   "E1DT12H",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Days == 1 && eod.Hours == 12 && eod.ReferencePoint == ReferenceEnd
			},
		},
		{
			name:    "Until end of month",
			input:   "E2DT4H M",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Days == 2 && eod.Hours == 4 && eod.ReferencePoint == ReferenceMonth
			},
		},
		{
			name:    "Until end of quarter",
			input:   "E1Y6M Q",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Years == 1 && eod.Months == 6 && eod.ReferencePoint == ReferenceQuarter
			},
		},
		{
			name:    "With event identifier",
			input:   "E30M E[event_completion]",
			wantErr: false,
			check: func(eod *EndOfDuration) bool {
				return eod.Minutes == 30 && eod.EventIdentifier != nil && *eod.EventIdentifier == "event_completion"
			},
		},
		{
			name:    "Invalid format",
			input:   "INVALID",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "Empty string",
			input:   "",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "No duration components",
			input:   "E",
			wantErr: true,
			check:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ParseEoD(tt.input)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if tt.check != nil && !tt.check(result) {
				t.Errorf("Validation check failed for input: %s", tt.input)
			}
		})
	}
}

func TestIsValidEoD(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"E8H", true},
		{"S30M", true},
		{"E1DT12H", true},
		{"E2DT4H M", true},
		{"INVALID", false},
		{"", false},
		{"E25H", true}, // Valid syntax, even if 25 hours is unusual
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := IsValidEoD(tt.input)
			if result != tt.expected {
				t.Errorf("IsValidEoD(%s) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestEoDHelpers(t *testing.T) {
	t.Run("EndOfDay", func(t *testing.T) {
		eod := EODHelpers.EndOfDay(2, 30, 0)
		if eod.Hours != 2 || eod.Minutes != 30 || eod.ReferencePoint != ReferenceDay {
			t.Errorf("EndOfDay helper failed")
		}
	})

	t.Run("EndOfWeek", func(t *testing.T) {
		eod := EODHelpers.EndOfWeek(1, 12, 0)
		if eod.Days != 1 || eod.Hours != 12 || eod.ReferencePoint != ReferenceWeek {
			t.Errorf("EndOfWeek helper failed")
		}
	})

	t.Run("EndOfMonth", func(t *testing.T) {
		eod := EODHelpers.EndOfMonth(5, 0, 0)
		if eod.Days != 5 || eod.ReferencePoint != ReferenceMonth {
			t.Errorf("EndOfMonth helper failed")
		}
	})

	t.Run("UntilEvent", func(t *testing.T) {
		eod := EODHelpers.UntilEvent("project_deadline", 4, 0, 0)
		if eod.Hours != 4 || eod.EventIdentifier == nil || *eod.EventIdentifier != "project_deadline" {
			t.Errorf("UntilEvent helper failed")
		}
	})
}

func TestScheduleWithEOD(t *testing.T) {
	t.Run("FromCronSyntax with EOD", func(t *testing.T) {
		schedule, err := FromCronSyntax("0 9 * * 1-5 EOD:E8H")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if schedule.EOD == nil {
			t.Errorf("EOD should not be nil")
		}

		if schedule.EOD.Hours != 8 {
			t.Errorf("Expected 8 hours, got %d", schedule.EOD.Hours)
		}

		if schedule.EOD.ReferencePoint != ReferenceEnd {
			t.Errorf("Expected End reference point")
		}
	})

	t.Run("FromJCronString with EOD", func(t *testing.T) {
		schedule, err := FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E30M")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if schedule.EOD == nil || schedule.EOD.Minutes != 30 {
			t.Errorf("EOD parsing failed")
		}

		if *schedule.WeekOfYear != "1-26" {
			t.Errorf("WeekOfYear parsing failed")
		}

		if *schedule.Timezone != "UTC" {
			t.Errorf("Timezone parsing failed")
		}
	})

	t.Run("Schedule.EndOf", func(t *testing.T) {
		eod := &EndOfDuration{
			Hours:          2,
			ReferencePoint: ReferenceEnd,
		}
		schedule := Schedule{
			Second:     stringPtr("0"),
			Minute:     stringPtr("9"),
			Hour:       stringPtr("*"),
			DayOfMonth: stringPtr("*"),
			Month:      stringPtr("*"),
			DayOfWeek:  stringPtr("1-5"),
			EOD:        eod,
		}

		testTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
		endTime := schedule.EndOf(testTime)

		expectedEnd := testTime.Add(2 * time.Hour)
		if !endTime.Equal(expectedEnd) {
			t.Errorf("Expected %v, got %v", expectedEnd, endTime)
		}
	})

	t.Run("Schedule without EOD", func(t *testing.T) {
		schedule := Schedule{
			Second:     stringPtr("0"),
			Minute:     stringPtr("9"),
			Hour:       stringPtr("*"),
			DayOfMonth: stringPtr("*"),
			Month:      stringPtr("*"),
			DayOfWeek:  stringPtr("1-5"),
		}

		testTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
		endTime := schedule.EndOf(testTime)

		if !endTime.IsZero() {
			t.Errorf("Expected zero time for schedule without EOD")
		}

		if schedule.HasEOD() {
			t.Errorf("HasEOD should return false")
		}
	})

	t.Run("ToJCronString with EOD", func(t *testing.T) {
		eod := &EndOfDuration{
			Hours:          8,
			ReferencePoint: ReferenceEnd,
		}
		schedule := Schedule{
			Second:     stringPtr("0"),
			Minute:     stringPtr("9"),
			Hour:       stringPtr("*"),
			DayOfMonth: stringPtr("*"),
			Month:      stringPtr("*"),
			DayOfWeek:  stringPtr("1-5"),
			EOD:        eod,
		}

		result := schedule.ToJCronString()
		expected := "0 9 * * * 1-5 EOD:E8H"

		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}
	})
}

func TestEndOfDurationCalculation(t *testing.T) {
	testTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

	t.Run("Simple duration", func(t *testing.T) {
		eod := &EndOfDuration{
			Hours:          2,
			ReferencePoint: ReferenceEnd,
		}

		result := eod.CalculateEndDate(testTime)
		expected := testTime.Add(2 * time.Hour)

		if !result.Equal(expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	})

	t.Run("End of day reference", func(t *testing.T) {
		eod := &EndOfDuration{
			Hours:          2,
			ReferencePoint: ReferenceDay,
		}

		result := eod.CalculateEndDate(testTime)
		// Should be end of day (23:59:59)

		if result.Hour() != 23 || result.Minute() != 59 || result.Second() != 59 {
			t.Errorf("Expected end of day, got %v", result)
		}
	})

	t.Run("End of month reference", func(t *testing.T) {
		eod := &EndOfDuration{
			Days:           5,
			ReferencePoint: ReferenceMonth,
		}

		result := eod.CalculateEndDate(testTime)
		// Should be end of January plus 5 days from test time
		if result.Month() != time.January || result.Day() != 31 {
			t.Errorf("Expected end of month calculation, got %v", result)
		}
	})
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
