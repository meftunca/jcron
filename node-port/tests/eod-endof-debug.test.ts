// tests/eod-endof-debug.test.ts
import { describe, test, expect } from '@jest/globals';
import { Schedule, getNext, getPrev } from '../src/index';
import { parseEoD, EndOfDuration, ReferencePoint } from '../src/eod';

describe('EOD endOf Debug Tests', () => {
  test('should debug the endOf calculation issue - E1W example', () => {
    // Recreate the scenario from the user's problem
    const eodString = 'E1W';
    const testDate = new Date('2025-08-14T09:00:00+03:00'); // Current date from user example
    
    console.log('\n=== DEBUG: EOD endOf Calculation Issue ===');
    console.log('eodString:', eodString);
    console.log('testDate (fromTime):', testDate.toISOString());
    
    // Create a schedule with EOD
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:' + eodString);
    console.log('Schedule:', schedule.toString());
    
    // Get next run
    const nextRun = getNext(schedule, testDate);
    console.log('nextRun:', nextRun.toString());
    console.log('nextRun ISO:', nextRun.toISOString());
    
    // Get the start time (should be previous trigger)
    const startTime = schedule.startOf(testDate);
    console.log('startTime (startOf):', startTime?.toString());
    console.log('startTime ISO:', startTime?.toISOString());
    
    // Get the end time (should be calculated from start time + 1 week)
    const endTime = schedule.endOf(testDate);
    console.log('endTime (endOf):', endTime?.toString());
    console.log('endTime ISO:', endTime?.toISOString());
    
    // Let's also test the EOD calculation directly
    const eod = parseEoD(eodString);
    console.log('\nEOD object:', eod);
    console.log('EOD toString:', eod.toString());
    
    if (startTime) {
      const directEndTime = eod.calculateEndDate(startTime);
      console.log('Direct EOD calculation from startTime:', directEndTime.toString());
      console.log('Direct EOD ISO:', directEndTime.toISOString());
    }
    
    // Calculate time difference
    if (startTime && endTime) {
      const timeDiff = endTime.getTime() - startTime.getTime();
      console.log('Time difference (ms):', timeDiff);
      console.log('Time difference (hours):', timeDiff / (1000 * 60 * 60));
      console.log('Time difference (days):', timeDiff / (1000 * 60 * 60 * 24));
    }
    
    // Expected: endTime should be startTime + 1 week
    // Problem: endTime is earlier than startTime (negative difference)
  });

  test('should debug with a simpler weekly schedule', () => {
    console.log('\n=== DEBUG: Simple Weekly Schedule ===');
    
    // Every Monday at 9 AM with 1 week duration
    const schedule = new Schedule('0 0 9 * * 1 EOD:E1W');
    const testDate = new Date('2025-08-15T10:00:00+03:00'); // Friday
    
    console.log('Schedule:', schedule.toString());
    console.log('Test date:', testDate.toString());
    
    // Get previous Monday (should be start time)
    const prev = getPrev(schedule, testDate);
    console.log('Previous trigger (getPrev):', prev?.toString());
    
    // Get next Monday
    const next = getNext(schedule, testDate);
    console.log('Next trigger (getNext):', next?.toString());
    
    // Get start and end times
    const startTime = schedule.startOf(testDate);
    const endTime = schedule.endOf(testDate);
    
    console.log('startOf result:', startTime?.toString());
    console.log('endOf result:', endTime?.toString());
    
    // Let's manually calculate what should happen:
    // 1. Previous Monday at 9 AM should be the start
    // 2. Start + 1 week should be the end
    if (startTime) {
      const manualEndTime = new Date(startTime);
      manualEndTime.setDate(manualEndTime.getDate() + 7); // Add 1 week
      console.log('Manual calculation (start + 1 week):', manualEndTime.toString());
    }
  });

  test('should test different reference date scenarios', () => {
    console.log('\n=== DEBUG: Different Reference Dates ===');
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W'); // Weekdays 9 AM + 1 week
    
    // Test with different reference dates
    const testDates = [
      new Date('2025-08-11T10:00:00+03:00'), // Monday
      new Date('2025-08-12T10:00:00+03:00'), // Tuesday  
      new Date('2025-08-13T10:00:00+03:00'), // Wednesday
      new Date('2025-08-14T10:00:00+03:00'), // Thursday
      new Date('2025-08-15T10:00:00+03:00'), // Friday
    ];
    
    testDates.forEach((testDate, index) => {
      console.log(`\n--- Test ${index + 1}: ${testDate.toDateString()} ---`);
      console.log('Day of week:', testDate.getDay()); // 0=Sun, 1=Mon, ..., 5=Fri
      
      const startTime = schedule.startOf(testDate);
      const endTime = schedule.endOf(testDate);
      
      console.log('startOf:', startTime?.toString());
      console.log('endOf:', endTime?.toString());
      
      if (startTime && endTime) {
        const diff = endTime.getTime() - startTime.getTime();
        console.log('Difference (days):', diff / (1000 * 60 * 60 * 24));
      }
    });
  });

  test('should test the isRangeNow function', () => {
    console.log('\n=== DEBUG: isRangeNow Function ===');
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W');
    const testDate = new Date('2025-08-14T15:00:00+03:00'); // Thursday afternoon
    
    console.log('Schedule:', schedule.toString());
    console.log('Test date:', testDate.toString());
    
    const isInRange = schedule.isRangeNow(testDate);
    console.log('isRangeNow result:', isInRange);
    
    const startTime = schedule.startOf(testDate);
    const endTime = schedule.endOf(testDate);
    
    console.log('Start time:', startTime?.toString());
    console.log('End time:', endTime?.toString());
    console.log('Test is after start:', testDate >= (startTime || new Date(0)));
    console.log('Test is before end:', testDate <= (endTime || new Date(0)));
  });
});
