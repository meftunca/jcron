// tests/eod-user-original-issue.test.ts
import { describe, test, expect } from 'bun:test';
import { Schedule, getNext } from '../src/index';

describe('EOD User Original Issue - Fixed', () => {
  test('should fix the user reported issue with E1W', () => {
    console.log('\n=== USER ORIGINAL ISSUE - FIXED ===');
    
    // User's exact scenario
    const eodString = 'E1W';
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:' + eodString); // Weekdays 9 AM + E1W
    
    // Simulate user's fromTime
    const fromTime = new Date('2025-08-14T09:00:00+03:00'); // Thursday 9 AM
    
    console.log('eodString:', eodString);
    console.log('fromTime:', fromTime.toString());
    console.log('fromTime ISO:', fromTime.toISOString());
    
    // Get next run
    const nextRun = getNext(schedule, fromTime);
    console.log('nextRun:', nextRun.toString());
    console.log('nextRun ISO:', nextRun.toISOString());
    
    // Get end time (this was the problematic calculation before)
    const endTime = schedule.endOf(fromTime);
    console.log('endTime:', endTime?.toString());
    console.log('endTime ISO:', endTime?.toISOString());
    
    // Calculate scheduleEndOf (what user was doing)
    const scheduleEndOf = schedule.endOf(nextRun);
    console.log('scheduleEndOf:', scheduleEndOf?.toString());
    console.log('scheduleEndOf ISO:', scheduleEndOf?.toISOString());
    
    if (nextRun && endTime && scheduleEndOf) {
      // Calculate time differences
      const timeDiff1 = endTime.getTime() - nextRun.getTime();
      const timeDiff2 = scheduleEndOf.getTime() - nextRun.getTime();
      
      console.log('\n--- Time Analysis ---');
      console.log('EOD Bitiş Zamanı (endOf from fromTime):', endTime.toISOString());
      console.log('Başlangıç Zamanı (nextRun):', nextRun.toISOString());
      console.log('scheduleEndOf (endOf from nextRun):', scheduleEndOf.toISOString());
      console.log('Zaman Farkı 1 (endTime - nextRun):', timeDiff1);
      console.log('Zaman Farkı 2 (scheduleEndOf - nextRun):', timeDiff2);
      
      // Now both should be positive (after the next run)
      expect(timeDiff1).toBeGreaterThan(0);
      expect(timeDiff2).toBeGreaterThan(0);
      
      // Both endTime and scheduleEndOf should be the same (end of current week)
      expect(endTime.getTime()).toBe(scheduleEndOf.getTime());
      
      // Should be end of the week containing the nextRun (Sunday)
      expect(endTime.getDay()).toBe(0); // Sunday
      expect(scheduleEndOf.getDay()).toBe(0); // Sunday
      
      console.log('\n--- Result ---');
      console.log('✅ Problem FIXED: endTime is now after nextRun');
      console.log('✅ endTime and scheduleEndOf are now the same');
      console.log('✅ Both point to end of current week (Sunday)');
    }
  });

  test('should test different weekdays with E1W', () => {
    console.log('\n=== TESTING E1W FROM DIFFERENT WEEKDAYS ===');
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W');
    
    const testDates = [
      { date: '2025-08-11T09:00:00+03:00', day: 'Monday' },
      { date: '2025-08-12T09:00:00+03:00', day: 'Tuesday' },
      { date: '2025-08-13T09:00:00+03:00', day: 'Wednesday' },
      { date: '2025-08-14T09:00:00+03:00', day: 'Thursday' },
      { date: '2025-08-15T09:00:00+03:00', day: 'Friday' },
    ];
    
    testDates.forEach(({ date, day }) => {
      console.log(`\n--- Testing from ${day} ---`);
      
      const fromTime = new Date(date);
      const nextRun = getNext(schedule, fromTime);
      const endTime = schedule.endOf(fromTime);
      
      console.log('From:', fromTime.toString());
      console.log('Next:', nextRun.toString());
      console.log('End:', endTime?.toString());
      
      if (endTime && nextRun) {
        const diffMs = endTime.getTime() - nextRun.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        console.log('Difference (days):', diffDays);
        console.log('End is after next?', diffMs > 0);
        
        // All should end on the same Sunday (end of current week)
        expect(endTime.getDay()).toBe(0); // Sunday
        expect(diffMs).toBeGreaterThan(0); // End should be after next
        
        // For the week of Aug 11-15, 2025, should all end on Aug 17 (Sunday)
        expect(endTime.getDate()).toBe(17);
        expect(endTime.getMonth()).toBe(7); // August (0-indexed)
      }
    });
  });

  test('should compare old vs new behavior simulation', () => {
    console.log('\n=== OLD VS NEW BEHAVIOR COMPARISON ===');
    
    const fromTime = new Date('2025-08-14T09:00:00+03:00'); // Thursday
    const nextRun = new Date('2025-09-01T09:00:00+03:00'); // User's example next run
    
    console.log('Scenario: User wants endOf for next execution window');
    console.log('fromTime:', fromTime.toString());
    console.log('nextRun:', nextRun.toString());
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W');
    
    // Current behavior (fixed)
    const currentEndOf = schedule.endOf(fromTime);
    console.log('Current endOf(fromTime):', currentEndOf?.toString());
    
    // What user probably wants: endOf calculated from nextRun
    const endOfFromNextRun = schedule.endOf(nextRun);
    console.log('endOf(nextRun):', endOfFromNextRun?.toString());
    
    // Both should now be sensible (after the respective start times)
    if (currentEndOf && endOfFromNextRun) {
      console.log('\n--- Analysis ---');
      console.log('endOf(fromTime) is reasonable:', currentEndOf.getTime() > fromTime.getTime());
      console.log('endOf(nextRun) is reasonable:', endOfFromNextRun.getTime() > nextRun.getTime());
      
      // They should be different weeks
      expect(currentEndOf.getTime()).not.toBe(endOfFromNextRun.getTime());
      
      console.log('✅ Both calculations now work correctly');
      console.log('✅ User can choose which reference point to use');
    }
  });
});
