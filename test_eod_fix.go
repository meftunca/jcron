// Test Go EOD correct behavior
package jcron

import (
	"fmt"
	"log"
	"os"
	"testing"
	"time"
)

func TestEODFix(t *testing.T) {
	fmt.Println("=== GO EOD IMPLEMENTATION TEST ===")

	// Test E1W parsing
	eod, err := ParseEOD("E1W")
	if err != nil {
		log.Fatalf("Failed to parse E1W: %v", err)
	}

	fmt.Printf("EOD object: %+v\n", eod)
	fmt.Printf("EOD string: %s\n", eod.String())

	// Test calculation with current week
	testDate := time.Date(2025, 8, 14, 9, 0, 0, 0, time.UTC) // Thursday
	fmt.Printf("Test date: %s\n", testDate.String())
	fmt.Printf("Day of week: %d\n", testDate.Weekday()) // 4=Thursday

	endDate := eod.CalculateEndDate(testDate)
	fmt.Printf("End date: %s\n", endDate.String())
	fmt.Printf("End day of week: %d\n", endDate.Weekday()) // Should be 0=Sunday

	// Check if it's end of current week (Sunday)
	if endDate.Weekday() != time.Sunday {
		fmt.Printf("❌ ERROR: Expected Sunday (0), got %d\n", endDate.Weekday())
		t.Fatalf("Expected Sunday, got %d", endDate.Weekday())
	}

	// Should be August 17, 2025 (same week)
	expectedDate := time.Date(2025, 8, 17, 23, 59, 59, 999999999, time.UTC)
	if endDate.Year() != expectedDate.Year() || endDate.Month() != expectedDate.Month() || endDate.Day() != expectedDate.Day() {
		fmt.Printf("❌ ERROR: Expected %s, got %s\n", expectedDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
		t.Fatalf("Expected %s, got %s", expectedDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	}

	fmt.Println("✅ E1W correctly calculates end of current week")

	// Test E2W (end of next week)
	eod2, err := ParseEOD("E2W")
	if err != nil {
		t.Fatalf("Failed to parse E2W: %v", err)
	}

	endDate2 := eod2.CalculateEndDate(testDate)
	fmt.Printf("E2W End date: %s\n", endDate2.String())

	// Should be Sunday of next week (August 24, 2025)
	expectedDate2 := time.Date(2025, 8, 24, 23, 59, 59, 999999999, time.UTC)
	if endDate2.Year() != expectedDate2.Year() || endDate2.Month() != expectedDate2.Month() || endDate2.Day() != expectedDate2.Day() {
		fmt.Printf("❌ ERROR: Expected %s, got %s\n", expectedDate2.Format("2006-01-02"), endDate2.Format("2006-01-02"))
		t.Fatalf("Expected %s, got %s", expectedDate2.Format("2006-01-02"), endDate2.Format("2006-01-02"))
	}

	fmt.Println("✅ E2W correctly calculates end of next week")

	// Test Schedule with EOD
	second := "0"
	minute := "0"
	hour := "9"
	dayOfMonth := "*"
	month := "*"
	dayOfWeek := "1-5"

	schedule := Schedule{
		Second:     &second,
		Minute:     &minute,
		Hour:       &hour,
		DayOfMonth: &dayOfMonth,
		Month:      &month,
		DayOfWeek:  &dayOfWeek, // Monday-Friday
		EOD:        eod,        // E1W
	}

	fmt.Printf("Schedule: %+v\n", schedule)

	// Test EndOf method
	fromTime := time.Date(2025, 8, 14, 9, 0, 0, 0, time.UTC) // Thursday 9 AM
	endTime := schedule.EndOf(fromTime)

	fmt.Printf("Schedule EndOf result: %s\n", endTime.String())

	if !endTime.IsZero() && endTime.Weekday() == time.Sunday {
		fmt.Println("✅ Schedule.EndOf works correctly")
	} else {
		fmt.Printf("❌ ERROR: Schedule.EndOf failed, got: %s\n", endTime.String())
		os.Exit(1)
	}

	fmt.Println("\n🎉 All tests passed! Go EOD implementation is working correctly.")
}
