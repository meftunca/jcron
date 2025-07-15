package main

import (
	"fmt"
	"time"

	"github.com/maple-tech/baseline/jcron"
)

func main() {
	fmt.Println("=== jcron Week of Year Test ===")

	engine := jcron.New()
	now := time.Now()

	// Display current week information
	year, week := now.ISOWeek()
	fmt.Printf("Current time: %s\n", now.Format("2006-01-02 15:04:05 Monday"))
	fmt.Printf("Current ISO week: %d of year %d\n\n", week, year)

	// Test 1: Traditional cron with week constraint
	fmt.Println("Test 1: Every Monday at 9 AM during odd weeks")
	schedule1, err := jcron.FromCronWithWeekOfYear("0 9 * * 1", jcron.OddWeeks)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	next1, err := engine.Next(schedule1, now)
	if err != nil {
		fmt.Printf("Error finding next: %v\n", err)
		return
	}

	_, nextWeek1 := next1.ISOWeek()
	fmt.Printf("Next execution: %s (Week %d)\n", next1.Format("2006-01-02 15:04:05 Monday"), nextWeek1)
	fmt.Printf("Is odd week: %t\n\n", nextWeek1%2 == 1)

	// Test 2: 7-field cron syntax
	fmt.Println("Test 2: Every day at noon during first quarter (weeks 1-13)")
	schedule2, err := jcron.FromCronSyntax("0 0 12 * * * 1-13")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	next2, err := engine.Next(schedule2, now)
	if err != nil {
		fmt.Printf("Error finding next: %v\n", err)
		return
	}

	_, nextWeek2 := next2.ISOWeek()
	fmt.Printf("Next execution: %s (Week %d)\n", next2.Format("2006-01-02 15:04:05 Monday"), nextWeek2)
	fmt.Printf("In first quarter: %t\n\n", nextWeek2 >= 1 && nextWeek2 <= 13)

	// Test 3: Quarterly pattern
	fmt.Println("Test 3: First day of month at 8 AM during quarterly weeks")
	schedule3, err := jcron.FromCronSyntax("0 0 8 1 * * 1,14,27,40")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	next3, err := engine.Next(schedule3, now)
	if err != nil {
		fmt.Printf("Error finding next: %v\n", err)
		return
	}

	_, nextWeek3 := next3.ISOWeek()
	fmt.Printf("Next execution: %s (Week %d)\n", next3.Format("2006-01-02 15:04:05 Monday"), nextWeek3)
	isQuarterly := nextWeek3 == 1 || nextWeek3 == 14 || nextWeek3 == 27 || nextWeek3 == 40
	fmt.Printf("Is quarterly week: %t\n\n", isQuarterly)

	// Test 4: Multiple next executions
	fmt.Println("Test 4: Next 5 executions for bi-weekly Friday meetings")
	schedule4, err := jcron.FromCronWithWeekOfYear("0 14 * * 5", jcron.EvenWeeks)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	current := now
	for i := 0; i < 5; i++ {
		next, err := engine.Next(schedule4, current)
		if err != nil {
			fmt.Printf("Error finding next: %v\n", err)
			break
		}

		_, nextWeek := next.ISOWeek()
		fmt.Printf("%d. %s (Week %d, Even: %t)\n", i+1, next.Format("2006-01-02 15:04:05 Monday"), nextWeek, nextWeek%2 == 0)
		current = next
	}

	fmt.Println("\n=== Test Complete ===")
}
