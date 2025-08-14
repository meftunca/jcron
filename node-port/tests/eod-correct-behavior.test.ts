// tests/eod-correct-behavior.test.ts
import { describe, test, expect } from 'bun:test';
import { Schedule, getNext } from '../src/index';
import { parseEoD, EndOfDuration, ReferencePoint } from '../src/eod';

describe('EOD Correct Behavior Tests', () => {
  test('should correctly parse E1W as end of current week', () => {
    console.log('\n=== PARSING E1W ===');
    
    const eod = parseEoD('E1W');
    console.log('EOD object:', {
      weeks: eod.weeks,
      referencePoint: eod.referencePoint,
      toString: eod.toString()
    });
    
    expect(eod.weeks).toBe(1);
    expect(eod.referencePoint).toBe(ReferencePoint.WEEK);
  });

  test('should correctly calculate E1W as end of current week', () => {
    console.log('\n=== CALCULATING E1W ===');
    
    // Test with Thursday August 14, 2025 at 9 AM
    const testDate = new Date('2025-08-14T09:00:00+03:00');
    console.log('Test date:', testDate.toString());
    console.log('Day of week:', testDate.getDay()); // 0=Sun, 1=Mon, ..., 4=Thu
    
    const eod = parseEoD('E1W');
    const endDate = eod.calculateEndDate(testDate);
    
    console.log('End date:', endDate.toString());
    console.log('End date ISO:', endDate.toISOString());
    console.log('End day of week:', endDate.getDay()); // Should be 0 (Sunday)
    
    // Should be Sunday (day 0) of the same week
    expect(endDate.getDay()).toBe(0); // Sunday
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    
    // Should be Sunday August 17, 2025 (same week as Thursday Aug 14)
    expect(endDate.getDate()).toBe(17);
    expect(endDate.getMonth()).toBe(7); // August (0-indexed)
  });

  test('should correctly calculate E2W as end of next week', () => {
    console.log('\n=== CALCULATING E2W ===');
    
    // Test with Thursday August 14, 2025 at 9 AM
    const testDate = new Date('2025-08-14T09:00:00+03:00');
    console.log('Test date:', testDate.toString());
    
    const eod = parseEoD('E2W');
    const endDate = eod.calculateEndDate(testDate);
    
    console.log('End date:', endDate.toString());
    console.log('End date ISO:', endDate.toISOString());
    
    // Should be Sunday of next week (August 24, 2025)
    expect(endDate.getDay()).toBe(0); // Sunday
    expect(endDate.getDate()).toBe(24); // Next week's Sunday
    expect(endDate.getMonth()).toBe(7); // August
  });

  test('should test the user scenario with corrected behavior', () => {
    console.log('\n=== USER SCENARIO WITH CORRECTED BEHAVIOR ===');
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W'); // Weekdays 9 AM + end of current week
    const testDate = new Date('2025-08-14T09:00:00+03:00'); // Thursday
    
    console.log('Schedule:', schedule.toString());
    console.log('Test date (fromTime):', testDate.toString());
    
    const nextRun = getNext(schedule, testDate);
    console.log('Next run:', nextRun.toString());
    
    const endTime = schedule.endOf(testDate);
    console.log('End time:', endTime?.toString());
    
    if (endTime && nextRun) {
      console.log('End time ISO:', endTime.toISOString());
      console.log('Next run ISO:', nextRun.toISOString());
      
      // End time should be after next run (correct behavior)
      const isEndAfterNext = endTime.getTime() > nextRun.getTime();
      console.log('Is end time after next run?', isEndAfterNext);
      
      // End time should be end of current week (Sunday of this week)
      expect(endTime.getDay()).toBe(0); // Sunday
      expect(isEndAfterNext).toBe(true);
      
      const diffDays = (endTime.getTime() - nextRun.getTime()) / (1000 * 60 * 60 * 24);
      console.log('Difference from next run (days):', diffDays);
    }
  });

  test('should test different EOD patterns', () => {
    console.log('\n=== DIFFERENT EOD PATTERNS ===');
    
    const testDate = new Date('2025-08-14T15:30:00+03:00'); // Thursday 3:30 PM
    console.log('Base test date:', testDate.toString());
    
    const testCases = [
      { pattern: 'E1D', desc: 'end of current day' },
      { pattern: 'E1W', desc: 'end of current week' },
      { pattern: 'E1M', desc: 'end of current month' },
      { pattern: 'E2D', desc: 'end of next day' },
      { pattern: 'E2W', desc: 'end of next week' },
    ];
    
    testCases.forEach(({ pattern, desc }) => {
      console.log(`\n--- Testing ${pattern} (${desc}) ---`);
      
      const eod = parseEoD(pattern);
      const endDate = eod.calculateEndDate(testDate);
      
      console.log('Pattern:', pattern);
      console.log('Result:', endDate.toString());
      console.log('Reference point:', eod.referencePoint);
      
      // All should be at end of their respective periods (23:59:59)
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });
  });

  test('should verify week calculation edge cases', () => {
    console.log('\n=== WEEK CALCULATION EDGE CASES ===');
    
    // Test from different days of the week
    const testDates = [
      { date: new Date('2025-08-10T09:00:00+03:00'), day: 'Sunday' },
      { date: new Date('2025-08-11T09:00:00+03:00'), day: 'Monday' },
      { date: new Date('2025-08-14T09:00:00+03:00'), day: 'Thursday' },
      { date: new Date('2025-08-16T09:00:00+03:00'), day: 'Saturday' },
    ];
    
    testDates.forEach(({ date, day }) => {
      console.log(`\n--- Testing E1W from ${day} ---`);
      console.log('Start date:', date.toString());
      
      const eod = parseEoD('E1W');
      const endDate = eod.calculateEndDate(date);
      
      console.log('End date:', endDate.toString());
      console.log('Days until end:', (endDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      // All should end on the same Sunday (end of current week)
      expect(endDate.getDay()).toBe(0); // Sunday
      
      // For dates in same week (Aug 10-16, 2025), should all end on current or next Sunday
      if (date.getDate() >= 11 && date.getDate() <= 16) {
        // Monday to Saturday should end on Sunday Aug 17
        expect(endDate.getDate()).toBe(17); // Sunday Aug 17
      } else if (date.getDate() === 10) {
        // Sunday should end on the same day (Sunday Aug 10)
        expect(endDate.getDate()).toBe(10); // Same Sunday
      }
    });
  });
});
